import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSocket } from '../contexts/SocketContext';

const StatisticsDashboard = ({ compact = false }) => {
  const { statistics, nodes, tokenStatus, isConnected } = useSocket();
  const [timeRange, setTimeRange] = useState('1h');
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('bandwidth');

  // Update historical data
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && statistics) {
        const timestamp = new Date();
        const newDataPoint = {
          time: timestamp.toISOString(),
          timestamp: timestamp.getTime(),
          totalBandwidth: statistics.totalBandwidth,
          activeNodes: statistics.activeNodes,
          tokenCirculations: statistics.tokenCirculations,
          messagesRelayed: statistics.messagesRelayed,
          networkEfficiency: statistics.networkEfficiency,
          dfsCompletionRate: statistics.dfsCompletionRate,
          averageTokenHoldTime: statistics.averageTokenHoldTime
        };

        setHistoricalData(prevData => {
          const updated = [...prevData, newDataPoint];
          // Keep data based on time range
          const cutoff = timestamp.getTime() - getTimeRangeMs(timeRange);
          return updated.filter(point => point.timestamp > cutoff);
        });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected, statistics, timeRange]);

  const getTimeRangeMs = (range) => {
    switch (range) {
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getNodeStatusDistribution = () => {
    const statusCounts = nodes.reduce((acc, node) => {
      acc[node.status] = (acc[node.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: getStatusColor(status)
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTopPerformers = () => {
    return nodes
      .filter(node => node.bytesSent !== undefined)
      .sort((a, b) => (b.bytesSent + b.bytesReceived) - (a.bytesSent + a.bytesReceived))
      .slice(0, 5)
      .map(node => ({
        nodeId: node.nodeId,
        totalBytes: node.bytesSent + node.bytesReceived,
        bytesSent: node.bytesSent,
        bytesReceived: node.bytesReceived,
        messagesRelayed: node.messagesRelayed
      }));
  };

  if (compact) {
    return (
      <div className="statistics-dashboard compact">
        <div className="stats-grid compact">
          <StatCard
            title="Active Nodes"
            value={`${statistics.activeNodes}/${statistics.totalNodes}`}
            icon="🟢"
            change={null}
          />
          <StatCard
            title="Token Circulation"
            value={statistics.tokenCirculations}
            icon="🔄"
            change={null}
          />
          <StatCard
            title="Total Bandwidth"
            value={formatBytes(statistics.totalBandwidth)}
            icon="📊"
            change={null}
          />
          <StatCard
            title="Network Efficiency"
            value={`${statistics.networkEfficiency.toFixed(1)}%`}
            icon="⚡"
            change={null}
          />
        </div>

        {historicalData.length > 0 && (
          <div className="compact-chart">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={historicalData}>
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric === 'bandwidth' ? 'totalBandwidth' : 'activeNodes'} 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="statistics-dashboard">
      <div className="dashboard-header">
        <h2>Network Statistics</h2>
        <div className="dashboard-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-select"
          >
            <option value="bandwidth">Bandwidth</option>
            <option value="nodes">Active Nodes</option>
            <option value="efficiency">Network Efficiency</option>
            <option value="tokens">Token Circulation</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <StatCard
          title="Total Nodes"
          value={statistics.totalNodes}
          icon="🌐"
          subtitle={`${statistics.activeNodes} active`}
        />
        <StatCard
          title="Token Circulations"
          value={statistics.tokenCirculations}
          icon="🔄"
          subtitle={`Current holder: ${tokenStatus.currentHolder || 'None'}`}
        />
        <StatCard
          title="Total Bandwidth"
          value={formatBytes(statistics.totalBandwidth)}
          icon="📊"
          subtitle="Sent + Received"
        />
        <StatCard
          title="Messages Relayed"
          value={statistics.messagesRelayed}
          icon="📨"
          subtitle="Total network messages"
        />
        <StatCard
          title="Network Efficiency"
          value={`${statistics.networkEfficiency.toFixed(1)}%`}
          icon="⚡"
          subtitle="Message relay efficiency"
        />
        <StatCard
          title="DFS Completion"
          value={`${statistics.dfsCompletionRate.toFixed(1)}%`}
          icon="🔍"
          subtitle="Traversal coverage"
        />
        <StatCard
          title="Avg Token Hold"
          value={`${statistics.averageTokenHoldTime.toFixed(1)}ms`}
          icon="⏱️"
          subtitle="Token hold duration"
        />
        <StatCard
          title="Current Phase"
          value={tokenStatus.phase}
          icon="🔄"
          subtitle={`Depth: ${tokenStatus.traversalDepth}`}
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Main Time Series Chart */}
        <div className="chart-container large">
          <h3>Network Performance Over Time</h3>
          {historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  labelFormatter={formatTime}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.375rem'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalBandwidth"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Bandwidth (bytes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No historical data available</div>
          )}
        </div>

        <div className="chart-row">
          {/* Node Status Distribution */}
          <div className="chart-container">
            <h3>Node Status Distribution</h3>
            {nodes.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={getNodeStatusDistribution()}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {getNodeStatusDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No node data available</div>
            )}
          </div>

          {/* Top Performers */}
          <div className="chart-container">
            <h3>Top Performing Nodes</h3>
            {getTopPerformers().length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getTopPerformers()} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis 
                    type="category" 
                    dataKey="nodeId" 
                    stroke="#9ca3af"
                    width={60}
                  />
                  <Tooltip 
                    formatter={(value) => formatBytes(value)}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Bar 
                    dataKey="totalBytes" 
                    fill="#10b981"
                    name="Total Bytes"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No performance data available</div>
            )}
          </div>
        </div>

        {/* Token Flow Analysis */}
        <div className="chart-container">
          <h3>Token Flow Analysis</h3>
          {historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  labelFormatter={formatTime}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.375rem'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="tokenCirculations"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Token Circulations"
                />
                <Line
                  type="monotone"
                  dataKey="averageTokenHoldTime"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Avg Hold Time (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No token flow data available</div>
          )}
        </div>
      </div>

      {/* Detailed Node Table */}
      <div className="node-table-container">
        <h3>Node Performance Details</h3>
        <div className="table-wrapper">
          <table className="node-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Status</th>
                <th>IP:Port</th>
                <th>Neighbors</th>
                <th>Bytes Sent</th>
                <th>Bytes Received</th>
                <th>Messages Relayed</th>
                <th>Token Holds</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map(node => (
                <tr key={node.nodeId} className={node.id === tokenStatus.currentHolder ? 'token-holder-row' : ''}>
                  <td>
                    {node.nodeId}
                    {node.id === tokenStatus.currentHolder && <span className="token-badge">🔗</span>}
                  </td>
                  <td>
                    <span className={`status-badge status-${node.status}`}>
                      {node.status}
                    </span>
                  </td>
                  <td>{node.ip}:{node.port}</td>
                  <td>{node.neighbors?.length || 0}</td>
                  <td>{formatBytes(node.bytesSent || 0)}</td>
                  <td>{formatBytes(node.bytesReceived || 0)}</td>
                  <td>{node.messagesRelayed || 0}</td>
                  <td>{node.tokenHolds || 0}</td>
                  <td>{node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, subtitle, change }) => {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      {change && (
        <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

export default StatisticsDashboard;