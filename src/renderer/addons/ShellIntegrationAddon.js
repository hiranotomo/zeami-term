/**
 * ShellIntegrationAddon - Shell integration with command tracking
 * Implements VS Code-style shell integration using OSC sequences
 */

export class ShellIntegrationAddon {
  constructor() {
    this._terminal = null;
    this._commands = new Map();
    this._decorations = new Map();
    this._currentCommand = null;
    this._promptStart = null;
    this._isExecuting = false;
    this._commandIdCounter = 0;
    
    // Bind methods
    this.activate = this.activate.bind(this);
    this.dispose = this.dispose.bind(this);
  }
  
  activate(terminal) {
    this._terminal = terminal;
    
    // Register OSC handlers
    // OSC 7 - Working directory notification
    terminal.parser.registerOscHandler(7, this._handleDirectoryChange.bind(this));
    // OSC 133 - Shell integration sequences
    terminal.parser.registerOscHandler(133, this._handlePromptSequence.bind(this));
    // OSC 633 - Custom sequences for extended data
    terminal.parser.registerOscHandler(633, this._handleCustomSequence.bind(this));
    // OSC 1337 - iTerm2 sequences (for CurrentDir)
    terminal.parser.registerOscHandler(1337, this._handleITermSequence.bind(this));
    
    // Register decoration types
    this._registerDecorationTypes();
    
    // Listen to terminal events
    terminal.onLineFeed(this._onLineFeed.bind(this));
    terminal.onScroll(this._onScroll.bind(this));
    
    console.log('[ShellIntegrationAddon] Activated');
  }
  
  /**
   * Check if notification should be shown for completed command
   */
  _checkNotification(command) {
    console.log('[ShellIntegrationAddon] Checking notification for command:', command);
    
    if (!command) {
      console.warn('[ShellIntegrationAddon] No command provided for notification check');
      return;
    }
    
    if (!window.zeamiTermManager) {
      console.warn('[ShellIntegrationAddon] window.zeamiTermManager not found');
      return;
    }
    
    const manager = window.zeamiTermManager;
    const prefs = manager.preferenceManager;
    
    if (!prefs.get('notifications.enabled')) return;
    
    // Calculate duration
    const duration = command.endTime - command.startTime;
    const commandText = command.command.toLowerCase();
    
    // Check if it's Zeami CLI command
    const isZeamiCLI = commandText.startsWith('zeami ') || 
                       commandText.startsWith('./zeami ') || 
                       commandText.startsWith('../../bin/zeami ') ||
                       commandText.startsWith('./bin/zeami ');
    
    if (isZeamiCLI) {
      console.log('[ShellIntegrationAddon] Zeami CLI command detected, always sending to Message Center');
      // Always send Zeami CLI commands to Message Center
      this._emitEvent('zeamiCLICompleted', {
        command: command.command || command.commandLine || 'Unknown command',
        duration,
        exitCode: command.exitCode,
        output: command.output || [],
        cwd: command.cwd || '',
        isClaude: this._isFromClaude(commandText)
      });
      
      // Also check for regular notification if long-running
      if (duration >= 2000) { // 2 seconds for Zeami CLI
        this._emitEvent('longCommandCompleted', {
          command: command.command || command.commandLine || 'Unknown command',
          duration,
          exitCode: command.exitCode,
          isClaude: false,
          isZeamiCLI: true
        });
      }
      return;
    }
    
    // Check if it's Claude Code
    const claudePatterns = prefs.get('notifications.claudeCode.detectPattern') || [];
    const isClaude = claudePatterns.some(pattern => 
      commandText.includes(pattern.toLowerCase())
    );
    
    // Determine threshold
    let threshold = prefs.get('notifications.longCommandThreshold');
    if (isClaude && prefs.get('notifications.claudeCode.enabled')) {
      threshold = prefs.get('notifications.claudeCode.threshold');
    }
    
    // Check if duration exceeds threshold
    console.log(`[ShellIntegrationAddon] Duration: ${duration}ms, Threshold: ${threshold}ms`);
    
    if (duration >= threshold) {
      console.log('[ShellIntegrationAddon] Duration exceeds threshold, emitting notification event');
      // Emit notification event
      this._emitEvent('longCommandCompleted', {
        command: command.command || command.commandLine || 'Unknown command',
        duration,
        exitCode: command.exitCode,
        isClaude
      });
    } else {
      console.log('[ShellIntegrationAddon] Duration below threshold, no notification');
    }
  }
  
