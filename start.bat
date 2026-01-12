@echo off
echo.
echo  ____                 _   _                 
echo / __ \ _   _  ___  ___| |_| |    ___   __ _ 
echo | |  | | | | |/ _ \/ __| __| |   / _ \ / _` |
echo | |__| | |_| |  __/\__ \ |_| |__| (_) | (_| |
echo  \___\_\\__,_|\___||___/\__|_____\___/ \__, |
echo                                        |___/ 
echo.
echo Starting QuestLog...
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
    if errorlevel 1 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
    echo.
)

REM Build if dist doesn't exist
if not exist "apps\web\dist" (
    echo Building application...
    call pnpm build
    if errorlevel 1 (
        echo Failed to build application.
        pause
        exit /b 1
    )
    echo.
)

echo Starting server...
echo.
echo QuestLog is running at: http://localhost:4100
echo Press Ctrl+C to stop.
echo.

set NODE_ENV=production
call pnpm start

pause
