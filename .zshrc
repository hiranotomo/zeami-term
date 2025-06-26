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