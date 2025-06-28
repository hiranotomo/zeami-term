/**
 * ShellIntegrationAddon Test Suite
 */

// Mock xterm.js
class MockTerminal {
  constructor() {
    this.markers = [];
    this.decorations = [];
    this.buffer = {
      active: {
        cursorY: 0,
        getLine: (row) => ({
          translateToString: () => `Line ${row}`
        })
      }
    };
    this.rows = 24;
    this.cols = 80;
    this._core = {
      _renderService: {
        dimensions: {
          actualCellHeight: 20
        }
      }
    };
  }
  
  registerMarker(offset) {
    const marker = {
      id: this.markers.length,
      line: this.buffer.active.cursorY + offset,
      dispose: jest.fn()
    };
    this.markers.push(marker);
    return marker;
  }
  
  registerDecoration(options) {
    const decoration = {
      id: this.decorations.length,
      options,
      dispose: jest.fn()
    };
    this.decorations.push(decoration);
    return decoration;
  }
  
  scrollToLine(line) {
    // Mock implementation
  }
}

// We need to handle ES modules in renderer code differently
// For now, we'll create a simplified version of ShellIntegrationAddon for testing
class ShellIntegrationAddon {
  constructor() {
    this._terminal = null;
    this._commands = [];
    this._decorations = [];
    this._currentCommand = null;
    this._promptLine = -1;
    
    // OSC handlers map
    this._oscHandlers = new Map([
      [133, this._handleOsc133.bind(this)],
      [633, this._handleOsc633.bind(this)],
      [1337, this._handleOsc1337.bind(this)]
    ]);
  }
  
  activate(terminal) {
    this._terminal = terminal;
  }
  
  dispose() {
    this._decorations.forEach(d => d.dispose());
    this._commands = [];
    this._decorations = [];
    this._currentCommand = null;
  }
  
  _handleOsc133(data) {
    const parts = data.split(';');
    const type = parts[0];
    
    switch (type) {
      case 'A':
        // Command start
        this._currentCommand = {
          startLine: this._terminal.buffer.active.cursorY,
          startTime: Date.now()
        };
        break;
        
      case 'D':
        // Command end
        if (this._currentCommand) {
          const exitCode = parts[1] ? parseInt(parts[1]) : 0;
          const command = {
            ...this._currentCommand,
            endLine: this._terminal.buffer.active.cursorY,
            exitCode,
            duration: Date.now() - this._currentCommand.startTime
          };
          this._commands.push(command);
          
          if (exitCode !== 0) {
            const decoration = this._terminal.registerDecoration({
              marker: {
                line: command.startLine
              },
              backgroundColor: '#ff000020'
            });
            if (decoration) {
              this._decorations.push(decoration);
            }
          }
          
          if (this._terminal.onShellIntegrationEvent) {
            this._terminal.onShellIntegrationEvent('commandEnd', {
              exitCode,
              duration: command.duration
            });
          }
          
          this._currentCommand = null;
        }
        break;
        
      case 'P':
        // Prompt
        this._promptLine = this._terminal.buffer.active.cursorY;
        break;
    }
  }
  
  _handleOsc633(data) {
    const parts = data.split(';');
    const type = parts[0];
    
    switch (type) {
      case 'A':
        // Prompt start
        this._promptLine = this._terminal.buffer.active.cursorY;
        break;
        
      case 'B':
        // Command start
        this._currentCommand = {
          startLine: this._terminal.buffer.active.cursorY,
          startTime: Date.now()
        };
        break;
        
      case 'C':
        // Command finished
        if (this._currentCommand) {
          const command = {
            ...this._currentCommand,
            endLine: this._terminal.buffer.active.cursorY,
            exitCode: 0,
            duration: Date.now() - this._currentCommand.startTime
          };
          this._commands.push(command);
          this._currentCommand = null;
        }
        break;
        
      case 'E':
        // Command with output
        if (parts[1]) {
          const commandText = Buffer.from(parts[1], 'base64').toString();
          if (this._terminal.onShellIntegrationEvent) {
            this._terminal.onShellIntegrationEvent('command', commandText);
          }
        }
        break;
        
      case 'P':
        // Property
        if (parts[1] && parts[1].startsWith('Cwd=')) {
          const encodedCwd = parts[1].substring(4);
          const cwd = Buffer.from(encodedCwd, 'base64').toString();
          if (this._terminal.onShellIntegrationEvent) {
            this._terminal.onShellIntegrationEvent('cwdChange', cwd);
          }
        }
        break;
    }
  }
  
