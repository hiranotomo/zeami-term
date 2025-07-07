#!/bin/bash

echo "Removing ZeamiTerm shell integration..."

# Remove from .zshrc
if [ -f "$HOME/.zshrc" ]; then
    echo "Cleaning .zshrc..."
    # Remove shell integration lines
    sed -i.bak '/# ZeamiTerm Shell Integration/d' "$HOME/.zshrc" 2>/dev/null || sed -i '' '/# ZeamiTerm Shell Integration/d' "$HOME/.zshrc"
    sed -i.bak '/source.*zeami-shell-integration/d' "$HOME/.zshrc" 2>/dev/null || sed -i '' '/source.*zeami-shell-integration/d' "$HOME/.zshrc"
    sed -i.bak '/OSC 133/d' "$HOME/.zshrc" 2>/dev/null || sed -i '' '/OSC 133/d' "$HOME/.zshrc"
    sed -i.bak '/precmd_zeami/d' "$HOME/.zshrc" 2>/dev/null || sed -i '' '/precmd_zeami/d' "$HOME/.zshrc"
    sed -i.bak '/preexec_zeami/d' "$HOME/.zshrc" 2>/dev/null || sed -i '' '/preexec_zeami/d' "$HOME/.zshrc"
    echo "Cleaned .zshrc"
fi

# Remove from .bashrc
if [ -f "$HOME/.bashrc" ]; then
    echo "Cleaning .bashrc..."
    sed -i.bak '/# ZeamiTerm Shell Integration/d' "$HOME/.bashrc" 2>/dev/null || sed -i '' '/# ZeamiTerm Shell Integration/d' "$HOME/.bashrc"
    sed -i.bak '/source.*zeami-shell-integration/d' "$HOME/.bashrc" 2>/dev/null || sed -i '' '/source.*zeami-shell-integration/d' "$HOME/.bashrc"
    sed -i.bak '/OSC 133/d' "$HOME/.bashrc" 2>/dev/null || sed -i '' '/OSC 133/d' "$HOME/.bashrc"
    sed -i.bak '/PROMPT_COMMAND.*zeami/d' "$HOME/.bashrc" 2>/dev/null || sed -i '' '/PROMPT_COMMAND.*zeami/d' "$HOME/.bashrc"
    echo "Cleaned .bashrc"
fi

# Remove shell integration files
INTEGRATION_FILES=(
    "$HOME/.config/zeami-term/shell-integration.zsh"
    "$HOME/.config/zeami-term/shell-integration.bash"
    "$HOME/.config/zeami-term/shell-integration"
)

for file in "${INTEGRATION_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Removing $file..."
        rm -f "$file"
    fi
done

# Remove config directory if empty
if [ -d "$HOME/.config/zeami-term" ]; then
    rmdir "$HOME/.config/zeami-term" 2>/dev/null || echo "Config directory not empty, keeping it"
fi

echo "Shell integration removal complete!"
echo "Please restart your terminal or run 'source ~/.zshrc' (or ~/.bashrc) to apply changes."