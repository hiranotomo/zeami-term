/**
 * ClearCommand - Clear the terminal screen
 */

export class ClearCommand {
  constructor() {
    this.name = 'clear';
    this.description = 'Clear the terminal screen';
    this.usage = 'clear';
    this.category = 'builtin';
    this.aliases = ['cls'];
  }
  
  async execute(terminal, args = []) {
    // Clear screen and move cursor to top
    terminal.write('\x1b[2J\x1b[H');
    
    // Also clear the scrollback buffer
    terminal.clear();
  }
}