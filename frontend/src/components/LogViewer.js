import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

const LogViewer = () => {
  const { logs, clearLogs } = useSocket();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.level !== filter) {
      return false;
    }
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getLevelClass = (level) => {
    return `log-level-${level}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message
    }));

    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="log-viewer-container">
      <div className="log-viewer-header">
        <h3>System Logs</h3>
        <div className="log-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="log-filter"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
          
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="log-search"
          />

          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>

          <button
            className="log-button"
            onClick={exportLogs}
            title="Export logs"
          >
            💾
          </button>

          <button
            className="log-button"
            onClick={clearLogs}
            title="Clear logs"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="log-stats">
        <span className="log-stat">
          Total: {logs.length}
        </span>
        <span className="log-stat">
          Filtered: {filteredLogs.length}
        </span>
        <span className="log-stat">
          Errors: {logs.filter(l => l.level === 'error').length}
        </span>
        <span className="log-stat">
          Warnings: {logs.filter(l => l.level === 'warning').length}
        </span>
      </div>

      <div 
        className="log-viewer"
        ref={logContainerRef}
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
          setAutoScroll(isAtBottom);
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            {logs.length === 0 ? 'No logs available' : 'No logs match current filter'}
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
              <span className="log-timestamp">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className="log-level-icon">
                {getLevelIcon(log.level)}
              </span>
              <span className="log-message">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogViewer;