#!/usr/bin/env node

/**
 * Token Ring Network Monitoring Protocol Test Client
 * 
 * This test client simulates a network node connecting to the monitoring server
 * and sending various types of messages according to the defined protocol.
 * 
 * Usage: node protocol-test.js [options]
 */

const net = require('net');
const { program } = require('commander');

program
  .option('-h, --host <host>', 'Monitor server host', 'localhost')
  .option('-p, --port <port>', 'Monitor server port', '8080')
  .option('-n, --nodeId <nodeId>', 'Node identifier', `test_node_${Math.floor(Math.random() * 1000)}`)
  .option('-i, --interval <ms>', 'Update interval in milliseconds', '5000')
  .option('-d, --duration <seconds>', 'Test duration in seconds', '60')
  .option('-v, --verbose', 'Verbose logging')
  .parse();

const options = program.opts();

class TestNode {
  constructor(nodeId, host, port) {
    this.nodeId = nodeId;
    this.host = host;
    this.port = parseInt(port);
    this.socket = null;
    this.connected = false;
    this.stats = {
      bytesSent: 0,
      bytesReceived: 0,
      messagesRelayed: 0,
      tokenReceived: 0,
      tokenSent: 0,
      uptime: 0
    };
    this.neighbors = this.generateRandomNeighbors();
    this.hasToken = false;
    this.tokenSequence = 0;
    this.dfsState = {
      phase: 'FORWARD',
      depth: 0,
      visited: false,
      parent: null,
      children: []
    };
    this.startTime = Date.now();
  }

  generateRandomNeighbors() {
    const neighborCount = Math.floor(Math.random() * 3) + 1; // 1-3 neighbors
    const neighbors = [];
    for (let i = 0; i < neighborCount; i++) {
      neighbors.push(`node_${Math.floor(Math.random() * 100)}`);
    }
    return neighbors;
  }

  connect() {
    console.log(`Connecting to monitoring server at ${this.host}:${this.port}...`);
    
    this.socket = net.createConnection(this.port, this.host);
    
    this.socket.on('connect', () => {
      console.log('Connected to monitoring server');
      this.connected = true;
      this.sendNodeInfo();
      this.startPeriodicUpdates();
    });

    this.socket.on('data', (data) => {
      this.handleServerMessage(data.toString());
    });

    this.socket.on('close', () => {
      console.log('Disconnected from monitoring server');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Connection error:', error.message);
      this.connected = false;
    });
  }

  handleServerMessage(data) {
    const messages = data.trim().split('\n');
    messages.forEach(messageStr => {
      if (messageStr.trim()) {
        try {
          const message = JSON.parse(messageStr);
          if (options.verbose) {
            console.log('Received:', message);
          }
          
          switch (message.type) {
            case 'heartbeat':
              this.sendHeartbeatResponse();
              break;
            default:
              if (options.verbose) {
                console.log('Unknown message type:', message.type);
              }
          }
        } catch (error) {
          console.error('Error parsing server message:', error.message);
        }
      }
    });
  }

