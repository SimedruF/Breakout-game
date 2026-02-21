@echo off
setlocal enabledelayedexpansion

color 0B
echo ========================================
echo      Arcade Games Launcher
echo ========================================
echo.

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
) else (
    where python3 >nul 2>nul
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python3
    ) else (
        color 0C
        echo Error: Python is not installed!
        echo Please install Python 3 to run the local server.
        pause
        exit /b 1
    )
)

echo [OK] Python found: %PYTHON_CMD%
echo.

REM Game selection menu
color 0E
echo Select a game to play:
echo [1] Breakout (Classic brick-breaking)
echo [2] Pong (Two-player paddle game)
echo [3] Space Shooter (Vertical scrolling shooter)
echo [4] Tetris (Classic falling blocks)
echo [5] Breakout Ultimate (With power-ups ^& combos)
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    set GAME_FILE=index.html
    set GAME_NAME=Breakout
) else if "%choice%"=="2" (
    set GAME_FILE=pong.html
    set GAME_NAME=Pong
) else if "%choice%"=="3" (
    set GAME_FILE=space_shooter.html
    set GAME_NAME=Space Shooter
) else if "%choice%"=="4" (
    set GAME_FILE=tetris.html
    set GAME_NAME=Tetris
) else if "%choice%"=="5" (
    set GAME_FILE=breakout_next.html
    set GAME_NAME=Breakout Ultimate
) else (
    color 0C
    echo Invalid choice. Exiting.
    pause
    exit /b 1
)

echo.
color 0A
echo [OK] Selected: %GAME_NAME%

REM Find available port
set PORT=8000
:check_port
netstat -an | find ":%PORT% " | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [!] Port %PORT% is in use, trying next port...
    set /a PORT+=1
    goto check_port
)

echo [OK] Using port: %PORT%
echo.
echo Starting HTTP server...
echo Press Ctrl+C to stop the server
echo.

REM Start server and open browser
start /B %PYTHON_CMD% -m http.server %PORT% >nul 2>&1

REM Wait for server to start
timeout /t 2 /nobreak >nul

REM Open browser
set URL=http://localhost:%PORT%/%GAME_FILE%
echo [OK] Opening %GAME_NAME% in browser...
echo.
start "" "%URL%"

color 0B
echo ========================================
echo    Server is running!
echo ========================================
echo.
echo Game: %GAME_NAME%
echo URL: %URL%
echo.
echo Press any key to stop the server...
pause >nul

REM Stop the server
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT%" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

color 0A
echo.
echo Server stopped.
pause
