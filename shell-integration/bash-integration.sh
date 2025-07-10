#!/bin/bash
# ZeamiTerm Shell Integration for Bash
# Provides command tracking via OSC sequences

# Only activate if running in ZeamiTerm
if [ -n "$ZEAMI_TERM" ]; then
    # Save original prompt command if exists
    __zeami_original_prompt_command="$PROMPT_COMMAND"
    
    # ZeamiTerm prompt command
    __zeami_prompt_command() {
        local exit_code=$?
        
        # Send command end marker with exit code (OSC 133 D)
        printf "\033]133;D;%s\007" "$exit_code"
        
        # Send current working directory (OSC 7)
        printf "\033]7;file://%s%s\007" "${HOSTNAME:-localhost}" "$PWD"
        
        # Send prompt start marker (OSC 133 A)
        printf "\033]133;A\007"
        
        # Execute original prompt command if exists
        if [ -n "$__zeami_original_prompt_command" ]; then
            eval "$__zeami_original_prompt_command"
        fi
        
        return $exit_code
    }
    
    # Set new prompt command
    PROMPT_COMMAND="__zeami_prompt_command"
    
    # Add prompt end marker to PS1
    # \[ and \] prevent the sequence from affecting line length calculation
    PS1="\[\033]133;B\007\]$PS1"
    
    # Command preexec hook using DEBUG trap
    __zeami_preexec() {
        # Skip if this is our own prompt command
        if [ "$BASH_COMMAND" = "__zeami_prompt_command" ] || 
           [ "$BASH_COMMAND" = "__zeami_original_prompt_command" ]; then
            return
        fi
        
        # Skip if this is the prompt command evaluation
        if [[ "$BASH_COMMAND" == *"PROMPT_COMMAND"* ]]; then
            return
        fi
        
        # Send command start marker (OSC 133 C)
        printf "\033]133;C\007"
    }
    
    # Enable debug trap for preexec
    trap '__zeami_preexec' DEBUG
    
    # Initial directory notification
    printf "\033]7;file://%s%s\007" "${HOSTNAME:-localhost}" "$PWD"
    
    # Aliases for better integration
    alias clear='printf "\033[2J\033[3J\033[H"; __zeami_prompt_command'
    
    # Export function for subshells
    export -f __zeami_prompt_command
    export -f __zeami_preexec
    
    # Notify that shell integration is active
    echo "[ZeamiTerm] Shell integration activated for bash"
fi