@echo off
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0"
call npm --prefix "%~dp0desktop\daidar-flow" run admin:ui
if errorlevel 1 pause
