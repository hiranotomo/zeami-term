/**
 * ShellIntegrationAddon - Shell integration with command tracking
 * Implements VS Code-style shell integration using OSC sequences
 */

import { ciDebugger } from '../utils/CommandIntelligenceDebugger.js';

export class ShellIntegrationAddon {
  constructor(terminalId) {
    this._terminal = null;
    this._terminalId = terminalId;
    this._commands = new Map();
    this._decorations = new Map();
    this._currentCommand = null;
    this._promptStart = null;
    this._isExecuting = false;
    this._commandIdCounter = 0;
    this._pendingCommandText = null;
    
    // 拡張データ収集
    this._collectedData = {
      commands: new Map(),
      currentCommand: null,
      cwd: '/',  // Will be updated by OSC 7
      
      // 追加情報
      windowTitle: '',
      iconTitle: '',
      userVars: new Map(),
      gitInfo: {},
      marks: [],
      badges: [],
      notifications: [],
      hyperlinks: new Map(),
      clipboard: '',
      
      // 環境情報
      hostname: '',
      username: '',
      shell: '/bin/bash',  // Will be updated from terminal info
      
      // Claude Code セッション検出
      inClaudeSession: false,
      claudeSessionStart: null
    };
    
    // 統計情報
    this._stats = {
      totalCommands: 0,
      successCount: 0,
      errorCount: 0,
      totalDuration: 0
    };
    
    // Bind methods
    this.activate = this.activate.bind(this);
    this.dispose = this.dispose.bind(this);
  }
  
