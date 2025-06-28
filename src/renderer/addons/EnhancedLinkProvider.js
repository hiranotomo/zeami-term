/**
 * EnhancedLinkProvider - Advanced link detection for ZeamiTerm
 * Detects file paths, error outputs, Git URLs, and more
 */

// File system access will be handled through Electron IPC if needed
let fs = null;
let path = null;

try {
  // Try to get fs and path if available in preload
  if (window.electronAPI && window.electronAPI.fs) {
    fs = window.electronAPI.fs;
  }
  if (window.electronAPI && window.electronAPI.path) {
    path = window.electronAPI.path;
  }
} catch (error) {
  console.warn('[EnhancedLinkProvider] fs/path not available:', error);
}

export class EnhancedLinkProvider {
  constructor() {
    this._terminal = null;
    this._cwd = '/';  // Default to root, will be updated by shell integration
    this._linkCache = new Map();
    this._decorations = new Map();
    
    // Bind methods
    this.activate = this.activate.bind(this);
    this.dispose = this.dispose.bind(this);
  }
  
  activate(terminal) {
    this._terminal = terminal;
    
    // Register link provider
    if (terminal.registerLinkProvider) {
      this._linkProvider = terminal.registerLinkProvider(this);
    }
    
    // Listen to CWD changes from shell integration
    terminal.onShellIntegrationEvent = (eventName, data) => {
      if (eventName === 'cwdChange') {
        this._cwd = data;
      }
    };
    
    console.log('[EnhancedLinkProvider] Activated');
  }
  
  dispose() {
    if (this._linkProvider) {
      this._linkProvider.dispose();
    }
    this._decorations.forEach(decoration => decoration.dispose());
    this._decorations.clear();
    this._linkCache.clear();
  }
  
  /**
   * Main link provider method - called by xterm.js
   */
  async provideLinks(lineIndex, callback) {
    const line = this._terminal.buffer.active.getLine(lineIndex);
    if (!line) {
      callback(undefined);
      return;
    }
    
    const text = line.translateToString();
    const links = [];
    
    // Detect various link types
    links.push(...this._detectFilePaths(text, lineIndex));
    links.push(...this._detectErrorOutput(text, lineIndex));
    links.push(...this._detectGitUrls(text, lineIndex));
    links.push(...this._detectUrls(text, lineIndex));
    links.push(...this._detectStackTrace(text, lineIndex));
    
    callback(links);
  }
  
  /**
   * Detect file paths with validation
   */
  _detectFilePaths(text, lineIndex) {
    const links = [];
    
    // Common file path patterns
    const patterns = [
      // Absolute paths
      /(?:^|\s)(\/[^\s:]+(?:\.[a-zA-Z]+)?)/g,
      // Relative paths
      /(?:^|\s)(\.{1,2}\/[^\s:]+(?:\.[a-zA-Z]+)?)/g,
      // Windows paths
      /(?:^|\s)([A-Za-z]:\\[^\s:]+(?:\.[a-zA-Z]+)?)/g,
      // File with line number (file.js:10)
      /(?:^|\s)((?:\/|\.{1,2}\/)?[^\s:]+\.[a-zA-Z]+):(\d+)(?::(\d+))?/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const filePath = match[1];
        const lineNum = match[2];
        const colNum = match[3];
        
        // Resolve path
        const resolvedPath = this._resolvePath(filePath);
        
        // Create link
        const link = {
          range: {
            start: { x: match.index + (fullMatch.length - fullMatch.trimStart().length), y: lineIndex },
            end: { x: match.index + fullMatch.length, y: lineIndex }
          },
          text: fullMatch.trim(),
          filePath: resolvedPath,
          lineNumber: lineNum ? parseInt(lineNum, 10) : undefined,
          columnNumber: colNum ? parseInt(colNum, 10) : undefined,
          type: 'file',
          activate: (e) => this._handleFileLink(resolvedPath, lineNum, colNum, e)
        };
        
        // Validate file exists (async)
        if (fs) {
          this._validateFilePath(link);
        }
        
        links.push(link);
      }
    }
    
