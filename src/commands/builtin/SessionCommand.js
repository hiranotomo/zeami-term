/**
 * SessionCommand - Session management command
 * 
 * Provides commands for session persistence, recording, and playback
 */

import { SessionPersistence } from '../../features/session/SessionPersistence.js';
import { RealtimeLogger } from '../../features/session/RealtimeLogger.js';
import { SessionPlayer } from '../../features/session/SessionPlayer.js';

export class SessionCommand {
  constructor() {
    this.name = 'session';
    this.description = 'Manage terminal sessions (save, restore, record, play)';
    this.usage = `session <subcommand> [options]
    
Subcommands:
  save [name]      - Save current session
  restore [name]   - Restore a saved session
  list            - List all saved sessions
  clear [name]    - Clear saved session(s)
  
  record <file>   - Start recording session
  stop            - Stop recording
  play <file>     - Play recorded session
  
  export <name>   - Export session to file
  import <file>   - Import session from file`;
    
    this.category = 'session';
    this.aliases = ['sess'];
    
    // Session management instances
    this.persistence = new SessionPersistence();
    this.logger = null;
    this.player = null;
  }

  async execute(terminal, args) {
    if (args.length === 0) {
      this.showHelp(terminal);
      return;
    }

    const subcommand = args[0];
    const subArgs = args.slice(1);

    try {
      switch (subcommand) {
        case 'save':
          await this.saveSession(terminal, subArgs);
          break;
          
        case 'restore':
          await this.restoreSession(terminal, subArgs);
          break;
          
        case 'list':
          this.listSessions(terminal);
          break;
          
        case 'clear':
          this.clearSessions(terminal, subArgs);
          break;
          
        case 'record':
          await this.startRecording(terminal, subArgs);
          break;
          
        case 'stop':
          await this.stopRecording(terminal);
          break;
          
        case 'play':
          await this.playSession(terminal, subArgs);
          break;
          
        case 'export':
          await this.exportSession(terminal, subArgs);
          break;
          
        case 'import':
          await this.importSession(terminal, subArgs);
          break;
          
        case 'auto':
          this.toggleAutoSave(terminal, subArgs);
          break;
          
        default:
          terminal.writeln(`\r\n\x1b[31mUnknown subcommand: ${subcommand}\x1b[0m`);
          this.showHelp(terminal);
      }
    } catch (error) {
      terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
    }
  }

  /**
   * Show help information
   */
  showHelp(terminal) {
    terminal.writeln('\r\n\x1b[1;36mSession Management\x1b[0m');
    terminal.writeln(this.usage);
    terminal.writeln('\r\nExamples:');
    terminal.writeln('  session save work        - Save current session as "work"');
    terminal.writeln('  session restore work     - Restore "work" session');
    terminal.writeln('  session record demo.log  - Start recording to demo.log');
    terminal.writeln('  session play demo.log    - Play back demo.log');
  }

  /**
   * Save current session
   */
  async saveSession(terminal, args) {
    const sessionName = args[0] || `session-${Date.now()}`;
    
    // Get terminal manager to access process info
    const terminalManager = terminal._zeamiTermManager;
    const session = terminalManager?.terminals.get(terminalManager.activeTerminalId);
    
    const processInfo = session?.process || {};
    
    // Save session
    const savedData = this.persistence.saveSession(
      sessionName,
      terminal,
      processInfo
    );
    
    terminal.writeln(`\r\n\x1b[32m✓ Session saved as "${sessionName}"\x1b[0m`);
    terminal.writeln(`  Buffer lines: ${savedData.buffer.length}`);
    terminal.writeln(`  Working directory: ${savedData.workingDirectory}`);
  }

