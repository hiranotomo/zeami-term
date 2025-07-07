# ZeamiTerm Shell Configuration
# This file is loaded when ZeamiTerm starts

# Source the main zshrc if it exists
if [[ -f "$HOME/.zshrc" ]]; then
    source "$HOME/.zshrc"
fi

# ZeamiTerm specific configuration
export ZEAMI_TERM_PATH="$HOME/develop/Zeami-1/projects/zeami-term"

# Set up commands
source "$ZEAMI_TERM_PATH/scripts/setup-zeami-commands.zsh" 2>/dev/null

# Custom prompt
PROMPT='%F{green}zeami%f:%F{cyan}%~%f %# '

# Enable bracketed paste mode
# This allows proper handling of multi-line pastes
if [[ $TERM == 'xterm'* ]] || [[ $TERM == 'screen'* ]]; then
    # Enable bracketed paste mode at startup
    printf '\e[?2004h'
fi
