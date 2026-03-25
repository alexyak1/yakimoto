#!/bin/bash

# Yakimoto Production Deployment Script
# Zero-downtime: builds new images first, then swaps containers

set -e

SSH_HOST="root@46.62.154.96"

echo "Starting deployment to production..."
echo "=========================================="

ssh $SSH_HOST << 'ENDSSH'
set -e

cd /root/yakimoto

echo "Pulling latest changes from git..."
git pull origin master || {
    echo "Git pull failed!"
    exit 1
}

# Enable BuildKit if available
if docker buildx version > /dev/null 2>&1; then
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
fi

echo "Building new images (containers still running)..."
docker-compose -f docker-compose.prod.yml build --no-cache || {
    echo "Build failed! Old containers still running, no downtime."
    exit 1
}

echo "Build successful. Swapping containers..."
docker-compose -f docker-compose.prod.yml up -d || {
    echo "Failed to start new containers!"
    exit 1
}

echo "Waiting for services to start..."
sleep 5

echo "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo "Cleaning up old images..."
docker image prune -f 2>/dev/null || true

echo ""
echo "Deployment completed successfully!"
echo "Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=10

ENDSSH

echo ""
echo "Done! Site: https://yakimoto.se"
