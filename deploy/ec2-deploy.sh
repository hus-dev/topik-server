#!/bin/bash

# AWS EC2 Deployment Script for TOPIK Server
# This script should be run on your EC2 instance after copying the project

set -e

echo "🚀 Starting TOPIK Server deployment on EC2..."

# Check if .env.ec2 exists
if [ ! -f .env.ec2 ]; then
    echo "⚠️  .env.ec2 not found. Copying from .env.ec2.example..."
    cp .env.ec2.example .env.ec2
    echo "✏️  Please edit .env.ec2 with your production values before continuing."
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo yum update -y || sudo apt update -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed. Please log out and back in, or run: newgrp docker"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
fi

# Stop existing containers if running
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.ec2.yml down || true

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose -f docker-compose.ec2.yml up -d --build

echo "✅ TOPIK Server deployment complete!"
echo ""
echo "📝 Useful commands:"
echo "  - View logs:        docker compose -f docker-compose.ec2.yml logs -f"
echo "  - Stop services:    docker compose -f docker-compose.ec2.yml down"
echo "  - Restart services: docker compose -f docker-compose.ec2.yml restart"
echo ""
echo "🌐 API will be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"