# Token Ring Network Monitor - Deployment Guide

This guide provides comprehensive instructions for deploying the Token Ring Network Monitoring System in various environments.

## 🚀 Deployment Options

### 1. Development Deployment
For development and testing purposes.

### 2. Production Deployment
For production monitoring systems.

### 3. Docker Deployment
Containerized deployment for scalability.

### 4. Cloud Deployment
AWS, Azure, GCP deployment instructions.

---

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+), macOS 10.15+, Windows 10+
- **Node.js**: 16.x or higher
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 1GB free space
- **Network**: TCP ports 3001, 8080 available

### Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm sqlite3 build-essential

# CentOS/RHEL
sudo yum install nodejs npm sqlite gcc gcc-c++ make

# macOS (with Homebrew)
brew install node sqlite

# Windows
# Download Node.js from https://nodejs.org/
# SQLite included with Node.js sqlite3 package
```

---

## 🛠️ Development Deployment

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd token-ring-monitor

# Install dependencies
npm run install-all

# Start development servers
npm run dev
```

### Manual Setup
```bash
# Backend setup
cd backend
npm install
node server.js

# Frontend setup (new terminal)
cd frontend
npm install
npm start
```

### Configuration
Create `backend/.env`:
```env
NODE_ENV=development
HTTP_PORT=3001
TCP_PORT=8080
DATABASE_PATH=./monitor_dev.db
HEARTBEAT_INTERVAL=30000
```

---

## 🏭 Production Deployment

### 1. System Preparation
```bash
# Create monitoring user
sudo useradd -r -s /bin/false monitor
sudo mkdir -p /opt/token-ring-monitor
sudo chown monitor:monitor /opt/token-ring-monitor

# Create data directory
sudo mkdir -p /var/lib/token-ring-monitor
sudo chown monitor:monitor /var/lib/token-ring-monitor

# Create log directory
sudo mkdir -p /var/log/token-ring-monitor
sudo chown monitor:monitor /var/log/token-ring-monitor
```

### 2. Application Setup
```bash
# Deploy application
sudo -u monitor git clone <repository-url> /opt/token-ring-monitor
cd /opt/token-ring-monitor

# Install dependencies
sudo -u monitor npm run install-all

# Build frontend
sudo -u monitor npm run build
```

### 3. Production Configuration
Create `/opt/token-ring-monitor/backend/.env`:
```env
NODE_ENV=production
HTTP_PORT=3001
TCP_PORT=8080
DATABASE_PATH=/var/lib/token-ring-monitor/monitor.db
LOG_PATH=/var/log/token-ring-monitor
MAX_NODES=100
HEARTBEAT_INTERVAL=30000
NODE_TIMEOUT=60000
```

### 4. Process Management with PM2
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 configuration
sudo -u monitor tee /opt/token-ring-monitor/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'token-ring-monitor',
    script: './backend/server.js',
    cwd: '/opt/token-ring-monitor',
    user: 'monitor',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    log_file: '/var/log/token-ring-monitor/combined.log',
    out_file: '/var/log/token-ring-monitor/out.log',
    error_file: '/var/log/token-ring-monitor/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
EOF

# Start application
sudo -u monitor pm2 start /opt/token-ring-monitor/ecosystem.config.js
sudo -u monitor pm2 save
sudo pm2 startup
```

### 5. Reverse Proxy with Nginx
```bash
# Install Nginx
sudo apt install nginx  # Ubuntu/Debian
sudo yum install nginx  # CentOS/RHEL

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/token-ring-monitor << EOF
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Main application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/token-ring-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8080/tcp    # Node connections
sudo ufw enable

# iptables (CentOS)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### 7. Systemd Service (Alternative to PM2)
Create `/etc/systemd/system/token-ring-monitor.service`:
```ini
[Unit]
Description=Token Ring Network Monitor
After=network.target

[Service]
Type=simple
User=monitor
Group=monitor
WorkingDirectory=/opt/token-ring-monitor/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
Environment=PWD=/opt/token-ring-monitor/backend
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable token-ring-monitor
sudo systemctl start token-ring-monitor
sudo systemctl status token-ring-monitor
```

---

## 🐳 Docker Deployment

### 1. Create Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S monitor -u 1001

# Create data directory
RUN mkdir -p /app/data && chown -R monitor:nodejs /app

USER monitor

EXPOSE 3001 8080

