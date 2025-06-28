# ZeamiTerm Shell Integration for Fish
# Source this file in your config.fish:
# source ~/path/to/zeami-term/shell-integration/zeami-shell-integration.fish

# Only enable if we're in ZeamiTerm
if not set -q ZEAMI_TERM
    return
end

# Send OSC sequences for command tracking
function _zeami_prompt_start --on-event fish_prompt
    printf '\033]133;A\007'
end

function _zeami_prompt_end --on-event fish_prompt
    printf '\033]133;B\007'
end

function _zeami_command_start --on-event fish_preexec
    printf '\033]133;C\007'
    # Send command line
    printf '\033]633;CommandLine=%s\007' "$argv"
end

function _zeami_command_end --on-event fish_postexec
    set -l exit_code $status
    printf '\033]133;D;%s\007' "$exit_code"
    # Send current directory
    printf '\033]1337;CurrentDir=%s\007' "$PWD"
end

# Additional features

# Send window title
function _zeami_set_title
    printf '\033]0;%s\007' "$argv"
end

# Mark output regions
function _zeami_mark_output_start
    printf '\033]133;E\007'
end

function _zeami_mark_output_end
    printf '\033]133;F\007'
end

# Update fish prompt to include markers
function fish_prompt_zeami_wrapper --description 'Wrapper for fish prompt with ZeamiTerm markers'
    # Call the original prompt if it exists
    if functions -q fish_prompt_original
        fish_prompt_original
    else if functions -q fish_prompt
        fish_prompt
    end
    _zeami_prompt_end
end

# Backup original prompt if not already done
if not functions -q fish_prompt_original
    if functions -q fish_prompt
        functions -c fish_prompt fish_prompt_original
    end
    functions -e fish_prompt
    functions -c fish_prompt_zeami_wrapper fish_prompt
end

# Set initial directory
printf '\033]1337;CurrentDir=%s\007' "$PWD"

# Indicate shell integration is active
set -x ZEAMI_SHELL_INTEGRATION 1

echo "ZeamiTerm shell integration activated for Fish"