#!/bin/bash

# Space Shooter - Linux Startup Script
# Pornește un server HTTP local și deschide jocul în browser

echo "🚀 Pornesc Space Shooter..."
echo ""

# Verifică dacă Python 3 este instalat
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python nu este instalat. Instalează Python pentru a rula serverul."
    exit 1
fi

# Port pentru server
PORT=8000

# Găsește un port liber dacă 8000 este ocupat
while netstat -tuln 2>/dev/null | grep -q ":$PORT "; do
    PORT=$((PORT + 1))
done

echo "📡 Pornesc server HTTP pe portul $PORT..."
echo "🌐 Adresa jocului: http://localhost:$PORT/space_shooter.html"
echo ""
echo "💡 Pentru a opri serverul, apasă Ctrl+C"
echo ""

# Așteaptă 2 secunde și apoi deschide browser-ul
(sleep 2 && xdg-open "http://localhost:$PORT/space_shooter.html" 2>/dev/null || \
 open "http://localhost:$PORT/space_shooter.html" 2>/dev/null || \
 echo "Deschide manual: http://localhost:$PORT/space_shooter.html") &

# Pornește serverul HTTP
$PYTHON_CMD -m http.server $PORT
