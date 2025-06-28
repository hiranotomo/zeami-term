/**
 * ZeamiTerminal - Extended xterm.js Terminal with built-in command system
 * This leverages our xterm.js fork to provide native command interception
 */

import { CommandRegistry } from '../commands/CommandRegistry.js';

export class ZeamiTerminal extends window.Terminal {
  constructor(options = {}) {
    super({
      ...options,
      allowProposedApi: true  // Enable proposed APIs for advanced features
    });
    
    // Initialize command system
    this._commandRegistry = new CommandRegistry();
    this._commandBuffer = '';
    this._isProcessingCommand = false;
    
    // Interactive mode support
    this._interactiveMode = null;
    this._originalHandlers = new Map();
    
    // Bind methods
    this._handleData = this._handleData.bind(this);
    this._processCommand = this._processCommand.bind(this);
    
    // Setup command interception after terminal is ready
    this.onRender(() => {
      if (!this._commandInterceptionSetup) {
        this._setupCommandInterception();
        this._commandInterceptionSetup = true;
      }
    });
  }
  
  /**
   * Setup command interception at the core level
   */
  _setupCommandInterception() {
    // Store original data handler
    this._originalDataHandler = this.onData(() => {});
    
    // Override onData to intercept all input
    this.onData(this._handleData);
  }
  
  /**
   * Handle all terminal input data
   */
  _handleData(data) {
    // If in interactive mode, let the mode handler process first
    if (this._interactiveMode && this._interactiveMode.handler) {
      const handled = this._interactiveMode.handler(data);
      if (handled) return;
    }
    
    // If we're processing a command, don't interfere
    if (this._isProcessingCommand) {
      return;
    }
    
    // Handle special characters
    if (data === '\r' || data === '\n') {
      // Enter pressed - check if we have a command
      const trimmedBuffer = this._commandBuffer.trim();
      
      if (trimmedBuffer) {
        const parts = trimmedBuffer.split(' ');
        const cmdName = parts[0];
        
        // Check if it's a registered command
        if (this._commandRegistry.has(cmdName)) {
          // Clear the current line
          this.write('\r\x1b[K');
          
          // Process the command
          this._processCommand(cmdName, parts.slice(1));
          
          // Clear the buffer
          this._commandBuffer = '';
          
          // Don't send to PTY
          return;
        }
      }
      
      // Not a command, clear buffer and continue
      this._commandBuffer = '';
    } else if (data === '\x7f' || data === '\b') {
      // Backspace
      if (this._commandBuffer.length > 0) {
        this._commandBuffer = this._commandBuffer.slice(0, -1);
      }
    } else if (data === '\x03') {
      // Ctrl+C - clear buffer
      this._commandBuffer = '';
    } else if (data.charCodeAt(0) >= 32) {
      // Regular character, add to buffer
      this._commandBuffer += data;
    }
    
    // Always send to PTY unless we handled a command
    if (this._ptyHandler) {
      this._ptyHandler(data);
    }
  }
  
  /**
   * Process a command
   */
  async _processCommand(cmdName, args) {
    this._isProcessingCommand = true;
    
    try {
      const command = this._commandRegistry.get(cmdName);
      if (command && command.handler) {
        // Execute command
        await command.handler.execute(this, args);
      }
    } catch (error) {
      this.writeln(`\r\n\x1b[31mCommand error: ${error.message}\x1b[0m`);
    } finally {
      // Only clear processing flag if not in interactive mode
      if (!this._interactiveMode) {
        this._isProcessingCommand = false;
      }
      
      // Show prompt after command execution
      if (this._showPrompt && !this._interactiveMode) {
        this._showPrompt();
      }
    }
  }
  
  /**
   * Register a command
   */
  registerCommand(name, handler, options = {}) {
    this._commandRegistry.register(name, handler, options);
  }
  
  /**
   * Set PTY handler for normal input
   */
  setPtyHandler(handler) {
    this._ptyHandler = handler;
  }
  
  /**
   * Set prompt display function
   */
  setPromptHandler(handler) {
    this._showPrompt = handler;
  }
  
  /**
   * Get the command registry
   */
  getCommandRegistry() {
    return this._commandRegistry;
  }
  
  /**
   * Enter interactive mode
   */
  enterInteractiveMode(name, handler) {
    this._interactiveMode = { name, handler };
    // Keep command processing active
    this._isProcessingCommand = true;
  }
  
  /**
   * Exit interactive mode
   */
  exitInteractiveMode() {
    this._interactiveMode = null;
    this._isProcessingCommand = false;
  }
  
  /**
   * Write output with proper formatting
   */
  writeln(text) {
    this.write(text + '\r\n');
  }
}