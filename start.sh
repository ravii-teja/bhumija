#!/bin/bash

# Project Bhumija Startup Script
# This script starts both the FastAPI backend and the React frontend.

# Exit immediately if a command exits with a non-zero status
set -e

echo "🌾 Starting Project Bhumija: El Niño Resilience Engine..."
echo "========================================================="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    exit
}
trap cleanup INT TERM

# 1. Setup & Start Backend
echo "Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Starting FastAPI backend on http://localhost:8000..."
python3 main.py &
BACKEND_PID=$!

# 2. Setup & Start Frontend
echo ""
echo "Setting up frontend..."
cd ../frontend
echo "Installing frontend dependencies..."
npm install

echo "Starting Vite dev server on http://localhost:3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================================="
echo "🌾 Bhumija is running!"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "========================================================="
echo "Press Ctrl+C to stop both servers."

# Keep script running to monitor background processes
wait
