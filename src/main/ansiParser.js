/**
 * ANSI Escape Sequence Parser
 * Handles terminal control sequences for proper rendering
 */

class AnsiParser {
  constructor() {
    // Common ANSI escape patterns
    this.patterns = {
      // Cursor movement
      cursorUp: /\x1b\[(\d+)?A/g,
      cursorDown: /\x1b\[(\d+)?B/g,
      cursorForward: /\x1b\[(\d+)?C/g,
      cursorBack: /\x1b\[(\d+)?D/g,
      cursorPosition: /\x1b\[(\d+)?;?(\d+)?H/g,
      
      // Erase
      clearScreen: /\x1b\[2J/g,
      clearLine: /\x1b\[2K/g,
      
      // Colors and styles
      sgr: /\x1b\[([0-9;]+)?m/g,
      
      // Other
      bell: /\x07/g,
      backspace: /\x08/g,
      tab: /\x09/g,
      newline: /\n/g,
      carriageReturn: /\r/g
    };
  }

  /**
   * Process raw terminal output for better handling
   */
  process(data) {
    let processed = data;
    
    // Handle carriage returns properly
    if (processed.includes('\r\n')) {
      // Windows line endings - keep as is
      processed = processed;
    } else if (processed.includes('\r')) {
      // Unix carriage return - might need special handling
      // For now, convert standalone \r to \r\n
      processed = processed.replace(/\r(?!\n)/g, '\r\n');
    }
    
    return processed;
  }

  /**
   * Strip ANSI escape sequences for logging
   */
  stripAnsi(data) {
    let stripped = data;
    
    // Remove all ANSI escape sequences
    Object.values(this.patterns).forEach(pattern => {
      stripped = stripped.replace(pattern, '');
    });
    
    return stripped;
  }

  /**
   * Parse and extract ANSI sequences
   */
  parse(data) {
    const sequences = [];
    let lastIndex = 0;
    
    // Find all ANSI sequences
    const ansiRegex = /\x1b\[[^m]*m|\x1b\[[^J]*J|\x1b\[[^K]*K|\x1b\[[^H]*H/g;
    let match;
    
    while ((match = ansiRegex.exec(data)) !== null) {
      if (match.index > lastIndex) {
        // Add text before the sequence
        sequences.push({
          type: 'text',
          content: data.substring(lastIndex, match.index)
        });
      }
      
      // Add the ANSI sequence
      sequences.push({
        type: 'ansi',
        content: match[0],
        raw: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < data.length) {
      sequences.push({
        type: 'text',
        content: data.substring(lastIndex)
      });
    }
    
    return sequences;
  }
}

module.exports = { AnsiParser };