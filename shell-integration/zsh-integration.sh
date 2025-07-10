#!/bin/zsh
# ZeamiTerm Shell Integration for Zsh
# Provides command tracking via OSC sequences

# Only activate if running in ZeamiTerm
if [ -n "$ZEAMI_TERM" ]; then
    # Precmd hook - runs before each prompt
    __zeami_precmd() {
        local exit_code=$?
        
        # Send command end marker with exit code (OSC 133 D)
        printf "\033]133;D;%s\007" "$exit_code"
        
        # Send current working directory (OSC 7)
        printf "\033]7;file://%s%s\007" "${HOST:-localhost}" "$PWD"
        
        # Send prompt start marker (OSC 133 A)
        printf "\033]133;A\007"
        
        return $exit_code
    }
    
    # Preexec hook - runs before command execution
    __zeami_preexec() {
        # Send command start marker (OSC 133 C)
        printf "\033]133;C\007"
    }
    
    # Add our functions to the hook arrays
    precmd_functions+=(__zeami_precmd)
    preexec_functions+=(__zeami_preexec)
    
    # Add prompt end marker to PS1
    # %{ and %} prevent the sequence from affecting line length calculation
    PS1="%{$(printf '\033]133;B\007')%}$PS1"
    
    # Initial directory notification
    printf "\033]7;file://%s%s\007" "${HOST:-localhost}" "$PWD"
    
    # Aliases for better integration
    alias clear='printf "\033[2J\033[3J\033[H"; __zeami_precmd'
    
    # Load ZeamiTerm specific completions if available
    if [ -f "$HOME/.zeamiterm/completions/zeami.zsh" ]; then
        source "$HOME/.zeamiterm/completions/zeami.zsh"
    fi
    
    # Notify that shell integration is active
    echo "[ZeamiTerm] Shell integration activated for zsh"
fi