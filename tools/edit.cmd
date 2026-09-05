@echo off
rem Double-click this to open the art editor. It starts tools/edit.py, which
rem serves the project and writes src/00-art.js when you press Save.
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (python edit.py %*) else (py edit.py %*)
echo.
pause