    return links;
  }
  
  /**
   * Detect compiler/linter error output
   */
  _detectErrorOutput(text, lineIndex) {
    const links = [];
    
    // Common error patterns
    const patterns = [
      // TypeScript/JavaScript errors: src/file.ts(10,5): error TS2322
      /([^\s]+\.(?:ts|tsx|js|jsx))\((\d+),(\d+)\):\s*(?:error|warning)/g,
      // Python errors: File "script.py", line 42
      /File\s+"([^"]+)",\s+line\s+(\d+)/g,
      // GCC/Clang: file.c:10:5: error:
      /([^\s]+\.(?:c|cpp|cc|h|hpp)):(\d+):(\d+):\s*(?:error|warning|note):/g,
      // Rust: src/main.rs:10:5
      /(?:^|\s)([^\s]+\.rs):(\d+):(\d+)/g,
      // Go: file.go:10:5:
      /([^\s]+\.go):(\d+):(\d+):/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const filePath = match[1];
        const lineNum = match[2];
        const colNum = match[3];
        
        const resolvedPath = this._resolvePath(filePath);
        
        const link = {
          range: {
            start: { x: match.index, y: lineIndex },
            end: { x: match.index + fullMatch.length, y: lineIndex }
          },
          text: fullMatch,
          filePath: resolvedPath,
          lineNumber: parseInt(lineNum, 10),
          columnNumber: colNum ? parseInt(colNum, 10) : undefined,
          type: 'error',
          activate: (e) => this._handleFileLink(resolvedPath, lineNum, colNum, e)
        };
        
        links.push(link);
      }
    }
    
    return links;
  }
  
  /**
   * Detect Git remote URLs
   */
  _detectGitUrls(text, lineIndex) {
    const links = [];
    
    // Git URL patterns
    const patterns = [
      // GitHub/GitLab/Bitbucket SSH
      /git@(github|gitlab|bitbucket)\.(?:com|org):([^\/\s]+)\/([^\/\s]+?)(?:\.git)?(?:\s|$)/g,
      // GitHub/GitLab/Bitbucket HTTPS
      /https?:\/\/(github|gitlab|bitbucket)\.(?:com|org)\/([^\/\s]+)\/([^\/\s]+?)(?:\.git)?(?:\s|$)/g,
      // Generic Git URL
      /(?:git|https?):\/\/[^\s]+\.git/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const provider = match[1];
        const owner = match[2];
        const repo = match[3];
        
        const link = {
          range: {
            start: { x: match.index, y: lineIndex },
            end: { x: match.index + fullMatch.length, y: lineIndex }
          },
          text: fullMatch.trim(),
          type: 'git',
          provider,
          owner,
          repo,
          activate: (e) => this._handleGitLink(fullMatch.trim(), provider, owner, repo, e)
        };
        
        links.push(link);
      }
    }
    
    return links;
  }
  
  /**
   * Detect regular URLs
   */
  _detectUrls(text, lineIndex) {
    const links = [];
    
    // URL pattern
    const pattern = /https?:\/\/[^\s<>"\{\}|\\\^\[\]`]+/g;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const url = match[0];
      
      // Don't duplicate Git URLs
      if (url.endsWith('.git')) continue;
      
      const link = {
        range: {
          start: { x: match.index, y: lineIndex },
          end: { x: match.index + url.length, y: lineIndex }
        },
        text: url,
        type: 'url',
        activate: (e) => this._handleUrlLink(url, e)
      };
      
      links.push(link);
    }
    
    return links;
  }
  
  /**
   * Detect stack traces
   */
  _detectStackTrace(text, lineIndex) {
    const links = [];
    
    // Stack trace patterns
    const patterns = [
      // JavaScript: at Function.name (file.js:10:5)
      /at\s+(?:[^\s]+\s+)?\(([^)]+):(\d+):(\d+)\)/g,
      // Python: File "file.py", line 10, in function
      /File\s+"([^"]+)",\s+line\s+(\d+)/g,
      // Java: at com.example.Class.method(Class.java:10)
      /at\s+[^\s]+\(([^:]+):(\d+)\)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const filePath = match[1];
        const lineNum = match[2];
        const colNum = match[3];
        
        const resolvedPath = this._resolvePath(filePath);
        
        const link = {
          range: {
            start: { x: match.index, y: lineIndex },
            end: { x: match.index + fullMatch.length, y: lineIndex }
          },
          text: fullMatch,
          filePath: resolvedPath,
          lineNumber: parseInt(lineNum, 10),
          columnNumber: colNum ? parseInt(colNum, 10) : undefined,
          type: 'stacktrace',
          activate: (e) => this._handleFileLink(resolvedPath, lineNum, colNum, e)
        };
        
        links.push(link);
      }
    }
    
    return links;
  }
  
  /**
   * Resolve file path relative to CWD
   */
  _resolvePath(filePath) {
    if (!path) return filePath;
    
    // If absolute path, return as is
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Resolve relative to CWD
    return path.resolve(this._cwd, filePath);
  }
  
  /**
   * Validate file path exists
   */
  async _validateFilePath(link) {
    // Skip validation if fs is not available
    if (!fs || !fs.promises) {
      link.exists = undefined;
      return;
    }
    
    try {
      await fs.promises.access(link.filePath, fs.constants.F_OK);
      link.exists = true;
      
      // Add decoration for valid file
      this._addLinkDecoration(link, 'valid-file');
    } catch (error) {
      link.exists = false;
      
      // Add decoration for invalid file
      this._addLinkDecoration(link, 'invalid-file');
    }
  }
  
  /**
   * Add visual decoration for link
   */
  _addLinkDecoration(link, type) {
    if (!this._terminal.registerDecoration) return;
    
    try {
      const decoration = this._terminal.registerDecoration({
        marker: {
          line: link.range.start.y,
          startColumn: link.range.start.x,
          endColumn: link.range.end.x
        },
        overviewRulerLane: 'center'
      });
      
      if (decoration) {
        decoration.onRender((element) => {
          element.classList.add(`link-decoration`, `link-${type}`);
          
          // Add hover effect
          element.addEventListener('mouseenter', () => {
            this._showLinkTooltip(link, element);
          });
          
          element.addEventListener('mouseleave', () => {
            this._hideLinkTooltip();
          });
        });
        
        this._decorations.set(link, decoration);
      }
    } catch (error) {
      console.warn('[EnhancedLinkProvider] Failed to add decoration:', error);
    }
  }
  
  /**
   * Show tooltip for link
   */
  _showLinkTooltip(link, element) {
    const tooltip = document.createElement('div');
    tooltip.className = 'link-tooltip';
    
    let content = '';
    if (link.type === 'file' || link.type === 'error' || link.type === 'stacktrace') {
      content = `
        <strong>File:</strong> ${link.filePath}<br>
        ${link.lineNumber ? `<strong>Line:</strong> ${link.lineNumber}<br>` : ''}
        ${link.columnNumber ? `<strong>Column:</strong> ${link.columnNumber}<br>` : ''}
        ${link.exists !== undefined ? `<strong>Exists:</strong> ${link.exists ? 'Yes' : 'No'}<br>` : ''}
        <em>Click to open</em>
      `;
    } else if (link.type === 'git') {
      content = `
        <strong>Git Repository</strong><br>
        <strong>Provider:</strong> ${link.provider}<br>
        <strong>Owner:</strong> ${link.owner}<br>
        <strong>Repo:</strong> ${link.repo}<br>
        <em>Click to open in browser</em>
      `;
    } else if (link.type === 'url') {
      content = `
        <strong>URL:</strong> ${link.text}<br>
        <em>Click to open in browser</em>
      `;
    }
    
    tooltip.innerHTML = content;
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.zIndex = '10000';
    
    this._currentTooltip = tooltip;
  }
  
  _hideLinkTooltip() {
    if (this._currentTooltip) {
      this._currentTooltip.remove();
      this._currentTooltip = null;
    }
  }
  
  /**
   * Handle file link click
   */
  _handleFileLink(filePath, lineNum, colNum, event) {
    console.log('[EnhancedLinkProvider] Opening file:', filePath, 'at', lineNum, ':', colNum);
    
    // Send IPC message to open file
    if (window.electronAPI) {
      window.electronAPI.openFile({
        path: filePath,
        line: lineNum ? parseInt(lineNum, 10) : undefined,
        column: colNum ? parseInt(colNum, 10) : undefined
      });
    } else {
      // Fallback: copy path to clipboard
      navigator.clipboard.writeText(filePath);
      this._showNotification(`Path copied: ${filePath}`);
    }
    
    event.preventDefault();
  }
  
  /**
   * Handle Git link click
   */
  _handleGitLink(url, provider, owner, repo, event) {
    let webUrl = url;
    
    // Convert SSH to HTTPS
    if (url.startsWith('git@')) {
      if (provider && owner && repo) {
        webUrl = `https://${provider}.com/${owner}/${repo}`;
      } else {
        // Generic conversion
        webUrl = url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');
      }
    }
    
    // Open in browser
    if (window.electronAPI) {
      window.electronAPI.openExternal(webUrl);
    } else {
      window.open(webUrl, '_blank');
    }
    
    event.preventDefault();
  }
  
  /**
   * Handle URL link click
   */
  _handleUrlLink(url, event) {
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
    
    event.preventDefault();
  }
  
  /**
   * Show notification
   */
  _showNotification(message) {
    if (this._terminal.onNotification) {
      this._terminal.onNotification(message);
    }
  }
}