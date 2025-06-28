/**
 * EnhancedLinkProvider Test Suite
 */

// Mock xterm.js terminal and buffer
class MockLine {
  constructor(text) {
    this._text = text;
  }
  
  translateToString() {
    return this._text;
  }
}

class MockBuffer {
  constructor() {
    this._lines = new Map();
  }
  
  setLine(index, text) {
    this._lines.set(index, new MockLine(text));
  }
  
  getLine(index) {
    return this._lines.get(index);
  }
}

class MockTerminal {
  constructor() {
    this.buffer = {
      active: new MockBuffer()
    };
    this._linkProviders = [];
    this.shellIntegrationEventHandlers = [];
  }
  
  registerLinkProvider(provider) {
    const registration = {
      provider,
      dispose: jest.fn()
    };
    this._linkProviders.push(registration);
    return registration;
  }
  
  set onShellIntegrationEvent(handler) {
    this.shellIntegrationEventHandlers.push(handler);
  }
  
  fireShellIntegrationEvent(eventName, data) {
    this.shellIntegrationEventHandlers.forEach(handler => {
      handler(eventName, data);
    });
  }
}

// Simplified EnhancedLinkProvider for testing
class EnhancedLinkProvider {
  constructor() {
    this._terminal = null;
    this._cwd = '/';
    this._linkCache = new Map();
    this._decorations = new Map();
  }
  
  activate(terminal) {
    this._terminal = terminal;
    
    if (terminal.registerLinkProvider) {
      this._linkProvider = terminal.registerLinkProvider(this);
    }
    
    terminal.onShellIntegrationEvent = (eventName, data) => {
      if (eventName === 'cwdChange') {
        this._cwd = data;
      }
    };
  }
  
  dispose() {
    if (this._linkProvider) {
      this._linkProvider.dispose();
    }
    this._decorations.forEach(decoration => decoration.dispose());
    this._decorations.clear();
    this._linkCache.clear();
  }
  
  async provideLinks(lineIndex, callback) {
    const line = this._terminal.buffer.active.getLine(lineIndex);
    if (!line) {
      callback(undefined);
      return;
    }
    
    const text = line.translateToString();
    const links = [];
    
    links.push(...this._detectFilePaths(text, lineIndex));
    links.push(...this._detectErrorOutput(text, lineIndex));
    links.push(...this._detectGitUrls(text, lineIndex));
    links.push(...this._detectUrls(text, lineIndex));
    
    callback(links);
  }
  
  _detectFilePaths(text, lineIndex) {
    const links = [];
    
    // Absolute paths
    const absPathRegex = /(?:^|\s)(\/[^\s:]+(?:\.[a-zA-Z]+)?)/g;
    let match;
    while ((match = absPathRegex.exec(text)) !== null) {
      links.push({
        range: [match.index + (match[0].length - match[1].length), lineIndex, match.index + match[0].length, lineIndex],
        text: match[1],
        activate: () => console.log('Open file:', match[1])
      });
    }
    
    // File with line number
    const fileLineRegex = /(?:^|\s)((?:\/|\.{1,2}\/)?[^\s:]+\.[a-zA-Z]+):(\d+)(?::(\d+))?/g;
    while ((match = fileLineRegex.exec(text)) !== null) {
      links.push({
        range: [match.index + (match[0].charAt(0) === ' ' ? 1 : 0), lineIndex, match.index + match[0].length, lineIndex],
        text: match[0].trim(),
        activate: () => console.log('Open file:', match[1], 'at line:', match[2])
      });
    }
    
    return links;
  }
  
