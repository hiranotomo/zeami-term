#!/usr/bin/env zsh

# setup-zeami-commands.zsh - Set up ZeamiTerm commands in current shell

# Get script directory
ZEAMI_SCRIPTS_DIR="${0:A:h}"

# Create executable links in a temporary bin directory
ZEAMI_BIN_DIR="$HOME/.zeami-term/bin"
mkdir -p "$ZEAMI_BIN_DIR"

# Create a simple 'h' command as help
cat > "$ZEAMI_BIN_DIR/h" << 'EOF'
#!/usr/bin/env zsh
exec "$HOME/develop/Zeami-1/projects/zeami-term/scripts/zeami-menu.zsh"
EOF
chmod +x "$ZEAMI_BIN_DIR/h"

# Create 'zm' command
cat > "$ZEAMI_BIN_DIR/zm" << 'EOF'
#!/usr/bin/env zsh
exec "$HOME/develop/Zeami-1/projects/zeami-term/scripts/zeami-menu.zsh"
EOF
chmod +x "$ZEAMI_BIN_DIR/zm"

# Create 'matrix' command
cat > "$ZEAMI_BIN_DIR/matrix" << 'EOF'
#!/usr/bin/env zsh
if [[ "$1" == "extreme" ]]; then
    exec "$HOME/develop/Zeami-1/projects/zeami-term/scripts/matrix-code-extreme.zsh"
else
    exec "$HOME/develop/Zeami-1/projects/zeami-term/scripts/matrix-code.zsh"
fi
EOF
chmod +x "$ZEAMI_BIN_DIR/matrix"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$ZEAMI_BIN_DIR:"* ]]; then
    export PATH="$ZEAMI_BIN_DIR:$PATH"
fi

# Define aliases
alias '?'='h'
alias help='h'
alias menu='zm'

# Success message
echo "\033[0;32m✓ ZeamiTerm commands installed!\033[0m"
echo ""
echo "\033[0;36mAvailable commands:\033[0m"
echo "  \033[1;33mh\033[0m or \033[1;33mhelp\033[0m  - Open interactive menu"
echo "  \033[1;33mzm\033[0m or \033[1;33mmenu\033[0m - Open interactive menu"
echo "  \033[1;33mmatrix\033[0m       - Run Matrix animation"
echo "  \033[1;33mmatrix extreme\033[0m - Run high-load test"
echo ""
echo "\033[0;33mNote: The '?' command is aliased to 'h'\033[0m"