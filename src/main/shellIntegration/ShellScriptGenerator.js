/**
 * ShellScriptGenerator - Generates shell integration scripts for different shells
 * Based on VS Code's shell integration implementation
 */

const path = require('path');
const os = require('os');
const fs = require('fs').promises;

class ShellScriptGenerator {
  constructor() {
    this.scriptsDir = null;
    this.supportedShells = ['bash', 'zsh', 'fish', 'pwsh'];
  }

  /**
   * Initialize the generator and create scripts directory
   */
  async initialize(appDataPath) {
    this.scriptsDir = path.join(appDataPath, 'shell-integration');
    
    // Ensure scripts directory exists
    await fs.mkdir(this.scriptsDir, { recursive: true });
    
    // Generate all shell scripts
    await this.generateAllScripts();
  }

  /**
   * Generate all shell integration scripts
   */
  async generateAllScripts() {
    const scripts = {
      'bash-integration.sh': this.generateBashScript(),
      'zsh-integration.zsh': this.generateZshScript(),
      'fish-integration.fish': this.generateFishScript(),
      'pwsh-integration.ps1': this.generatePowerShellScript()
    };

    for (const [filename, content] of Object.entries(scripts)) {
      const scriptPath = path.join(this.scriptsDir, filename);
      await fs.writeFile(scriptPath, content, 'utf8');
      
      // Make shell scripts executable (Unix-like systems)
      if (!filename.endsWith('.ps1')) {
        await fs.chmod(scriptPath, 0o755);
      }
    }
  }

  /**
   * Get integration command for a specific shell
   */
  getIntegrationCommand(shell) {
    const shellName = path.basename(shell).toLowerCase();
    
    if (shellName.includes('bash')) {
      return `. "${path.join(this.scriptsDir, 'bash-integration.sh')}"`;
    } else if (shellName.includes('zsh')) {
      return `. "${path.join(this.scriptsDir, 'zsh-integration.zsh')}"`;
    } else if (shellName.includes('fish')) {
      return `source "${path.join(this.scriptsDir, 'fish-integration.fish')}"`;
    } else if (shellName.includes('pwsh') || shellName.includes('powershell')) {
      return `. "${path.join(this.scriptsDir, 'pwsh-integration.ps1')}"`;
    }
    
    return null;
  }

