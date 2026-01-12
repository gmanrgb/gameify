#!/bin/bash

echo ""
echo " ____                 _   _                 "
echo "/ __ \ _   _  ___  ___| |_| |    ___   __ _ "
echo "| |  | | | | |/ _ \/ __| __| |   / _ \ / _\` |"
echo "| |__| | |_| |  __/\__ \ |_| |__| (_) | (_| |"
echo " \___\_\\\__,_|\___||___/\__|_____\___/ \__, |"
echo "                                       |___/ "
echo ""
echo "Starting QuestLog..."
echo ""

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install || { echo "Failed to install dependencies."; exit 1; }
    echo ""
fi

# Build if dist doesn't exist
if [ ! -d "apps/web/dist" ]; then
    echo "Building application..."
    pnpm build || { echo "Failed to build application."; exit 1; }
    echo ""
fi

echo "Starting server..."
echo ""
echo "QuestLog is running at: http://localhost:4100"
echo "Press Ctrl+C to stop."
echo ""

NODE_ENV=production pnpm start
