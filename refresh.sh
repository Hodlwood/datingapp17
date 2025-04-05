#!/bin/bash

# Kill any processes running on ports 3000, 3001, and 3003
echo "Killing processes on ports 3000, 3001, and 3003..."
kill -9 $(lsof -ti:3000,3001,3003) 2>/dev/null || true

# Wait a moment to ensure ports are released
sleep 1

# Start the development server
echo "Starting development server on port 3000..."
npm run dev 