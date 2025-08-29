import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

const RecordingPlayback = () => {
  const { getRecordingSessions, getPlaybackData, exportSession, socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [playbackData, setPlaybackData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const playbackIntervalRef = useRef(null);

  // Load recording sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Handle socket events for playback
  useEffect(() => {
    if (!socket) return;

    const handlePlaybackEvent = (event) => {
      // Handle real-time playback events from server
      console.log('Playback event:', event);
    };

    const handlePlaybackComplete = () => {
      setIsPlaying(false);
      setCurrentEventIndex(playbackData.length);
    };

    const handlePlaybackError = (errorMsg) => {
      setError(errorMsg);
      setIsPlaying(false);
    };

    socket.on('playback_event', handlePlaybackEvent);
    socket.on('playback_complete', handlePlaybackComplete);
    socket.on('playback_error', handlePlaybackError);

    return () => {
      socket.off('playback_event', handlePlaybackEvent);
      socket.off('playback_complete', handlePlaybackComplete);
      socket.off('playback_error', handlePlaybackError);
    };
  }, [socket, playbackData.length]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionData = await getRecordingSessions();
      setSessions(sessionData);
    } catch (err) {
      setError('Failed to load recording sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlaybackData(sessionId);
      setPlaybackData(data);
      setCurrentEventIndex(0);
      setSelectedSession(sessions.find(s => s.id === sessionId));
    } catch (err) {
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const startPlayback = () => {
    if (playbackData.length === 0) return;

    setIsPlaying(true);
    setError(null);

    playbackIntervalRef.current = setInterval(() => {
      setCurrentEventIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= playbackData.length) {
          setIsPlaying(false);
          return prevIndex;
        }
        return nextIndex;
      });
    }, 1000 / playbackSpeed);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const stopPlayback = () => {
    pausePlayback();
    setCurrentEventIndex(0);
  };

  const seekToEvent = (index) => {
    setCurrentEventIndex(Math.max(0, Math.min(index, playbackData.length - 1)));
  };

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return 'In progress';
    const duration = new Date(endTime) - new Date(startTime);
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatFileSize = (eventCount) => {
    // Rough estimation of file size based on event count
    const avgEventSize = 200; // bytes
    const totalBytes = eventCount * avgEventSize;
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1048576) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / 1048576).toFixed(1)} MB`;
  };

  const getCurrentEvent = () => {
    return playbackData[currentEventIndex] || null;
  };

  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'node_info': return '#3b82f6';
      case 'token_status': return '#22c55e';
      case 'topology_update': return '#f59e0b';
      case 'statistics_update': return '#8b5cf6';
      case 'dfs_state': return '#06b6d4';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="recording-playback">
      <div className="playback-header">
        <h2>Recording Playback</h2>
        <button 
          className="button button-secondary"
          onClick={loadSessions}
          disabled={loading}
        >
          🔄 Refresh Sessions
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="playback-content">
        {/* Session List */}
        <div className="session-list">
          <h3>Recording Sessions</h3>
          {loading && <div className="loading-spinner"></div>}
          
          {sessions.length === 0 && !loading ? (
            <div className="no-sessions">
              No recording sessions found. Start recording to create sessions.
            </div>
          ) : (
            <div className="sessions-grid">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  className={`session-card ${selectedSession?.id === session.id ? 'selected' : ''}`}
                  onClick={() => loadSessionData(session.id)}
                >
                  <div className="session-header">
                    <div className="session-id">
                      {session.id.slice(0, 8)}...
                    </div>
                    <div className="session-date">
                      {new Date(session.start_time).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="session-details">
                    <div className="session-stat">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">
                        {formatDuration(session.start_time, session.end_time)}
                      </span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-label">Events:</span>
                      <span className="stat-value">{session.event_count}</span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-label">Nodes:</span>
                      <span className="stat-value">{session.node_count}</span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-label">Size:</span>
                      <span className="stat-value">{formatFileSize(session.event_count)}</span>
                    </div>
                  </div>

                  <div className="session-actions">
                    <button
                      className="session-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSession(session.id, 'json');
                      }}
                      title="Export as JSON"
                    >
                      📄
                    </button>
                    <button
                      className="session-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSession(session.id, 'csv');
                      }}
                      title="Export as CSV"
                    >
                      📊
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playback Controls */}
        {selectedSession && (
          <div className="playback-controls">
            <h3>Playback Controls</h3>
            
            <div className="control-row">
              <div className="playback-buttons">
                <button
                  className="button button-primary"
                  onClick={isPlaying ? pausePlayback : startPlayback}
                  disabled={playbackData.length === 0}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                  className="button button-secondary"
                  onClick={stopPlayback}
                  disabled={playbackData.length === 0}
                >
                  ⏹️ Stop
                </button>
              </div>

              <div className="speed-control">
                <label>Speed:</label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                  <option value={8}>8x</option>
                </select>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-info">
                <span>Event {currentEventIndex + 1} of {playbackData.length}</span>
                <span>{selectedSession.start_time}</span>
              </div>
              
              <div className="progress-bar">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, playbackData.length - 1)}
                  value={currentEventIndex}
                  onChange={(e) => seekToEvent(parseInt(e.target.value))}
                  className="progress-slider"
                />
              </div>
            </div>

            {/* Current Event Display */}
            {getCurrentEvent() && (
              <div className="current-event">
                <h4>Current Event</h4>
                <div className="event-details">
                  <div className="event-header">
                    <span 
                      className="event-type"
                      style={{ color: getEventTypeColor(getCurrentEvent().event_type) }}
                    >
                      {getCurrentEvent().event_type}
                    </span>
                    <span className="event-timestamp">
                      {new Date(getCurrentEvent().timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="event-data">
                    <pre>{JSON.stringify(getCurrentEvent().data, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event Timeline */}
        {playbackData.length > 0 && (
          <div className="event-timeline">
            <h3>Event Timeline</h3>
            <div className="timeline-container">
              {playbackData.slice(Math.max(0, currentEventIndex - 10), currentEventIndex + 20).map((event, index) => {
                const actualIndex = Math.max(0, currentEventIndex - 10) + index;
                const isCurrent = actualIndex === currentEventIndex;
                const isPast = actualIndex < currentEventIndex;
                
                return (
                  <div
                    key={event.id}
                    className={`timeline-event ${isCurrent ? 'current' : ''} ${isPast ? 'past' : 'future'}`}
                    onClick={() => seekToEvent(actualIndex)}
                  >
                    <div className="timeline-marker">
                      <div 
                        className="timeline-dot"
                        style={{ backgroundColor: getEventTypeColor(event.event_type) }}
                      ></div>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-type">{event.event_type}</div>
                      <div className="timeline-time">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      {event.node_id && (
                        <div className="timeline-node">Node: {event.node_id}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingPlayback;