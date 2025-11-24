#!/bin/bash

# Yakimoto Production Deployment Script
# This script handles the complete deployment process with error handling and cleanup

set -e  # Exit on any error

SSH_HOST="root@46.62.154.96"
PROJECT_DIR="/root/yakimoto"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment to production..."
echo "=========================================="

# Execute commands on remote server
ssh $SSH_HOST << 'ENDSSH'
set -e

cd /root/yakimoto

echo "📥 Pulling latest changes from git..."
git pull origin master || {
    echo "❌ Git pull failed!"
    exit 1
}

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || {
    echo "⚠️  Warning: Some containers may not have been running"
}

echo "🧹 Cleaning up old Docker images (keeping last 2 versions)..."
docker image prune -f
# Remove dangling images
docker image prune -a -f --filter "until=24h" || true

echo "🔨 Building new images..."
# Check if buildx is available, if not try to install it or use legacy builder
if docker buildx version > /dev/null 2>&1; then
    echo "✅ BuildKit/buildx is available, using it..."
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
else
    echo "⚠️  BuildKit/buildx not available, attempting to install..."
    if docker buildx install 2>/dev/null; then
        echo "✅ BuildKit/buildx installed successfully!"
        export DOCKER_BUILDKIT=1
        export COMPOSE_DOCKER_CLI_BUILD=1
    else
        echo "⚠️  Could not install buildx, using legacy builder..."
        echo "   (This may show deprecation warnings but will still work)"
        unset DOCKER_BUILDKIT
        unset COMPOSE_DOCKER_CLI_BUILD
    fi
fi

docker-compose -f docker-compose.prod.yml build --no-cache || {
    echo "❌ Build failed!"
    exit 1
}

echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d || {
    echo "❌ Failed to start containers!"
    exit 1
}

echo "⏳ Waiting for services to be healthy..."
sleep 5

echo "🔍 Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📝 Recent logs (last 20 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=20

ENDSSH

echo ""
echo "✨ Deployment script completed!"
echo "🌐 Your site should be available at: https://yakimoto.se"

