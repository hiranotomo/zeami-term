/**
 * ZeamiTerminal - Extended xterm.js Terminal with built-in command system
 * This leverages our xterm.js fork to provide native command interception
 */

import { CommandRegistry } from '../commands/CommandRegistry.js';

// Import paste debugger if available
let pasteDebugger = null;
if (typeof window !== 'undefined' && window.pasteDebugger) {
  pasteDebugger = window.pasteDebugger;
}

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
    this._pasteTimeout = null; // Timeout for stuck paste mode
    this._isHandlingPaste = false; // Flag to prevent double processing
    
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
    console.log('[ZeamiTerminal] _handleData:', data.length, 'bytes');
    
    // Debug: Log first 50 chars to see what data we're getting
    console.log('[ZeamiTerminal] Data preview:', data.substring(0, 50).replace(/\x1b/g, 'ESC'));
    
    const hasStartMarker = data.includes('\x1b[200~');
    const hasEndMarker = data.includes('\x1b[201~');
    
    console.log('[ZeamiTerminal] Markers check - Start:', hasStartMarker, 'End:', hasEndMarker);
    
    // CRITICAL: Handle bracketed paste specially for Claude Code
    if (hasStartMarker || hasEndMarker) {
      console.log('[ZeamiTerminal] Bracketed paste detected in _handleData - special handling');
      
      if (pasteDebugger) {
        pasteDebugger.log('critical', 'Bracketed paste in _handleData - splitting markers', {
          hasStartMarker,
          hasEndMarker,
          length: data.length
        });
      }
      
      // Extract content without markers
      let content = data;
      if (hasStartMarker) {
        content = content.replace(/\x1b\[200~/g, '');
      }
      if (hasEndMarker) {
        content = content.replace(/\x1b\[201~/g, '');
      }
      
      // Send in proper sequence with delays
      if (this._ptyHandler) {
        // 1. Send start marker
        this._ptyHandler('\x1b[200~');
        console.log('[ZeamiTerminal] Sent START marker');
        
        // 2. Send content in chunks after delay
        setTimeout(() => {
          // For large content, send in smaller chunks
          const CHUNK_SIZE = 1000; // 1000 chars per chunk
          const chunks = [];
          
          for (let i = 0; i < content.length; i += CHUNK_SIZE) {
            chunks.push(content.substring(i, i + CHUNK_SIZE));
          }
          
          console.log(`[ZeamiTerminal] Sending content in ${chunks.length} chunks`);
          
          // Send chunks with small delays
          let chunkIndex = 0;
          const sendNextChunk = () => {
            if (chunkIndex < chunks.length) {
              this._ptyHandler(chunks[chunkIndex]);
              console.log(`[ZeamiTerminal] Sent chunk ${chunkIndex + 1}/${chunks.length}: ${chunks[chunkIndex].length} chars`);
              chunkIndex++;
              setTimeout(sendNextChunk, 10); // 10ms between chunks
            } else {
              // All chunks sent, now send end marker
              setTimeout(() => {
                this._ptyHandler('\x1b[201~');
                console.log('[ZeamiTerminal] Sent END marker');
              }, 50); // Wait before end marker
            }
          };
          
          sendNextChunk();
        }, 200); // Increased delay after start marker to ensure Claude Code enters paste mode
      }
      
      return; // Don't process further
    }
    
    // Non-paste data - pass through normally
    if (pasteDebugger) {
      pasteDebugger.trackPtyData('send', data, {
        source: 'ZeamiTerminal._handleData',
        isPaste: false,
        lineCount: data.split('\n').length,
        dataPreview: data.substring(0, 100).replace(/\x1b/g, 'ESC')
      });
    }
    
    // Pass non-paste data directly to PTY
    if (this._ptyHandler) {
      this._ptyHandler(data);
      return;
    }
    
    /* DISABLED: All paste handling moved to PTY/Claude Code
    try {
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
        
        console.log('[ZeamiTerminal] Paste mode started');
        
        // Set timeout to auto-exit paste mode after 10 seconds (longer for large pastes)
        if (this._pasteTimeout) {
          clearTimeout(this._pasteTimeout);
        }
        this._pasteTimeout = setTimeout(() => {
          if (this._isPasting && this._pasteBuffer) {
            console.log('[ZeamiTerminal] Paste timeout - sending buffered data');
            
            // Send the buffered data even on timeout
            if (this._ptyHandler) {
              // Send complete paste sequence: start marker + data + end marker
              const dataToSend = this._pasteStartMarker + this._pasteBuffer + '\x1b[201~';
              console.log(`[ZeamiTerminal] Sending ${this._pasteBuffer.length} bytes on timeout`);
              this._ptyHandler(dataToSend);
            }
            
            // Now exit paste mode
            this._exitPasteMode();
          }
        }, 3000); // 3 second timeout (Claude Code's typical timeout)
        
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
        this._exitPasteMode();
        
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
  }
  
  /**
   * Detect if input is likely a paste operation
   */
  _detectPaste(data) {
    // If data contains bracketed paste markers, it's definitely a paste
    if (data.includes('\x1b[200~') || data.includes('\x1b[201~')) {
      return true;
    }
    
    // Heuristic: Multiple lines or large single-line input
    const lines = data.split('\n');
    if (lines.length > 1 && data.length > 10) {
      return true;
    }
    
    // Very long single line is likely a paste
    if (data.length > 100) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Handle paste data with proper chunking and flow control
   */
  async _handlePasteData(data) {
    const CHUNK_SIZE = 4096; // 4KB chunks
    const CHUNK_DELAY = 5;   // 5ms between chunks
    
    console.log(`[ZeamiTerminal] Handling paste data: ${data.length} bytes`);
    
    // For small pastes, send directly
    if (data.length <= CHUNK_SIZE) {
      if (this._ptyHandler) {
        this._ptyHandler(data);
      }
      return;
    }
    
    // For large pastes, handle bracketed paste mode properly
    let content = data;
    let hasStartMarker = false;
    let hasEndMarker = false;
    
    // Check for and extract paste markers
    if (content.includes('\x1b[200~')) {
      hasStartMarker = true;
      const startIdx = content.indexOf('\x1b[200~');
      // Send everything before the start marker first
      if (startIdx > 0 && this._ptyHandler) {
        this._ptyHandler(content.substring(0, startIdx));
      }
      // Send the start marker
      if (this._ptyHandler) {
        this._ptyHandler('\x1b[200~');
      }
      content = content.substring(startIdx + 6); // Remove start marker
    }
    
    if (content.includes('\x1b[201~')) {
      hasEndMarker = true;
      const endIdx = content.indexOf('\x1b[201~');
      const mainContent = content.substring(0, endIdx);
      
      // Send main content in chunks
      await this._sendInChunks(mainContent, CHUNK_SIZE, CHUNK_DELAY);
      
      // Send end marker
      if (this._ptyHandler) {
        await this._delay(10); // Small delay before end marker
        this._ptyHandler('\x1b[201~');
      }
      
      // Send any remaining content after end marker
      const remaining = content.substring(endIdx + 6);
      if (remaining && this._ptyHandler) {
        this._ptyHandler(remaining);
      }
    } else {
      // No end marker, just send content in chunks
      await this._sendInChunks(content, CHUNK_SIZE, CHUNK_DELAY);
    }
  }
  
  /**
   * Send data in chunks with delays
   */
  async _sendInChunks(data, chunkSize, delayMs) {
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      
      if (this._ptyHandler) {
        this._ptyHandler(chunk);
      }
      
      // Add delay between chunks except for the last one
      if (i + chunkSize < data.length && delayMs > 0) {
        await this._delay(delayMs);
      }
    }
  }
  
  /**
   * Utility delay function
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Exit paste mode and cleanup
   */
  _exitPasteMode() {
    console.log('[ZeamiTerminal] Exiting paste mode, buffer length:', this._pasteBuffer ? this._pasteBuffer.length : 0);
    this._isPasting = false;
    this._pasteBuffer = '';
    this._pasteStartMarker = '';
    if (this._pasteTimeout) {
      clearTimeout(this._pasteTimeout);
      this._pasteTimeout = null;
    }
  }
  
  /**
   * Set PTY handler for normal input
   */
  setPtyHandler(handler) {
    this._ptyHandler = handler;
  }
  
  /**
   * Set flag to indicate we're handling a paste
   */
  setHandlingPaste(value) {
    this._isHandlingPaste = value;
    console.log('[ZeamiTerminal] Handling paste flag set to:', value);
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