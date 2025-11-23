@echo off
cd /d "%~dp0"
taskkill /F /IM python.exe /IM python3.11.exe 2>nul
timeout /t 2 /nobreak >nul
echo Starting Python Flask service...
echo.
python python_agent_service.py
pause