  activate(terminal) {
    this._terminal = terminal;
    this._userInputBuffer = '';
    this._lastInputTime = 0;
    
    // Listen for user INPUT (what the user types)
    // onData captures user input before it's sent to PTY
    this._terminal.onData((data) => {
      console.log('[ShellIntegration] User input:', data.length, 'bytes');
      this._sendTerminalOutputToHub(data, 'input');
      
      // Track user input for Claude Code sessions
      if (this._collectedData.inClaudeSession) {
        this._trackClaudeUserInput(data);
      }
      
      // Also check for Claude patterns in user input
      this._detectClaudeCodePatterns(data);
    });
    
    // NOTE: Terminal output is now captured in ZeamiTermManager and forwarded to
    // this addon via _sendTerminalOutputToHub method directly
    
    // Register ALL OSC handlers for comprehensive data collection
    // OSC 0,1,2 - Window/Icon titles
    [0, 1, 2].forEach(num => {
      terminal.parser.registerOscHandler(num, (data) => this._handleTitle(num, data));
    });
    
    // OSC 4 - Color palette
    terminal.parser.registerOscHandler(4, this._handleColorPalette.bind(this));
    
    // OSC 7 - Working directory notification
    terminal.parser.registerOscHandler(7, this._handleDirectoryChange.bind(this));
    
    // OSC 8 - Hyperlinks
    terminal.parser.registerOscHandler(8, this._handleHyperlink.bind(this));
    
    // OSC 9 - Notifications
    terminal.parser.registerOscHandler(9, this._handleNotification.bind(this));
    
    // OSC 10-19 - Various color settings
    for (let i = 10; i <= 19; i++) {
      terminal.parser.registerOscHandler(i, (data) => this._handleColorSetting(i, data));
    }
    
    // OSC 52 - Clipboard operations
    terminal.parser.registerOscHandler(52, this._handleClipboard.bind(this));
    
    // OSC 133 - Shell integration sequences
    terminal.parser.registerOscHandler(133, this._handlePromptSequence.bind(this));
    ciDebugger.logOSC(133, 'Shell integration registered');
    
    // OSC 633 - Custom sequences for extended data
    terminal.parser.registerOscHandler(633, this._handleCustomSequence.bind(this));
    ciDebugger.logOSC(633, 'Custom sequences registered');
    
    // OSC 777 - Extended notifications
    terminal.parser.registerOscHandler(777, this._handleExtendedNotification.bind(this));
    
    // OSC 1337 - iTerm2 sequences (for CurrentDir and more)
    terminal.parser.registerOscHandler(1337, this._handleITermSequence.bind(this));
    
    // Register decoration types
    this._registerDecorationTypes();
    
    // Listen to terminal events
    terminal.onLineFeed(this._onLineFeed.bind(this));
    terminal.onScroll(this._onScroll.bind(this));
    
    console.log('[ShellIntegrationAddon] Activated with full OSC support');
    ciDebugger.log('osc', 'All OSC handlers registered', { terminalId: this._terminalId });
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
    console.log('[DEBUG] OSC 133 full data:', JSON.stringify(data));
    console.log('[DEBUG] OSC 133 parts:', JSON.stringify(parts));
    
    // Log if we're in Claude session
    if (this._collectedData.inClaudeSession) {
      console.log('[ShellIntegrationAddon] OSC 133 in Claude session:', data);
    }
    
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
    console.log('[DEBUG] OSC 633 received:', JSON.stringify(data));
    
    const match = data.match(/^([^=]+)=(.*)$/);
    if (!match) {
      console.log('[DEBUG] OSC 633 no match for pattern');
      return false;
    }
    
    const [, key, value] = match;
    console.log('[DEBUG] OSC 633 parsed - key:', key, 'value:', value);
    
    switch (key) {
      case 'CommandLine':
        // Decode the command line value properly
        let decodedValue = value;
        try {
          // Check if it needs UTF-8 decoding
          if (value.includes('%') || /[\x80-\xFF]/.test(value)) {
            decodedValue = decodeURIComponent(escape(value));
          }
        } catch (e) {
          // If decoding fails, use original value
          console.warn('[ShellIntegrationAddon] Failed to decode command line:', e);
        }
        
        if (this._currentCommand) {
          this._currentCommand.command = decodedValue;  // Also set command
          this._currentCommand.commandLine = decodedValue;
          console.log('[ShellIntegrationAddon] Command line updated from OSC 633:', decodedValue);
        } else {
          // Store the command text for when C is received
          this._pendingCommandText = decodedValue;
          console.log('[ShellIntegrationAddon] Stored pending command line from OSC 633:', decodedValue);
        }
        break;
        
      case 'ClaudeInput':
        // Claude Code user input
        this._handleClaudeInput(value);
        break;
        
      case 'ClaudeOutput':
        // Claude Code response
        this._handleClaudeOutput(value);
        break;
        
      case 'ClaudeCommand':
        // Claude Code executed command
        this._handleClaudeCommand(value);
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
   * Handle OSC 0,1,2 - Window/Icon titles
   */
  _handleTitle(type, data) {
    switch (type) {
      case 0: // Both window and icon
        this._collectedData.windowTitle = data;
        this._collectedData.iconTitle = data;
        break;
      case 1: // Icon only
        this._collectedData.iconTitle = data;
        break;
      case 2: // Window only
        this._collectedData.windowTitle = data;
        break;
    }
    console.log(`[ShellIntegrationAddon] Title updated (type ${type}):`, data);
    return true;
  }
  
  /**
   * Handle OSC 4 - Color palette
   */
  _handleColorPalette(data) {
    // Color palette changes - store if needed
    console.log('[ShellIntegrationAddon] Color palette change:', data);
    return true;
  }
  
  /**
   * Handle OSC 8 - Hyperlinks
   */
  _handleHyperlink(data) {
    const parts = data.split(';');
    if (parts.length >= 2) {
      const params = parts[0];
      const uri = parts[1];
      
      const linkId = `link-${Date.now()}`;
      this._collectedData.hyperlinks.set(linkId, {
        uri,
        params,
        line: this._terminal.buffer.active.cursorY,
        timestamp: Date.now()
      });
      
      console.log('[ShellIntegrationAddon] Hyperlink detected:', uri);
    }
    return true;
  }
  
  /**
   * Handle OSC 9 - Simple notifications
   */
  _handleNotification(message) {
    this._collectedData.notifications.push({
      type: 'simple',
      message,
      timestamp: Date.now()
    });
    
    // Also emit for immediate handling
    this._emitEvent('notification', { message });
    console.log('[ShellIntegrationAddon] Notification:', message);
    return true;
  }
  
  /**
   * Handle OSC 10-19 - Color settings
   */
  _handleColorSetting(type, data) {
    // Various terminal colors - log for now
    console.log(`[ShellIntegrationAddon] Color setting (OSC ${type}):`, data);
    return true;
  }
  
  /**
   * Handle OSC 52 - Clipboard operations
   */
  _handleClipboard(data) {
    const parts = data.split(';');
    if (parts.length >= 2) {
      const operation = parts[0];
      const content = parts[1];
      
      if (content === '?') {
        // Request for clipboard content
        console.log('[ShellIntegrationAddon] Clipboard content requested');
      } else {
        // Set clipboard content
        try {
          const decoded = atob(content);
          this._collectedData.clipboard = decoded;
          console.log('[ShellIntegrationAddon] Clipboard updated');
        } catch (e) {
          console.warn('[ShellIntegrationAddon] Failed to decode clipboard data:', e);
        }
      }
    }
    return true;
  }
  
  /**
   * Handle OSC 777 - Extended notifications
   */
  _handleExtendedNotification(data) {
    const parts = data.split(';');
    if (parts.length >= 3) {
      const [type, title, body] = parts;
      
      this._collectedData.notifications.push({
        type: 'extended',
        notificationType: type,
        title,
        body,
        timestamp: Date.now()
      });
      
      // Emit for immediate handling
      this._emitEvent('extendedNotification', { type, title, body });
      console.log('[ShellIntegrationAddon] Extended notification:', title);
    }
    return true;
  }
  
  /**
   * Handle OSC 1337 sequences (iTerm2 compatibility)
   */
  _handleITermSequence(data) {
    // Parse various iTerm2 extensions
    const [command, ...args] = data.split(';');
    
    switch (command) {
      case 'SetMark':
        this._collectedData.marks.push({
          line: this._terminal.buffer.active.cursorY,
          timestamp: Date.now()
        });
        console.log('[ShellIntegrationAddon] Mark set');
        break;
        
      case 'CurrentDir':
        const dirMatch = data.match(/^CurrentDir=(.*)$/);
        if (dirMatch) {
          const cwd = dirMatch[1];
          this._collectedData.cwd = cwd;
          if (this._currentCommand) {
            this._currentCommand.cwd = cwd;
          }
          this._emitEvent('cwdChange', cwd);
        }
        break;
        
      case 'SetUserVar':
        const varMatch = data.match(/^SetUserVar=([^=]+)=(.*)$/);
        if (varMatch) {
          const [, key, value] = varMatch;
          this._collectedData.userVars.set(key, value);
          
          // Special handling for git info
          if (key === 'gitBranch' || key === 'gitChanges') {
            this._collectedData.gitInfo[key] = value;
          }
          
          console.log(`[ShellIntegrationAddon] User var set: ${key}=${value}`);
        }
        break;
        
      case 'Badge':
        const badgeMatch = data.match(/^Badge=(.*)$/);
        if (badgeMatch) {
          this._collectedData.badges.push({
            text: badgeMatch[1],
            timestamp: Date.now()
          });
          console.log('[ShellIntegrationAddon] Badge set:', badgeMatch[1]);
        }
        break;
        
      case 'RemoteHost':
        const hostMatch = data.match(/^RemoteHost=(.*)@(.*)$/);
        if (hostMatch) {
          this._collectedData.username = hostMatch[1];
          this._collectedData.hostname = hostMatch[2];
          console.log(`[ShellIntegrationAddon] Remote host: ${hostMatch[1]}@${hostMatch[2]}`);
        }
        break;
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
    
    // Store any pending command text
    const pendingCommandText = this._pendingCommandText;
    this._pendingCommandText = null;
    
    // Check if this is a Claude Code command
    if (pendingCommandText && pendingCommandText.toLowerCase().includes('claude')) {
      this._collectedData.inClaudeSession = true;
      this._collectedData.claudeSessionStart = Date.now();
      console.log('[ShellIntegrationAddon] Claude Code session detected');
    }
    
    // Use pending command text from OSC 633 if available
    let commandText = pendingCommandText || '';
    
    // Only try to read from buffer if we don't have command text from OSC 633
    if (!commandText) {
      console.warn('[ShellIntegrationAddon] No command text from OSC 633, attempting buffer read...');
      try {
        const buffer = this._terminal.buffer.active;
        // Try current line first
        const currentLine = buffer.getLine(startLine);
        if (currentLine) {
          // Use translateToString to properly extract text
          commandText = currentLine.translateToString(false).trim();
          
          // Remove prompt if present
          const promptMatch = commandText.match(/(?:.*?[>$#%]\s+)(.+)$/);
          if (promptMatch) {
            commandText = promptMatch[1];
          }
        }
        
        // If still empty or garbled, try previous line
        if (!commandText || commandText.match(/^[ア-ン\s]+$/)) {
          const prevLine = buffer.getLine(startLine - 1);
          if (prevLine) {
            const cleanText = prevLine.translateToString(false).trim();
            if (cleanText && !cleanText.match(/^[ア-ン\s]+$/)) {
              commandText = cleanText;
            }
          }
        }
      } catch (e) {
        console.warn('[ShellIntegrationAddon] Failed to get command text from buffer:', e);
      }
    }
    
    // Log warning if command text appears garbled
    if (commandText && commandText.match(/^[ア-ン\s]+$/)) {
      console.warn('[ShellIntegrationAddon] Command text appears garbled:', commandText);
      // Keep the text from OSC 633 if available
      if (this._pendingCommandText) {
        commandText = this._pendingCommandText;
        console.log('[ShellIntegrationAddon] Using OSC 633 command text instead:', commandText);
      }
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
      cwd: this._collectedData.cwd || '',  // Use current CWD if available
      output: []
    };
    
    this._commands.set(commandId, this._currentCommand);
    this._isExecuting = true;
    
    // Add start decoration
    this._addDecoration(commandId, startLine, 'command-start');
    
    // Send real-time update to Command Intelligence Hub
    const executionData = this._createComprehensiveCommandData({
      ...this._currentCommand,
      endTime: Date.now() // Temporary for status update
    });
    executionData.execution.status = 'running';
    
    if (window.zeamiAPI && window.zeamiAPI.invoke) {
      try {
        // Ensure the entire object is serializable
        const serializedData = JSON.parse(JSON.stringify(executionData));
        
        window.zeamiAPI.invoke('command:execution-complete', serializedData)
          .catch(error => {
            console.error('[ShellIntegrationAddon] Error sending command start:', error);
          });
      } catch (serializationError) {
        console.error('[ShellIntegrationAddon] Failed to serialize command start data:', serializationError);
        console.error('[ShellIntegrationAddon] Problematic data:', executionData);
      }
    }
    
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
    
    // Update statistics
    this._stats.totalCommands++;
    this._stats.totalDuration += (this._currentCommand.endTime - this._currentCommand.startTime);
    if (exitCode === 0) {
      this._stats.successCount++;
    } else {
      this._stats.errorCount++;
    }
    
    // Create comprehensive command execution data
    const comprehensiveData = this._createComprehensiveCommandData(this._currentCommand);
    
    // Store in collected data
    this._collectedData.commands.set(comprehensiveData.id, comprehensiveData);
    
    // Update decoration based on exit code
    const decorationType = exitCode === 0 ? 'command-success' : 'command-error';
    this._updateDecoration(this._currentCommand.id, decorationType);
    
    // Add gutter decoration
    this._addGutterDecoration(this._currentCommand);
    
    // Send to Command Intelligence Hub via IPC
    console.log('[ShellIntegrationAddon] Sending command to Intelligence Hub:', comprehensiveData.id);
    console.log('[ShellIntegrationAddon] Command details:', {
      command: comprehensiveData.command.raw,
      exitCode: comprehensiveData.execution.exitCode,
      duration: comprehensiveData.execution.duration
    });
    
    if (window.zeamiAPI && window.zeamiAPI.invoke) {
      try {
        // Ensure the entire object is serializable
        const serializedData = JSON.parse(JSON.stringify(comprehensiveData));
        
        window.zeamiAPI.invoke('command:execution-complete', serializedData)
          .then(result => {
            if (!result.success) {
              console.error('[ShellIntegrationAddon] Failed to register command execution:', result.error);
            } else {
              console.log('[ShellIntegrationAddon] Command execution registered successfully:', result);
            }
          })
          .catch(error => {
            console.error('[ShellIntegrationAddon] Error sending command execution:', error);
          });
      } catch (serializationError) {
        console.error('[ShellIntegrationAddon] Failed to serialize command data:', serializationError);
        console.error('[ShellIntegrationAddon] Problematic data:', comprehensiveData);
      }
    }
    
    // Emit comprehensive event
    this._emitEvent('commandExecutionComplete', comprehensiveData);
    
    // Also emit legacy event for compatibility
    this._emitEvent('commandEnd', this._currentCommand);
    
    console.log('[ShellIntegrationAddon] Command ended with comprehensive data:', comprehensiveData);
    
    // Check if notification should be shown
    this._checkNotification(this._currentCommand);
    
    this._currentCommand = null;
    this._isExecuting = false;
  }
  
  /**
   * Decoration management
   */
  _addDecoration(commandId, line, type) {
    // Temporarily disable decorations due to xterm.js API incompatibility
    // TODO: Re-enable when we update to a compatible xterm.js version
    return;
    
    /*
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
    */
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
          // Use translateToString for proper UTF-8 handling
          const lineText = line.translateToString(false);
          if (lineText.trim()) {
            lines.push(lineText.trim());
          }
        }
      }
    }
    
    return lines;
  }
  
  /**
   * Create comprehensive command execution data
   */
  _createComprehensiveCommandData(command) {
    // Get output text
    const outputLines = this._getOutputLines(command.output || []);
    const outputText = outputLines.join('\n');
    
    // Detect executor type
    const executorType = this._detectExecutorType(command.command);
    
    // Get window info - fix window ID extraction
    const urlParams = new URLSearchParams(window.location.search);
    const windowIndex = urlParams.get('windowIndex') || '0';
    const windowIdParam = urlParams.get('windowId') || windowIndex;
    const windowTitle = document.title || this._collectedData.windowTitle || '';
    
    return {
      // Basic info
      id: command.id,
      timestamp: command.startTime,
      type: 'command-execution',
      
      // Context
      context: {
        app: {
          id: 'zeami-term',
          version: window.electronAPI?.getAppVersion?.() || '0.1.16',
          instance: window.electronAPI?.getProcessId?.() || 'browser'
        },
        window: {
          id: windowIdParam,
          index: parseInt(windowIndex, 10),
          title: windowTitle,
          pid: window.electronAPI?.getProcessId?.() || 0
        },
        terminal: {
          id: this._terminalId,
          label: this._terminalId?.split('-')[1]?.toUpperCase() || 'A',
          type: 'standard',
          profile: 'default'
        },
        session: {
          id: `session-${this._terminalId}-${Date.now()}`,
          startTime: Date.now(),
          shell: this._collectedData.shell
        }
      },
      
      // Executor
      executor: {
        type: executorType,
        name: this._getExecutorName(executorType),
        version: 'latest',
        trigger: 'user-request'
      },
      
      // Command details
      command: {
        raw: command.command || command.commandLine || '',
        parsed: this._parseCommand(command.command),
        category: this._categorizeCommand(command.command),
        sensitivity: this._assessSensitivity(command.command)
      },
      
      // Execution info
      execution: {
        startTime: command.startTime,
        endTime: command.endTime,
        duration: command.endTime - command.startTime,
        exitCode: command.exitCode,
        signal: null,
        status: command.exitCode === 0 ? 'success' : 'error',
        environment: {
          cwd: command.cwd || this._collectedData.cwd,
          env: {}
        },
        resources: {
          cpuUsage: 0,
          memoryUsage: 0,
          outputSize: outputText.length
        }
      },
      
      // Output
      output: {
        stdout: {
          lines: outputLines.length,
          size: outputText.length,
          sample: outputText.substring(0, 1000),
          hasMore: outputText.length > 1000
        },
        stderr: {
          lines: 0,
          size: 0,
          sample: '',
          hasMore: false
        }
      },
      
      // Metadata - ensure all data is serializable
      metadata: {
        tags: [],
        priority: 'normal',
        relatedCommands: [],
        gitInfo: this._serializeObject(this._collectedData.gitInfo),
        projectInfo: {},
        userVars: this._serializeMap(this._collectedData.userVars),
        marks: this._serializeArray(this._collectedData.marks),
        badges: this._serializeArray(this._collectedData.badges),
        hyperlinks: this._serializeMap(this._collectedData.hyperlinks)
      }
    };
  }
  
  /**
   * Detect executor type from command
   */
  _detectExecutorType(command) {
    if (!command) return 'human';
    
    const cmd = command.toLowerCase();
    
    // Claude Code patterns
    if (cmd.includes('claude') || 
        cmd.includes('--dangerously-skip-permissions')) {
      return 'claude-code';
    }
    
    // Check if we're currently in Claude Code session
    if (this._collectedData.inClaudeSession) {
      return 'claude-code';
    }
    
    // Gemini patterns (future)
    if (cmd.includes('gemini')) {
      return 'gemini-cli';
    }
    
    // Shell script
    if (cmd.endsWith('.sh') || cmd.startsWith('bash ') || cmd.startsWith('./')) {
      return 'shell-script';
    }
    
    return 'human';
  }
  
  /**
   * Get executor name
   */
  _getExecutorName(type) {
    const names = {
      'claude-code': 'Claude Code',
      'gemini-cli': 'Gemini CLI',
      'shell-script': 'Shell Script',
      'human': 'Human'
    };
    return names[type] || 'Unknown';
  }
  
  /**
   * Send terminal output to Command Intelligence Hub in real-time
   */
  _sendTerminalOutputToHub(data, type) {
    try {
      // Get window info
      const urlParams = new URLSearchParams(window.location.search);
      const windowIndex = urlParams.get('windowIndex') || '0';
      const windowIdParam = urlParams.get('windowId') || windowIndex;
      
      // Create a simple, serializable object
      const outputData = {
        id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'terminal-output',
        outputType: type, // 'input' or 'output'
        data: String(data), // Ensure data is a string
        context: {
          app: {
            id: 'zeami-term',
            version: '0.1.16',
            instance: 'browser'
          },
          window: {
            id: String(windowIdParam),
            index: parseInt(windowIndex, 10),
            title: String(document.title || ''),
            pid: 0
          },
          terminal: {
            id: String(this._terminalId || 'terminal-a'),
            label: String(this._terminalId?.split('-')[1]?.toUpperCase() || 'A'),
            type: 'standard',
            profile: 'default'
          },
          session: {
            id: `session-${this._terminalId}-${Date.now()}`,
            startTime: Date.now(),
            shell: String(this._collectedData.shell || '/bin/bash')
          }
        },
        collectedData: {
          currentDirectory: String(this._collectedData.currentDirectory || '/'),
          inClaudeSession: Boolean(this._collectedData.inClaudeSession),
          isCommand: Boolean(this._currentCommand !== null)
        }
      };
      
      // Ensure the object is fully serializable
      const serialized = JSON.parse(JSON.stringify(outputData));
      
      // Send to main process
      if (window.zeamiAPI && window.zeamiAPI.invoke) {
        window.zeamiAPI.invoke('terminal:output', serialized)
          .catch(err => console.warn('[ShellIntegration] Failed to send output:', err));
      }
    } catch (error) {
      console.error('[ShellIntegration] Failed to send terminal output:', error);
    }
  }
  
  /**
   * Parse command into components
   */
  _parseCommand(raw) {
    if (!raw) return { program: '', args: [], flags: {} };
    
    const parts = raw.trim().split(/\s+/);
    const program = parts[0] || '';
    const args = [];
    const flags = {};
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('-')) {
        const nextPart = parts[i + 1];
        if (nextPart && !nextPart.startsWith('-')) {
          flags[part] = nextPart;
          i++;
        } else {
          flags[part] = true;
        }
      } else {
        args.push(part);
      }
    }
    
    return { program, args, flags };
  }
  
  /**
   * Categorize command
   */
  _categorizeCommand(raw) {
    if (!raw) return 'other';
    
    const categories = {
      build: /^(npm|yarn|pnpm|make|cargo|go)\s+(run\s+)?(build|compile)/i,
      test: /^(npm|yarn|jest|mocha|pytest|go)\s+(run\s+)?(test|spec)/i,
      deploy: /^(deploy|push|publish|release)/i,
      git: /^git\s+/i,
      file: /^(ls|cd|mkdir|rm|cp|mv|find|grep|cat|echo|touch)/i,
      system: /^(ps|top|kill|df|du|free|systemctl|service)/i,
      install: /^(npm|yarn|pnpm|pip|gem|apt|brew|cargo)\s+(install|add|i)/i,
      zeami: /^(zeami|\.\/zeami|\.\.\/.*zeami)/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(raw)) {
        return category;
      }
    }
    
    return 'other';
  }
  
