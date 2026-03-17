@echo off
title Skull King Server
cd /d "%~dp0"

echo.
echo  Checking Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed!
    echo.
    echo  Please download and install it from:
    echo  https://nodejs.org  ^(click the LTS button^)
    echo.
    echo  Then double-click this file again.
    pause
    exit /b
)

echo  Node.js found.
echo.
echo  Checking dependencies...
if not exist node_modules (
    echo  Installing packages ^(first time only^)...
    npm install
    echo.
)

echo  Starting Skull King server...
echo.
node server.js

echo.
echo  Server stopped. Press any key to close.
pause