  /**
   * Check if shell integration is already installed
   */
  async isIntegrationInstalled(shell) {
    const shellName = path.basename(shell).toLowerCase();
    let rcFile = null;

    if (shellName.includes('bash')) {
      rcFile = path.join(os.homedir(), '.bashrc');
    } else if (shellName.includes('zsh')) {
      rcFile = path.join(os.homedir(), '.zshrc');
    } else if (shellName.includes('fish')) {
      rcFile = path.join(os.homedir(), '.config', 'fish', 'config.fish');
    }

    if (!rcFile) return false;

    try {
      const content = await fs.readFile(rcFile, 'utf8');
      return content.includes('ZEAMI_TERM_SHELL_INTEGRATION');
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate Bash integration script
   */
  generateBashScript() {
    return `#!/bin/bash
# ZEAMI_TERM_SHELL_INTEGRATION

# Save original PS1 if not already saved
if [ -z "\${ZEAMI_ORIGINAL_PS1+x}" ]; then
  export ZEAMI_ORIGINAL_PS1="$PS1"
fi

# Function to send OSC sequences
__zeami_osc() {
  printf "\\033]%s\\007" "$1"
}

# Command execution hooks
__zeami_preexec() {
  # OSC 133;C - Command start
  __zeami_osc "133;C"
  
  # OSC 633;CommandLine - Send command line
  __zeami_osc "633;CommandLine=$1"
  
  # Store command start time
  __zeami_cmd_start=\$(date +%s%N)
}

__zeami_precmd() {
  local exit_code=$?
  
  # Calculate command duration if available
  if [ -n "\${__zeami_cmd_start}" ]; then
    local cmd_end=\$(date +%s%N)
    local duration=\$(( (cmd_end - __zeami_cmd_start) / 1000000 ))
    unset __zeami_cmd_start
  fi
  
  # OSC 133;D - Command end with exit code
  __zeami_osc "133;D;$exit_code"
  
  # OSC 1337;CurrentDir - Send current directory
  __zeami_osc "1337;CurrentDir=$PWD"
  
  # OSC 133;A - Prompt start
  __zeami_osc "133;A"
  
  return $exit_code
}

# Setup prompt command
if [[ ! "$PROMPT_COMMAND" =~ __zeami_precmd ]]; then
  PROMPT_COMMAND="__zeami_precmd;\${PROMPT_COMMAND:+$PROMPT_COMMAND}"
fi

# Setup preexec using DEBUG trap
trap '__zeami_preexec "$BASH_COMMAND"' DEBUG

# Modify PS1 to include prompt end marker
PS1="\${PS1}\\[\\e]133;B\\a\\]"

# Initial OSC sequences
__zeami_osc "1337;CurrentDir=$PWD"
__zeami_osc "133;A"
`;
  }

  /**
   * Generate Zsh integration script
   */
  generateZshScript() {
    return `#!/bin/zsh
# ZEAMI_TERM_SHELL_INTEGRATION

# Function to send OSC sequences
__zeami_osc() {
  printf "\\033]%s\\007" "$1"
}

# Preexec hook - runs before command execution
__zeami_preexec() {
  # OSC 133;C - Command start
  __zeami_osc "133;C"
  
  # OSC 633;CommandLine - Send command line
  __zeami_osc "633;CommandLine=$1"
  
  # Store command start time
  __zeami_cmd_start=\$(date +%s%N 2>/dev/null || date +%s)
}

# Precmd hook - runs before prompt display
__zeami_precmd() {
  local exit_code=$?
  
  # Calculate command duration if available
  if [ -n "\${__zeami_cmd_start}" ]; then
    local cmd_end=\$(date +%s%N 2>/dev/null || date +%s)
    if [[ "$cmd_end" =~ N ]]; then
      # Nanosecond precision available
      local duration=\$(( (cmd_end - __zeami_cmd_start) / 1000000 ))
    else
      # Fall back to second precision
      local duration=\$(( (cmd_end - __zeami_cmd_start) * 1000 ))
    fi
    unset __zeami_cmd_start
  fi
  
  # OSC 133;D - Command end with exit code
  __zeami_osc "133;D;$exit_code"
  
  # OSC 1337;CurrentDir - Send current directory
  __zeami_osc "1337;CurrentDir=$PWD"
  
  # OSC 133;A - Prompt start
  __zeami_osc "133;A"
  
  return $exit_code
}

# Add hooks if not already added
if ! (( \${precmd_functions[(I)__zeami_precmd]} )); then
  precmd_functions+=(__zeami_precmd)
fi

if ! (( \${preexec_functions[(I)__zeami_preexec]} )); then
  preexec_functions+=(__zeami_preexec)
fi

# Modify prompt to include prompt end marker
setopt PROMPT_SUBST
PS1="\${PS1}%{\$(__zeami_osc '133;B')%}"

# Initial OSC sequences
__zeami_osc "1337;CurrentDir=$PWD"
__zeami_osc "133;A"
`;
  }

  /**
   * Generate Fish integration script
   */
  generateFishScript() {
    return `#!/usr/bin/env fish
# ZEAMI_TERM_SHELL_INTEGRATION

# Function to send OSC sequences
function __zeami_osc
    printf "\\033]%s\\007" $argv[1]
end

# Preexec event - runs before command execution
function __zeami_preexec --on-event fish_preexec
    # OSC 133;C - Command start
    __zeami_osc "133;C"
    
    # OSC 633;CommandLine - Send command line
    __zeami_osc "633;CommandLine=$argv[1]"
    
    # Store command start time
    set -g __zeami_cmd_start (date +%s%N 2>/dev/null; or date +%s)
end

# Postexec event - runs after command execution
function __zeami_postexec --on-event fish_postexec
    set -l exit_code $status
    
    # Calculate command duration if available
    if set -q __zeami_cmd_start
        set -l cmd_end (date +%s%N 2>/dev/null; or date +%s)
        # Calculate duration in milliseconds
        if string match -q '*N' $cmd_end
            # Nanosecond precision available
            set -l duration (math "($cmd_end - $__zeami_cmd_start) / 1000000")
        else
            # Fall back to second precision
            set -l duration (math "($cmd_end - $__zeami_cmd_start) * 1000")
        end
        set -e __zeami_cmd_start
    end
    
    # OSC 133;D - Command end with exit code
    __zeami_osc "133;D;$exit_code"
    
    # OSC 1337;CurrentDir - Send current directory
    __zeami_osc "1337;CurrentDir=$PWD"
    
    # OSC 133;A - Prompt start
    __zeami_osc "133;A"
end

# Modify prompt to include prompt end marker
function fish_prompt
    # Call original prompt
    if functions -q __zeami_original_prompt
        __zeami_original_prompt
    else
        # Default prompt if no original exists
        echo -n "$USER@"(hostname)":"(prompt_pwd)"> "
    end
    
    # Add prompt end marker
    __zeami_osc "133;B"
end

# Save original prompt if it exists
if functions -q fish_prompt
    functions -c fish_prompt __zeami_original_prompt
end

# Initial OSC sequences
__zeami_osc "1337;CurrentDir=$PWD"
__zeami_osc "133;A"
`;
  }

  /**
   * Generate PowerShell integration script
   */
  generatePowerShellScript() {
    return `# ZEAMI_TERM_SHELL_INTEGRATION

# Function to send OSC sequences
function Send-ZeamiOSC {
    param([string]$sequence)
    Write-Host -NoNewline "\`e]$sequence\`a"
}

# Store original prompt if exists
if (-not $Global:__ZeamiOriginalPrompt) {
    $Global:__ZeamiOriginalPrompt = $function:prompt
}

# Command execution tracking
$Global:__ZeamiCommandStart = $null

# Custom prompt function
function prompt {
    # Get exit code of last command
    $exitCode = $LASTEXITCODE
    if ($null -eq $exitCode) { $exitCode = 0 }
    
    # Command end sequence
    if ($null -ne $Global:__ZeamiCommandStart) {
        $duration = (Get-Date) - $Global:__ZeamiCommandStart
        $durationMs = [math]::Round($duration.TotalMilliseconds)
        $Global:__ZeamiCommandStart = $null
        
        # OSC 133;D - Command end with exit code
        Send-ZeamiOSC "133;D;$exitCode"
    }
    
    # OSC 1337;CurrentDir - Send current directory
    Send-ZeamiOSC "1337;CurrentDir=$PWD"
    
    # OSC 133;A - Prompt start
    Send-ZeamiOSC "133;A"
    
    # Call original prompt
    if ($Global:__ZeamiOriginalPrompt) {
        & $Global:__ZeamiOriginalPrompt
    } else {
        "PS $PWD> "
    }
    
    # OSC 133;B - Prompt end
    Send-ZeamiOSC "133;B"
}

# Pre-execution hook
$ExecutionContext.SessionState.InvokeCommand.PreCommandLookupAction = {
    param($commandName, $commandLookupEventArgs)
    
    if ($commandLookupEventArgs.CommandOrigin -eq 'Runspace') {
        # OSC 133;C - Command start
        Send-ZeamiOSC "133;C"
        
        # Store command start time
        $Global:__ZeamiCommandStart = Get-Date
    }
}

# Initial sequences
Send-ZeamiOSC "1337;CurrentDir=$PWD"
Send-ZeamiOSC "133;A"
`;
  }

  /**
   * Install integration for current shell
   */
  async installForShell(shellPath) {
    const shellName = path.basename(shellPath).toLowerCase();
    const integrationCmd = this.getIntegrationCommand(shellPath);
    
    if (!integrationCmd) {
      throw new Error(`Unsupported shell: ${shellPath}`);
    }

    // Check if already installed
    if (await this.isIntegrationInstalled(shellPath)) {
      return { installed: false, reason: 'already_installed' };
    }

    // Determine RC file
    let rcFile = null;
    if (shellName.includes('bash')) {
      rcFile = path.join(os.homedir(), '.bashrc');
    } else if (shellName.includes('zsh')) {
      rcFile = path.join(os.homedir(), '.zshrc');
    } else if (shellName.includes('fish')) {
      rcFile = path.join(os.homedir(), '.config', 'fish', 'config.fish');
      // Ensure fish config directory exists
      await fs.mkdir(path.dirname(rcFile), { recursive: true });
    }

    if (!rcFile) {
      return { installed: false, reason: 'no_rc_file' };
    }

    // Add integration to RC file
    const integrationBlock = `
# ZeamiTerm Shell Integration
# Added on ${new Date().toISOString()}
if [ -z "\${ZEAMI_TERM_INTEGRATED+x}" ]; then
  export ZEAMI_TERM_INTEGRATED=1
  ${integrationCmd}
fi
`;

    try {
      const currentContent = await fs.readFile(rcFile, 'utf8').catch(() => '');
      await fs.writeFile(rcFile, currentContent + '\n' + integrationBlock, 'utf8');
      return { installed: true, rcFile };
    } catch (error) {
      console.error('Failed to install shell integration:', error);
      return { installed: false, reason: 'write_error', error };
    }
  }

  /**
   * Get shell initialization command for temporary integration
   */
  getInitCommand(shellPath) {
    return this.getIntegrationCommand(shellPath);
  }
}

module.exports = { ShellScriptGenerator };