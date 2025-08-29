import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

const ControlPanel = () => {
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    clearLogs, 
    isConnected,
    statistics,
    tokenStatus
  } = useSocket();

  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState({
    showInactive: true,
    showWarnings: true,
    nodeFilter: ''
  });
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 5000,
    maxLogEntries: 500,
    showTooltips: true
  });

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      clearLogs();
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        statistics,
        tokenStatus,
        filters,
        settings
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_snapshot_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleResetNetwork = () => {
    if (window.confirm('Are you sure you want to reset the network view? This will not affect the actual network.')) {
      window.location.reload();
    }
  };

  return (
    <div className="control-panel">
      <div className="control-section">
        <div className="control-group">
          <h3>Recording</h3>
          <div className="button-group">
            {!isRecording ? (
              <button
                className="button button-success"
                onClick={handleStartRecording}
                disabled={!isConnected}
                title="Start recording network events"
              >
                ⏺️ Start Recording
              </button>
            ) : (
              <button
                className="button button-danger"
                onClick={handleStopRecording}
                title="Stop recording network events"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>
          {isRecording && (
            <div className="recording-status">
              <div className="recording-indicator active">
                <div className="recording-dot"></div>
                <span>Recording active</span>
              </div>
            </div>
          )}
        </div>

        <div className="control-group">
          <h3>Data Management</h3>
          <div className="button-group">
            <button
              className="button button-secondary"
              onClick={handleExportData}
              disabled={!isConnected}
              title="Export current network data"
            >
              💾 Export Data
            </button>
            <button
              className="button button-secondary"
              onClick={handleClearLogs}
              title="Clear all log entries"
            >
              🗑️ Clear Logs
            </button>
            <button
              className="button button-secondary"
              onClick={handleResetNetwork}
              title="Reset network visualization"
            >
              🔄 Reset View
            </button>
          </div>
        </div>

        <div className="control-group">
          <h3>View Filters</h3>
          <div className="filter-controls">
            <label className="filter-item">
              <input
                type="checkbox"
                checked={filters.showInactive}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  showInactive: e.target.checked
                }))}
              />
              Show Inactive Nodes
            </label>
            <label className="filter-item">
              <input
                type="checkbox"
                checked={filters.showWarnings}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  showWarnings: e.target.checked
                }))}
              />
              Show Warnings
            </label>
            <div className="filter-item">
              <input
                type="text"
                placeholder="Filter by node ID..."
                value={filters.nodeFilter}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  nodeFilter: e.target.value
                }))}
                className="filter-input"
              />
            </div>
          </div>
        </div>

        <div className="control-group">
          <h3>Network Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Connection:</span>
              <span className={`status-value ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Active Nodes:</span>
              <span className="status-value">{statistics.activeNodes}/{statistics.totalNodes}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Token Holder:</span>
              <span className="status-value">
                {tokenStatus.currentHolder ? `🔗 ${tokenStatus.currentHolder}` : 'None'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">DFS Phase:</span>
              <span className="status-value">{tokenStatus.phase}</span>
            </div>
          </div>
        </div>

        <div className="control-group">
          <button
            className="settings-toggle"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ {showSettings ? 'Hide' : 'Show'} Settings
          </button>
          
          {showSettings && (
            <div className="settings-panel">
              <h4>Display Settings</h4>
              <div className="settings-grid">
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={settings.autoRefresh}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      autoRefresh: e.target.checked
                    }))}
                  />
                  Auto Refresh
                </label>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={settings.showTooltips}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      showTooltips: e.target.checked
                    }))}
                  />
                  Show Tooltips
                </label>

                <div className="setting-item">
                  <label>Refresh Interval (ms):</label>
                  <input
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      refreshInterval: parseInt(e.target.value)
                    }))}
                    className="setting-input"
                  />
                </div>

                <div className="setting-item">
                  <label>Max Log Entries:</label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="100"
                    value={settings.maxLogEntries}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxLogEntries: parseInt(e.target.value)
                    }))}
                    className="setting-input"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="control-summary">
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-icon">📊</span>
            <div>
              <div className="summary-value">{statistics.tokenCirculations}</div>
              <div className="summary-label">Token Circulations</div>
            </div>
          </div>
          <div className="summary-item">
            <span className="summary-icon">⚡</span>
            <div>
              <div className="summary-value">{statistics.networkEfficiency.toFixed(1)}%</div>
              <div className="summary-label">Network Efficiency</div>
            </div>
          </div>
          <div className="summary-item">
            <span className="summary-icon">🔍</span>
            <div>
              <div className="summary-value">{statistics.dfsCompletionRate.toFixed(1)}%</div>
              <div className="summary-label">DFS Completion</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;