  _detectErrorOutput(text, lineIndex) {
    const links = [];
    
    // Common error patterns
    const errorPatterns = [
      // JavaScript/TypeScript: Error at file.js:10:5
      /Error(?:\s+at)?\s+([^\s:]+\.[a-zA-Z]+):(\d+):(\d+)/g,
      // Python: File "script.py", line 42
      /File\s+"([^"]+)",\s+line\s+(\d+)/g
    ];
    
    errorPatterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern);
      while ((match = regex.exec(text)) !== null) {
        links.push({
          range: [match.index, lineIndex, match.index + match[0].length, lineIndex],
          text: match[0],
          activate: () => console.log('Open error location:', match[1])
        });
      }
    });
    
    return links;
  }
  
  _detectGitUrls(text, lineIndex) {
    const links = [];
    
    // Git URL patterns
    const gitPatterns = [
      /(?:git@|https:\/\/)github\.com[:/]([^\/\s]+)\/([^\/\s]+?)(?:\.git)?(?:\s|$)/g,
      /(?:git@|https:\/\/)gitlab\.com[:/]([^\/\s]+)\/([^\/\s]+?)(?:\.git)?(?:\s|$)/g
    ];
    
    gitPatterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern);
      while ((match = regex.exec(text)) !== null) {
        links.push({
          range: [match.index, lineIndex, match.index + match[0].trim().length, lineIndex],
          text: match[0].trim(),
          activate: () => console.log('Open Git URL:', match[0])
        });
      }
    });
    
    return links;
  }
  
  _detectUrls(text, lineIndex) {
    const links = [];
    
    // Standard URL pattern
    const urlRegex = /https?:\/\/[^\s<>[\]{}|\\^`"']+/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      links.push({
        range: [match.index, lineIndex, match.index + match[0].length, lineIndex],
        text: match[0],
        activate: () => console.log('Open URL:', match[0])
      });
    }
    
    return links;
  }
}

describe('EnhancedLinkProvider', () => {
  let terminal;
  let provider;
  
  beforeEach(() => {
    terminal = new MockTerminal();
    provider = new EnhancedLinkProvider();
    provider.activate(terminal);
  });
  
  afterEach(() => {
    provider.dispose();
  });
  
  describe('File Path Detection', () => {
    test('should detect absolute paths', async () => {
      terminal.buffer.active.setLine(0, 'Error in /home/user/project/file.js');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links).toHaveLength(1);
      expect(links[0].text).toBe('/home/user/project/file.js');
    });
    
    test('should detect files with line numbers', async () => {
      terminal.buffer.active.setLine(0, 'Error at src/index.js:42:10');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      // Both file path and error pattern will match, so we expect 2 links
      expect(links).toHaveLength(2);
      
      // Find the file path link (not the error pattern)
      const fileLink = links.find(link => link.text === 'src/index.js:42:10');
      expect(fileLink).toBeDefined();
    });
    
    test('should detect multiple file paths in one line', async () => {
      terminal.buffer.active.setLine(0, 'Compare /path/file1.txt with /path/file2.txt');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links).toHaveLength(2);
      expect(links[0].text).toBe('/path/file1.txt');
      expect(links[1].text).toBe('/path/file2.txt');
    });
  });
  
  describe('Error Output Detection', () => {
    test('should detect JavaScript error format', async () => {
      terminal.buffer.active.setLine(0, 'Error at app.js:10:5');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links.length).toBeGreaterThan(0);
      const errorLink = links.find(link => link.text.includes('Error'));
      expect(errorLink).toBeDefined();
    });
    
    test('should detect Python error format', async () => {
      terminal.buffer.active.setLine(0, 'File "script.py", line 42');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links.length).toBeGreaterThan(0);
      const errorLink = links.find(link => link.text.includes('File'));
      expect(errorLink).toBeDefined();
    });
  });
  
  describe('Git URL Detection', () => {
    test('should detect GitHub URLs', async () => {
      terminal.buffer.active.setLine(0, 'Clone from https://github.com/user/repo.git');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links.length).toBeGreaterThan(0);
      const gitLink = links.find(link => link.text.includes('github.com'));
      expect(gitLink).toBeDefined();
      expect(gitLink.text).toBe('https://github.com/user/repo.git');
    });
    
    test('should detect SSH Git URLs', async () => {
      terminal.buffer.active.setLine(0, 'Clone from git@github.com:user/repo.git');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links.length).toBeGreaterThan(0);
      const gitLink = links.find(link => link.text.includes('git@github.com'));
      expect(gitLink).toBeDefined();
    });
  });
  
  describe('Standard URL Detection', () => {
    test('should detect HTTP URLs', async () => {
      terminal.buffer.active.setLine(0, 'Visit http://example.com for more info');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      const urlLink = links.find(link => link.text.includes('http://'));
      expect(urlLink).toBeDefined();
      expect(urlLink.text).toBe('http://example.com');
    });
    
    test('should detect HTTPS URLs', async () => {
      terminal.buffer.active.setLine(0, 'Documentation at https://docs.example.com/guide');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      const urlLink = links.find(link => link.text.includes('https://'));
      expect(urlLink).toBeDefined();
      expect(urlLink.text).toBe('https://docs.example.com/guide');
    });
  });
  
  describe('CWD Integration', () => {
    test('should update CWD from shell integration event', () => {
      expect(provider._cwd).toBe('/');
      
      terminal.fireShellIntegrationEvent('cwdChange', '/home/user/project');
      
      expect(provider._cwd).toBe('/home/user/project');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle empty lines', async () => {
      terminal.buffer.active.setLine(0, '');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links).toHaveLength(0);
    });
    
    test('should handle non-existent lines', async () => {
      const links = await new Promise(resolve => {
        provider.provideLinks(999, resolve);
      });
      
      expect(links).toBeUndefined();
    });
    
    test('should not detect partial URLs', async () => {
      terminal.buffer.active.setLine(0, 'http:// or https:// without domain');
      
      const links = await new Promise(resolve => {
        provider.provideLinks(0, resolve);
      });
      
      expect(links).toHaveLength(0);
    });
  });
  
  describe('Disposal', () => {
    test('should clean up resources on dispose', () => {
      const linkProvider = provider._linkProvider;
      provider.dispose();
      
      expect(linkProvider.dispose).toHaveBeenCalled();
      expect(provider._linkCache.size).toBe(0);
      expect(provider._decorations.size).toBe(0);
    });
  });
});