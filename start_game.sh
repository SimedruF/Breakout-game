#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# ── Function: display controls for a game ──
show_controls() {
    local game="$1"
    echo ""
    echo -e "${CYAN}── Controls: ${BOLD}${game}${NC}${CYAN} ─────────────────────${NC}"
    case "$game" in
        Breakout)
            echo -e "  ${GREEN}← →${NC}  or  ${GREEN}Mouse${NC}   Move paddle"
            echo -e "  ${GREEN}Space${NC}              Launch ball / restart"
            echo -e "  ${GREEN}P${NC}                  Pause"
            echo -e "  ${GREEN}M${NC}                  Toggle sound"
            ;;
        Pong)
            echo -e "  ${GREEN}W${NC} / ${GREEN}S${NC}              Move paddle up / down"
            echo -e "  ${GREEN}Space${NC}              Serve ball / restart"
            echo -e "  ${GREEN}P${NC}                  Pause"
            echo -e "  ${GREEN}M${NC}                  Toggle sound"
            ;;
        "Space Shooter")
            echo -e "  ${GREEN}← → ↑ ↓${NC}  or  ${GREEN}WASD${NC}  or  ${GREEN}Mouse${NC}  Move ship"
            echo -e "  ${GREEN}Space${NC} (hold)        Auto-fire"
            echo -e "  ${GREEN}Space${NC} (press)       Start / restart"
            echo -e "  ${GREEN}P${NC}                   Pause"
            echo -e "  ${GREEN}M${NC}                   Toggle sound"
            ;;
        Tetris)
            echo -e "  ${GREEN}← →${NC}               Move piece left / right"
            echo -e "  ${GREEN}↓${NC}                  Soft drop"
            echo -e "  ${GREEN}Space${NC}              Hard drop"
            echo -e "  ${GREEN}↑${NC} / ${GREEN}X${NC}              Rotate clockwise"
            echo -e "  ${GREEN}Z${NC} / ${GREEN}Ctrl${NC}           Rotate counter-clockwise"
            echo -e "  ${GREEN}C${NC} / ${GREEN}Shift${NC}          Hold piece"
            echo -e "  ${GREEN}P${NC}                  Pause"
            ;;
        "Breakout Ultimate")
            echo -e "  ${GREEN}← →${NC}  or  ${GREEN}Mouse${NC}   Move paddle"
            echo -e "  ${GREEN}Space${NC}              Launch ball / next level / restart"
            echo -e "  ${GREEN}P${NC}                  Pause"
            echo -e "  ${GREEN}M${NC}                  Toggle sound"
            ;;
        Snake)
            echo -e "  ${GREEN}← → ↑ ↓${NC}  or  ${GREEN}WASD${NC}  Move snake"
            echo -e "  ${GREEN}Space${NC}              Start / restart"
            echo -e "  ${GREEN}P${NC}                  Pause"
            echo -e "  ${GREEN}M${NC}                  Toggle sound"
            ;;
        Frogger)
            echo -e "  ${GREEN}← → ↑ ↓${NC}  or  ${GREEN}WASD${NC}  Hop"
            echo -e "  ${GREEN}Space${NC}              Start / restart"
            echo -e "  ${GREEN}P${NC}                  Pause"
            echo -e "  ${GREEN}M${NC}                  Toggle sound"
            ;;
        "Tower Defense")
            echo -e "  ${GREEN}Click${NC}              Place tower on grass"
            echo -e "  ${GREEN}1-4${NC}               Select tower (Arrow / Cannon / Ice / Lightning)"
            echo -e "  ${GREEN}S${NC}                  Sell tower (hover over it)"
            echo -e "  ${GREEN}Space${NC}              Start game / send next wave"
            echo -e "  ${GREEN}P${NC}                  Pause"
            echo -e "  ${GREEN}M${NC}                  Toggle sound"
            ;;
    esac
    echo -e "${CYAN}──────────────────────────────────────${NC}"
}

# ── Function: display controls for all games ──
show_all_controls() {
    show_controls "Breakout"
    show_controls "Pong"
    show_controls "Space Shooter"
    show_controls "Tetris"
    show_controls "Breakout Ultimate"
    show_controls "Snake"
    show_controls "Frogger"
    show_controls "Tower Defense"
    echo ""
}

# ── Banner ──
clear
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}     ${BOLD}🎮  Arcade Games Launcher  🎮${NC}     ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── How it works ──
echo -e "${BLUE}How it works:${NC}"
echo -e "  ${DIM}1.${NC} Pick a game from the menu below"
echo -e "  ${DIM}2.${NC} A local Python server starts on a free port"
echo -e "  ${DIM}3.${NC} The game opens automatically in your browser"
echo -e "  ${DIM}4.${NC} When you're done, press ${YELLOW}Ctrl+C${NC} to stop the server"
echo ""
echo -e "${BLUE}Requirements:${NC} Python 3 · Modern web browser (Chrome, Firefox, Edge)"
echo ""