  sendMessage(type, data) {
    if (!this.connected || !this.socket) return;

    const message = {
      type,
      timestamp: new Date().toISOString(),
      data: { nodeId: this.nodeId, ...data }
    };

    try {
      this.socket.write(JSON.stringify(message) + '\n');
      if (options.verbose) {
        console.log('Sent:', message);
      }
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  }

  sendNodeInfo() {
    this.sendMessage('node_info', {
      ip: '127.0.0.1',
      port: 8000 + Math.floor(Math.random() * 1000),
      neighbors: this.neighbors,
      status: 'active',
      version: '1.0.0'
    });
  }

  sendTokenStatus() {
    this.sendMessage('token_status', {
      hasToken: this.hasToken,
      tokenSequence: this.tokenSequence,
      holdStartTime: this.hasToken ? new Date().toISOString() : null,
      holdDuration: this.hasToken ? Math.floor(Math.random() * 1000) + 100 : 0,
      phase: this.dfsState.phase,
      nextNode: this.hasToken ? this.neighbors[0] : null
    });
  }

  sendTopologyUpdate() {
    // Simulate occasional topology changes
    if (Math.random() < 0.1) { // 10% chance
      const changeType = Math.random() < 0.5 ? 'neighbor_added' : 'neighbor_removed';
      const affectedNode = `node_${Math.floor(Math.random() * 100)}`;
      
      if (changeType === 'neighbor_added' && !this.neighbors.includes(affectedNode)) {
        this.neighbors.push(affectedNode);
      } else if (changeType === 'neighbor_removed' && this.neighbors.length > 1) {
        const index = this.neighbors.indexOf(affectedNode);
        if (index > -1) {
          this.neighbors.splice(index, 1);
        }
      }

      this.sendMessage('topology_update', {
        neighbors: this.neighbors,
        changeType,
        affectedNode
      });
    }
  }

  sendStatisticsUpdate() {
    // Simulate network activity
    this.stats.bytesSent += Math.floor(Math.random() * 1000) + 100;
    this.stats.bytesReceived += Math.floor(Math.random() * 1500) + 200;
    this.stats.messagesRelayed += Math.floor(Math.random() * 5);
    this.stats.uptime = Date.now() - this.startTime;

    this.sendMessage('statistics_update', {
      ...this.stats,
      averageLatency: Math.random() * 50 + 5,
      errorCount: Math.floor(Math.random() * 3)
    });
  }

  sendDfsState() {
    // Simulate DFS traversal changes
    if (Math.random() < 0.3) { // 30% chance of state change
      this.dfsState.depth = Math.floor(Math.random() * 10);
      this.dfsState.phase = Math.random() < 0.5 ? 'FORWARD' : 'REVERSE';
      this.dfsState.visited = Math.random() < 0.7;
      this.dfsState.parent = this.neighbors[Math.floor(Math.random() * this.neighbors.length)];
    }

    this.sendMessage('dfs_state', {
      ...this.dfsState,
      traversalComplete: Math.random() < 0.1,
      visitedCount: Math.floor(Math.random() * 20) + 1
    });
  }

  sendHeartbeatResponse() {
    this.sendMessage('heartbeat_response', {
      status: 'active',
      hasToken: this.hasToken,
      uptime: Date.now() - this.startTime
    });
  }

  simulateTokenMovement() {
    // Simulate token passing
    if (Math.random() < 0.2) { // 20% chance of token movement
      this.hasToken = !this.hasToken;
      if (this.hasToken) {
        this.tokenSequence++;
        this.stats.tokenReceived++;
      } else {
        this.stats.tokenSent++;
      }
      this.sendTokenStatus();
    }
  }

  sendErrorReport() {
    // Simulate occasional errors
    if (Math.random() < 0.05) { // 5% chance
      const errorTypes = ['token_timeout', 'connection_lost', 'invalid_message', 'buffer_overflow'];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      
      this.sendMessage('error', {
        errorType,
        errorMessage: `Simulated ${errorType} error`,
        severity: Math.random() < 0.3 ? 'error' : 'warning',
        context: {
          tokenSequence: this.tokenSequence,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  startPeriodicUpdates() {
    const interval = parseInt(options.interval);
    
    setInterval(() => {
      if (this.connected) {
        this.simulateTokenMovement();
        this.sendStatisticsUpdate();
        this.sendDfsState();
        this.sendTopologyUpdate();
        this.sendErrorReport();
      }
    }, interval);

    console.log(`Started periodic updates every ${interval}ms`);
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

// Create and start test node
const testNode = new TestNode(options.nodeId, options.host, options.port);

console.log(`Starting test node: ${options.nodeId}`);
console.log(`Target: ${options.host}:${options.port}`);
console.log(`Update interval: ${options.interval}ms`);
console.log(`Test duration: ${options.duration}s`);
console.log('---');

testNode.connect();

// Auto-disconnect after specified duration
setTimeout(() => {
  console.log('Test duration completed, disconnecting...');
  testNode.disconnect();
  process.exit(0);
}, parseInt(options.duration) * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down test node...');
  testNode.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down test node...');
  testNode.disconnect();
  process.exit(0);
});