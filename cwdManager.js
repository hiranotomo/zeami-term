/**
 * CWD Manager - Manages working directory for terminal sessions
 * Ensures proper context when running commands like 'claude code'
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

class CwdManager {
  constructor() {
    // Store the initial launch directory
    this.launchDirectory = process.cwd();
    
    // Cache for project root detection
    this.projectRootCache = new Map();
  }
  
  /**
   * Get the appropriate CWD for a new terminal session
   * @param {Object} options - Terminal creation options
   * @returns {string} The working directory path
   */
  getTerminalCwd(options = {}) {
    // 1. If explicitly specified, use that
    if (options.cwd && fs.existsSync(options.cwd)) {
      return options.cwd;
    }
    
    // 2. Try to detect if we're in a project directory
    const projectRoot = this.findProjectRoot(this.launchDirectory);
    if (projectRoot) {
      return projectRoot;
    }
    
    // 3. If launched from a specific directory, use that
    if (this.launchDirectory !== process.cwd()) {
      return this.launchDirectory;
    }
    
    // 4. Default to home directory
    return os.homedir();
  }
  
  /**
   * Find the project root by looking for key files
   * @param {string} startPath - Starting directory
   * @returns {string|null} Project root path or null
   */
  findProjectRoot(startPath) {
    // Check cache first
    if (this.projectRootCache.has(startPath)) {
      return this.projectRootCache.get(startPath);
    }
    
    // Files that indicate a project root
    const rootIndicators = [
      'CLAUDE.md',
      'package.json',
      '.git',
      '.zeami-context',
      'PROJECT_KNOWLEDGE.md'
    ];
    
    let currentPath = startPath;
    const root = path.parse(currentPath).root;
    
    while (currentPath !== root) {
      // Check if any root indicator exists
      for (const indicator of rootIndicators) {
        const indicatorPath = path.join(currentPath, indicator);
        if (fs.existsSync(indicatorPath)) {
          // Special handling for CLAUDE.md to ensure it's a project file
          if (indicator === 'CLAUDE.md') {
            try {
              const content = fs.readFileSync(indicatorPath, 'utf8');
              // Check if it's a project-specific CLAUDE.md
              if (content.includes('プロジェクト') || content.includes('project')) {
                this.projectRootCache.set(startPath, currentPath);
                return currentPath;
              }
            } catch (err) {
              // Continue checking other indicators
            }
          } else {
            this.projectRootCache.set(startPath, currentPath);
            return currentPath;
          }
        }
      }
      
      // Move up one directory
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) break; // Reached root
      currentPath = parentPath;
    }
    
    // No project root found
    this.projectRootCache.set(startPath, null);
    return null;
  }
  
  /**
   * Get the Zeami root directory
   * @returns {string|null} Zeami root path or null
   */
  findZeamiRoot() {
    // Start from the app's directory
    let currentPath = __dirname;
    const root = path.parse(currentPath).root;
    
    while (currentPath !== root) {
      // Check for Zeami root indicators
      const zeamiIndicators = [
        path.join(currentPath, 'bin', 'zeami'),
        path.join(currentPath, 'CLAUDE.md'),
        path.join(currentPath, 'projects', 'SHARED_KNOWLEDGE.md')
      ];
      
      if (zeamiIndicators.some(p => fs.existsSync(p))) {
        // Additional check for CLAUDE.md content
        const claudePath = path.join(currentPath, 'CLAUDE.md');
        if (fs.existsSync(claudePath)) {
          try {
            const content = fs.readFileSync(claudePath, 'utf8');
            if (content.includes('Zeami CLI') || content.includes('AI開発アシスタント用ガイドライン')) {
              return currentPath;
            }
          } catch (err) {
            // Continue checking
          }
        }
      }
      
      // Move up one directory
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) break;
      currentPath = parentPath;
    }
    
    return null;
  }
  
  /**
   * Update the launch directory (e.g., when opening a folder)
   * @param {string} newPath - New working directory
   */
  updateLaunchDirectory(newPath) {
    if (fs.existsSync(newPath)) {
      this.launchDirectory = newPath;
      // Clear cache when directory changes
      this.projectRootCache.clear();
    }
  }
  
  /**
   * Get context information for the current directory
   * @param {string} cwd - Current working directory
   * @returns {Object} Context information
   */
  getDirectoryContext(cwd) {
    const projectRoot = this.findProjectRoot(cwd);
    const zeamiRoot = this.findZeamiRoot();
    
    return {
      cwd,
      projectRoot,
      zeamiRoot,
      isInProject: !!projectRoot,
      isInZeami: !!zeamiRoot,
      relativePath: projectRoot ? path.relative(projectRoot, cwd) : null,
      hasClaudeMd: fs.existsSync(path.join(cwd, 'CLAUDE.md')),
      hasProjectKnowledge: fs.existsSync(path.join(cwd, 'PROJECT_KNOWLEDGE.md'))
    };
  }
}

module.exports = { CwdManager };