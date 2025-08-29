const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const net = require('net');
const cors = require('cors');
const path = require('path');
const DatabaseManager = require('./database');
const NetworkMonitor = require('./networkMonitor');
const config = require('./config');

class TokenRingMonitorServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.tcpServer = null;
        this.connectedNodes = new Map();
        this.networkMonitor = new NetworkMonitor();
        this.database = new DatabaseManager();
        this.isRecording = false;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.setupTcpServer();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../frontend/build')));
    }

    setupRoutes() {
        // API routes
        this.app.get('/api/nodes', (req, res) => {
            const nodes = Array.from(this.connectedNodes.values());
            res.json(nodes);
        });

        this.app.get('/api/topology', (req, res) => {
            const topology = this.networkMonitor.getTopology();
            res.json(topology);
        });

        this.app.get('/api/statistics', (req, res) => {
            const stats = this.networkMonitor.getStatistics();
            res.json(stats);
        });

        this.app.post('/api/recording/start', (req, res) => {
            this.startRecording();
            res.json({ status: 'recording_started' });
        });

        this.app.post('/api/recording/stop', (req, res) => {
            this.stopRecording();
            res.json({ status: 'recording_stopped' });
        });

        this.app.get('/api/recording/sessions', async (req, res) => {
            try {
                const sessions = await this.database.getRecordingSessions();
                res.json(sessions);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/recording/playback/:sessionId', async (req, res) => {
            try {
                const events = await this.database.getRecordingEvents(req.params.sessionId);
                res.json(events);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Serve React app for all other routes
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Web client connected:', socket.id);

            // Send initial data
            socket.emit('nodes_update', Array.from(this.connectedNodes.values()));
            socket.emit('topology_update', this.networkMonitor.getTopology());
            socket.emit('statistics_update', this.networkMonitor.getStatistics());

            socket.on('disconnect', () => {
                console.log('Web client disconnected:', socket.id);
            });

            // Handle playback controls
            socket.on('start_playback', (sessionId) => {
                this.startPlayback(socket, sessionId);
            });

            socket.on('stop_playback', () => {
                this.stopPlayback(socket);
            });
        });
    }

    setupTcpServer() {
        this.tcpServer = net.createServer((socket) => {
            console.log('Node connected from:', socket.remoteAddress + ':' + socket.remotePort);
            
            let nodeId = null;
            let buffer = '';

            socket.on('data', (data) => {
                buffer += data.toString();
                let messages = buffer.split('\n');
                buffer = messages.pop(); // Keep incomplete message in buffer

                messages.forEach(messageStr => {
                    if (messageStr.trim()) {
                        try {
                            const message = JSON.parse(messageStr);
                            this.handleNodeMessage(socket, message);
                            
                            if (message.type === 'node_info') {
                                nodeId = message.data.nodeId;
                            }
                        } catch (error) {
                            console.error('Error parsing message:', error, messageStr);
                        }
                    }
                });
            });

            socket.on('close', () => {
                console.log('Node disconnected:', nodeId || 'unknown');
                if (nodeId && this.connectedNodes.has(nodeId)) {
                    this.connectedNodes.delete(nodeId);
                    this.broadcastToClients('node_disconnected', { nodeId });
                }
            });

            socket.on('error', (error) => {
                console.error('TCP socket error:', error);
            });

            // Send heartbeat every 30 seconds
            const heartbeatInterval = setInterval(() => {
                if (!socket.destroyed) {
                    socket.write(JSON.stringify({ type: 'heartbeat' }) + '\n');
                } else {
                    clearInterval(heartbeatInterval);
                }
            }, 30000);
        });

        this.tcpServer.listen(config.TCP_PORT, () => {
            console.log(`TCP server listening on port ${config.TCP_PORT}`);
        });
    }

    handleNodeMessage(socket, message) {
        const timestamp = new Date().toISOString();
        
        switch (message.type) {
            case 'node_info':
                this.handleNodeInfo(socket, message.data, timestamp);
                break;
            case 'token_status':
                this.handleTokenStatus(message.data, timestamp);
                break;
            case 'topology_update':
                this.handleTopologyUpdate(message.data, timestamp);
                break;
            case 'statistics_update':
                this.handleStatisticsUpdate(message.data, timestamp);
                break;
            case 'dfs_state':
                this.handleDfsState(message.data, timestamp);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }

        // Record event if recording is active
        if (this.isRecording) {
            this.database.recordEvent(message.type, message.data, timestamp);
        }
    }

    handleNodeInfo(socket, data, timestamp) {
        const nodeInfo = {
            ...data,
            socket: socket,
            lastSeen: timestamp,
            status: 'active'
        };

        this.connectedNodes.set(data.nodeId, nodeInfo);
        this.networkMonitor.updateNode(data.nodeId, nodeInfo);
        
        this.broadcastToClients('node_info', nodeInfo);
        console.log('Node registered:', data.nodeId);
    }

    handleTokenStatus(data, timestamp) {
        this.networkMonitor.updateTokenStatus(data);
        this.broadcastToClients('token_status', data);
    }

    handleTopologyUpdate(data, timestamp) {
        this.networkMonitor.updateTopology(data);
        this.broadcastToClients('topology_update', data);
    }

    handleStatisticsUpdate(data, timestamp) {
        this.networkMonitor.updateStatistics(data);
        this.broadcastToClients('statistics_update', data);
    }

    handleDfsState(data, timestamp) {
        this.networkMonitor.updateDfsState(data);
        this.broadcastToClients('dfs_state', data);
    }

    broadcastToClients(event, data) {
        this.io.emit(event, data);
    }

    startRecording() {
        if (!this.isRecording) {
            this.isRecording = true;
            this.database.startRecordingSession();
            console.log('Recording started');
            this.broadcastToClients('recording_status', { recording: true });
        }
    }

    stopRecording() {
        if (this.isRecording) {
            this.isRecording = false;
            this.database.endRecordingSession();
            console.log('Recording stopped');
            this.broadcastToClients('recording_status', { recording: false });
        }
    }

    async startPlayback(socket, sessionId) {
        try {
            const events = await this.database.getRecordingEvents(sessionId);
            let eventIndex = 0;

            const playbackInterval = setInterval(() => {
                if (eventIndex >= events.length) {
                    clearInterval(playbackInterval);
                    socket.emit('playback_complete');
                    return;
                }

                const event = events[eventIndex];
                socket.emit('playback_event', event);
                eventIndex++;
            }, 100); // 10 FPS playback

            socket.playbackInterval = playbackInterval;
        } catch (error) {
            console.error('Playback error:', error);
            socket.emit('playback_error', error.message);
        }
    }

    stopPlayback(socket) {
        if (socket.playbackInterval) {
            clearInterval(socket.playbackInterval);
            socket.playbackInterval = null;
        }
    }

    async start() {
        try {
            await this.database.initialize();
            this.server.listen(config.HTTP_PORT, () => {
                console.log(`HTTP server listening on port ${config.HTTP_PORT}`);
                console.log(`Monitor available at http://localhost:${config.HTTP_PORT}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start the server
const server = new TokenRingMonitorServer();
server.start();

module.exports = TokenRingMonitorServer;