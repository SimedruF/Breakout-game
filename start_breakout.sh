#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "${CYAN}========================================${NC}"
echo "${CYAN}       Breakout Launcher${NC}"
echo "${CYAN}========================================${NC}"
echo ""

# Check if Python is installed
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "${RED}Error: Python is not installed!${NC}"
    echo "Please install Python 3 to run the local server."
    exit 1
fi

echo "${GREEN}✓${NC} Python found: $PYTHON_CMD"

# Find an available port
PORT=8000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo "${YELLOW}⚠${NC} Port $PORT is in use, trying next port..."
    PORT=$((PORT + 1))
done

echo "${GREEN}✓${NC} Using port: $PORT"
echo ""
echo "Starting HTTP server..."
echo "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the server in the background
$PYTHON_CMD -m http.server $PORT > /dev/null 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 1

# Open browser
URL="http://localhost:$PORT/index.html"
echo "${GREEN}✓${NC} Opening Breakout in browser..."
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null
elif command -v open &> /dev/null; then
    open "$URL"
elif command -v start &> /dev/null; then
    start "$URL"
else
    echo "${YELLOW}Could not open browser automatically.${NC}"
    echo "Please open this URL manually: $URL"
fi

echo "${CYAN}========================================${NC}"
echo "${CYAN}   Server is running!${NC}"
echo "${CYAN}========================================${NC}"
echo ""
echo "Game: Breakout"
echo "URL: $URL"
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for Ctrl+C
trap "echo ''; echo '${YELLOW}Stopping server...${NC}'; kill $SERVER_PID 2>/dev/null; echo '${GREEN}Server stopped.${NC}'; exit 0" INT

wait $SERVER_PID
