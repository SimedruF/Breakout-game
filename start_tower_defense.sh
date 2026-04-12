#!/bin/bash
cd "$(dirname "$0")"
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()' 2>/dev/null || echo 8000)
echo "Starting Tower Defense on http://localhost:$PORT/tower_defense.html"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" &
sleep 1
xdg-open "http://localhost:$PORT/tower_defense.html" 2>/dev/null || open "http://localhost:$PORT/tower_defense.html" 2>/dev/null
wait
