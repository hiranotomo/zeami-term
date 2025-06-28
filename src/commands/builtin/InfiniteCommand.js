/**
 * InfiniteCommand - Generate endless code output for testing
 */

export class InfiniteCommand {
  constructor() {
    this.name = 'infinite';
    this.description = 'Generate endless code output (Ctrl+C to stop)';
    this.usage = 'infinite [type]';
    this.category = 'builtin';
    this.aliases = ['endless'];
    this.isRunning = false;
  }
  
  async execute(terminal, args = []) {
    const type = args[0] || 'code';
    
    terminal.writeln('\r\n\x1b[1;33mGenerating endless output... Press Ctrl+C to stop.\x1b[0m\r\n');
    
    this.isRunning = true;
    
    // Use interactive mode to catch Ctrl+C
    terminal.enterInteractiveMode('infinite', (data) => {
      if (data === '\x03') { // Ctrl+C
        this.isRunning = false;
        terminal.exitInteractiveMode();
        terminal.writeln('\r\n\x1b[1;31mStopped.\x1b[0m');
        return true;
      }
      return false; // Let other input pass through
    });
    
    switch (type) {
      case 'code':
        await this.generateCode(terminal);
        break;
      case 'log':
        await this.generateLogs(terminal);
        break;
      case 'json':
        await this.generateJSON(terminal);
        break;
      case 'matrix':
        await this.generateMatrix(terminal);
        break;
      default:
        await this.generateCode(terminal);
    }
    
    // Exit interactive mode if still running
    if (this.isRunning) {
      terminal.exitInteractiveMode();
      this.isRunning = false;
    }
  }
  
  async generateCode(terminal) {
    const codeSnippets = [
      'function processData(input) {',
      '  const result = input.map(item => {',
      '    return transformItem(item);',
      '  });',
      '  return result.filter(Boolean);',
      '}',
      '',
      'class DataProcessor {',
      '  constructor(options = {}) {',
      '    this.options = { ...defaultOptions, ...options };',
      '    this.cache = new Map();',
      '  }',
      '',
      '  async process(data) {',
      '    if (this.cache.has(data.id)) {',
      '      return this.cache.get(data.id);',
      '    }',
      '    const result = await this.transform(data);',
      '    this.cache.set(data.id, result);',
      '    return result;',
      '  }',
      '}',
      '',
      'const API_ENDPOINT = "https://api.example.com/v2";',
      'const MAX_RETRIES = 3;',
      '',
      'async function fetchWithRetry(url, options = {}) {',
      '  let lastError;',
      '  for (let i = 0; i < MAX_RETRIES; i++) {',
      '    try {',
      '      const response = await fetch(url, options);',
      '      if (!response.ok) throw new Error(`HTTP ${response.status}`);',
      '      return await response.json();',
      '    } catch (error) {',
      '      lastError = error;',
      '      await sleep(Math.pow(2, i) * 1000);',
      '    }',
      '  }',
      '  throw lastError;',
      '}',
      ''
    ];
    
    let lineNumber = 1;
    let snippetIndex = 0;
    
    while (this.isRunning) {
      const line = codeSnippets[snippetIndex % codeSnippets.length];
      const coloredLine = this.syntaxHighlight(line);
      terminal.write(`\x1b[90m${String(lineNumber).padStart(4, ' ')}│\x1b[0m ${coloredLine}\r\n`);
      
      lineNumber++;
      snippetIndex++;
      
      // Small delay to simulate typing
      await this.sleep(50 + Math.random() * 100);
    }
  }
  
  async generateLogs(terminal) {
    const logLevels = [
      { level: 'INFO', color: '\x1b[36m' },
      { level: 'WARN', color: '\x1b[33m' },
      { level: 'ERROR', color: '\x1b[31m' },
      { level: 'DEBUG', color: '\x1b[90m' }
    ];
    
    const messages = [
      'Server started on port 3000',
      'Connected to database',
      'Request received: GET /api/users',
      'Cache miss for key: user_123',
      'Database query executed in 45ms',
      'Response sent: 200 OK',
      'Memory usage: 124MB / 512MB',
      'Active connections: 42',
      'Background job started: email_notifications',
      'Rate limit exceeded for IP: 192.168.1.100'
    ];
    
    while (this.isRunning) {
      const timestamp = new Date().toISOString();
      const logLevel = logLevels[Math.floor(Math.random() * logLevels.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      terminal.write(`[${timestamp}] ${logLevel.color}[${logLevel.level}]\x1b[0m ${message}\r\n`);
      
      await this.sleep(200 + Math.random() * 300);
    }
  }
  
  async generateJSON(terminal) {
    let id = 1;
    
    while (this.isRunning) {
      const data = {
        id: id++,
        timestamp: Date.now(),
        user: {
          name: `User${Math.floor(Math.random() * 1000)}`,
          email: `user${id}@example.com`,
          role: ['admin', 'user', 'guest'][Math.floor(Math.random() * 3)]
        },
        metrics: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          disk: Math.random() * 100,
          network: {
            in: Math.floor(Math.random() * 1000000),
            out: Math.floor(Math.random() * 1000000)
          }
        },
        status: ['active', 'idle', 'processing'][Math.floor(Math.random() * 3)]
      };
      
      const json = JSON.stringify(data, null, 2);
      const lines = json.split('\n');
      
      for (const line of lines) {
        if (!this.isRunning) break;
        terminal.write(this.jsonHighlight(line) + '\r\n');
        await this.sleep(50);
      }
      
      terminal.write('\r\n');
      await this.sleep(500);
    }
  }
  
  async generateMatrix(terminal) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
    const width = terminal.cols;
    
    while (this.isRunning) {
      let line = '';
      for (let i = 0; i < width; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const intensity = Math.random();
        
        if (intensity > 0.9) {
          line += `\x1b[1;32m${char}\x1b[0m`; // Bright green
        } else if (intensity > 0.7) {
          line += `\x1b[32m${char}\x1b[0m`; // Normal green
        } else if (intensity > 0.3) {
          line += `\x1b[2;32m${char}\x1b[0m`; // Dim green
        } else {
          line += ' ';
        }
      }
      
      terminal.write(line + '\r\n');
      await this.sleep(100);
    }
  }
  
  syntaxHighlight(line) {
    // Simple syntax highlighting
    return line
      .replace(/\b(function|class|const|let|var|async|await|return|if|else|for|while|try|catch|throw|new)\b/g, '\x1b[35m$1\x1b[0m') // Keywords in magenta
      .replace(/\b(true|false|null|undefined)\b/g, '\x1b[36m$1\x1b[0m') // Literals in cyan
      .replace(/"[^"]*"/g, '\x1b[32m$&\x1b[0m') // Strings in green
      .replace(/\/\/.*$/g, '\x1b[90m$&\x1b[0m') // Comments in gray
      .replace(/\b\d+\b/g, '\x1b[33m$&\x1b[0m'); // Numbers in yellow
  }
  
  jsonHighlight(line) {
    return line
      .replace(/"([^"]+)":/g, '\x1b[36m"$1":\x1b[0m') // Keys in cyan
      .replace(/: "([^"]+)"/g, ': \x1b[32m"$1"\x1b[0m') // String values in green
      .replace(/: (\d+\.?\d*)/g, ': \x1b[33m$1\x1b[0m') // Numbers in yellow
      .replace(/: (true|false|null)/g, ': \x1b[35m$1\x1b[0m'); // Booleans/null in magenta
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}