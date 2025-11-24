#!/bin/sh
set -e

# Fix permissions for mounted volumes
# This runs as root before switching to appuser
if [ -d "/app/app/data" ]; then
    chown -R appuser:appuser /app/app/data || true
    chmod -R 755 /app/app/data || true
fi

if [ -d "/app/app/uploads" ]; then
    chown -R appuser:appuser /app/app/uploads || true
    chmod -R 755 /app/app/uploads || true
fi

# Ensure directories exist with correct permissions
mkdir -p /app/app/data /app/app/uploads
chown -R appuser:appuser /app/app/data /app/app/uploads
chmod -R 755 /app/app/data /app/app/uploads

# Switch to non-root user and run the application
# "$@" passes all arguments correctly
exec su appuser -c "exec \"\$@\"" -- "$@"

