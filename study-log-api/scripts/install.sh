#!/bin/bash

# StudyLog API Installation Script for Mac Mini

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.studylog.api.plist"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"
LOG_DIR="$HOME/.studylog/logs"

echo "StudyLog API Installer"
echo "======================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Install via: brew install node"
    exit 1
fi

NODE_PATH=$(which node)
echo "Node.js found at: $NODE_PATH"

# Create log directory
mkdir -p "$LOG_DIR"
echo "Log directory: $LOG_DIR"

# Install dependencies
echo ""
echo "Installing dependencies..."
cd "$PROJECT_DIR"
npm install

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build

# Update plist with correct node path
echo ""
echo "Configuring launchd service..."
sed "s|/usr/local/bin/node|$NODE_PATH|g" "$PLIST_SRC" > "$PLIST_DST"

# Unload if already loaded
launchctl unload "$PLIST_DST" 2>/dev/null || true

# Load the service
launchctl load "$PLIST_DST"

echo ""
echo "Installation complete!"
echo ""
echo "Service status:"
launchctl list | grep studylog || echo "Service not running yet"

echo ""
echo "To check logs:"
echo "  tail -f $LOG_DIR/api.log"
echo ""
echo "To test API:"
echo "  curl http://localhost:3100/api/health"
echo ""
echo "To uninstall:"
echo "  launchctl unload $PLIST_DST"
echo "  rm $PLIST_DST"
