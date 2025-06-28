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
    
    // Track current working directory
    this.cwd = options.cwd || '/';
    
    // Paste handling
    this._isPasting = false;
    this._pasteBuffer = '';
    this._pasteStartMarker = '';
    this._incompleteBytesBuffer = ''; // For handling incomplete UTF-8 sequences
    
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
    console.log('[ZeamiTerminal] _handleData called with:', data.length, 'bytes');
    try {
      // TEMPORARILY DISABLE PASTE HANDLING TO DEBUG ISSUE
      /*
      // Handle bracketed paste mode with proper sequence detection
      if (data.includes('\x1b[200~')) {
        console.log('[ZeamiTerminal] Detected paste start marker');
      // Extract the paste start marker and any data after it
      const startIndex = data.indexOf('\x1b[200~');
      const beforeMarker = data.substring(0, startIndex);
      const afterMarker = data.substring(startIndex + 6); // 6 is length of '\x1b[200~'
      
      // Process any data before the marker normally
      if (beforeMarker && this._ptyHandler) {
        this._ptyHandler(beforeMarker);
      }
      
      // Start paste mode
      this._isPasting = true;
      this._pasteBuffer = '';
      this._pasteStartMarker = '\x1b[200~';
      this._pasteStartTime = Date.now();
      
      // Show paste indicator (don't add newline)
      // this.write('\x1b[33m[Pasting...]\x1b[0m');
      console.log('[ZeamiTerminal] Paste mode started');
      
      // Buffer any data after the marker
      if (afterMarker) {
        this._pasteBuffer += afterMarker;
      }
      return;
    }
    
    if (data.includes('\x1b[201~')) {
      console.log('[ZeamiTerminal] Detected paste end marker');
      // Extract the paste end marker and any data before it
      const endIndex = data.indexOf('\x1b[201~');
      const beforeMarker = data.substring(0, endIndex);
      const afterMarker = data.substring(endIndex + 6); // 6 is length of '\x1b[201~'
      
      // Add remaining data to buffer
      if (beforeMarker) {
        this._pasteBuffer += beforeMarker;
      }
      
      // Send the complete paste sequence in correct order
      if (this._ptyHandler && this._isPasting) {
        // Clear paste indicator (commented out for now)
        // this.write('\r\x1b[K');
        
        // Limit paste buffer size (10MB)
        const MAX_PASTE_SIZE = 10 * 1024 * 1024;
        let truncated = false;
        if (this._pasteBuffer.length > MAX_PASTE_SIZE) {
          console.warn(`[ZeamiTerminal] Paste buffer too large (${this._pasteBuffer.length} bytes), truncating to ${MAX_PASTE_SIZE} bytes`);
          this._pasteBuffer = this._pasteBuffer.substring(0, MAX_PASTE_SIZE);
          truncated = true;
        }
        
        // Calculate paste statistics
        const elapsedTime = Date.now() - this._pasteStartTime;
        const lineCount = (this._pasteBuffer.match(/\n/g) || []).length;
        const byteCount = this._pasteBuffer.length;
        
        // Send in correct order: start marker, data, end marker
        this._ptyHandler(this._pasteStartMarker + this._pasteBuffer + '\x1b[201~');
        
        // Show paste completion message (commented out for now)
        const truncatedMsg = truncated ? ' (truncated)' : '';
        console.log(`[ZeamiTerminal] Pasted ${byteCount} bytes, ${lineCount} lines in ${elapsedTime}ms${truncatedMsg}`);
        // const msg = `\x1b[32m[Pasted ${byteCount} bytes, ${lineCount} lines in ${elapsedTime}ms]${truncatedMsg}\x1b[0m\r\n`;
        // this.write(msg);
      }
      
      // Reset paste mode
      this._isPasting = false;
      this._pasteBuffer = '';
      this._pasteStartMarker = '';
      
      // Process any data after the end marker
      if (afterMarker && this._ptyHandler) {
        this._ptyHandler(afterMarker);
      }
      return;
    }
    
    // If we're in paste mode, buffer the data
    if (this._isPasting) {
      this._pasteBuffer += data;
      console.log('[ZeamiTerminal] Buffering paste data, total:', this._pasteBuffer.length);
      return;
    }
    */
    
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
      console.log('[ZeamiTerminal] Sending to PTY:', data.length, 'bytes');
      this._ptyHandler(data);
    } else {
      console.log('[ZeamiTerminal] No PTY handler available');
    }
    } catch (error) {
      console.error('[ZeamiTerminal] Error handling terminal data:', error);
      // Show error to user only for critical errors
      if (error.message && error.message.includes('paste')) {
        this.write(`\r\n\x1b[31m[Error: ${error.message}]\x1b[0m\r\n`);
      }
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