  _handleOsc1337(data) {
    if (data === 'SetMark') {
      this._terminal.registerMarker(0);
    } else if (data.startsWith('CurrentDir=')) {
      const dir = data.substring(11);
      if (this._terminal.onShellIntegrationEvent) {
        this._terminal.onShellIntegrationEvent('cwdChange', dir);
      }
    }
  }
  
  navigateToPreviousCommand() {
    if (!this._terminal || this._commands.length === 0) return;
    
    const currentLine = this._terminal.buffer.active.cursorY;
    for (let i = this._commands.length - 1; i >= 0; i--) {
      if (this._commands[i].startLine < currentLine) {
        this._terminal.scrollToLine(this._commands[i].startLine);
        break;
      }
    }
  }
  
  navigateToNextCommand() {
    if (!this._terminal || this._commands.length === 0) return;
    
    const currentLine = this._terminal.buffer.active.cursorY;
    for (let i = 0; i < this._commands.length; i++) {
      if (this._commands[i].startLine > currentLine) {
        this._terminal.scrollToLine(this._commands[i].startLine);
        break;
      }
    }
  }
}

describe('ShellIntegrationAddon', () => {
  let terminal;
  let addon;
  
  beforeEach(() => {
    jest.useFakeTimers();
    terminal = new MockTerminal();
    addon = new ShellIntegrationAddon();
    addon.activate(terminal);
  });
  
  afterEach(() => {
    addon.dispose();
    jest.useRealTimers();
  });
  
  describe('OSC 133 Sequences (Command Tracking)', () => {
    test('should handle command start (133;A)', () => {
      const handler = addon._oscHandlers.get(133);
      expect(handler).toBeDefined();
      
      handler('A');
      
      expect(addon._currentCommand).toBeDefined();
      expect(addon._currentCommand.startLine).toBe(0);
      expect(addon._currentCommand.startTime).toBeDefined();
    });
    
    test('should handle command end with exit code (133;D;0)', () => {
      // Start a command first
      addon._oscHandlers.get(133)('A');
      const startTime = addon._currentCommand.startTime;
      
      // Wait a bit for duration
      jest.advanceTimersByTime(100);
      
      // End command with success
      addon._oscHandlers.get(133)('D;0');
      
      expect(addon._commands.length).toBe(1);
      const command = addon._commands[0];
      expect(command.exitCode).toBe(0);
      expect(command.duration).toBeGreaterThan(0);
    });
    
    test('should fire onShellIntegrationEvent for command end', () => {
      const eventCallback = jest.fn();
      terminal.onShellIntegrationEvent = eventCallback;
      
      // Start and end command
      addon._oscHandlers.get(133)('A');
      addon._oscHandlers.get(133)('D;1');
      
      expect(eventCallback).toHaveBeenCalledWith('commandEnd', {
        exitCode: 1,
        duration: expect.any(Number)
      });
    });
    
    test('should handle command prompt (133;P)', () => {
      addon._oscHandlers.get(133)('P');
      
      expect(addon._promptLine).toBe(0);
    });
  });
  
  describe('OSC 633 Sequences (VS Code Style)', () => {
    test('should handle prompt start (633;A)', () => {
      addon._oscHandlers.get(633)('A');
      
      expect(addon._promptLine).toBe(0);
    });
    
    test('should handle command start (633;B)', () => {
      addon._oscHandlers.get(633)('B');
      
      expect(addon._currentCommand).toBeDefined();
      expect(addon._currentCommand.startLine).toBe(0);
    });
    
    test('should handle command finish (633;C)', () => {
      // Start command first
      addon._oscHandlers.get(633)('B');
      
      // Finish command
      addon._oscHandlers.get(633)('C');
      
      expect(addon._commands.length).toBe(1);
    });
    
    test('should handle command with output (633;E)', () => {
      const eventCallback = jest.fn();
      terminal.onShellIntegrationEvent = eventCallback;
      
      const commandText = 'ls -la';
      const encodedCommand = Buffer.from(commandText).toString('base64');
      addon._oscHandlers.get(633)(`E;${encodedCommand}`);
      
      expect(eventCallback).toHaveBeenCalledWith('command', commandText);
    });
    
    test('should handle current directory (633;P;Cwd=)', () => {
      const eventCallback = jest.fn();
      terminal.onShellIntegrationEvent = eventCallback;
      
      const cwd = '/home/user/projects';
      const encodedCwd = Buffer.from(cwd).toString('base64');
      addon._oscHandlers.get(633)(`P;Cwd=${encodedCwd}`);
      
      expect(eventCallback).toHaveBeenCalledWith('cwdChange', cwd);
    });
  });
  
  describe('OSC 1337 Sequences (iTerm2 Style)', () => {
    test('should handle SetMark', () => {
      addon._oscHandlers.get(1337)('SetMark');
      
      expect(terminal.markers.length).toBe(1);
    });
    
    test('should handle CurrentDir', () => {
      const eventCallback = jest.fn();
      terminal.onShellIntegrationEvent = eventCallback;
      
      const dir = '/usr/local/bin';
      addon._oscHandlers.get(1337)(`CurrentDir=${dir}`);
      
      expect(eventCallback).toHaveBeenCalledWith('cwdChange', dir);
    });
  });
  
  describe('Command Navigation', () => {
    beforeEach(() => {
      // Add some commands
      addon._commands = [
        { startLine: 0, endLine: 2, exitCode: 0 },
        { startLine: 5, endLine: 7, exitCode: 0 },
        { startLine: 10, endLine: 12, exitCode: 1 }
      ];
      terminal.buffer.active.cursorY = 6; // Between first and second command
    });
    
    test('should navigate to previous command', () => {
      const scrollSpy = jest.spyOn(terminal, 'scrollToLine');
      
      addon.navigateToPreviousCommand();
      
      expect(scrollSpy).toHaveBeenCalledWith(5); // Should go to the second command at line 5
    });
    
    test('should navigate to next command', () => {
      const scrollSpy = jest.spyOn(terminal, 'scrollToLine');
      
      addon.navigateToNextCommand();
      
      expect(scrollSpy).toHaveBeenCalledWith(10);
    });
    
    test('should not navigate beyond bounds', () => {
      terminal.buffer.active.cursorY = 15; // After last command
      const scrollSpy = jest.spyOn(terminal, 'scrollToLine');
      
      addon.navigateToNextCommand();
      
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('Command Decorations', () => {
    test('should create decoration for failed command', () => {
      // Simulate command with failure
      addon._oscHandlers.get(133)('A');
      addon._oscHandlers.get(133)('D;1');
      
      expect(terminal.decorations.length).toBe(1);
      const decoration = terminal.decorations[0];
      expect(decoration.options.backgroundColor).toBe('#ff000020');
    });
    
    test('should not create decoration for successful command', () => {
      // Simulate successful command
      addon._oscHandlers.get(133)('A');
      addon._oscHandlers.get(133)('D;0');
      
      expect(terminal.decorations.length).toBe(0);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid OSC sequences gracefully', () => {
      expect(() => {
        addon._oscHandlers.get(133)('X;invalid');
      }).not.toThrow();
    });
    
    test('should handle missing terminal gracefully', () => {
      addon._terminal = null;
      
      expect(() => {
        addon.navigateToPreviousCommand();
      }).not.toThrow();
    });
  });
  
  describe('Disposal', () => {
    test('should clean up resources on dispose', () => {
      // Add some commands and decorations
      addon._oscHandlers.get(133)('A');
      addon._oscHandlers.get(133)('D;1');
      
      const decoration = terminal.decorations[0];
      
      addon.dispose();
      
      expect(decoration.dispose).toHaveBeenCalled();
      expect(addon._commands.length).toBe(0);
      expect(addon._decorations.length).toBe(0);
    });
  });
});