  /**
   * Restore saved session
   */
  async restoreSession(terminal, args) {
    const sessionName = args[0];
    
    if (!sessionName) {
      terminal.writeln('\r\n\x1b[31mPlease specify a session name\x1b[0m');
      this.listSessions(terminal);
      return;
    }
    
    const restored = this.persistence.restoreSession(sessionName, terminal);
    
    if (!restored) {
      terminal.writeln(`\r\n\x1b[31mSession "${sessionName}" not found\x1b[0m`);
      return;
    }
    
    // Change to saved working directory
    if (restored.workingDirectory && terminal._ptyWrite) {
      terminal._ptyWrite(`cd "${restored.workingDirectory}"\r`);
    }
    
    terminal.writeln(`\r\n\x1b[32m✓ Session "${sessionName}" restored\x1b[0m`);
  }

  /**
   * List saved sessions
   */
  listSessions(terminal) {
    const sessions = this.persistence.listSessions();
    
    if (sessions.length === 0) {
      terminal.writeln('\r\n\x1b[33mNo saved sessions\x1b[0m');
      return;
    }
    
    terminal.writeln('\r\n\x1b[1;36mSaved Sessions:\x1b[0m');
    terminal.writeln('─'.repeat(60));
    
    sessions.forEach(session => {
      const date = new Date(session.timestamp).toLocaleString();
      terminal.writeln(`\x1b[1m${session.id}\x1b[0m`);
      terminal.writeln(`  Date: ${date}`);
      terminal.writeln(`  Directory: ${session.workingDirectory}`);
      terminal.writeln(`  Buffer size: ${session.bufferSize} lines`);
      terminal.writeln('');
    });
  }

  /**
   * Clear saved sessions
   */
  clearSessions(terminal, args) {
    const sessionName = args[0];
    
    if (sessionName) {
      this.persistence.clearSession(sessionName);
      terminal.writeln(`\r\n\x1b[32m✓ Cleared session "${sessionName}"\x1b[0m`);
    } else {
      // Confirm before clearing all
      terminal.writeln('\r\n\x1b[33mThis will clear all saved sessions.\x1b[0m');
      terminal.writeln('Type "yes" to confirm: ');
      
      // Note: In real implementation, you'd need to handle user input
      // For now, we'll just show the message
      terminal.writeln('\x1b[31mOperation cancelled\x1b[0m');
    }
  }

  /**
   * Start recording session
   */
  async startRecording(terminal, args) {
    if (this.logger && this.logger.isRecording) {
      terminal.writeln('\r\n\x1b[31mAlready recording\x1b[0m');
      return;
    }
    
    const filename = args[0];
    if (!filename) {
      terminal.writeln('\r\n\x1b[31mPlease specify a filename\x1b[0m');
      return;
    }
    
    // Parse options
    const options = {
      compress: args.includes('--compress') || args.includes('-c'),
      includeKeystrokes: !args.includes('--no-input'),
      format: args.includes('--binary') ? 'binary' : 'jsonl'
    };
    
    // Add .gz extension if compressing
    const finalFilename = options.compress && !filename.endsWith('.gz') 
      ? `${filename}.gz` 
      : filename;
    
    // Create logger
    this.logger = new RealtimeLogger(terminal, options);
    
    // Get metadata
    const terminalManager = terminal._zeamiTermManager;
    const session = terminalManager?.terminals.get(terminalManager.activeTerminalId);
    const metadata = {
      sessionId: session?.id || 'unknown',
      shell: session?.process?.shell || 'unknown',
      cwd: session?.process?.cwd || process.cwd()
    };
    
    // Start recording
    await this.logger.startRecording(finalFilename, metadata);
    
    terminal.writeln(`\r\n\x1b[32m● Recording to: ${finalFilename}\x1b[0m`);
    terminal.writeln(`  Format: ${options.format}${options.compress ? ' (compressed)' : ''}`);
    terminal.writeln(`  Input recording: ${options.includeKeystrokes ? 'enabled' : 'disabled'}`);
    terminal.writeln(`  Use "session stop" to stop recording`);
  }

