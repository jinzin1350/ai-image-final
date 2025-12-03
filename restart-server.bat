@echo off
echo.
echo ========================================
echo    Restarting Server with New Code
echo ========================================
echo.
echo Killing any existing Node.js processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
echo.
echo Starting server...
echo.
node index.js
