const { EventEmitter } = require('events');
const { MessageRouter } = require('./messageRouter');
const { PatternDetector } = require('./patternDetector');
const { TerminalBackend } = require('./terminalBackend');
const path = require('path');

class ZeamiInstance extends EventEmitter {
  constructor(options) {
    super();
    this.sessionId = options.sessionId;
    this.shell = options.shell;
    this.args = options.args || [];
    this.cwd = options.cwd;
    this.env = options.env;
    this.profile = options.profile;
    this.ptyProcess = null;
    this.messageRouter = new MessageRouter();
    this.patternDetector = new PatternDetector();
    this.enableShellIntegration = options.enableShellIntegration !== false; // default true
    this.shellIntegrationCmd = options.shellIntegrationCmd; // Command to run for shell integration
    this.shellIntegrationInjected = false;
    this.context = {
      currentDirectory: this.cwd,
      history: [],
      detectedPatterns: [],
      profile: this.profile
    };
  }

  async start() {
    // Create terminal backend
    this.ptyProcess = new TerminalBackend({
      shell: this.shell,
      args: this.args,
      cwd: this.cwd,
      env: this.env
    });

    // Handle terminal output
    this.ptyProcess.on('data', (data) => {
      // Store in history
      this.context.history.push({
        type: 'output',
        data,
        timestamp: Date.now()
      });

      // Detect patterns
      const patterns = this.patternDetector.analyze(data);
      if (patterns.length > 0) {
        patterns.forEach(pattern => {
          this.context.detectedPatterns.push(pattern);
          this.emit('pattern-detected', pattern);
        });
      }

      // Forward to renderer
      this.emit('data', data);
    });

    // Handle terminal exit
    this.ptyProcess.on('exit', ({ code, signal }) => {
      this.emit('exit', { exitCode: code, signal });
    });

    // Handle errors
    this.ptyProcess.on('error', (error) => {
      console.error('Terminal error:', error);
      this.emit('error', error);
    });

    // Start the terminal
    this.ptyProcess.spawn();
    
    // Inject shell integration after a short delay
    if (this.enableShellIntegration) {
      setTimeout(() => {
        this.injectShellIntegration();
      }, 500); // Wait for shell to initialize
    }
  }

  write(data) {
    console.log('[INSTANCE] write called with:', data);
    if (this.ptyProcess) {
      // Store in history
      this.context.history.push({
        type: 'input',
        data,
        timestamp: Date.now()
      });

      // Route through message router for enhancement
      console.log('[INSTANCE] Processing through message router');
      const enhanced = this.messageRouter.processInput(data, this.context);
      console.log('[INSTANCE] Enhanced data:', enhanced);
      
      // Write to PTY
      console.log('[INSTANCE] Writing to PTY process');
      this.ptyProcess.write(enhanced);
      console.log('[INSTANCE] Data written to PTY');
    } else {
      console.log('[INSTANCE] No PTY process available');
    }
  }

  resize(cols, rows) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  getContext() {
    return {
      ...this.context,
      pid: this.ptyProcess?.pid,
      running: !!this.ptyProcess
    };
  }

  destroy() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
  
