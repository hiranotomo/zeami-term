#!/bin/bash

# Shell Integration Setup Script for ZeamiTerm
# This script sets up OSC 133 sequences for better shell integration

echo "Setting up shell integration for ZeamiTerm..."

# Function to add shell integration to a file if not already present
add_shell_integration() {
    local rc_file="$1"
    local shell_name="$2"
    
    if [ -f "$rc_file" ]; then
        # Check if already configured
        if grep -q "OSC 133" "$rc_file"; then
            echo "✓ Shell integration already configured in $rc_file"
        else
            echo "Adding shell integration to $rc_file..."
            
            # Backup the original file
            cp "$rc_file" "$rc_file.backup.$(date +%Y%m%d%H%M%S)"
            
            # Add shell integration
            cat >> "$rc_file" << 'EOF'

# ZeamiTerm Shell Integration (OSC 133)
if [[ $TERM_PROGRAM == "ZeamiTerm" || -n "$ZEAMI_TERM" ]]; then
    # Mark prompt start
    PS1="\[\033]133;A\007\]$PS1"
    # Mark prompt end (after PS1)
    PS1="$PS1\[\033]133;B\007\]"
    
    # Command execution hooks
    preexec() {
        printf "\033]133;C\007"
    }
    
    precmd() {
        printf "\033]133;D;%s\007" "$?"
    }
    
    # Set up hooks based on shell
    case "$SHELL" in
        */bash)
            # Bash uses DEBUG trap for preexec
            trap 'preexec' DEBUG
            PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }precmd"
            ;;
        */zsh)
            # Zsh has built-in preexec and precmd
            autoload -Uz add-zsh-hook
            add-zsh-hook preexec preexec
            add-zsh-hook precmd precmd
            ;;
    esac
fi
EOF
            echo "✓ Shell integration added to $rc_file"
        fi
    else
        echo "✗ $rc_file not found"
    fi
}

# Configure for Bash
if [ -n "$BASH_VERSION" ]; then
    add_shell_integration "$HOME/.bashrc" "bash"
fi

# Configure for Zsh
if [ -f "$HOME/.zshrc" ]; then
    add_shell_integration "$HOME/.zshrc" "zsh"
fi

# Configure for Fish (different syntax)
if [ -f "$HOME/.config/fish/config.fish" ]; then
    if grep -q "OSC 133" "$HOME/.config/fish/config.fish"; then
        echo "✓ Shell integration already configured for Fish"
    else
        echo "Adding shell integration to Fish config..."
        cp "$HOME/.config/fish/config.fish" "$HOME/.config/fish/config.fish.backup.$(date +%Y%m%d%H%M%S)"
        
        cat >> "$HOME/.config/fish/config.fish" << 'EOF'

# ZeamiTerm Shell Integration (OSC 133)
if test "$TERM_PROGRAM" = "ZeamiTerm" -o -n "$ZEAMI_TERM"
    function fish_prompt --description 'Write out the prompt'
        # Mark prompt start
        printf "\033]133;A\007"
        
        # Your existing prompt here
        # (This is a basic example, keep your existing prompt)
        set -l last_status $status
        echo -n (prompt_pwd)
        set_color normal
        echo -n '> '
        
        # Mark prompt end
        printf "\033]133;B\007"
    end
    
    function fish_preexec --on-event fish_preexec
        printf "\033]133;C\007"
    end
    
    function fish_postexec --on-event fish_postexec
        printf "\033]133;D;%s\007" $status
    end
end
EOF
        echo "✓ Shell integration added to Fish config"
    fi
fi

echo ""
echo "Shell integration setup complete!"
echo ""
echo "To activate the changes:"
echo "  • Bash: source ~/.bashrc"
echo "  • Zsh: source ~/.zshrc"
echo "  • Fish: source ~/.config/fish/config.fish"
echo ""
echo "Or simply restart your terminal."
echo ""
echo "To test if it's working, run a command like 'sleep 6' in ZeamiTerm."
echo "You should see a notification after 5 seconds (current threshold)."