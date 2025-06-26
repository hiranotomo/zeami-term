#!/usr/bin/env zsh

# zeami-shell-init.zsh - Initialize shell for ZeamiTerm
# This should be sourced in .zshrc or .bashrc

# Get the directory where ZeamiTerm scripts are located
if [[ -n "$ZEAMI_TERM_PATH" ]]; then
    ZEAMI_SCRIPTS_DIR="$ZEAMI_TERM_PATH/scripts"
else
    # Try to find it relative to common locations
    if [[ -d "$HOME/develop/Zeami-1/projects/zeami-term/scripts" ]]; then
        ZEAMI_SCRIPTS_DIR="$HOME/develop/Zeami-1/projects/zeami-term/scripts"
    elif [[ -d "$HOME/projects/zeami-term/scripts" ]]; then
        ZEAMI_SCRIPTS_DIR="$HOME/projects/zeami-term/scripts"
    elif [[ -d "/Applications/ZeamiTerm.app/Contents/Resources/scripts" ]]; then
        ZEAMI_SCRIPTS_DIR="/Applications/ZeamiTerm.app/Contents/Resources/scripts"
    else
        echo "Warning: Cannot find ZeamiTerm scripts directory"
        return 1
    fi
fi

# Export for use in other scripts
export ZEAMI_SCRIPTS_DIR

# Create a function instead of alias for '?'
function ? {
    if [[ -x "$ZEAMI_SCRIPTS_DIR/zeami-menu.zsh" ]]; then
        "$ZEAMI_SCRIPTS_DIR/zeami-menu.zsh"
    else
        echo "Error: zeami-menu.zsh not found or not executable"
        echo "Expected location: $ZEAMI_SCRIPTS_DIR/zeami-menu.zsh"
    fi
}

# Create a simple 'zm' command as an alternative
function zm {
    ? "$@"
}

# Quick access aliases
alias zeami-menu="$ZEAMI_SCRIPTS_DIR/zeami-menu.zsh"
alias matrix="$ZEAMI_SCRIPTS_DIR/matrix-code.zsh"
alias matrix-extreme="$ZEAMI_SCRIPTS_DIR/matrix-code-extreme.zsh"
alias generate-code="$ZEAMI_SCRIPTS_DIR/generate-code.zsh"
alias infinite-code="$ZEAMI_SCRIPTS_DIR/generate-code-infinite.zsh"
alias test10k="$ZEAMI_SCRIPTS_DIR/test-10k.zsh"

# Performance test shortcuts
alias test-scroll='seq 1 10000'
alias test-color='seq 1 10000 | while read i; do printf "\033[0;3$((i % 7 + 1))mLine %05d\033[0m\n" $i; done'
alias test-json='seq 1 10000 | while read i; do echo "{\"id\": $i, \"data\": \"item_$i\"}"; done'

# Check if scripts are accessible
if [[ -d "$ZEAMI_SCRIPTS_DIR" ]]; then
    echo "\033[0;32m✓ ZeamiTerm shell integration loaded!\033[0m"
    echo "\033[0;36mCommands available:\033[0m"
    echo "  \033[1;33m?\033[0m or \033[1;33mzm\033[0m     - Open interactive menu"
    echo "  \033[1;33mmatrix\033[0m      - Run Matrix animation"
    echo "  \033[1;33mmatrix extreme\033[0m - Run high-load Matrix test"
    echo ""
else
    echo "\033[0;31m✗ Warning: ZeamiTerm scripts directory not found\033[0m"
    echo "  Expected: $ZEAMI_SCRIPTS_DIR"
fi