# ── Check Python ──
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo -e "${RED}✗ Error: Python is not installed!${NC}"
    echo -e "  Install Python 3 to run the local server."
    echo -e "  ${DIM}Ubuntu/Debian: sudo apt install python3${NC}"
    echo -e "  ${DIM}Fedora:        sudo dnf install python3${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Python found: $PYTHON_CMD"
echo ""

# ── Game selection menu ──
show_menu() {
    echo -e "${BLUE}═══ Choose a game ══════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC} ${BOLD}Breakout${NC}           – Smash bricks with the ball and paddle"
    echo -e "  ${GREEN}2)${NC} ${BOLD}Pong${NC}               – Classic paddle game (you vs. AI)"
    echo -e "  ${GREEN}3)${NC} ${BOLD}Space Shooter${NC}      – Destroy enemy ships and collect power-ups"
    echo -e "  ${GREEN}4)${NC} ${BOLD}Tetris${NC}             – Arrange falling blocks to clear lines"
    echo -e "  ${GREEN}5)${NC} ${BOLD}Breakout Ultimate${NC}  – Breakout with levels, power-ups & combos"
    echo -e "  ${GREEN}6)${NC} ${BOLD}Snake${NC}              – Eat food, grow longer, don't hit yourself"
    echo -e "  ${GREEN}7)${NC} ${BOLD}Frogger${NC}            – Cross roads and rivers to reach safety"
    echo -e "  ${GREEN}8)${NC} ${BOLD}Tower Defense${NC}      – Place towers to stop waves of enemies"
    echo ""
    echo -e "  ${CYAN}0)${NC} ${BOLD}Game Collection${NC}    – Open the full games page in browser"
    echo -e "  ${YELLOW}9)${NC} ${DIM}Help – Show controls for all games${NC}"
    echo -e "  ${RED}10)${NC} ${DIM}Exit${NC}"
    echo ""
}

while true; do
    show_menu
    read -p "Enter your choice (0-10): " choice

    case $choice in
        0)
            GAME_FILE="index.html"
            GAME_NAME="Game Collection"
            break
            ;;
        1)
            GAME_FILE="breakout.html"
            GAME_NAME="Breakout"
            break
            ;;
        2)
            GAME_FILE="pong.html"
            GAME_NAME="Pong"
            break
            ;;
        3)
            GAME_FILE="space_shooter.html"
            GAME_NAME="Space Shooter"
            break
            ;;
        4)
            GAME_FILE="tetris.html"
            GAME_NAME="Tetris"
            break
            ;;
        5)
            GAME_FILE="breakout_next.html"
            GAME_NAME="Breakout Ultimate"
            break
            ;;
        6)
            GAME_FILE="snake.html"
            GAME_NAME="Snake"
            break
            ;;
        7)
            GAME_FILE="frogger.html"
            GAME_NAME="Frogger"
            break
            ;;
        8)
            GAME_FILE="tower_defense.html"
            GAME_NAME="Tower Defense"
            break
            ;;
        9)
            show_all_controls
            echo -e "${DIM}Press Enter to return to the menu...${NC}"
            read -r
            clear
            echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
            echo -e "${CYAN}║${NC}     ${BOLD}🎮  Arcade Games Launcher  🎮${NC}     ${CYAN}║${NC}"
            echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
            echo ""
            ;;
        10)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}✗ Invalid choice! Enter a number between 0 and 10.${NC}"
            echo ""
            ;;
    esac
done

echo ""
echo -e "${GREEN}✓${NC} Selected: ${BOLD}$GAME_NAME${NC}"

# Display controls for the selected game
show_controls "$GAME_NAME"
echo ""

# ── Find a free port ──
PORT=8000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo -e "${YELLOW}⚠${NC} Port $PORT is in use, trying next..."
    PORT=$((PORT + 1))
done

echo -e "${GREEN}✓${NC} Using port: $PORT"
echo ""
echo -e "Starting HTTP server..."
echo ""

# ── Start the server ──
$PYTHON_CMD -m http.server $PORT > /dev/null 2>&1 &
SERVER_PID=$!

sleep 1

# ── Open browser ──
URL="http://localhost:$PORT/$GAME_FILE"
echo -e "${GREEN}✓${NC} Opening ${BOLD}$GAME_NAME${NC} in browser..."
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "$URL" 2>/dev/null
elif command -v open &> /dev/null; then
    open "$URL"
elif command -v start &> /dev/null; then
    start "$URL"
else
    echo -e "${YELLOW}Could not open browser automatically.${NC}"
    echo -e "Please open this URL manually: ${BOLD}$URL${NC}"
fi

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}      ${GREEN}Server is running!${NC}              ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Game: ${BOLD}$GAME_NAME${NC}"
echo -e "  URL:  ${BOLD}$URL${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop the server"
echo ""

# ── Clean shutdown on Ctrl+C ──
trap "echo ''; echo -e '${YELLOW}Stopping server...${NC}'; kill $SERVER_PID 2>/dev/null; echo -e '${GREEN}Server stopped. Goodbye!${NC}'; exit 0" INT

wait $SERVER_PID
