import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import NetworkVisualization from './components/NetworkVisualization';
import StatisticsDashboard from './components/StatisticsDashboard';
import ControlPanel from './components/ControlPanel';
import RecordingPlayback from './components/RecordingPlayback';
import LogViewer from './components/LogViewer';
import Navigation from './components/Navigation';
import { SocketProvider } from './contexts/SocketContext';
import './App.css';
import './components/components.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [currentView, setCurrentView] = useState('monitor');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to monitoring server');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from monitoring server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'monitor':
        return <NetworkMonitorView />;
      case 'statistics':
        return <StatisticsDashboard />;
      case 'playback':
        return <RecordingPlayback />;
      default:
        return <NetworkMonitorView />;
    }
  };

  return (
    <SocketProvider socket={socket}>
      <div className="app">
        <Navigation 
          currentView={currentView}
          onViewChange={setCurrentView}
          connectionStatus={connectionStatus}
        />
        <main className="main-content">
          {renderView()}
        </main>
      </div>
    </SocketProvider>
  );
}

// Main network monitoring view
function NetworkMonitorView() {
  return (
    <div className="monitor-view">
      <div className="monitor-header">
        <ControlPanel />
      </div>
      <div className="monitor-body">
        <div className="network-section">
          <NetworkVisualization />
        </div>
        <div className="sidebar">
          <div className="stats-section">
            <StatisticsDashboard compact={true} />
          </div>
          <div className="log-section">
            <LogViewer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;