import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSocket } from '../contexts/SocketContext';

const NetworkVisualization = () => {
  const svgRef = useRef();
  const containerRef = useRef();
  const { nodes, topology, tokenStatus, isConnected } = useSocket();
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 20, height: height - 20 });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 visualization effect
  useEffect(() => {
    if (!topology.nodes || topology.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous visualization

    const { width, height } = dimensions;
    
    // Set up SVG
    svg.attr('width', width).attr('height', height);

    // Create main group for zoom/pan
    const g = svg.append('g').attr('class', 'main-group');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(topology.nodes)
      .force('link', d3.forceLink(topology.edges).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Add grid pattern
    const defs = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 50)
      .attr('height', 50)
      .attr('patternUnits', 'userSpaceOnUse');

    pattern.append('path')
      .attr('d', 'M 50 0 L 0 0 0 50')
      .attr('fill', 'none')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    // Add background
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#grid)')
      .attr('opacity', 0.1);

    // Create edges
    const edges = g.selectAll('.edge')
      .data(topology.edges)
      .enter().append('line')
      .attr('class', 'edge')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Create token path edges (for animation)
    const tokenPaths = g.selectAll('.token-path')
      .data(topology.tokenPath || [])
      .enter().append('line')
      .attr('class', 'token-path')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 4)
      .attr('opacity', 0.8)
      .attr('stroke-dasharray', '10,5');

    // Animate token paths
    tokenPaths.each(function() {
      d3.select(this)
        .attr('stroke-dashoffset', 15)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', -15)
        .on('end', function() {
          d3.select(this).attr('stroke-dashoffset', 15);
        });
    });

    // Create node groups
    const nodeGroups = g.selectAll('.node-group')
      .data(topology.nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer');

    // Add node circles
    const nodeCircles = nodeGroups.append('circle')
      .attr('class', 'node')
      .attr('r', 20)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => d.id === tokenStatus.currentHolder ? '#22c55e' : '#475569')
      .attr('stroke-width', d => d.id === tokenStatus.currentHolder ? 4 : 2);

    // Add token hold timer for current token holder
    nodeGroups.each(function(d) {
      if (d.id === tokenStatus.currentHolder) {
        const timerCircle = d3.select(this).append('circle')
          .attr('class', 'token-timer')
          .attr('r', 25)
          .attr('fill', 'none')
          .attr('stroke', '#22c55e')
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0.8);

        // Animate timer countdown
        const circumference = 2 * Math.PI * 25;
        timerCircle
          .attr('stroke-dasharray', circumference)
          .attr('stroke-dashoffset', 0)
          .transition()
          .duration(5000) // 5 second token hold time
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', circumference);
      }
    });

    // Add node labels
    nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#e5e7eb')
      .text(d => d.id);

    // Add status indicators
    nodeGroups.append('circle')
      .attr('class', 'status-indicator')
      .attr('r', 4)
      .attr('cx', 15)
      .attr('cy', -15)
      .attr('fill', d => getStatusColor(d.status));

    // Add DFS phase indicator for current token holder
    nodeGroups.each(function(d) {
      if (d.id === tokenStatus.currentHolder && tokenStatus.phase) {
        d3.select(this).append('text')
          .attr('class', 'dfs-phase')
          .attr('x', 0)
          .attr('y', 35)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('fill', '#22c55e')
          .text(tokenStatus.phase);
      }
    });

    // Add mouse events
    nodeGroups
      .on('mouseover', (event, d) => {
        // Highlight node
        d3.select(event.currentTarget).select('.node')
          .transition().duration(200)
          .attr('r', 25)
          .attr('stroke-width', 3);

        // Show tooltip
        const tooltipContent = createTooltipContent(d);
        setTooltip({
          visible: true,
          x: event.pageX + 10,
          y: event.pageY - 10,
          content: tooltipContent
        });
      })
      .on('mouseout', (event, d) => {
        // Reset node
        d3.select(event.currentTarget).select('.node')
          .transition().duration(200)
          .attr('r', 20)
          .attr('stroke-width', d.id === tokenStatus.currentHolder ? 4 : 2);

        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      })
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      edges
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      tokenPaths
        .attr('x1', d => {
          const sourceNode = topology.nodes.find(n => n.id === d.from);
          return sourceNode ? sourceNode.x : 0;
        })
        .attr('y1', d => {
          const sourceNode = topology.nodes.find(n => n.id === d.from);
          return sourceNode ? sourceNode.y : 0;
        })
        .attr('x2', d => {
          const targetNode = topology.nodes.find(n => n.id === d.to);
          return targetNode ? targetNode.x : 0;
        })
        .attr('y2', d => {
          const targetNode = topology.nodes.find(n => n.id === d.to);
          return targetNode ? targetNode.y : 0;
        });

      nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add drag behavior
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroups.call(drag);

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, 20)`);

    const legendData = [
      { color: '#10b981', label: 'Active Node' },
      { color: '#ef4444', label: 'Inactive Node' },
      { color: '#22c55e', label: 'Token Holder', stroke: true },
      { color: '#f59e0b', label: 'Warning' }
    ];

    const legendItems = legend.selectAll('.legend-item')
      .data(legendData)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 25})`);

    legendItems.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.stroke ? '#22c55e' : 'none')
      .attr('stroke-width', d => d.stroke ? 2 : 0);

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', '#e5e7eb')
      .text(d => d.label);

    // Cleanup
    return () => {
      simulation.stop();
    };

  }, [topology, tokenStatus, dimensions]);

  const getNodeColor = (node) => {
    if (node.id === tokenStatus.currentHolder) {
      return '#22c55e'; // Green for token holder
    }
    switch (node.status) {
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const createTooltipContent = (node) => {
    return (
      <div className="tooltip-content">
        <div className="tooltip-title">{node.id}</div>
        <div>Status: {node.status}</div>
        <div>IP: {node.ip}:{node.port}</div>
        <div>Neighbors: {node.neighbors?.length || 0}</div>
        {node.id === tokenStatus.currentHolder && (
          <div className="token-info">
            <div>🔗 Token Holder</div>
            <div>Sequence: {tokenStatus.sequence}</div>
            <div>Phase: {tokenStatus.phase}</div>
          </div>
        )}
        {node.bytesSent !== undefined && (
          <div className="stats-info">
            <div>Sent: {formatBytes(node.bytesSent)}</div>
            <div>Received: {formatBytes(node.bytesReceived)}</div>
            <div>Relayed: {node.messagesRelayed}</div>
          </div>
        )}
      </div>
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="network-visualization" ref={containerRef}>
      {!isConnected && (
        <div className="disconnected-overlay">
          <div className="disconnected-message">
            <div className="disconnected-icon">🔌</div>
            <div>Not Connected to Monitoring Server</div>
            <div className="text-sm text-gray-400">
              Waiting for connection...
            </div>
          </div>
        </div>
      )}

      {isConnected && (!nodes || nodes.length === 0) && (
        <div className="no-nodes-overlay">
          <div className="no-nodes-message">
            <div className="no-nodes-icon">🔍</div>
            <div>No Network Nodes Detected</div>
            <div className="text-sm text-gray-400">
              Connect nodes to the monitoring server on TCP port 8080
            </div>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="network-svg"></svg>

      {tooltip.visible && (
        <div
          className="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            position: 'fixed',
            zIndex: 1000
          }}
        >
          {tooltip.content}
        </div>
      )}

      {selectedNode && (
        <NodeDetailsModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      <div className="visualization-controls">
        <button
          className="control-button"
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(750).call(
              d3.zoom().transform,
              d3.zoomIdentity
            );
          }}
          title="Reset Zoom"
        >
          🔍
        </button>
        <button
          className="control-button"
          onClick={() => {
            // Force restart simulation
            const svg = d3.select(svgRef.current);
            const simulation = svg.select('.main-group').datum();
            if (simulation) simulation.alpha(0.3).restart();
          }}
          title="Restart Layout"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

// Node details modal component
const NodeDetailsModal = ({ node, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Node Details: {node.id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="node-details">
            <div className="detail-group">
              <h4>Connection Info</h4>
              <div>IP Address: {node.ip}</div>
              <div>Port: {node.port}</div>
              <div>Status: <span className={`status-${node.status}`}>{node.status}</span></div>
              <div>Last Seen: {new Date(node.lastSeen).toLocaleString()}</div>
            </div>
            
            <div className="detail-group">
              <h4>Network Topology</h4>
              <div>Neighbors: {node.neighbors?.length || 0}</div>
              {node.neighbors && node.neighbors.length > 0 && (
                <div className="neighbors-list">
                  {node.neighbors.map(neighbor => (
                    <span key={neighbor} className="neighbor-tag">{neighbor}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-group">
              <h4>Statistics</h4>
              <div>Bytes Sent: {node.bytesSent || 0}</div>
              <div>Bytes Received: {node.bytesReceived || 0}</div>
              <div>Messages Relayed: {node.messagesRelayed || 0}</div>
              <div>Token Holds: {node.tokenHolds || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkVisualization;