#!/usr/bin/env zsh

# zeami-init.zsh - Initialize ZeamiTerm environment

# Get the directory where this script is located
ZEAMI_SCRIPTS_DIR="${0:A:h}"

# Export for use in other scripts
export ZEAMI_SCRIPTS_DIR

# Define the ? command
alias '?'="$ZEAMI_SCRIPTS_DIR/zeami-menu.zsh"

# Quick access aliases
alias zeami-menu="$ZEAMI_SCRIPTS_DIR/zeami-menu.zsh"
alias matrix="$ZEAMI_SCRIPTS_DIR/matrix-code.zsh"
alias generate-code="$ZEAMI_SCRIPTS_DIR/generate-code.zsh"
alias infinite-code="$ZEAMI_SCRIPTS_DIR/generate-code-infinite.zsh"
alias test10k="$ZEAMI_SCRIPTS_DIR/test-10k.zsh"

# Performance test shortcuts
alias test-scroll='seq 1 10000'
alias test-color='seq 1 10000 | while read i; do printf "\033[0;3$((i % 7 + 1))mLine %05d\033[0m\n" $i; done'
alias test-json='seq 1 10000 | while read i; do echo "{\"id\": $i, \"data\": \"item_$i\"}"; done'

# Display welcome message
echo "\033[0;32m"
echo "ZeamiTerm initialized!"
echo "\033[0;36m"
echo "Type \033[1;33m?\033[0;36m to open the interactive menu"
echo "Type \033[1;33mmatrix\033[0;36m for the Matrix animation"
echo "\033[0m"