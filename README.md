# Token Ring Network Monitoring System

A comprehensive real-time web-based monitoring system for distributed token ring networks using compressed DFS token passing algorithms.

## 🚀 Features

### Real-Time Network Monitoring
- **Live Network Visualization**: Interactive D3.js-powered graph showing nodes and connections
- **Token Flow Animation**: Real-time visualization of token movement with animated paths
- **Node Status Tracking**: Monitor active/inactive nodes with visual indicators
- **DFS State Monitoring**: Track traversal phases, depth, and completion rates

### Advanced Statistics Dashboard
- **Performance Metrics**: Bandwidth usage, message relay statistics, network efficiency
- **Historical Data**: Time-series charts showing network performance over time
- **Node Performance**: Individual node statistics and top performers
- **Token Analysis**: Token circulation timing and hold duration metrics

### Data Recording & Playback
- **Session Recording**: Record all network events to SQLite database
- **Playback System**: Review past network behavior with timeline scrubber
- **Export Capabilities**: Export data in JSON/CSV formats for analysis
- **Session Management**: Browse and manage multiple recording sessions

### Professional UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark Theme**: Modern dark interface optimized for monitoring environments
- **Real-time Logs**: System log viewer with filtering and search capabilities
- **Control Panel**: Comprehensive controls for recording, filtering, and configuration

## 🏗️ Architecture

### Backend (Node.js)
- **TCP Server**: Handles connections from network nodes
- **WebSocket Server**: Real-time communication with web clients
- **Database Layer**: SQLite for data persistence
- **REST API**: Configuration and data export endpoints

### Frontend (React)
- **Real-time Updates**: Socket.IO integration for live data
- **Interactive Visualization**: D3.js network graphs with animations
- **Statistics Charts**: Recharts for performance metrics
- **Responsive UI**: Mobile-first design with modern styling

### Communication Protocol
- **JSON-based**: Structured message format for all communications
- **Event Types**: Node info, token status, topology updates, statistics, DFS state
- **Heartbeat System**: Automatic connection monitoring
- **Error Handling**: Graceful handling of network issues

## 📋 Prerequisites

- **Node.js** 16.x or higher
- **npm** 8.x or higher
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)
- **Linux/macOS/Windows** operating system

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd token-ring-monitor
```

### 2. Install Dependencies
```bash
# Install all dependencies (root, backend, frontend)
npm run install-all

# Or install individually:
npm install                    # Root dependencies
cd backend && npm install     # Backend dependencies
cd ../frontend && npm install # Frontend dependencies
```

### 3. Configuration
The system uses environment variables for configuration. Create a `.env` file in the backend directory:

```bash
# Backend Configuration
HTTP_PORT=3001
TCP_PORT=8080
DATABASE_PATH=./monitor.db
MAX_NODES=100
HEARTBEAT_INTERVAL=30000
NODE_TIMEOUT=60000

# Optional: Frontend Configuration
REACT_APP_SERVER_URL=http://localhost:3001
```

## 🚀 Quick Start

### Development Mode
Run both backend and frontend in development mode:
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:3000`
- TCP monitoring server on port `8080`

### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Testing with Simulated Nodes
Use the included test client to simulate network nodes:

```bash
# Install test dependencies
cd test && npm install

# Run single test node
node protocol-test.js --nodeId test_node_1 --verbose

# Run multiple test nodes
for i in {1..5}; do
  node protocol-test.js --nodeId test_node_$i --duration 300 &
done
```

## 📡 Network Node Integration

### TCP Connection
Nodes connect to the monitoring server via TCP on port 8080 (configurable).

### Message Protocol
All messages are JSON objects terminated with newline characters:

```javascript
{
  "type": "node_info",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "nodeId": "node_001",
    "ip": "192.168.1.100",
    "port": 8001,
    "neighbors": ["node_002", "node_003"],
    "status": "active"
  }
}
```

### Implementation Example
```javascript
const net = require('net');

class MonitoringClient {
  constructor(nodeId, monitorHost = 'localhost', monitorPort = 8080) {
    this.nodeId = nodeId;
    this.host = monitorHost;
    this.port = monitorPort;
    this.socket = null;
  }

  connect() {
    this.socket = net.createConnection(this.port, this.host);
    
    this.socket.on('connect', () => {
      this.sendNodeInfo();
    });

    this.socket.on('data', (data) => {
      this.handleServerMessage(data.toString());
    });
  }

  sendMessage(type, data) {
    const message = {
      type,
      timestamp: new Date().toISOString(),
      data: { nodeId: this.nodeId, ...data }
    };
    this.socket.write(JSON.stringify(message) + '\n');
  }

  sendNodeInfo() {
    this.sendMessage('node_info', {
      ip: this.getLocalIP(),
      port: this.getLocalPort(),
      neighbors: this.getNeighbors(),
      status: 'active'
    });
  }
}
```

## 📊 Message Types