  injectShellIntegration() {
    if (this.shellIntegrationInjected || !this.ptyProcess) {
      return;
    }
    
    console.log('[ZeamiInstance] Injecting shell integration...');
    
    // Use the provided shell integration command if available
    if (this.shellIntegrationCmd) {
      console.log('[ZeamiInstance] Using provided shell integration command:', this.shellIntegrationCmd);
      
      // Clear any partial input first
      this.ptyProcess.write('\x03'); // Ctrl+C
      
      setTimeout(() => {
        // Execute the shell integration command
        this.ptyProcess.write(this.shellIntegrationCmd + '\n');
        
        this.shellIntegrationInjected = true;
        console.log('[ZeamiInstance] Shell integration command executed');
        
        // Clear the screen after injection
        setTimeout(() => {
          this.ptyProcess.write('clear\n');
        }, 200);
      }, 100);
    } else {
      // Fallback to inline integration (for backward compatibility)
      const shellName = path.basename(this.shell || process.env.SHELL || '/bin/bash');
      const integration = this.getShellIntegrationCode(shellName);
      
      if (integration) {
        // Clear any partial input first
        this.ptyProcess.write('\x03'); // Ctrl+C
        
        // Write integration code
        setTimeout(() => {
          // Send each line separately to avoid issues with long commands
          const lines = integration.split('\n').filter(line => line.trim());
          lines.forEach((line, index) => {
            setTimeout(() => {
              this.ptyProcess.write(line + '\n');
            }, index * 10); // Small delay between lines
          });
          
          this.shellIntegrationInjected = true;
          console.log('[ZeamiInstance] Shell integration injected for', shellName);
          
          // Clear the screen after injection
          setTimeout(() => {
            this.ptyProcess.write('clear\n');
          }, lines.length * 10 + 100);
        }, 100);
      }
    }
  }
  
  getShellIntegrationCode(shellName) {
    // Base integration code that should work for bash and zsh
    const baseIntegration = [
      '# ZeamiTerm Shell Integration (temporary)',
      'if [[ ! "$PS1" =~ "OSC 133" ]]; then',
      '  export ZEAMI_SHELL_INTEGRATED=1',
      '  ',
      '  # Add markers to prompt',
      '  PS1="\\[\\033]133;A\\007\\]$PS1\\[\\033]133;B\\007\\]"',
      '  ',
      '  # Command execution hooks',
      '  __zeami_preexec() {',
      '    printf "\\033]133;C\\007"',
      '  }',
      '  ',
      '  __zeami_precmd() {',
      '    local exit_code=$?',
      '    printf "\\033]133;D;%s\\007" "$exit_code"',
      '    return $exit_code',
      '  }'
    ].join('\n');
    
    switch (shellName) {
      case 'bash':
        return baseIntegration + '\n' + [
          '  # Bash-specific setup',
          '  trap \'__zeami_preexec\' DEBUG',
          '  PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }__zeami_precmd"',
          'fi'
        ].join('\n') + '\n';
        
      case 'zsh':
        return baseIntegration + '\n' + [
          '  # Zsh-specific setup',
          '  preexec() { __zeami_preexec; }',
          '  precmd() { __zeami_precmd; }',
          'fi'
        ].join('\n') + '\n';
        
      case 'fish':
        // Fish has different syntax
        return [
          '# ZeamiTerm Shell Integration for Fish',
          'if not set -q ZEAMI_SHELL_INTEGRATED',
          '  set -x ZEAMI_SHELL_INTEGRATED 1',
          '  ',
          '  function fish_prompt --description \'Write out the prompt\'',
          '    printf "\\033]133;A\\007"',
          '    # Call the original prompt function if it exists',
          '    if functions -q __fish_prompt_original',
          '      __fish_prompt_original',
          '    else',
          '      echo -n (prompt_pwd) \'> \'',
          '    end',
          '    printf "\\033]133;B\\007"',
          '  end',
          '  ',
          '  function __zeami_preexec --on-event fish_preexec',
          '    printf "\\033]133;C\\007"',
          '  end',
          '  ',
          '  function __zeami_postexec --on-event fish_postexec',
          '    printf "\\033]133;D;%s\\007" $status',
          '  end',
          'end'
        ].join('\n') + '\n';
        
      default:
        // Try bash-style for unknown shells
        console.log('[ZeamiInstance] Unknown shell:', shellName, '- trying bash-style integration');
        return baseIntegration + '\n' + [
          '  # Generic setup (bash-style)',
          '  trap \'__zeami_preexec\' DEBUG 2>/dev/null || true',
          '  PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }__zeami_precmd"',
          'fi'
        ].join('\n') + '\n';
    }
  }
}

module.exports = { ZeamiInstance };