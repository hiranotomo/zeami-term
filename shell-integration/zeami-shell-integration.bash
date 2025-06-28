#!/bin/bash
# ZeamiTerm Shell Integration for Bash and Zsh
# Source this file in your .bashrc or .zshrc:
# source ~/path/to/zeami-term/shell-integration/zeami-shell-integration.bash

# Only enable if we're in ZeamiTerm
if [ -z "$ZEAMI_TERM" ]; then
  return
fi

# Send OSC sequences for command tracking
_zeami_prompt_start() {
  printf '\033]133;A\007'
}

_zeami_prompt_end() {
  printf '\033]133;B\007'
}

_zeami_command_start() {
  printf '\033]133;C\007'
  # Send command line if available
  if [ -n "$BASH_COMMAND" ]; then
    printf '\033]633;CommandLine=%s\007' "$BASH_COMMAND"
  fi
}

_zeami_command_end() {
  local exit_code=$?
  printf '\033]133;D;%s\007' "$exit_code"
  # Send current directory
  printf '\033]1337;CurrentDir=%s\007' "$PWD"
  return $exit_code
}

# Configure based on shell
if [ -n "$BASH_VERSION" ]; then
  # Bash configuration
  
  # Update PS1 to include prompt markers
  if [[ "$PS1" != *_zeami_prompt_start* ]]; then
    PS1="\$(_zeami_prompt_start)$PS1\$(_zeami_prompt_end)"
  fi
  
  # Hook command execution
  trap '_zeami_command_start' DEBUG
  
  # Hook command completion
  if [[ "$PROMPT_COMMAND" != *_zeami_command_end* ]]; then
    PROMPT_COMMAND="_zeami_command_end${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
  fi
  
elif [ -n "$ZSH_VERSION" ]; then
  # Zsh configuration
  
  # Hooks for command tracking
  precmd_functions+=(_zeami_prompt_start)
  
  # Wrap the prompt
  if [[ "$PS1" != *_zeami_prompt_end* ]]; then
    PS1="$PS1%{$(_zeami_prompt_end)%}"
  fi
  
  # Command execution hooks
  preexec_functions+=(_zeami_command_start_zsh)
  precmd_functions+=(_zeami_command_end)
  
  _zeami_command_start_zsh() {
    printf '\033]133;C\007'
    printf '\033]633;CommandLine=%s\007' "$1"
  }
fi

# Additional features

# Send window title
_zeami_set_title() {
  printf '\033]0;%s\007' "$1"
}

# Mark output regions
_zeami_mark_output_start() {
  printf '\033]133;E\007'
}

_zeami_mark_output_end() {
  printf '\033]133;F\007'
}

# Export functions for use in scripts
export -f _zeami_mark_output_start 2>/dev/null || true
export -f _zeami_mark_output_end 2>/dev/null || true
export -f _zeami_set_title 2>/dev/null || true

# Set initial directory
printf '\033]1337;CurrentDir=%s\007' "$PWD"

# Indicate shell integration is active
export ZEAMI_SHELL_INTEGRATION=1

echo "ZeamiTerm shell integration activated"