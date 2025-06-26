/**
 * Claude Code Helper - Ensures claude code runs with proper context
 * Handles CLAUDE.md resolution and project context
 */

const path = require('path');
const fs = require('fs');
const { CwdManager } = require('./cwdManager');

class ClaudeCodeHelper {
  constructor() {
    this.cwdManager = new CwdManager();
  }
  
  /**
   * Prepare environment for claude code execution
   * @param {string} cwd - Current working directory
   * @returns {Object} Environment variables to add
   */
  prepareEnvironment(cwd) {
    const context = this.cwdManager.getDirectoryContext(cwd);
    const env = {};
    
    // If we're in a project, ensure claude code can find CLAUDE.md
    if (context.projectRoot && context.hasClaudeMd) {
      // Set a marker that we're in a Zeami project
      env.ZEAMI_PROJECT_ROOT = context.projectRoot;
      
      // If we're in a subdirectory, claude code might need help finding CLAUDE.md
      if (cwd !== context.projectRoot) {
        env.ZEAMI_CLAUDE_MD_PATH = path.join(context.projectRoot, 'CLAUDE.md');
      }
    }
    
    // If we found Zeami root, add it to the environment
    if (context.zeamiRoot) {
      env.ZEAMI_ROOT = context.zeamiRoot;
    }
    
    return env;
  }
  
  /**
   * Check if a command is trying to run claude code
   * @param {string} command - Command being executed
   * @returns {boolean} True if it's a claude code command
   */
  isClaudeCodeCommand(command) {
    if (!command) return false;
    
    const trimmed = command.trim().toLowerCase();
    return trimmed === 'claude' || 
           trimmed.startsWith('claude ') ||
           trimmed === 'claude code' ||
           trimmed.startsWith('claude code ');
  }
  
  /**
   * Create a wrapper script for claude code that ensures proper context
   * @param {string} projectRoot - Project root directory
   * @returns {string} Path to the wrapper script
   */
  createClaudeWrapper(projectRoot) {
    const wrapperContent = `#!/bin/bash
# ZeamiTerm Claude Code Wrapper
# Ensures claude code runs with proper project context

# Change to project root if CLAUDE.md exists there
if [ -f "${projectRoot}/CLAUDE.md" ]; then
  cd "${projectRoot}"
fi

# Run claude code with all arguments
exec claude "$@"
`;
    
    const wrapperPath = path.join(require('os').tmpdir(), 'zeami-claude-wrapper.sh');
    fs.writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 });
    
    return wrapperPath;
  }
  
  /**
   * Get startup message for terminal
   * @param {Object} context - Directory context
   * @returns {string} Startup message
   */
  getStartupMessage(context) {
    const lines = [];
    
    if (context.isInProject && context.projectRoot) {
      lines.push(`📁 Project: ${path.basename(context.projectRoot)}`);
      if (context.hasClaudeMd) {
        lines.push(`✅ CLAUDE.md found in project root`);
      }
      if (context.relativePath) {
        lines.push(`📍 Location: ${context.relativePath || 'project root'}`);
      }
    } else if (context.isInZeami) {
      lines.push(`🏠 Zeami workspace`);
    }
    
    if (lines.length > 0) {
      lines.unshift('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return lines.join('\r\n') + '\r\n';
    }
    
    return '';
  }
}

module.exports = { ClaudeCodeHelper };