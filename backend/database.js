const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.currentSessionId = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(config.DATABASE_PATH, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database');
                this.createTables().then(resolve).catch(reject);
            });
        });
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS recording_sessions (
                id TEXT PRIMARY KEY,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                description TEXT,
                node_count INTEGER DEFAULT 0,
                event_count INTEGER DEFAULT 0
            )`,
            
            `CREATE TABLE IF NOT EXISTS network_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT NOT NULL,
                node_id TEXT,
                data TEXT,
                FOREIGN KEY (session_id) REFERENCES recording_sessions (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS node_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                node_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                bytes_sent INTEGER DEFAULT 0,
                bytes_received INTEGER DEFAULT 0,
                messages_relayed INTEGER DEFAULT 0,
                token_holds INTEGER DEFAULT 0,
                avg_token_hold_time REAL DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES recording_sessions (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS topology_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                change_type TEXT NOT NULL,
                node_id TEXT,
                neighbor_data TEXT,
                FOREIGN KEY (session_id) REFERENCES recording_sessions (id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS token_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                from_node TEXT,
                to_node TEXT,
                token_sequence INTEGER,
                dfs_phase TEXT,
                traversal_depth INTEGER,
                FOREIGN KEY (session_id) REFERENCES recording_sessions (id)
            )`
        ];

        for (const tableQuery of tables) {
            await this.runQuery(tableQuery);
        }

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_events_session ON network_events(session_id)',
            'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON network_events(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_stats_session_node ON node_statistics(session_id, node_id)',
            'CREATE INDEX IF NOT EXISTS idx_topology_session ON topology_changes(session_id)',
            'CREATE INDEX IF NOT EXISTS idx_token_session ON token_movements(session_id)'
        ];

        for (const indexQuery of indexes) {
            await this.runQuery(indexQuery);
        }
    }

    runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    getQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    getAllQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    startRecordingSession(description = '') {
        this.currentSessionId = uuidv4();
        const query = `INSERT INTO recording_sessions (id, description) VALUES (?, ?)`;
        return this.runQuery(query, [this.currentSessionId, description]);
    }

    async endRecordingSession() {
        if (!this.currentSessionId) return;

        // Update session with end time and statistics
        const eventCount = await this.getQuery(
            'SELECT COUNT(*) as count FROM network_events WHERE session_id = ?',
            [this.currentSessionId]
        );

        const nodeCount = await this.getQuery(
            'SELECT COUNT(DISTINCT node_id) as count FROM network_events WHERE session_id = ? AND node_id IS NOT NULL',
            [this.currentSessionId]
        );

        await this.runQuery(
            'UPDATE recording_sessions SET end_time = CURRENT_TIMESTAMP, event_count = ?, node_count = ? WHERE id = ?',
            [eventCount.count, nodeCount.count, this.currentSessionId]
        );

        this.currentSessionId = null;
    }

    recordEvent(eventType, data, timestamp = null) {
        if (!this.currentSessionId) return;

        const query = `INSERT INTO network_events (session_id, event_type, node_id, data, timestamp) VALUES (?, ?, ?, ?, ?)`;
        const nodeId = data.nodeId || null;
        const dataJson = JSON.stringify(data);
        const ts = timestamp || new Date().toISOString();

        return this.runQuery(query, [this.currentSessionId, eventType, nodeId, dataJson, ts]);
    }

    recordTokenMovement(fromNode, toNode, tokenSequence, dfsPhase, traversalDepth) {
        if (!this.currentSessionId) return;

        const query = `INSERT INTO token_movements (session_id, from_node, to_node, token_sequence, dfs_phase, traversal_depth) VALUES (?, ?, ?, ?, ?, ?)`;
        return this.runQuery(query, [this.currentSessionId, fromNode, toNode, tokenSequence, dfsPhase, traversalDepth]);
    }

    recordNodeStatistics(nodeId, stats) {
        if (!this.currentSessionId) return;

        const query = `INSERT INTO node_statistics (session_id, node_id, bytes_sent, bytes_received, messages_relayed, token_holds, avg_token_hold_time) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        return this.runQuery(query, [
            this.currentSessionId,
            nodeId,
            stats.bytesSent || 0,
            stats.bytesReceived || 0,
            stats.messagesRelayed || 0,
            stats.tokenHolds || 0,
            stats.avgTokenHoldTime || 0
        ]);
    }

    recordTopologyChange(changeType, nodeId, neighborData) {
        if (!this.currentSessionId) return;

        const query = `INSERT INTO topology_changes (session_id, change_type, node_id, neighbor_data) VALUES (?, ?, ?, ?)`;
        return this.runQuery(query, [this.currentSessionId, changeType, nodeId, JSON.stringify(neighborData)]);
    }

    async getRecordingSessions() {
        const query = `SELECT * FROM recording_sessions ORDER BY start_time DESC`;
        return this.getAllQuery(query);
    }

    async getRecordingEvents(sessionId) {
        const query = `SELECT * FROM network_events WHERE session_id = ? ORDER BY timestamp ASC`;
        const events = await this.getAllQuery(query, [sessionId]);
        
        return events.map(event => ({
            ...event,
            data: JSON.parse(event.data)
        }));
    }

    async getSessionStatistics(sessionId) {
        const stats = await this.getAllQuery(
            'SELECT * FROM node_statistics WHERE session_id = ? ORDER BY timestamp DESC',
            [sessionId]
        );

        const topology = await this.getAllQuery(
            'SELECT * FROM topology_changes WHERE session_id = ? ORDER BY timestamp ASC',
            [sessionId]
        );

        const tokens = await this.getAllQuery(
            'SELECT * FROM token_movements WHERE session_id = ? ORDER BY timestamp ASC',
            [sessionId]
        );

        return { stats, topology, tokens };
    }

    async exportSessionData(sessionId, format = 'json') {
        const session = await this.getQuery(
            'SELECT * FROM recording_sessions WHERE id = ?',
            [sessionId]
        );

        const events = await this.getRecordingEvents(sessionId);
        const statistics = await this.getSessionStatistics(sessionId);

        const exportData = {
            session,
            events,
            statistics
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            // Convert to CSV format
            return this.convertToCSV(exportData);
        }

        return exportData;
    }

    convertToCSV(data) {
        const csvLines = [];
        
        // Events CSV
        csvLines.push('# Network Events');
        csvLines.push('timestamp,event_type,node_id,data');
        data.events.forEach(event => {
            const dataStr = JSON.stringify(event.data).replace(/"/g, '""');
            csvLines.push(`${event.timestamp},${event.event_type},${event.node_id || ''},"${dataStr}"`);
        });
        
        csvLines.push('\n# Node Statistics');
        csvLines.push('timestamp,node_id,bytes_sent,bytes_received,messages_relayed,token_holds,avg_token_hold_time');
        data.statistics.stats.forEach(stat => {
            csvLines.push(`${stat.timestamp},${stat.node_id},${stat.bytes_sent},${stat.bytes_received},${stat.messages_relayed},${stat.token_holds},${stat.avg_token_hold_time}`);
        });

        return csvLines.join('\n');
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;