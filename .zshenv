# ZeamiTerm ZSH Environment Configuration
# This file is loaded before .zshrc

# Source cargo env if exists
. "$HOME/.cargo/env"

# Ensure bracketed paste mode is enabled for all terminals
# This helps with Claude Code paste handling
if [[ -t 0 ]]; then
    # Only set if we're in an interactive terminal
    stty -ixon 2>/dev/null  # Disable XON/XOFF flow control
fi

# Export terminal capabilities
export TERM_PROGRAM="ZeamiTerm"
export COLORTERM="truecolor"