### Node Information (`node_info`)
Initial registration and configuration updates.

### Token Status (`token_status`)
Token possession, sequence numbers, and timing information.

### Topology Update (`topology_update`)
Network structure changes and neighbor modifications.

### Statistics Update (`statistics_update`)
Performance metrics and bandwidth usage data.

### DFS State (`dfs_state`)
Depth-first search traversal progress and phase information.

### Error Reporting (`error`)
Network errors and exception handling.

See `backend/protocol.md` for complete protocol specification.

## 🎛️ Web Interface

### Network Monitor View
- **Interactive Graph**: Zoom, pan, and click nodes for details
- **Token Animation**: Real-time token flow visualization
- **Node Details**: Pop-up modals with comprehensive node information
- **Control Panel**: Recording controls and view filters

### Statistics Dashboard
- **Key Metrics**: Network efficiency, token circulation, DFS completion
- **Time Series Charts**: Historical performance data
- **Node Performance**: Individual node statistics and rankings
- **Export Functions**: Download data for external analysis

### Recording & Playback
- **Session Management**: Browse and select recording sessions
- **Playback Controls**: Play, pause, seek through recorded events
- **Timeline View**: Visual event timeline with filtering
- **Export Options**: JSON and CSV export formats

## 🔧 Configuration Options

### Backend Configuration
- `HTTP_PORT`: Web server port (default: 3001)
- `TCP_PORT`: Node connection port (default: 8080)
- `DATABASE_PATH`: SQLite database location
- `MAX_NODES`: Maximum concurrent nodes
- `HEARTBEAT_INTERVAL`: Connection check frequency
- `NODE_TIMEOUT`: Node disconnection timeout

### Frontend Configuration
- `REACT_APP_SERVER_URL`: Backend server URL
- Display settings configurable via web interface

## 📁 Project Structure

```
token-ring-monitor/
├── backend/                 # Node.js backend server
│   ├── server.js           # Main server application
│   ├── database.js         # SQLite database management
│   ├── networkMonitor.js   # Network state management
│   ├── config.js           # Configuration settings
│   └── protocol.md         # Communication protocol docs
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── App.js         # Main application
│   └── public/            # Static assets
├── test/                  # Testing utilities
│   ├── protocol-test.js   # Node simulation client
│   └── package.json       # Test dependencies
└── README.md              # This file
```

## 🧪 Testing

### Protocol Testing
```bash
cd test
npm install

# Test single node connection
node protocol-test.js --nodeId test_node --verbose

# Test with custom parameters
node protocol-test.js --host localhost --port 8080 --nodeId custom_node --interval 2000 --duration 120
```

### Load Testing
```bash
# Simulate 10 nodes for 5 minutes
for i in {1..10}; do
  node protocol-test.js --nodeId load_test_$i --duration 300 &
done
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📈 Performance

### Scalability
- **Nodes**: Tested with 50+ concurrent nodes
- **Update Rate**: 10+ FPS visualization updates
- **Data Storage**: Efficient SQLite storage with indexing
- **Memory Usage**: Optimized for long-running sessions

### Browser Requirements
- **Modern Browser**: ES6+ support required
- **WebSocket**: Full WebSocket support
- **Canvas/SVG**: Hardware-accelerated graphics
- **Memory**: 512MB+ available RAM

## 🔒 Security Considerations

### Network Security
- **TCP Authentication**: Implement authentication for production use
- **TLS Encryption**: Use TLS for secure communication
- **Input Validation**: All messages validated before processing
- **Rate Limiting**: Built-in connection rate limiting

### Web Security
- **CORS Configuration**: Properly configured cross-origin requests
- **Input Sanitization**: XSS protection on all inputs
- **Session Management**: Secure session handling

## 🐛 Troubleshooting

### Common Issues

**Connection Refused**
- Verify backend server is running
- Check TCP port availability (default: 8080)
- Confirm firewall settings

**Frontend Not Loading**
- Ensure frontend build completed successfully
- Check console for JavaScript errors
- Verify WebSocket connection

**Database Errors**
- Check SQLite file permissions
- Verify disk space availability
- Review database path configuration

**Performance Issues**
- Reduce update frequency for large networks
- Limit historical data retention
- Check system resource usage

### Debug Mode
Enable verbose logging:
```bash
# Backend debugging
DEBUG=* node backend/server.js

# Test client debugging
node test/protocol-test.js --verbose
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Test with multiple browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **D3.js** - Interactive network visualization
- **React** - Frontend framework
- **Socket.IO** - Real-time communication
- **Recharts** - Statistics charts
- **SQLite** - Database storage

## 📞 Support

For questions, issues, or contributions:

1. **GitHub Issues**: Report bugs and feature requests
2. **Documentation**: Check `backend/protocol.md` for protocol details
3. **Examples**: See `test/` directory for implementation examples

---

**Built with ❤️ for network monitoring and analysis**