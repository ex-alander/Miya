@echo off
title MIYA - FAST MODE
color 0A

set PROJECT_PATH=C:\Users\user\Documents\Projects\JMLC\Miya

echo Starting everything at once...
echo.

REM Start backend
start "MIYA Backend" cmd /k "cd /d "%PROJECT_PATH%\backend" && python -m uvicorn app.main:app --reload"

REM Start frontend
start "MIYA Frontend" cmd /k "cd /d "%PROJECT_PATH%\frontend" && npm run dev"

REM Immediately try to open Chrome (it'll work once frontend is ready)
timeout /t 2 /nobreak >nul
start chrome http://localhost:5173/focus

echo Done! Check your windows and Chrome tab.
timeout /t 2 /nobreak >nul