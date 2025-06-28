# ZeamiTerm Shell Integration

Shell integration enhances your terminal experience by providing visual command tracking, execution status, and navigation features.

## Features

- **Visual Command Tracking**: See where commands start and end
- **Exit Code Indicators**: Instantly see if commands succeeded (✓) or failed (✗)
- **Execution Time**: Track how long each command takes
- **Command Navigation**: Jump between commands with Ctrl+Up/Down
- **Working Directory Tracking**: Monitor directory changes

## Installation

### Automatic (Recommended)

Add this to your shell configuration file:

#### Bash (~/.bashrc)
```bash
if [ -n "$ZEAMI_TERM" ] && [ -f "$ZEAMI_SHELL_INTEGRATION_PATH/zeami-shell-integration.bash" ]; then
    source "$ZEAMI_SHELL_INTEGRATION_PATH/zeami-shell-integration.bash"
fi
```

#### Zsh (~/.zshrc)
```bash
if [ -n "$ZEAMI_TERM" ] && [ -f "$ZEAMI_SHELL_INTEGRATION_PATH/zeami-shell-integration.bash" ]; then
    source "$ZEAMI_SHELL_INTEGRATION_PATH/zeami-shell-integration.bash"
fi
```

#### Fish (~/.config/fish/config.fish)
```fish
if set -q ZEAMI_TERM; and test -f "$ZEAMI_SHELL_INTEGRATION_PATH/zeami-shell-integration.fish"
    source "$ZEAMI_SHELL_INTEGRATION_PATH/zeami-shell-integration.fish"
end
```

### Manual

You can also manually source the integration scripts:

```bash
# Bash/Zsh
source /path/to/zeami-term/shell-integration/zeami-shell-integration.bash

# Fish
source /path/to/zeami-term/shell-integration/zeami-shell-integration.fish
```

## Usage

Once installed, shell integration activates automatically in ZeamiTerm.

### Command Navigation
- **Ctrl+Up**: Jump to previous command
- **Ctrl+Down**: Jump to next command

### Visual Indicators
- **Green checkmark (✓)**: Command succeeded (exit code 0)
- **Red X (✗)**: Command failed (non-zero exit code)
- **Duration**: Shows execution time for each command

## Troubleshooting

### Integration not working?

1. Check if `ZEAMI_TERM` environment variable is set:
   ```bash
   echo $ZEAMI_TERM
   ```

2. Verify the integration script is sourced:
   ```bash
   echo $ZEAMI_SHELL_INTEGRATION
   ```

3. Make sure your shell configuration file sources the integration script

### Prompt issues?

If your prompt looks broken, you may need to adjust your PS1/PROMPT variable to be compatible with the OSC sequences.

## Advanced Features

### Custom Markers

You can use these functions in your scripts:

```bash
# Mark output regions
_zeami_mark_output_start
echo "Important output"
_zeami_mark_output_end

# Set window title
_zeami_set_title "Custom Title"
```

## Technical Details

Shell integration uses OSC (Operating System Command) escape sequences:
- OSC 133: Command tracking (prompt/command start/end)
- OSC 633: Extended command metadata
- OSC 1337: Working directory tracking

These sequences are interpreted by ZeamiTerm to provide enhanced features.