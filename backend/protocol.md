# Token Ring Network Monitoring Protocol

## TCP Communication Protocol

The monitoring server listens on a configurable TCP port (default: 8080) for connections from token ring network nodes. All communication uses JSON messages terminated with newline characters (`\n`).

## Message Format

All messages follow this basic structure:

```json
{
    "type": "message_type",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        // Message-specific data
    }
}
```

## Message Types

### 1. Node Information (`node_info`)

Sent by nodes when they first connect or when their configuration changes.

```json
{
    "type": "node_info",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "ip": "192.168.1.100",
        "port": 8001,
        "neighbors": ["node_002", "node_003"],
        "status": "active",
        "version": "1.0.0"
    }
}
```

### 2. Token Status (`token_status`)

Sent when a node receives, holds, or releases the token.

```json
{
    "type": "token_status",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "hasToken": true,
        "tokenSequence": 12345,
        "holdStartTime": "2024-01-01T00:00:00.000Z",
        "holdDuration": 150,
        "phase": "FORWARD",
        "nextNode": "node_002"
    }
}
```

### 3. Topology Update (`topology_update`)

Sent when a node's neighbor list changes or network topology is modified.

```json
{
    "type": "topology_update",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "neighbors": ["node_002", "node_004"],
        "changeType": "neighbor_added",
        "affectedNode": "node_004"
    }
}
```

### 4. Statistics Update (`statistics_update`)

Sent periodically to report node performance statistics.

```json
{
    "type": "statistics_update",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "bytesSent": 1024000,
        "bytesReceived": 2048000,
        "messagesRelayed": 150,
        "tokenReceived": 25,
        "tokenSent": 25,
        "averageLatency": 12.5,
        "errorCount": 0,
        "uptime": 3600000
    }
}
```

### 5. DFS State (`dfs_state`)

Sent to report the current Depth-First Search traversal state.

```json
{
    "type": "dfs_state",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "phase": "FORWARD",
        "depth": 3,
        "visited": true,
        "parent": "node_002",
        "children": ["node_003", "node_004"],
        "traversalComplete": false,
        "visitedCount": 8
    }
}
```

### 6. Heartbeat (`heartbeat`)

Sent by the monitoring server to check node connectivity. Nodes should respond with their current status.

**Server to Node:**
```json
{
    "type": "heartbeat",
    "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Node Response:**
```json
{
    "type": "heartbeat_response",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "status": "active",
        "hasToken": false,
        "uptime": 3600000
    }
}
```

### 7. Error Reporting (`error`)

Sent when a node encounters an error or exception.

```json
{
    "type": "error",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
        "nodeId": "node_001",
        "errorType": "token_timeout",
        "errorMessage": "Token hold timeout exceeded",
        "severity": "warning",
        "context": {
            "tokenSequence": 12345,
            "holdDuration": 5000
        }
    }
}
```

## Connection Lifecycle

1. **Initial Connection**: Node establishes TCP connection to monitoring server
2. **Registration**: Node sends `node_info` message with its details
3. **Periodic Updates**: Node sends status and statistics updates
4. **Heartbeat**: Server sends periodic heartbeats; node responds
5. **Graceful Shutdown**: Node sends final status before disconnecting
6. **Automatic Reconnection**: Node should attempt to reconnect if connection is lost

## Implementation Guidelines for Nodes

### Connection Setup

```javascript
const net = require('net');

class MonitoringClient {
    constructor(monitorHost = 'localhost', monitorPort = 8080) {
        this.host = monitorHost;
        this.port = monitorPort;
        this.socket = null;
        this.reconnectInterval = 5000;
        this.nodeId = 'node_001'; // Unique node identifier
    }

    connect() {
        this.socket = net.createConnection(this.port, this.host);
        
        this.socket.on('connect', () => {
            console.log('Connected to monitoring server');
            this.sendNodeInfo();
        });

        this.socket.on('data', (data) => {
            this.handleServerMessage(data.toString());
        });

        this.socket.on('close', () => {
            console.log('Disconnected from monitoring server');
            setTimeout(() => this.connect(), this.reconnectInterval);
        });

        this.socket.on('error', (error) => {
            console.error('Monitor connection error:', error);
        });
    }

    sendMessage(type, data) {
        if (this.socket && !this.socket.destroyed) {
            const message = {
                type,
                timestamp: new Date().toISOString(),
                data: { nodeId: this.nodeId, ...data }
            };
            this.socket.write(JSON.stringify(message) + '\n');
        }
    }

    sendNodeInfo() {
        this.sendMessage('node_info', {
            ip: this.getLocalIP(),
            port: this.getLocalPort(),
            neighbors: this.getNeighbors(),
            status: 'active',
            version: '1.0.0'
        });
    }
}
```

### Message Handling

Nodes should implement handlers for each message type and send updates when:

- Token status changes (received, held, sent)
- Network topology changes (neighbors added/removed)
- Statistics need to be reported (every 30 seconds)
- DFS state changes
- Errors occur

### Error Handling

- Implement automatic reconnection with exponential backoff
- Buffer messages during disconnection and send when reconnected
- Handle partial message reception (messages may be split across TCP packets)
- Validate message format before processing

### Performance Considerations

- Batch multiple updates into single messages when possible
- Limit message frequency to avoid overwhelming the monitoring server
- Use efficient JSON serialization
- Implement message queuing for high-throughput scenarios

## Security Considerations

- Implement authentication if monitoring sensitive networks
- Use TLS encryption for secure communication
- Validate all incoming messages to prevent injection attacks
- Rate limit connections to prevent DoS attacks

## Testing

Use the provided test client to verify protocol implementation:

```bash
node test/protocol-test.js --host localhost --port 8080 --nodeId test_node
```