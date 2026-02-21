@echo off
REM Space Shooter - Windows Startup Script
REM Porneste un server HTTP local si deschide jocul in browser

echo.
echo ========================================
echo    SPACE SHOOTER - Starting Game
echo ========================================
echo.

REM Verifica daca Python este instalat
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python nu este instalat!
    echo.
    echo Descarca si instaleaza Python de la:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Port pentru server
set PORT=8000

echo [INFO] Pornesc server HTTP pe portul %PORT%...
echo [INFO] Adresa jocului: http://localhost:%PORT%/space_shooter.html
echo.
echo [TIP] Pentru a opri serverul, inchide aceasta fereastra sau apasa Ctrl+C
echo.

REM Asteapta 2 secunde si deschide browser-ul
timeout /t 2 /nobreak >nul
start http://localhost:%PORT%/space_shooter.html

REM Porneste serverul HTTP
python -m http.server %PORT%