CMD ["node", "server.js"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend Nginx Config** (`frontend/nginx.conf`):
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    server {
        listen 80;
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 2. Docker Compose Setup
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - HTTP_PORT=3001
      - TCP_PORT=8080
      - DATABASE_PATH=/app/data/monitor.db
    volumes:
      - monitor_data:/app/data
      - monitor_logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  monitor_data:
  monitor_logs:
```

### 3. Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale backend if needed
docker-compose up -d --scale backend=2

# Stop services
docker-compose down
```

---

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance Setup
```bash
# Launch EC2 instance (t3.medium recommended)
# Security groups: HTTP (80), HTTPS (443), Custom TCP (8080), SSH (22)

# Connect and setup
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies
sudo apt update
sudo apt install nodejs npm nginx certbot python3-certbot-nginx

# Deploy application (follow production deployment steps above)
```

#### 2. RDS Database (Optional)
```bash
# If using PostgreSQL instead of SQLite
npm install pg
```

Update `backend/database.js` for PostgreSQL support.

#### 3. Load Balancer Setup
```bash
# Create Application Load Balancer
# Target groups for port 3001
# Health check on /api/health
```

### Azure Deployment

#### 1. App Service
```bash
# Create App Service
az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name token-ring-monitor --runtime "NODE|18-lts"

# Configure app settings
az webapp config appsettings set --resource-group myResourceGroup --name token-ring-monitor --settings NODE_ENV=production HTTP_PORT=3001
```

#### 2. Container Deployment
```bash
# Push to Azure Container Registry
az acr build --registry myregistry --image token-ring-monitor .

# Deploy to Container Instances
az container create --resource-group myResourceGroup --name token-ring-monitor --image myregistry.azurecr.io/token-ring-monitor:latest
```

### Google Cloud Platform

#### 1. Compute Engine
```bash
# Create VM instance
gcloud compute instances create token-ring-monitor --image-family=ubuntu-2004-lts --image-project=ubuntu-os-cloud --machine-type=e2-medium

# SSH and deploy
gcloud compute ssh token-ring-monitor
```

#### 2. Cloud Run (Containerized)
```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/token-ring-monitor

# Deploy to Cloud Run
gcloud run deploy --image gcr.io/PROJECT-ID/token-ring-monitor --platform managed
```

---

## 📊 Monitoring & Maintenance

### 1. Health Checks
Add health check endpoint to `backend/server.js`:
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: this.connectedNodes.size
  });
});
```

### 2. Log Management
```bash
# Logrotate configuration
sudo tee /etc/logrotate.d/token-ring-monitor << EOF
/var/log/token-ring-monitor/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Database Maintenance
```bash
# SQLite maintenance script
#!/bin/bash
DB_PATH="/var/lib/token-ring-monitor/monitor.db"

# Vacuum database monthly
sqlite3 "$DB_PATH" "VACUUM;"

# Cleanup old sessions (older than 30 days)
sqlite3 "$DB_PATH" "DELETE FROM recording_sessions WHERE start_time < datetime('now', '-30 days');"
```

### 4. Backup Strategy
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/backup/token-ring-monitor"
DB_PATH="/var/lib/token-ring-monitor/monitor.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/monitor_$DATE.db"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "monitor_*.db" -mtime +7 -delete
```

---

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port
sudo lsof -i :8080
sudo netstat -tulpn | grep :8080

# Kill process if needed
sudo kill -9 <PID>
```

**Permission Denied**
```bash
# Fix file permissions
sudo chown -R monitor:monitor /opt/token-ring-monitor
sudo chmod -R 755 /opt/token-ring-monitor
```

**Database Lock**
```bash
# Check for database locks
sudo lsof /var/lib/token-ring-monitor/monitor.db

# Restart application if locked
sudo systemctl restart token-ring-monitor
```

**Memory Issues**
```bash
# Monitor memory usage
free -h
ps aux --sort=-%mem | head

# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Performance Tuning

**Node.js Optimization**
```javascript
// In server.js
process.env.UV_THREADPOOL_SIZE = 128;
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
```

**Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON network_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_node ON network_events(node_id);
```

**Nginx Optimization**
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## 📈 Scaling

### Horizontal Scaling
```bash
# Multiple backend instances with load balancer
# Use Redis for session sharing if needed
npm install redis
```

### Database Scaling
```bash
# Consider PostgreSQL for larger deployments
# Implement read replicas for heavy read workloads
```

### Monitoring at Scale
```bash
# Use Prometheus + Grafana for metrics
# Implement ELK stack for log analysis
# Consider container orchestration (Kubernetes)
```

---

This deployment guide covers most common scenarios. For specific requirements or issues, please refer to the main README.md or create an issue in the repository.