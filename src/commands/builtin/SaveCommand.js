/**
 * SaveCommand - Save terminal buffer to log file
 */

export class SaveCommand {
  constructor() {
    this.name = 's';
    this.description = 'Save terminal buffer to log file';
    this.usage = 's [filename] - Save terminal content to file';
    this.category = 'utility';
    this.aliases = ['save', 'log'];
  }

  async execute(terminal, args) {
    try {
      // Get terminal buffer content
      const buffer = terminal.buffer.active;
      const lines = [];
      
      // Extract all lines from buffer
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }
      
      // Generate filename with timestamp if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `zeami-terminal-${timestamp}.log`;
      
      // Prepare log content with metadata
      const metadata = [
        '=== ZeamiTerm Session Log ===',
        `Date: ${new Date().toLocaleString()}`,
        `Terminal: ${terminal.id || 'default'}`,
        `Buffer Lines: ${lines.length}`,
        '=' .repeat(30),
        ''
      ].join('\n');
      
      const content = metadata + lines.join('\n');
      
      // Save via Electron API
      if (window.electronAPI && window.electronAPI.saveFile) {
        const result = await window.electronAPI.saveFile({
          content,
          defaultFilename: args[0] || defaultFilename,
          filters: [
            { name: 'Log Files', extensions: ['log', 'txt'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (result.success) {
          terminal.writeln(`\r\n\x1b[32m✓ Saved to: ${result.path}\x1b[0m`);
        } else if (result.canceled) {
          terminal.writeln(`\r\n\x1b[33m⚠ Save canceled\x1b[0m`);
        } else {
          terminal.writeln(`\r\n\x1b[31m✗ Save failed: ${result.error}\x1b[0m`);
        }
      } else {
        // Fallback: Download as file in browser
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = args[0] || defaultFilename;
        a.click();
        URL.revokeObjectURL(url);
        
        terminal.writeln(`\r\n\x1b[32m✓ Downloaded as: ${a.download}\x1b[0m`);
      }
      
    } catch (error) {
      terminal.writeln(`\r\n\x1b[31m✗ Error saving log: ${error.message}\x1b[0m`);
    }
  }
}

// Additional utility class for session management
export class SessionRecorder {
  constructor(terminal) {
    this.terminal = terminal;
    this.recording = false;
    this.recordBuffer = [];
    this.startTime = null;
  }
  
  startRecording() {
    this.recording = true;
    this.startTime = Date.now();
    this.recordBuffer = [];
    
    // Record all terminal data
    this.dataListener = (data) => {
      if (this.recording) {
        this.recordBuffer.push({
          timestamp: Date.now() - this.startTime,
          data: data
        });
      }
    };
    
    this.terminal.onData(this.dataListener);
  }
  
  stopRecording() {
    this.recording = false;
    if (this.dataListener) {
      this.terminal.off('data', this.dataListener);
    }
    return this.recordBuffer;
  }
  
  // Playback recorded session
  async playback(recordBuffer, speed = 1) {
    for (const entry of recordBuffer) {
      await new Promise(resolve => setTimeout(resolve, entry.timestamp / speed));
      this.terminal.write(entry.data);
    }
  }
}