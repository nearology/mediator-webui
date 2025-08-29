class NetworkMonitor {
    constructor() {
        this.nodes = new Map();
        this.topology = {
            nodes: [],
            edges: []
        };
        this.tokenStatus = {
            currentHolder: null,
            sequence: 0,
            phase: 'FORWARD',
            traversalDepth: 0,
            visitedCount: 0,
            lastMovement: null
        };
        this.statistics = {
            totalNodes: 0,
            activeNodes: 0,
            totalBandwidth: 0,
            messagesRelayed: 0,
            tokenCirculations: 0,
            averageTokenHoldTime: 0,
            networkEfficiency: 0,
            dfsCompletionRate: 0
        };
        this.dfsState = new Map();
        this.tokenHistory = [];
        this.performanceMetrics = new Map();
    }

    updateNode(nodeId, nodeInfo) {
        const existingNode = this.nodes.get(nodeId);
        const updatedNode = {
            ...existingNode,
            ...nodeInfo,
            lastUpdated: new Date().toISOString()
        };

        this.nodes.set(nodeId, updatedNode);
        this.updateTopologyFromNode(nodeId, updatedNode);
        this.updateStatistics();
    }

    updateTokenStatus(tokenData) {
        const previousHolder = this.tokenStatus.currentHolder;
        
        this.tokenStatus = {
            ...this.tokenStatus,
            ...tokenData,
            lastMovement: new Date().toISOString()
        };

        // Record token movement
        if (previousHolder && previousHolder !== tokenData.currentHolder) {
            this.tokenHistory.push({
                from: previousHolder,
                to: tokenData.currentHolder,
                timestamp: new Date().toISOString(),
                sequence: tokenData.sequence,
                phase: tokenData.phase,
                depth: tokenData.traversalDepth
            });

            // Keep only last 1000 movements for performance
            if (this.tokenHistory.length > 1000) {
                this.tokenHistory = this.tokenHistory.slice(-1000);
            }

            this.statistics.tokenCirculations++;
        }

        // Update node token hold statistics
        if (tokenData.currentHolder) {
            const node = this.nodes.get(tokenData.currentHolder);
            if (node) {
                node.tokenHolds = (node.tokenHolds || 0) + 1;
                node.lastTokenHold = new Date().toISOString();
            }
        }
    }

    updateTopology(topologyData) {
        if (topologyData.nodeId) {
            const node = this.nodes.get(topologyData.nodeId);
            if (node) {
                node.neighbors = topologyData.neighbors || [];
                this.updateTopologyFromNode(topologyData.nodeId, node);
            }
        }
    }

    updateTopologyFromNode(nodeId, nodeInfo) {
        // Update nodes in topology
        const existingNodeIndex = this.topology.nodes.findIndex(n => n.id === nodeId);
        const nodeData = {
            id: nodeId,
            label: nodeId,
            ip: nodeInfo.ip,
            port: nodeInfo.port,
            status: nodeInfo.status || 'active',
            hasToken: this.tokenStatus.currentHolder === nodeId,
            neighbors: nodeInfo.neighbors || [],
            ...nodeInfo
        };

        if (existingNodeIndex >= 0) {
            this.topology.nodes[existingNodeIndex] = nodeData;
        } else {
            this.topology.nodes.push(nodeData);
        }

        // Update edges based on neighbors
        if (nodeInfo.neighbors) {
            // Remove existing edges for this node
            this.topology.edges = this.topology.edges.filter(
                edge => edge.from !== nodeId && edge.to !== nodeId
            );

            // Add new edges
            nodeInfo.neighbors.forEach(neighborId => {
                if (this.nodes.has(neighborId)) {
                    this.topology.edges.push({
                        id: `${nodeId}-${neighborId}`,
                        from: nodeId,
                        to: neighborId,
                        type: 'neighbor'
                    });
                }
            });
        }
    }

    updateStatistics(statsData) {
        if (statsData && statsData.nodeId) {
            // Update node-specific statistics
            const node = this.nodes.get(statsData.nodeId);
            if (node) {
                node.bytesSent = statsData.bytesSent || 0;
                node.bytesReceived = statsData.bytesReceived || 0;
                node.messagesRelayed = statsData.messagesRelayed || 0;
                
                // Update performance metrics
                this.performanceMetrics.set(statsData.nodeId, {
                    ...this.performanceMetrics.get(statsData.nodeId),
                    ...statsData,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Recalculate global statistics
        this.calculateGlobalStatistics();
    }

    updateDfsState(dfsData) {
        if (dfsData.nodeId) {
            this.dfsState.set(dfsData.nodeId, {
                ...dfsData,
                timestamp: new Date().toISOString()
            });

            // Update global DFS statistics
            this.tokenStatus.phase = dfsData.phase || this.tokenStatus.phase;
            this.tokenStatus.traversalDepth = dfsData.depth || this.tokenStatus.traversalDepth;
            this.tokenStatus.visitedCount = this.dfsState.size;
        }
    }

    calculateGlobalStatistics() {
        const nodes = Array.from(this.nodes.values());
        const activeNodes = nodes.filter(n => n.status === 'active');

        this.statistics.totalNodes = nodes.length;
        this.statistics.activeNodes = activeNodes.length;
        
        // Calculate bandwidth statistics
        this.statistics.totalBandwidth = nodes.reduce((sum, node) => 
            sum + (node.bytesSent || 0) + (node.bytesReceived || 0), 0
        );

        this.statistics.messagesRelayed = nodes.reduce((sum, node) => 
            sum + (node.messagesRelayed || 0), 0
        );

        // Calculate average token hold time
        const tokenHoldTimes = this.tokenHistory
            .filter(h => h.timestamp > new Date(Date.now() - 60000).toISOString()) // Last minute
            .map(h => new Date(h.timestamp).getTime());

        if (tokenHoldTimes.length > 1) {
            const intervals = [];
            for (let i = 1; i < tokenHoldTimes.length; i++) {
                intervals.push(tokenHoldTimes[i] - tokenHoldTimes[i-1]);
            }
            this.statistics.averageTokenHoldTime = 
                intervals.reduce((a, b) => a + b, 0) / intervals.length;
        }

        // Calculate network efficiency (messages relayed / total messages)
        const totalMessages = this.statistics.tokenCirculations + this.statistics.messagesRelayed;
        this.statistics.networkEfficiency = totalMessages > 0 ? 
            (this.statistics.messagesRelayed / totalMessages) * 100 : 0;

        // Calculate DFS completion rate
        const expectedVisits = this.statistics.activeNodes;
        this.statistics.dfsCompletionRate = expectedVisits > 0 ? 
            (this.tokenStatus.visitedCount / expectedVisits) * 100 : 0;
    }

    getTopology() {
        return {
            ...this.topology,
            tokenPath: this.getTokenPath(),
            lastUpdate: new Date().toISOString()
        };
    }

    getTokenPath() {
        const recentMovements = this.tokenHistory.slice(-10); // Last 10 movements
        return recentMovements.map(movement => ({
            from: movement.from,
            to: movement.to,
            timestamp: movement.timestamp,
            sequence: movement.sequence
        }));
    }

    getStatistics() {
        return {
            ...this.statistics,
            nodeStatistics: this.getNodeStatistics(),
            tokenHistory: this.tokenHistory.slice(-50), // Last 50 movements
            dfsProgress: this.getDfsProgress(),
            lastUpdate: new Date().toISOString()
        };
    }

    getNodeStatistics() {
        const nodeStats = [];
        this.nodes.forEach((node, nodeId) => {
            const perfMetrics = this.performanceMetrics.get(nodeId) || {};
            nodeStats.push({
                nodeId,
                ip: node.ip,
                port: node.port,
                status: node.status,
                bytesSent: node.bytesSent || 0,
                bytesReceived: node.bytesReceived || 0,
                messagesRelayed: node.messagesRelayed || 0,
                tokenHolds: node.tokenHolds || 0,
                lastSeen: node.lastSeen,
                neighbors: node.neighbors || [],
                ...perfMetrics
            });
        });
        return nodeStats;
    }

    getDfsProgress() {
        const progress = [];
        this.dfsState.forEach((state, nodeId) => {
            progress.push({
                nodeId,
                phase: state.phase,
                depth: state.depth,
                visited: state.visited,
                parent: state.parent,
                timestamp: state.timestamp
            });
        });
        return progress;
    }

    getNodeById(nodeId) {
        return this.nodes.get(nodeId);
    }

    getActiveNodes() {
        return Array.from(this.nodes.values()).filter(node => node.status === 'active');
    }

    removeNode(nodeId) {
        this.nodes.delete(nodeId);
        this.dfsState.delete(nodeId);
        this.performanceMetrics.delete(nodeId);
        
        // Remove from topology
        this.topology.nodes = this.topology.nodes.filter(n => n.id !== nodeId);
        this.topology.edges = this.topology.edges.filter(
            e => e.from !== nodeId && e.to !== nodeId
        );

        this.updateStatistics();
    }

    reset() {
        this.nodes.clear();
        this.dfsState.clear();
        this.performanceMetrics.clear();
        this.tokenHistory = [];
        this.topology = { nodes: [], edges: [] };
        this.tokenStatus = {
            currentHolder: null,
            sequence: 0,
            phase: 'FORWARD',
            traversalDepth: 0,
            visitedCount: 0,
            lastMovement: null
        };
        this.calculateGlobalStatistics();
    }
}

module.exports = NetworkMonitor;