  /**
   * Stop recording
   */
  async stopRecording(terminal) {
    if (!this.logger || !this.logger.isRecording) {
      terminal.writeln('\r\n\x1b[31mNot recording\x1b[0m');
      return;
    }
    
    const stats = this.logger.getStats();
    const filename = this.logger.filename;
    await this.logger.stopRecording();
    
    terminal.writeln(`\r\n\x1b[32m■ Recording stopped\x1b[0m`);
    terminal.writeln(`  Duration: ${this.formatDuration(stats.duration)}`);
    terminal.writeln(`  Events: ${stats.eventCount}`);
    
    
    this.logger = null;
  }

  /**
   * Play recorded session
   */
  async playSession(terminal, args) {
    const filename = args[0];
    if (!filename) {
      terminal.writeln('\r\n\x1b[31mPlease specify a recording file\x1b[0m');
      return;
    }
    
    // Stop any current playback
    if (this.player && this.player.isPlaying) {
      this.player.stop();
    }
    
    try {
      // Load recording
      terminal.writeln(`\r\n\x1b[33mLoading recording...\x1b[0m`);
      const session = await RealtimeLogger.loadRecording(filename);
      
      // Parse options
      const options = {
        showProgress: !args.includes('--no-progress'),
        showControls: !args.includes('--no-controls'),
        skipSilence: args.includes('--skip-silence'),
        showInput: args.includes('--show-input')
      };
      
      // Create player
      this.player = new SessionPlayer(terminal, options);
      this.player.loadSession(session);
      
      // Set initial speed if specified
      const speedArg = args.find(arg => arg.startsWith('--speed='));
      if (speedArg) {
        const speed = parseFloat(speedArg.split('=')[1]);
        this.player.setSpeed(speed);
      }
      
      // Start playback
      await this.player.play();
      
    } catch (error) {
      terminal.writeln(`\r\n\x1b[31mError loading recording: ${error.message}\x1b[0m`);
    }
  }

  /**
   * Export session to file
   */
  async exportSession(terminal, args) {
    const sessionName = args[0];
    if (!sessionName) {
      terminal.writeln('\r\n\x1b[31mPlease specify a session name\x1b[0m');
      return;
    }
    
    try {
      const jsonData = this.persistence.exportSession(sessionName);
      const filename = `${sessionName}-export.json`;
      
      if (window.electronAPI && window.electronAPI.saveFile) {
        const result = await window.electronAPI.saveFile({
          content: jsonData,
          defaultFilename: filename,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (result.success) {
          terminal.writeln(`\r\n\x1b[32m✓ Exported to: ${result.path}\x1b[0m`);
        }
      } else {
        // Browser fallback
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        terminal.writeln(`\r\n\x1b[32m✓ Downloaded as: ${filename}\x1b[0m`);
      }
    } catch (error) {
      terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
    }
  }

  /**
   * Import session from file
   */
  async importSession(terminal, args) {
    const filename = args[0];
    if (!filename) {
      terminal.writeln('\r\n\x1b[31mPlease specify a file to import\x1b[0m');
      return;
    }
    
    // In a real implementation, you'd read the file
    // For now, we'll show the interface
    terminal.writeln(`\r\n\x1b[33mImport functionality requires file system access\x1b[0m`);
    terminal.writeln(`Would import from: ${filename}`);
  }

  /**
   * Toggle auto-save
   */
  toggleAutoSave(terminal, args) {
    const action = args[0];
    
    if (action === 'on') {
      const interval = parseInt(args[1]) || 30000;
      this.persistence.enableAutoSave(interval);
      terminal.writeln(`\r\n\x1b[32m✓ Auto-save enabled (every ${interval / 1000}s)\x1b[0m`);
    } else if (action === 'off') {
      this.persistence.disableAutoSave();
      terminal.writeln(`\r\n\x1b[32m✓ Auto-save disabled\x1b[0m`);
    } else {
      terminal.writeln('\r\n\x1b[31mUsage: session auto [on|off] [interval]\x1b[0m');
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}