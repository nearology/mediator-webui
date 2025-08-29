import React, { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, socket }) => {
  const [nodes, setNodes] = useState([]);
  const [topology, setTopology] = useState({ nodes: [], edges: [] });
  const [statistics, setStatistics] = useState({
    totalNodes: 0,
    activeNodes: 0,
    totalBandwidth: 0,
    messagesRelayed: 0,
    tokenCirculations: 0,
    averageTokenHoldTime: 0,
    networkEfficiency: 0,
    dfsCompletionRate: 0
  });
  const [tokenStatus, setTokenStatus] = useState({
    currentHolder: null,
    sequence: 0,
    phase: 'FORWARD',
    traversalDepth: 0,
    visitedCount: 0,
    lastMovement: null
  });
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Connection status handlers
    socket.on('connect', () => {
      setIsConnected(true);
      addLog('info', 'Connected to monitoring server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addLog('warning', 'Disconnected from monitoring server');
    });

    // Data update handlers
    socket.on('nodes_update', (nodesData) => {
      setNodes(Array.isArray(nodesData) ? nodesData : [nodesData]);
      addLog('info', `Nodes updated: ${Array.isArray(nodesData) ? nodesData.length : 1} nodes`);
    });

    socket.on('node_info', (nodeData) => {
      setNodes(prevNodes => {
        const existingIndex = prevNodes.findIndex(n => n.nodeId === nodeData.nodeId);
        if (existingIndex >= 0) {
          const updated = [...prevNodes];
          updated[existingIndex] = { ...updated[existingIndex], ...nodeData };
          return updated;
        } else {
          return [...prevNodes, nodeData];
        }
      });
      addLog('info', `Node ${nodeData.nodeId} registered`);
    });

    socket.on('node_disconnected', (data) => {
      setNodes(prevNodes => prevNodes.filter(n => n.nodeId !== data.nodeId));
      addLog('warning', `Node ${data.nodeId} disconnected`);
    });

    socket.on('topology_update', (topologyData) => {
      setTopology(topologyData);
    });

    socket.on('token_status', (tokenData) => {
      setTokenStatus(prevStatus => ({ ...prevStatus, ...tokenData }));
      if (tokenData.currentHolder) {
        addLog('info', `Token moved to ${tokenData.currentHolder} (seq: ${tokenData.tokenSequence})`);
      }
    });

    socket.on('statistics_update', (statsData) => {
      setStatistics(prevStats => ({ ...prevStats, ...statsData }));
    });

    socket.on('dfs_state', (dfsData) => {
      addLog('info', `DFS state: ${dfsData.phase} phase, depth ${dfsData.traversalDepth}`);
    });

    socket.on('recording_status', (status) => {
      setIsRecording(status.recording);
      addLog('info', status.recording ? 'Recording started' : 'Recording stopped');
    });

    socket.on('error', (error) => {
      addLog('error', `Socket error: ${error.message || error}`);
    });

    // Cleanup listeners
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('nodes_update');
      socket.off('node_info');
      socket.off('node_disconnected');
      socket.off('topology_update');
      socket.off('token_status');
      socket.off('statistics_update');
      socket.off('dfs_state');
      socket.off('recording_status');
      socket.off('error');
    };
  }, [socket]);

  const addLog = (level, message) => {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    setLogs(prevLogs => {
      const newLogs = [logEntry, ...prevLogs];
      // Keep only last 500 log entries
      return newLogs.slice(0, 500);
    });
  };

  const startRecording = () => {
    if (socket && isConnected) {
      fetch('/api/recording/start', { method: 'POST' })
        .then(response => response.json())
        .then(() => {
          setIsRecording(true);
          addLog('info', 'Recording started');
        })
        .catch(error => {
          addLog('error', `Failed to start recording: ${error.message}`);
        });
    }
  };

  const stopRecording = () => {
    if (socket && isConnected) {
      fetch('/api/recording/stop', { method: 'POST' })
        .then(response => response.json())
        .then(() => {
          setIsRecording(false);
          addLog('info', 'Recording stopped');
        })
        .catch(error => {
          addLog('error', `Failed to stop recording: ${error.message}`);
        });
    }
  };

  const getRecordingSessions = async () => {
    try {
      const response = await fetch('/api/recording/sessions');
      return await response.json();
    } catch (error) {
      addLog('error', `Failed to get recording sessions: ${error.message}`);
      return [];
    }
  };

  const getPlaybackData = async (sessionId) => {
    try {
      const response = await fetch(`/api/recording/playback/${sessionId}`);
      return await response.json();
    } catch (error) {
      addLog('error', `Failed to get playback data: ${error.message}`);
      return [];
    }
  };

  const exportSession = async (sessionId, format = 'json') => {
    try {
      const response = await fetch(`/api/recording/export/${sessionId}?format=${format}`);
      const data = await response.text();
      
      // Create download
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_session_${sessionId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      addLog('info', `Session ${sessionId} exported as ${format}`);
    } catch (error) {
      addLog('error', `Failed to export session: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const contextValue = {
    socket,
    isConnected,
    nodes,
    topology,
    statistics,
    tokenStatus,
    isRecording,
    logs,
    startRecording,
    stopRecording,
    getRecordingSessions,
    getPlaybackData,
    exportSession,
    clearLogs,
    addLog
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};