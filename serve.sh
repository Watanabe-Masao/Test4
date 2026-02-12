#!/bin/bash
# Simple HTTP server script for development
# This helps avoid browser caching issues

PORT=8000

echo "🚀 Starting local development server..."
echo "📁 Serving: $(pwd)"
echo "🌐 URL: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first, then Python 2, then PHP, then Node.js
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    python3 -m http.server $PORT --bind 127.0.0.1
elif command -v python &> /dev/null; then
    echo "Using Python 2..."
    python -m SimpleHTTPServer $PORT
elif command -v php &> /dev/null; then
    echo "Using PHP..."
    php -S 127.0.0.1:$PORT
elif command -v node &> /dev/null; then
    echo "Using Node.js..."
    npx --yes http-server -p $PORT -a 127.0.0.1
else
    echo "❌ Error: No suitable HTTP server found."
    echo "Please install one of: Python, PHP, or Node.js"
    exit 1
fi
