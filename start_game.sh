#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}     Arcade Games Launcher${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check if Python is installed
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo -e "${RED}Error: Python is not installed!${NC}"
    echo "Please install Python 3 to run the local server."
    exit 1
fi

echo -e "${GREEN}✓${NC} Python found: $PYTHON_CMD"
echo ""

# Game selection menu
echo -e "${BLUE}Select a game to play:${NC}"
echo -e "${GREEN}1)${NC} Breakout (Classic brick-breaking)"
echo -e "${GREEN}2)${NC} Pong (Two-player paddle game)"
echo -e "${GREEN}3)${NC} Space Shooter (Vertical scrolling shooter)"
echo -e "${GREEN}4)${NC} Tetris (Classic falling blocks)"
echo -e "${GREEN}5)${NC} Breakout Ultimate (With power-ups & combos)"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        GAME_FILE="index.html"
        GAME_NAME="Breakout"
        ;;
    2)
        GAME_FILE="pong.html"
        GAME_NAME="Pong"
        ;;
    3)
        GAME_FILE="space_shooter.html"
        GAME_NAME="Space Shooter"
        ;;
    4)
        GAME_FILE="tetris.html"
        GAME_NAME="Tetris"
        ;;
    5)
        GAME_FILE="breakout_next.html"
        GAME_NAME="Breakout Ultimate"
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓${NC} Selected: $GAME_NAME"

# Find an available port
PORT=8000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo -e "${YELLOW}⚠${NC} Port $PORT is in use, trying next port..."
    PORT=$((PORT + 1))
done

echo -e "${GREEN}✓${NC} Using port: $PORT"
echo ""
echo "Starting HTTP server..."
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the server in the background
$PYTHON_CMD -m http.server $PORT > /dev/null 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 1

# Open browser
URL="http://localhost:$PORT/$GAME_FILE"
echo -e "${GREEN}✓${NC} Opening $GAME_NAME in browser..."
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null
elif command -v open &> /dev/null; then
    open "$URL"
elif command -v start &> /dev/null; then
    start "$URL"
else
    echo -e "${YELLOW}Could not open browser automatically.${NC}"
    echo "Please open this URL manually: $URL"
fi

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   Server is running!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "Game: $GAME_NAME"
echo "URL: $URL"
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for Ctrl+C
trap "echo ''; echo -e '${YELLOW}Stopping server...${NC}'; kill $SERVER_PID 2>/dev/null; echo -e '${GREEN}Server stopped.${NC}'; exit 0" INT

wait $SERVER_PID