  /**
   * Check if Zeami CLI was called from Claude Code
   */
  _isFromClaude(commandText) {
    // Check for common Claude Code indicators in the command or context
    const claudeIndicators = [
      'claude',
      '--dangerously-skip-permissions',
      'CLAUDE_',
      'claude-code'
    ];
    
    return claudeIndicators.some(indicator => 
      commandText.toLowerCase().includes(indicator)
    );
  }
  
  dispose() {
    // Clean up decorations
    this._decorations.forEach(decoration => decoration.dispose());
    this._decorations.clear();
    this._commands.clear();
    
    if (this._terminal) {
      // Unregister handlers
      this._terminal.parser.registerOscHandler(133, null);
      this._terminal.parser.registerOscHandler(633, null);
      this._terminal.parser.registerOscHandler(1337, null);
    }
    
    this._terminal = null;
  }
  
  /**
   * Register decoration types for visual feedback
   */
  _registerDecorationTypes() {
    // Command start marker
    if (this._terminal.registerDecorationType) {
      this._terminal.registerDecorationType('command-start', {
        backgroundColor: 'rgba(0, 150, 150, 0.1)',
        overviewRulerColor: '#009696'
      });
      
      // Command success
      this._terminal.registerDecorationType('command-success', {
        backgroundColor: 'rgba(0, 255, 0, 0.05)',
        overviewRulerColor: '#00ff00'
      });
      
      // Command error
      this._terminal.registerDecorationType('command-error', {
        backgroundColor: 'rgba(255, 0, 0, 0.05)',
        overviewRulerColor: '#ff0000'
      });
    }
  }
  
  /**
   * Handle OSC 133 sequences (shell integration)
   */
  _handlePromptSequence(data) {
    const parts = data.split(';');
    const type = parts[0];
    
    console.log('[ShellIntegrationAddon] OSC 133 received:', type, 'data:', data);
    
    switch (type) {
      case 'A': // Prompt start
        this._onPromptStart();
        break;
      case 'B': // Prompt end
        this._onPromptEnd();
        break;
      case 'C': // Command start
        this._onCommandStart();
        break;
      case 'D': // Command end
        this._onCommandEnd(parts[1]);
        break;
    }
    
    return true; // Handled
  }
  
  /**
   * Handle OSC 633 sequences (custom extensions)
   */
  _handleCustomSequence(data) {
    const match = data.match(/^([^=]+)=(.*)$/);
    if (!match) return false;
    
    const [, key, value] = match;
    
    switch (key) {
      case 'CommandLine':
        if (this._currentCommand) {
          this._currentCommand.command = value;  // Also set command
          this._currentCommand.commandLine = value;
          console.log('[ShellIntegrationAddon] Command line updated from OSC 633:', value);
        } else {
          console.warn('[ShellIntegrationAddon] Received CommandLine but no current command');
        }
        break;
      case 'CommandTime':
        if (this._currentCommand) {
          this._currentCommand.timestamp = parseInt(value, 10);
        }
        break;
    }
    
    return true;
  }
  
  /**
   * Handle OSC 7 sequences (standard directory change notification)
   * Format: OSC 7 ; file://hostname/path ST
   */
  _handleDirectoryChange(data) {
    try {
      // Extract path from file:// URL
      const match = data.match(/^file:\/\/[^\/]*(.*)$/);
      if (match) {
        let path = decodeURIComponent(match[1]);
        
        // Store CWD for current command
        if (this._currentCommand) {
          this._currentCommand.cwd = path;
        }
        
        // Emit CWD change event
        this._emitEvent('cwdChange', path);
        console.log('[ShellIntegrationAddon] Directory changed via OSC 7:', path);
      }
    } catch (error) {
      console.error('[ShellIntegrationAddon] Error handling OSC 7:', error);
    }
    
    return true;
  }
  
  /**
   * Handle OSC 1337 sequences (iTerm2 compatibility)
   */
  _handleITermSequence(data) {
    const match = data.match(/^CurrentDir=(.*)$/);
    if (match) {
      const cwd = match[1];
      if (this._currentCommand) {
        this._currentCommand.cwd = cwd;
      }
      // Emit CWD change event
      this._emitEvent('cwdChange', cwd);
    }
    
    return true;
  }
  
