#!/bin/bash
# Claude CLI wrapper for ZeamiTerm

# Find node in common locations
if command -v node >/dev/null 2>&1; then
    NODE_BIN=$(which node)
elif [ -f "/usr/local/bin/node" ]; then
    NODE_BIN="/usr/local/bin/node"
elif [ -f "/opt/homebrew/bin/node" ]; then
    NODE_BIN="/opt/homebrew/bin/node"
else
    echo "Error: Node.js not found. Please install Node.js first."
    exit 1
fi

# Execute claude with node
exec "$NODE_BIN" --no-warnings --enable-source-maps /Users/hirano/.npm-global/bin/claude "$@"