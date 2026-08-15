@echo off
setlocal
cd /d "%~dp0"
title Sim-Ciera v0.2 Easy Start

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is needed first.
  echo Opening the official Node.js download page now.
  start "" "https://nodejs.org/en/download"
  echo.
  echo Install Node.js, then double-click this file again.
  pause
  exit /b 1
)

node scripts\easy-start.mjs
set "SIM_CIERA_EXIT=%ERRORLEVEL%"
if not "%SIM_CIERA_EXIT%"=="0" (
  echo.
  echo Sim-Ciera needs one more setup step. Read the message above.
  pause
)
exit /b %SIM_CIERA_EXIT%
