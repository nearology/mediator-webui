import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import './Navigation.css';

const Navigation = ({ currentView, onViewChange, connectionStatus }) => {
  const { isRecording, statistics } = useSocket();

  const navItems = [
    { id: 'monitor', label: 'Network Monitor', icon: '📊' },
    { id: 'statistics', label: 'Statistics', icon: '📈' },
    { id: 'playback', label: 'Playback', icon: '⏯️' }
  ];

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10b981';
      case 'disconnected': return '#ef4444';
      case 'error': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <span className="nav-logo">🔗</span>
        <span className="nav-title">Token Ring Monitor</span>
      </div>
      
      <div className="nav-items">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-status">
        <div className="network-summary">
          <div className="summary-item">
            <span className="summary-label">Nodes:</span>
            <span className="summary-value">{statistics.activeNodes}/{statistics.totalNodes}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Token:</span>
            <span className="summary-value">#{statistics.tokenCirculations}</span>
          </div>
        </div>

        {isRecording && (
          <div className="recording-indicator">
            <div className="recording-dot"></div>
            <span>REC</span>
          </div>
        )}

        <div className="connection-status">
          <div 
            className="connection-dot"
            style={{ backgroundColor: getConnectionStatusColor() }}
          ></div>
          <span className="connection-text">
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;