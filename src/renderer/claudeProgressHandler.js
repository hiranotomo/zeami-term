/**
 * Claude Code Progress Handler
 * Handles Claude Code's specific progress output patterns
 */

class ClaudeProgressHandler {
  constructor() {
    // Patterns for Claude Code progress indicators
    this.patterns = {
      // Standard progress: [████████████████████████████████████████] 100%
      standardProgress: /\[([█▓▒░\s]+)\]\s*(\d+)%/,
      
      // Inline progress: Progress: 50% complete
      inlineProgress: /Progress:\s*(\d+)%\s*(?:complete)?/i,
      
      // Step progress: Step 1/5: Description
      stepProgress: /Step\s*(\d+)\/(\d+):\s*(.+)/i,
      
      // Loading dots: Loading...
      loadingDots: /^(.+?)(\.{1,3})$/,
      
      // Spinner patterns
      spinner: /^([⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏])\s*(.+)/,
      
      // File operation progress
      fileProgress: /(?:Downloading|Uploading|Processing)\s+(.+?):\s*(\d+)%/i,
      
      // Build/compile progress
      buildProgress: /(?:Building|Compiling)\s+\[(\d+)\/(\d+)\]/i
    };
    
    // Track last progress line for proper overwriting
    this.lastProgressLine = null;
    this.progressLines = new Map();
  }

  /**
   * Process a line of output and determine if it's a progress indicator
   * @param {string} line - The line to process
   * @returns {Object} Processed line info
   */
  processLine(line) {
    const trimmed = line.trim();
    
    // Check each pattern
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          isProgress: true,
          type: type,
          content: line,
          match: match,
          shouldOverwrite: this.shouldOverwritePrevious(type, match)
        };
      }
    }
    
    // Check if this line updates a previous progress line
    if (this.isProgressUpdate(trimmed)) {
      return {
        isProgress: true,
        type: 'update',
        content: line,
        shouldOverwrite: true
      };
    }
    
    // Not a progress line
    return {
      isProgress: false,
      content: line,
      shouldOverwrite: false
    };
  }

  /**
   * Determine if this progress should overwrite the previous line
   * @param {string} type - Progress type
   * @param {Array} match - Regex match result
   * @returns {boolean}
   */
  shouldOverwritePrevious(type, match) {
    switch (type) {
      case 'standardProgress':
      case 'inlineProgress':
      case 'fileProgress':
        // Always overwrite for percentage-based progress
        return true;
        
      case 'spinner':
      case 'loadingDots':
        // Overwrite for animated indicators
        return true;
        
      case 'buildProgress':
        // Overwrite if it's the same build step
        if (this.lastProgressLine && this.lastProgressLine.type === 'buildProgress') {
          return true;
        }
        return false;
        
      case 'stepProgress':
        // Don't overwrite step progress - each step should be preserved
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Check if a line is an update to a previous progress line
   * @param {string} line - Line to check
   * @returns {boolean}
   */
  isProgressUpdate(line) {
    if (!this.lastProgressLine) return false;
    
    // Check if it's a similar pattern with updated values
    const lastType = this.lastProgressLine.type;
    const lastContent = this.lastProgressLine.content;
    
    // For percentage updates
    if (lastType === 'standardProgress' || lastType === 'inlineProgress') {
      return line.includes('%') && this.extractPercentage(line) !== null;
    }
    
    // For spinner updates
    if (lastType === 'spinner') {
      return this.patterns.spinner.test(line);
    }
    
    return false;
  }

  /**
   * Extract percentage from a line
   * @param {string} line - Line to extract from
   * @returns {number|null} Percentage or null
   */
  extractPercentage(line) {
    const match = line.match(/(\d+)%/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Format output with proper control sequences
   * @param {string} data - Raw terminal data
   * @returns {string} Formatted data
   */
  formatOutput(data) {
    // For now, just pass through the data without modification
    // The terminal should handle control sequences properly
    return data;
    
    /* Disabled complex processing that was causing issues
    const lines = data.split(/(\r\n|\n|\r)/);
    let formatted = '';
    let pendingCarriageReturn = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty strings from split
      if (line === '') continue;
      
      // Handle line endings
      if (line === '\r') {
        pendingCarriageReturn = true;
        continue;
      } else if (line === '\n' || line === '\r\n') {
        if (pendingCarriageReturn) {
          // Don't add newline after carriage return for progress lines
          pendingCarriageReturn = false;
        } else {
          formatted += line;
        }
        continue;
      }
      
      // Process actual content
      const processed = this.processLine(line);
      
      if (processed.isProgress && processed.shouldOverwrite) {
        // Use carriage return to overwrite
        if (formatted.length > 0 && !formatted.endsWith('\n') && !formatted.endsWith('\r')) {
          formatted += '\r';
        }
        formatted += line;
        this.lastProgressLine = processed;
        pendingCarriageReturn = true;
      } else {
        // Normal line
        if (pendingCarriageReturn && !processed.isProgress) {
          formatted += '\n';
          pendingCarriageReturn = false;
        }
        formatted += line;
        if (processed.isProgress) {
          this.lastProgressLine = processed;
        } else {
          this.lastProgressLine = null;
        }
      }
    }
    
    return formatted;
    */
  }

  /**
   * Clear tracking state
   */
  reset() {
    this.lastProgressLine = null;
    this.progressLines.clear();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClaudeProgressHandler;
} else {
  window.ClaudeProgressHandler = ClaudeProgressHandler;
}