  /**
   * Prompt lifecycle handlers
   */
  _onPromptStart() {
    this._promptStart = this._terminal.buffer.active.cursorY;
    this._isExecuting = false;
  }
  
  _onPromptEnd() {
    // Prompt is ready for input
  }
  
  _onCommandStart() {
    const commandId = `cmd-${++this._commandIdCounter}`;
    const startLine = this._terminal.buffer.active.cursorY;
    
    // Try to get the command from the previous line (where command was typed)
    let commandText = '';
    try {
      const buffer = this._terminal.buffer.active;
      // Look at the previous line where the command was typed
      if (startLine > 0) {
        const cmdLine = buffer.getLine(startLine - 1);
        if (cmdLine) {
          commandText = cmdLine.translateToString(true).trim();
          // Remove prompt if present (simple heuristic)
          const promptMatch = commandText.match(/(?:.*?[>$#%]\s+)(.+)$/);
          if (promptMatch) {
            commandText = promptMatch[1];
          }
        }
      }
    } catch (e) {
      console.warn('[ShellIntegrationAddon] Failed to get command text:', e);
    }
    
    console.log('[ShellIntegrationAddon] Command started:', commandText, 'at line:', startLine);
    
    this._currentCommand = {
      id: commandId,
      command: commandText,  // Set command text
      commandLine: commandText,
      startLine: startLine,
      endLine: null,
      startTime: Date.now(),
      endTime: null,
      exitCode: null,
      cwd: '',  // Will be updated by OSC sequences
      output: []
    };
    
    this._commands.set(commandId, this._currentCommand);
    this._isExecuting = true;
    
    // Add start decoration
    this._addDecoration(commandId, startLine, 'command-start');
    
    // Emit event
    this._emitEvent('commandStart', this._currentCommand);
    
    console.log('[ShellIntegrationAddon] Current command initialized:', this._currentCommand);
    
  }
  
  _onCommandEnd(exitCodeStr) {
    if (!this._currentCommand) return;
    
    const exitCode = exitCodeStr ? parseInt(exitCodeStr, 10) : 0;
    const endLine = this._terminal.buffer.active.cursorY;
    
    this._currentCommand.endLine = endLine;
    this._currentCommand.endTime = Date.now();
    this._currentCommand.exitCode = exitCode;
    
    // Update decoration based on exit code
    const decorationType = exitCode === 0 ? 'command-success' : 'command-error';
    this._updateDecoration(this._currentCommand.id, decorationType);
    
    // Add gutter decoration
    this._addGutterDecoration(this._currentCommand);
    
    // Emit event
    this._emitEvent('commandEnd', this._currentCommand);
    
    console.log('[ShellIntegrationAddon] Command ended:', this._currentCommand);
    
    // Check if notification should be shown
    this._checkNotification(this._currentCommand);
    
    this._currentCommand = null;
    this._isExecuting = false;
  }
  
  /**
   * Decoration management
   */
  _addDecoration(commandId, line, type) {
    if (!this._terminal.registerDecoration) return;
    
    try {
      const decoration = this._terminal.registerDecoration({
        marker: {
          line: line
        },
        overviewRulerLane: 'full'
      });
      
      if (decoration) {
        this._decorations.set(commandId, decoration);
      }
    } catch (error) {
      console.warn('[ShellIntegrationAddon] Failed to add decoration:', error);
    }
  }
  
  _updateDecoration(commandId, type) {
    const decoration = this._decorations.get(commandId);
    if (decoration && decoration.setType) {
      decoration.setType(type);
    }
  }
  
  _addGutterDecoration(command) {
    if (!this._terminal.element) return;
    
    // Create gutter element
    const gutter = document.createElement('div');
    gutter.className = 'command-gutter';
    gutter.dataset.commandId = command.id;
    
    // Exit code indicator
    const exitCodeEl = document.createElement('span');
    exitCodeEl.className = command.exitCode === 0 ? 'exit-success' : 'exit-error';
    exitCodeEl.textContent = command.exitCode === 0 ? '✓' : '✗';
    exitCodeEl.title = `Exit code: ${command.exitCode}`;
    gutter.appendChild(exitCodeEl);
    
    // Duration
    if (command.endTime) {
      const duration = command.endTime - command.startTime;
      const durationEl = document.createElement('span');
      durationEl.className = 'duration';
      durationEl.textContent = this._formatDuration(duration);
      durationEl.title = `Duration: ${duration}ms`;
      gutter.appendChild(durationEl);
    }
    
    // Add hover handler
    gutter.addEventListener('mouseenter', () => this._showCommandDetails(command));
    gutter.addEventListener('mouseleave', () => this._hideCommandDetails());
    
    // Position gutter
    this._positionGutter(gutter, command.startLine);
  }
  
  _positionGutter(gutter, line) {
    // This is simplified - in production, we'd calculate exact position
    const lineHeight = this._terminal.options.lineHeight || 1.2;
    const fontSize = this._terminal.options.fontSize || 14;
    const top = line * fontSize * lineHeight;
    
    gutter.style.position = 'absolute';
    gutter.style.top = `${top}px`;
    gutter.style.left = '-50px';
    
    // Add to terminal container
    const container = this._terminal.element.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(gutter);
    }
  }
  
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  
  _showCommandDetails(command) {
    // Create tooltip with command details
    const tooltip = document.createElement('div');
    tooltip.className = 'command-tooltip';
    tooltip.innerHTML = `
      <div class="command-detail">
        <strong>Command:</strong> ${this._escapeHtml(command.commandLine || 'N/A')}<br>
        <strong>Exit Code:</strong> ${command.exitCode}<br>
        <strong>Duration:</strong> ${this._formatDuration(command.endTime - command.startTime)}<br>
        <strong>Directory:</strong> ${this._escapeHtml(command.cwd)}<br>
        <strong>Time:</strong> ${new Date(command.startTime).toLocaleString()}
      </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = event.target.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.top}px`;
    tooltip.style.left = `${rect.right + 10}px`;
    tooltip.style.zIndex = '10000';
    
    this._currentTooltip = tooltip;
  }
  
  _hideCommandDetails() {
    if (this._currentTooltip) {
      this._currentTooltip.remove();
      this._currentTooltip = null;
    }
  }
  
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Terminal event handlers
   */
  _onLineFeed() {
    // Track output lines for current command
    if (this._currentCommand && this._isExecuting) {
      const line = this._terminal.buffer.active.cursorY;
      this._currentCommand.output.push(line);
    }
  }
  
  _onScroll() {
    // Update gutter positions on scroll
    // This would need proper implementation for production
  }
  
  /**
   * Event emitter
   */
  _emitEvent(eventName, data) {
    if (this._terminal.onShellIntegrationEvent) {
      this._terminal.onShellIntegrationEvent(eventName, data);
    }
  }
  
  /**
   * Public API
   */
  
  /**
   * Navigate to previous command
   */
  navigateToPreviousCommand() {
    const currentLine = this._terminal.buffer.active.cursorY;
    const commands = Array.from(this._commands.values())
      .filter(cmd => cmd.startLine < currentLine)
      .sort((a, b) => b.startLine - a.startLine);
    
    if (commands.length > 0) {
      this._terminal.scrollToLine(commands[0].startLine);
      return commands[0];
    }
    return null;
  }
  
  /**
   * Navigate to next command
   */
  navigateToNextCommand() {
    const currentLine = this._terminal.buffer.active.cursorY;
    const commands = Array.from(this._commands.values())
      .filter(cmd => cmd.startLine > currentLine)
      .sort((a, b) => a.startLine - b.startLine);
    
    if (commands.length > 0) {
      this._terminal.scrollToLine(commands[0].startLine);
      return commands[0];
    }
    return null;
  }
  
  /**
   * Get all commands
   */
  getCommands() {
    return Array.from(this._commands.values());
  }
  
  /**
   * Get failed commands
   */
  getFailedCommands() {
    return this.getCommands().filter(cmd => cmd.exitCode !== 0);
  }
  
  /**
   * Get output lines from line numbers
   * @param {number[]} lineNumbers - Array of line numbers
   * @returns {string[]} Array of line contents
   */
  _getOutputLines(lineNumbers) {
    const lines = [];
    const buffer = this._terminal.buffer.active;
    
    for (const lineNum of lineNumbers) {
      if (lineNum >= 0 && lineNum < buffer.length) {
        const line = buffer.getLine(lineNum);
        if (line) {
          let lineText = '';
          for (let i = 0; i < line.length; i++) {
            const cell = line.getCell(i);
            if (cell) {
              lineText += cell.getChars() || ' ';
            }
          }
          lines.push(lineText.trim());
        }
      }
    }
    
    return lines.filter(line => line.length > 0);
  }
}