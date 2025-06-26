#!/bin/bash
# ZeamiTerm Shell Initialization Script

# Add multiple paths for development tools
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.npm-global/bin:/Users/Shared/bin:$PATH"

# Find node executable
NODE_CMD=""
if command -v node >/dev/null 2>&1; then
    NODE_CMD="node"
elif [ -x "/usr/local/bin/node" ]; then
    NODE_CMD="/usr/local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
    NODE_CMD="/opt/homebrew/bin/node"
elif [ -x "$HOME/.nvm/versions/node/v20.0.0/bin/node" ]; then
    NODE_CMD="$HOME/.nvm/versions/node/v20.0.0/bin/node"
elif [ -x "$HOME/.nvm/versions/node/v18.0.0/bin/node" ]; then
    NODE_CMD="$HOME/.nvm/versions/node/v18.0.0/bin/node"
fi

# Set up claude alias with node if found
if [ -n "$NODE_CMD" ]; then
    if [ -f "/Users/Shared/bin/claude" ]; then
        alias claude="$NODE_CMD --no-warnings --enable-source-maps /Users/Shared/bin/claude"
    elif [ -f "$HOME/.npm-global/bin/claude" ]; then
        alias claude="$NODE_CMD --no-warnings --enable-source-maps $HOME/.npm-global/bin/claude"
    fi
fi

# Enable bash completion if available
if [ -f /usr/local/etc/bash_completion ]; then
    . /usr/local/etc/bash_completion
fi

# Set terminal title
echo -ne "\033]0;ZeamiTerm\007"