  /**
   * Assess command sensitivity
   */
  _assessSensitivity(raw) {
    if (!raw) return 'normal';
    
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /:(){ :|:& };:/,
      /dd\s+if=.*of=\/dev\//,
      /mkfs/,
      /> \/dev\/sda/
    ];
    
    const sensitivePatterns = [
      /password|passwd|token|secret|key|credential/i,
      /ssh\s+/,
      /sudo\s+/,
      /chmod\s+777/,
      /curl.*(-d|--data)/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(raw)) {
        return 'dangerous';
      }
    }
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(raw)) {
        return 'sensitive';
      }
    }
    
    return 'normal';
  }
  
  /**
   * Public API methods
   */
  
  /**
   * Get comprehensive data collection
   */
  getComprehensiveData() {
    return {
      terminal: {
        id: this._terminalId,
        windowId: window.zeamiTermManager?.getWindowId?.() || 'unknown'
      },
      environment: {
        cwd: this._collectedData.cwd,
        shell: this._collectedData.shell,
        hostname: this._collectedData.hostname || 'localhost',
        username: this._collectedData.username || 'user'
      },
      session: {
        windowTitle: this._collectedData.windowTitle,
        userVars: this._serializeMap(this._collectedData.userVars),
        marks: this._serializeArray(this._collectedData.marks),
        badges: this._serializeArray(this._collectedData.badges)
      },
      git: this._serializeObject(this._collectedData.gitInfo),
      commands: this._serializeArray(Array.from(this._collectedData.commands.values())),
      notifications: this._serializeArray(this._collectedData.notifications),
      hyperlinks: this._serializeArray(Array.from(this._collectedData.hyperlinks.values())),
      statistics: this.getStatistics()
    };
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this._stats,
      averageDuration: this._stats.totalCommands > 0 
        ? Math.round(this._stats.totalDuration / this._stats.totalCommands) 
        : 0,
      successRate: this._stats.totalCommands > 0
        ? Math.round((this._stats.successCount / this._stats.totalCommands) * 100)
        : 0
    };
  }
  
  /**
   * Clear history
   */
  clearHistory() {
    this._commands.clear();
    this._collectedData.commands.clear();
    this._stats = {
      totalCommands: 0,
      successCount: 0,
      errorCount: 0,
      totalDuration: 0
    };
  }
  
  /**
   * Detect Claude Code patterns in terminal output
   */
  _detectClaudeCodePatterns(data) {
    // Claude Code specific patterns
    const claudePatterns = [
      /Claude Code/i,
      /╭────+╮/,  // Claude's UI borders
      /│.*Claude.*│/,
      /╰────+╯/,
      /\? for shortcuts/,  // Escape the ? character
      /Auto-updating to/
    ];
    
    for (const pattern of claudePatterns) {
      if (pattern.test(data)) {
        if (!this._collectedData.inClaudeSession) {
          this._collectedData.inClaudeSession = true;
          this._collectedData.claudeSessionStart = Date.now();
          console.log('[ShellIntegrationAddon] Claude Code UI detected in output');
          
          // Emit event for Claude session start
          this._emitEvent('claudeSessionStart', {
            timestamp: Date.now(),
            terminalId: this._terminalId
          });
        }
        break;
      }
    }
    
    // Detect Claude Code exit patterns
    const exitPatterns = [
      /Exiting Claude Code/i,
      /Claude session ended/i
    ];
    
    for (const pattern of exitPatterns) {
      if (pattern.test(data) && this._collectedData.inClaudeSession) {
        this._collectedData.inClaudeSession = false;
        const duration = Date.now() - this._collectedData.claudeSessionStart;
        console.log('[ShellIntegrationAddon] Claude Code session ended, duration:', duration);
        
        // Emit event for Claude session end
        this._emitEvent('claudeSessionEnd', {
          timestamp: Date.now(),
          terminalId: this._terminalId,
          duration
        });
        break;
      }
    }
  }
  
  /**
   * Handle Claude Code user input (対話内容)
   */
  _handleClaudeInput(input) {
    console.log('[ShellIntegrationAddon] Claude input received:', input);
    
    const claudeInputData = {
      id: `claude-input-${Date.now()}`,
      timestamp: Date.now(),
      type: 'claude-input',
      context: {
        terminalId: this._terminalId,
        inSession: this._collectedData.inClaudeSession
      },
      input: input
    };
    
    // Command Intelligence Hubに送信
    if (window.zeamiAPI && window.zeamiAPI.invoke) {
      try {
        const serializedData = JSON.parse(JSON.stringify(claudeInputData));
        window.zeamiAPI.invoke('command:execution-complete', {
          ...serializedData,
          // Command Intelligence Hub用のフォーマットに変換
          command: {
            raw: `[Claude Input] ${input}`,
            parsed: { program: 'claude-input', args: [input], flags: {} },
            category: 'claude-interaction',
            sensitivity: 'normal'
          },
          executor: {
            type: 'human',
            name: 'User → Claude',
            version: 'latest',
            trigger: 'user-input'
          },
          execution: {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            exitCode: 0,
            status: 'success',
            environment: { cwd: this._collectedData.cwd || '/', env: {} },
            resources: { cpuUsage: 0, memoryUsage: 0, outputSize: input.length }
          },
          output: {
            stdout: { lines: 1, size: input.length, sample: input, hasMore: false },
            stderr: { lines: 0, size: 0, sample: '', hasMore: false }
          }
        });
      } catch (error) {
        console.error('[ShellIntegrationAddon] Failed to send Claude input:', error);
      }
    }
  }
  
  /**
   * Handle Claude Code response
   */
  _handleClaudeOutput(output) {
    console.log('[ShellIntegrationAddon] Claude output received:', output.substring(0, 100) + '...');
    
    // Similar to input, but marked as Claude's response
    const claudeOutputData = {
      id: `claude-output-${Date.now()}`,
      timestamp: Date.now(),
      type: 'claude-output',
      context: {
        terminalId: this._terminalId,
        inSession: this._collectedData.inClaudeSession
      },
      output: output
    };
    
    // Send to Command Intelligence Hub
    if (window.zeamiAPI && window.zeamiAPI.invoke) {
      try {
        const serializedData = JSON.parse(JSON.stringify(claudeOutputData));
        window.zeamiAPI.invoke('command:execution-complete', {
          ...serializedData,
          command: {
            raw: `[Claude Response] ${output.substring(0, 50)}...`,
            parsed: { program: 'claude-output', args: [], flags: {} },
            category: 'claude-interaction',
            sensitivity: 'normal'
          },
          executor: {
            type: 'claude-code',
            name: 'Claude → User',
            version: 'latest',
            trigger: 'ai-response'
          },
          execution: {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            exitCode: 0,
            status: 'success',
            environment: { cwd: this._collectedData.cwd || '/', env: {} },
            resources: { cpuUsage: 0, memoryUsage: 0, outputSize: output.length }
          },
          output: {
            stdout: { lines: 1, size: output.length, sample: output.substring(0, 1000), hasMore: output.length > 1000 },
            stderr: { lines: 0, size: 0, sample: '', hasMore: false }
          }
        });
      } catch (error) {
        console.error('[ShellIntegrationAddon] Failed to send Claude output:', error);
      }
    }
  }
  
  /**
   * Handle Claude Code executed command
   */
  _handleClaudeCommand(commandInfo) {
    console.log('[ShellIntegrationAddon] Claude command execution:', commandInfo);
    // This would handle commands that Claude executes on behalf of the user
  }
  
  /**
   * Track user input during Claude Code session
   */
  _trackClaudeUserInput(data) {
    const now = Date.now();
    
    // Debug log
    console.log('[ShellIntegrationAddon] _trackClaudeUserInput called with:', JSON.stringify(data));
    
    // Reset buffer if too much time has passed
    if (now - this._lastInputTime > 5000) {
      this._userInputBuffer = '';
    }
    
    this._lastInputTime = now;
    
    // Handle Enter key
    if (data === '\r' || data === '\n') {
      if (this._userInputBuffer.trim()) {
        // User pressed Enter, send the input as Claude input
        console.log('[ShellIntegrationAddon] Detected Claude user input:', this._userInputBuffer);
        
        // Generate OSC sequence for Claude input
        const oscSequence = `633;ClaudeInput=${this._userInputBuffer}`;
        this._handleCustomSequence(`ClaudeInput=${this._userInputBuffer}`);
        
        this._userInputBuffer = '';
      }
    } else if (data === '\x7f' || data === '\b') {
      // Handle backspace
      if (this._userInputBuffer.length > 0) {
        this._userInputBuffer = this._userInputBuffer.slice(0, -1);
      }
    } else if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) < 127) {
      // Regular printable character
      this._userInputBuffer += data;
    } else if (data.length > 1) {
      // Might be pasted text
      this._userInputBuffer += data;
    }
  }
  
  /**
   * Serialization helpers to ensure data can be sent through IPC
   */
  _serializeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      // Create a clean copy without circular references
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.warn('[ShellIntegrationAddon] Failed to serialize object:', e);
      return {};
    }
  }
  
  _serializeMap(map) {
    if (!map || !(map instanceof Map)) return {};
    try {
      const obj = {};
      for (const [key, value] of map) {
        // Ensure both key and value are serializable
        const serializedKey = String(key);
        obj[serializedKey] = this._serializeObject(value);
      }
      return obj;
    } catch (e) {
      console.warn('[ShellIntegrationAddon] Failed to serialize map:', e);
      return {};
    }
  }
  
  _serializeArray(arr) {
    if (!Array.isArray(arr)) return [];
    try {
      // Filter out non-serializable items and create clean copies
      return arr.map(item => {
        if (typeof item === 'object') {
          return this._serializeObject(item);
        }
        return item;
      }).filter(item => item !== undefined);
    } catch (e) {
      console.warn('[ShellIntegrationAddon] Failed to serialize array:', e);
      return [];
    }
  }
}