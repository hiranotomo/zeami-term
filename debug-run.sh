#!/bin/bash

# Run the app with debugging enabled
export NODE_ENV=development
export DEBUG=*

echo "Starting ZeamiTerm with full debugging..."
echo "Watch the console output and type a single character when the terminal appears."
echo ""

# First, rebuild node-pty to ensure it's properly compiled
echo "Rebuilding node-pty..."
npm run rebuild

echo ""
echo "Starting app..."
npm run dev