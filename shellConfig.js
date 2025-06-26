/**
 * Shell Configuration for ZeamiTerm
 * Sets up aliases and functions for better claude code integration
 */

const path = require('path');
const fs = require('fs');

class ShellConfig {
  /**
   * Generate shell configuration commands
   * @param {Object} context - Directory context from CwdManager
   * @returns {string} Shell commands to execute
   */
  static getInitCommands(context) {
    const commands = [];
    
    // Basic terminal setup
    commands.push('export TERM=xterm-256color');
    commands.push('export LANG=en_US.UTF-8');
    commands.push('export LC_ALL=en_US.UTF-8');
    
    // ZeamiTerm identification
    commands.push('export ZEAMI_TERM=1');
    
    // Project context
    if (context.projectRoot) {
      commands.push(`export ZEAMI_PROJECT_ROOT="${context.projectRoot}"`);
      
      // Create a function to run claude from project root
      commands.push(`
# ZeamiTerm claude function
claude() {
  if [ -n "$ZEAMI_PROJECT_ROOT" ] && [ -f "$ZEAMI_PROJECT_ROOT/CLAUDE.md" ]; then
    echo "🚀 Running claude from project root: $ZEAMI_PROJECT_ROOT"
    (cd "$ZEAMI_PROJECT_ROOT" && command claude "$@")
  else
    command claude "$@"
  fi
}
export -f claude 2>/dev/null || true
`);
    }
    
    // Zeami root context
    if (context.zeamiRoot) {
      commands.push(`export ZEAMI_ROOT="${context.zeamiRoot}"`);
      
      // Add zeami to PATH if not already there
      const zeamiBinPath = path.join(context.zeamiRoot, 'bin');
      if (fs.existsSync(zeamiBinPath)) {
        commands.push(`
# Add Zeami bin to PATH
if [[ ":$PATH:" != *":${zeamiBinPath}:"* ]]; then
  export PATH="${zeamiBinPath}:$PATH"
fi
`);
      }
    }
    
    // Create helpful aliases
    commands.push(`
# ZeamiTerm aliases
alias zcd='cd "$ZEAMI_PROJECT_ROOT" 2>/dev/null || cd "$ZEAMI_ROOT" 2>/dev/null || echo "No Zeami context found"'
alias zls='ls -la'
alias zstatus='echo "Project: $(basename "$ZEAMI_PROJECT_ROOT" 2>/dev/null || echo "none") | Zeami: $(basename "$ZEAMI_ROOT" 2>/dev/null || echo "none")"'
`);
    
    // Clear screen for clean start
    commands.push('clear');
    
    // Join all commands with semicolons to execute as one
    return commands.join('; ');
  }
  
  /**
   * Get a welcome message for the terminal
   * @param {Object} context - Directory context
   * @returns {string} Welcome message
   */
  static getWelcomeMessage(context) {
    const lines = [];
    
    lines.push('╭────────────────────────────────────────╮');
    lines.push('│          Welcome to ZeamiTerm          │');
    lines.push('╰────────────────────────────────────────╯');
    
    if (context.projectRoot) {
      const projectName = path.basename(context.projectRoot);
      lines.push(`📁 Project: ${projectName}`);
      
      if (context.hasClaudeMd) {
        lines.push('✅ CLAUDE.md detected');
      }
      
      if (context.cwd !== context.projectRoot) {
        lines.push(`📍 Location: ./${context.relativePath || ''}`);
      }
    } else if (context.zeamiRoot) {
      lines.push('🏠 Zeami workspace');
    }
    
    lines.push('');
    lines.push('💡 Tips:');
    lines.push('  • Type "claude" to run Claude Code from project root');
    lines.push('  • Type "zcd" to go to project/zeami root');
    lines.push('  • Type "zstatus" to see current context');
    lines.push('────────────────────────────────────────');
    
    return lines.join('\r\n') + '\r\n';
  }
}

module.exports = { ShellConfig };