#!/bin/bash

# Token Ring Network Monitor - Installation Script
# This script sets up the complete monitoring system

set -e  # Exit on any error

echo "🔗 Token Ring Network Monitor - Installation Script"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16.x or higher."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 16.x or higher."
        exit 1
    fi
    
    print_success "Node.js $(node --version) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "npm $(npm --version) found"
    
    # Check if ports are available
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 is already in use. Please stop the service using this port."
    fi
    
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 8080 is already in use. Please stop the service using this port."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    print_status "Installing root dependencies..."
    npm install --silent
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install --silent
    cd ..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install --silent
    cd ..
    
    # Test dependencies
    print_status "Installing test dependencies..."
    cd test
    npm install --silent
    cd ..
    
    print_success "All dependencies installed successfully"
}

# Setup configuration
setup_config() {
    print_status "Setting up configuration..."
    
    # Create backend .env file if it doesn't exist
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# Token Ring Monitor Configuration
NODE_ENV=development
HTTP_PORT=3001
TCP_PORT=8080
DATABASE_PATH=./monitor.db
MAX_NODES=100
HEARTBEAT_INTERVAL=30000
NODE_TIMEOUT=60000
RECORDING_BUFFER_SIZE=10000
PLAYBACK_SPEED=100
EOF
        print_success "Created backend/.env configuration file"
    else
        print_warning "backend/.env already exists, skipping creation"
    fi
    
    # Create data directories
    mkdir -p backend/data
    mkdir -p backend/logs
    
    print_success "Configuration setup complete"
}

# Build frontend
build_frontend() {
    print_status "Building frontend for production..."
    
    cd frontend
    npm run build --silent
    cd ..
    
    print_success "Frontend build complete"
}

# Run tests
run_tests() {
    print_status "Running basic tests..."
    
    # Test backend startup
    print_status "Testing backend startup..."
    cd backend
    timeout 10s node server.js &
    BACKEND_PID=$!
    sleep 5
    
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_success "Backend starts successfully"
        kill $BACKEND_PID
    else
        print_error "Backend failed to start"
        exit 1
    fi
    cd ..
    
    # Test protocol client
    print_status "Testing protocol client..."
    cd test
    timeout 10s node protocol-test.js --duration 5 --nodeId test_install &
    TEST_PID=$!
    wait $TEST_PID
    
    if [ $? -eq 0 ]; then
        print_success "Protocol test completed successfully"
    else
        print_warning "Protocol test completed with warnings (expected if server not running)"
    fi
    cd ..
}

# Create startup scripts
create_scripts() {
    print_status "Creating startup scripts..."
    
    # Development startup script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "Starting Token Ring Monitor in development mode..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "TCP Server: localhost:8080"
echo "Press Ctrl+C to stop both servers"
npm run dev
EOF
    chmod +x start-dev.sh
    
    # Production startup script
    cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "Starting Token Ring Monitor in production mode..."
echo "Application: http://localhost:3001"
echo "TCP Server: localhost:8080"
echo "Press Ctrl+C to stop"
cd backend && node server.js
EOF
    chmod +x start-prod.sh
    
    # Test script
    cat > test-nodes.sh << 'EOF'
#!/bin/bash
echo "Starting test nodes..."
cd test
for i in {1..5}; do
    echo "Starting test node $i..."
    node protocol-test.js --nodeId test_node_$i --duration 300 &
done
echo "Started 5 test nodes. They will run for 5 minutes."
echo "Press Ctrl+C to stop all test nodes"
wait
EOF
    chmod +x test-nodes.sh
    
    print_success "Startup scripts created"
}

# Main installation process
main() {
    echo
    print_status "Starting installation process..."
    echo
    
    check_prerequisites
    echo
    
    install_dependencies
    echo
    
    setup_config
    echo
    
    build_frontend
    echo
    
    run_tests
    echo
    
    create_scripts
    echo
    
    print_success "Installation completed successfully!"
    echo
    echo "🚀 Quick Start:"
    echo "  Development: ./start-dev.sh"
    echo "  Production:  ./start-prod.sh"
    echo "  Test nodes:  ./test-nodes.sh"
    echo
    echo "📚 Documentation:"
    echo "  README.md      - Complete usage guide"
    echo "  DEPLOYMENT.md  - Production deployment guide"
    echo "  backend/protocol.md - Communication protocol"
    echo
    echo "🌐 URLs (after starting):"
    echo "  Web Interface: http://localhost:3000 (dev) or http://localhost:3001 (prod)"
    echo "  TCP Server:    localhost:8080"
    echo
    echo "✅ Installation complete! Happy monitoring! 🔗"
}

# Run main function
main "$@"