#!/bin/bash

# Helper script to manage the dev server

case "$1" in
  start)
    echo "Starting dev server..."
    npm run dev
    ;;
  stop)
    echo "Stopping dev server..."
    # Find and kill any process using port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No process found on port 3000"
    # Also kill any npm/vite processes
    pkill -f "vite" 2>/dev/null || true
    echo "Dev server stopped"
    ;;
  restart)
    echo "Restarting dev server..."
    $0 stop
    sleep 1
    $0 start
    ;;
  status)
    echo "Checking dev server status..."
    if lsof -ti:3000 > /dev/null 2>&1; then
      echo "Dev server is running on port 3000"
      lsof -i:3000
    else
      echo "Dev server is not running"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

