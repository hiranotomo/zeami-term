/**
 * Command Output Formatter
 * Formats common command outputs for better readability
 */

class CommandFormatter {
  constructor() {
    this.formatters = {
      // Git status formatting
      'git status': {
        patterns: [
          { regex: /modified:\s+(.+)/g, format: '\x1b[33m●\x1b[0m Modified: \x1b[33m$1\x1b[0m' },
          { regex: /new file:\s+(.+)/g, format: '\x1b[32m✚\x1b[0m New: \x1b[32m$1\x1b[0m' },
          { regex: /deleted:\s+(.+)/g, format: '\x1b[31m✖\x1b[0m Deleted: \x1b[31m$1\x1b[0m' },
          { regex: /renamed:\s+(.+)/g, format: '\x1b[36m➜\x1b[0m Renamed: \x1b[36m$1\x1b[0m' },
          { regex: /Your branch is ahead/g, format: '\x1b[35m⬆\x1b[0m $&' },
          { regex: /Your branch is behind/g, format: '\x1b[35m⬇\x1b[0m $&' }
        ]
      },
      
      // NPM/Yarn output formatting
      'npm': {
        patterns: [
          { regex: /✔|✓|success/gi, format: '\x1b[92m✔\x1b[0m' },
          { regex: /✖|✗|error/gi, format: '\x1b[91m✖\x1b[0m' },
          { regex: /warning/gi, format: '\x1b[93m⚠\x1b[0m' },
          { regex: /info/gi, format: '\x1b[96mℹ\x1b[0m' },
          { regex: /added \d+ packages?/g, format: '\x1b[92m$&\x1b[0m' },
          { regex: /removed \d+ packages?/g, format: '\x1b[91m$&\x1b[0m' },
          { regex: /updated \d+ packages?/g, format: '\x1b[93m$&\x1b[0m' }
        ]
      },
      
      // Test output formatting
      'test': {
        patterns: [
          { regex: /✓|✔|PASS/g, format: '\x1b[92m✓\x1b[0m' },
          { regex: /✗|✖|FAIL/g, format: '\x1b[91m✖\x1b[0m' },
          { regex: /(\d+) passing/g, format: '\x1b[92m✓ $1 passing\x1b[0m' },
          { regex: /(\d+) failing/g, format: '\x1b[91m✖ $1 failing\x1b[0m' },
          { regex: /(\d+) pending/g, format: '\x1b[93m◯ $1 pending\x1b[0m' }
        ]
      },
      
      // Zeami CLI formatting
      'zeami': {
        patterns: [
          { regex: /\[ERROR\]/g, format: '\x1b[91m[ERROR]\x1b[0m' },
          { regex: /\[WARN\]/g, format: '\x1b[93m[WARN]\x1b[0m' },
          { regex: /\[INFO\]/g, format: '\x1b[96m[INFO]\x1b[0m' },
          { regex: /\[SUCCESS\]/g, format: '\x1b[92m[SUCCESS]\x1b[0m' },
          { regex: /→/g, format: '\x1b[36m→\x1b[0m' },
          { regex: /✓/g, format: '\x1b[92m✓\x1b[0m' },
          { regex: /✗/g, format: '\x1b[91m✗\x1b[0m' }
        ]
      },
      
      // JSON formatting (basic)
      'json': {
        patterns: [
          { regex: /"([^"]+)":/g, format: '\x1b[94m"$1"\x1b[0m:' },
          { regex: /:\s*"([^"]+)"/g, format: ': \x1b[93m"$1"\x1b[0m' },
          { regex: /:\s*(\d+)/g, format: ': \x1b[95m$1\x1b[0m' },
          { regex: /:\s*(true|false)/g, format: ': \x1b[96m$1\x1b[0m' },
          { regex: /:\s*null/g, format: ': \x1b[90mnull\x1b[0m' }
        ]
      }
    };
    
    this.activeCommand = null;
  }
  
  // Detect command from input
  detectCommand(input) {
    const trimmed = input.trim();
    
    for (const cmd of Object.keys(this.formatters)) {
      if (trimmed.startsWith(cmd)) {
        this.activeCommand = cmd;
        return;
      }
    }
    
    // Check for test commands
    if (trimmed.match(/npm (run )?test|yarn test|jest|mocha/)) {
      this.activeCommand = 'test';
    } else if (trimmed.match(/npm|yarn|pnpm/)) {
      this.activeCommand = 'npm';
    } else if (trimmed.match(/zeami/)) {
      this.activeCommand = 'zeami';
    }
  }
  
  // Format output based on active command
  format(text) {
    if (!this.activeCommand || !this.formatters[this.activeCommand]) {
      return text;
    }
    
    let formatted = text;
    const formatter = this.formatters[this.activeCommand];
    
    for (const pattern of formatter.patterns) {
      formatted = formatted.replace(pattern.regex, pattern.format);
    }
    
    return formatted;
  }
  
  // Reset active command
  reset() {
    this.activeCommand = null;
  }
}

module.exports = { CommandFormatter };