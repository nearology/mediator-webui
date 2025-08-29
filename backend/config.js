module.exports = {
    HTTP_PORT: process.env.HTTP_PORT || 3001,
    TCP_PORT: process.env.TCP_PORT || 8080,
    DATABASE_PATH: process.env.DATABASE_PATH || './monitor.db',
    MAX_NODES: process.env.MAX_NODES || 100,
    HEARTBEAT_INTERVAL: process.env.HEARTBEAT_INTERVAL || 30000,
    NODE_TIMEOUT: process.env.NODE_TIMEOUT || 60000,
    RECORDING_BUFFER_SIZE: process.env.RECORDING_BUFFER_SIZE || 10000,
    PLAYBACK_SPEED: process.env.PLAYBACK_SPEED || 100, // milliseconds between events
};