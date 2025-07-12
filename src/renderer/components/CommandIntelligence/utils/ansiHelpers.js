/**
 * ANSI escape sequence helpers
 */

/**
 * Remove ANSI escape sequences from text
 * @param {string} text - Text containing ANSI escape sequences
 * @returns {string} Clean text without ANSI codes
 */
export function stripAnsi(text) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  // Comprehensive regex to match all ANSI escape sequences
  // This includes:
  // - CSI sequences: ESC [ ... m (colors, styles)
  // - OSC sequences: ESC ] ... BEL/ST (operating system commands)
  // - Other escape sequences
  const ansiRegex = new RegExp([
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|'), 'g');
  
  return text.replace(ansiRegex, '');
}

/**
 * Clean terminal output by removing ANSI codes and fixing encoding
 * @param {string} text - Raw terminal output
 * @returns {string} Clean text
 */
export function cleanTerminalOutput(text) {
  if (!text) return '';
  
  // First strip ANSI codes
  let cleaned = stripAnsi(text);
  
  // Don't remove any characters that might be part of UTF-8 sequences
  // Only normalize line endings
  cleaned = cleaned
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n');
  
  return cleaned;
}

/**
 * Parse ANSI color codes to HTML
 * @param {string} text - Text with ANSI codes
 * @returns {string} HTML with color spans
 */
export function ansiToHtml(text) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  // For now, just strip ANSI codes
  // In the future, we could convert them to HTML spans with colors
  return stripAnsi(text);
}

/**
 * Check if text contains ANSI escape sequences
 * @param {string} text - Text to check
 * @returns {boolean} True if contains ANSI codes
 */
export function hasAnsiCodes(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const ansiRegex = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?[\u0007])|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/;
  
  return ansiRegex.test(text);
}