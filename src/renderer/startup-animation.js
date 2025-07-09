/**
 * Startup Animation for ZeamiTerm
 * Enhanced matrix-style terminal initialization effect
 */

class StartupAnimation {
  constructor(terminal) {
    this.terminal = terminal;
    this.colors = {
      brightGreen: '\x1b[1;32m',
      green: '\x1b[0;32m',
      dimGreen: '\x1b[2;32m',
      cyan: '\x1b[36m',
      brightCyan: '\x1b[1;36m',
      yellow: '\x1b[33m',
      brightYellow: '\x1b[1;33m',
      magenta: '\x1b[35m',
      brightMagenta: '\x1b[1;35m',
      white: '\x1b[37m',
      brightWhite: '\x1b[1;37m',
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      blink: '\x1b[5m'
    };
    this.katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  }

  async play() {
    // Hide cursor during animation
    this.terminal.write('\x1b[?25l');
    
    // Clear screen
    this.terminal.write('\x1b[2J\x1b[H');
    
    // Enhanced matrix rain effect with Japanese characters
    await this.enhancedMatrixRain(8);
    
    // Glitch transition
    await this.glitchTransition();
    
    // Clear for logo
    this.terminal.write('\x1b[2J\x1b[H');
    
    // Display new compact logo with effects
    await this.displayEnhancedLogo();
    
    // Cyber boot sequence
    await this.cyberBootSequence();
    
    // Show cursor
    this.terminal.write('\x1b[?25h');
  }

  async enhancedMatrixRain(duration) {
    const cols = this.terminal.cols;
    const rows = this.terminal.rows;
    const drops = new Array(Math.floor(cols / 2)).fill(0);
    const chars = new Array(Math.floor(cols / 2)).fill('');
    
    for (let i = 0; i < duration * 15; i++) {
      let output = '';
      
      for (let j = 0; j < drops.length; j++) {
        const x = j * 2 + 1;
        
        // Randomly spawn new drops
        if (drops[j] === 0 && Math.random() > 0.98) {
          drops[j] = 1;
          chars[j] = this.katakana[Math.floor(Math.random() * this.katakana.length)];
        }
        
        if (drops[j] > 0) {
          // Draw the trail
          for (let k = 0; k < 5; k++) {
            const y = drops[j] - k;
            if (y > 0 && y <= rows) {
              let color;
              if (k === 0) {
                color = this.colors.brightWhite; // Head is bright white
              } else if (k === 1) {
                color = this.colors.brightGreen;
              } else if (k === 2) {
                color = this.colors.green;
              } else {
                color = this.colors.dimGreen;
              }
              
              const char = k === 0 ? chars[j] : this.katakana[Math.floor(Math.random() * this.katakana.length)];
              output += `\x1b[${y};${x}H${color}${char}${this.colors.reset}`;
            }
          }
          
          // Clear the tail
          const tailY = drops[j] - 5;
          if (tailY > 0 && tailY <= rows) {
            output += `\x1b[${tailY};${x}H `;
          }
          
          drops[j]++;
          
          // Reset when reaching bottom
          if (drops[j] - 5 > rows) {
            drops[j] = 0;
          }
          
          // Randomly change character
          if (Math.random() > 0.95) {
            chars[j] = this.katakana[Math.floor(Math.random() * this.katakana.length)];
          }
        }
      }
      
      this.terminal.write(output);
      await this.sleep(30);
    }
  }

  async glitchTransition() {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    const rows = this.terminal.rows;
    const cols = this.terminal.cols;
    
    // Create glitch effect
    for (let i = 0; i < 10; i++) {
      let output = '';
      for (let j = 0; j < 20; j++) {
        const x = Math.floor(Math.random() * cols) + 1;
        const y = Math.floor(Math.random() * rows) + 1;
        const char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        const color = Math.random() > 0.5 ? this.colors.brightMagenta : this.colors.cyan;
        output += `\x1b[${y};${x}H${color}${char}`;
      }
      this.terminal.write(output);
      await this.sleep(50);
    }
    
    // Flash effect
    this.terminal.write('\x1b[2J\x1b[H' + this.colors.brightWhite);
    for (let i = 0; i < rows; i++) {
      this.terminal.write('█'.repeat(cols) + '\r\n');
    }
    await this.sleep(100);
  }

  async displayEnhancedLogo() {
    this.terminal.write('\x1b[2J\x1b[H');
    
    // New compact ASCII art logo that fits in terminal width
    const logo = [
      '███████╗███████╗ █████╗ ███╗   ███╗██╗',
      '╚══███╔╝██╔════╝██╔══██╗████╗ ████║██║',
      '  ███╔╝ █████╗  ███████║██╔████╔██║██║',
      ' ███╔╝  ██╔══╝  ██╔══██║██║╚██╔╝██║██║',
      '███████╗███████╗██║  ██║██║ ╚═╝ ██║██║',
      '╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝'
    ];
    
    const termText = [
      '████████╗███████╗██████╗ ███╗   ███╗',
      '╚══██╔══╝██╔════╝██╔══██╗████╗ ████║',
      '   ██║   █████╗  ██████╔╝██╔████╔██║',
      '   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║',
      '   ██║   ███████╗██║  ██║██║ ╚═╝ ██║',
      '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝'
    ];
    
    // Calculate centering
    const logoWidth = Math.max(...logo.map(line => line.length));
    const termWidth = Math.max(...termText.map(line => line.length));
    const totalWidth = Math.max(logoWidth, termWidth);
    const startCol = Math.floor((this.terminal.cols - totalWidth) / 2);
    const verticalPadding = Math.floor((this.terminal.rows - 16) / 2);
    
    // Move to vertical center
    for (let i = 0; i < verticalPadding; i++) {
      this.terminal.write('\r\n');
    }
    
    // Animated logo appearance with gradient effect
    for (let i = 0; i < logo.length; i++) {
      const padding = ' '.repeat(Math.max(0, startCol));
      
      // Type effect with color gradient
      this.terminal.write(padding);
      for (let j = 0; j < logo[i].length; j++) {
        // Create gradient from cyan to green
        const progress = j / logo[i].length;
        const color = progress < 0.5 ? this.colors.brightCyan : this.colors.brightGreen;
        this.terminal.write(color + logo[i][j]);
        await this.sleep(2);
      }
      this.terminal.write('\r\n');
    }
    
    // Space between ZEAMI and TERM
    this.terminal.write('\r\n');
    
    // Animated TERM appearance
    for (let i = 0; i < termText.length; i++) {
      const padding = ' '.repeat(Math.max(0, startCol));
      
      // Slide in from right effect
      for (let offset = 20; offset >= 0; offset--) {
        this.terminal.write('\r' + padding + ' '.repeat(offset));
        this.terminal.write(this.colors.brightYellow + termText[i].substring(0, termText[i].length - offset));
        await this.sleep(10);
      }
      this.terminal.write('\r\n');
    }
    
    this.terminal.write(this.colors.reset + '\r\n');
    
    // Version and tagline with pulsing effect
    const version = 'TERMINAL v0.1.11';
    const tagline = '(C) 2025 TELEPORT COMPANY, LTD.';
    const subtitle = 'ALL RIGHTS RESERVED';
    
    // Pulsing version
    const versionPadding = ' '.repeat(Math.floor((this.terminal.cols - version.length) / 2));
    for (let pulse = 0; pulse < 3; pulse++) {
      this.terminal.write('\r' + versionPadding + this.colors.dim + this.colors.yellow + version);
      await this.sleep(200);
      this.terminal.write('\r' + versionPadding + this.colors.brightYellow + this.colors.bold + version);
      await this.sleep(200);
    }
    this.terminal.write('\r\n\r\n');
    
    // Copyright with typing effect
    const copyrightPadding = ' '.repeat(Math.floor((this.terminal.cols - tagline.length) / 2));
    this.terminal.write(copyrightPadding + this.colors.dim + this.colors.white);
    for (const char of tagline) {
      this.terminal.write(char);
      await this.sleep(10);
    }
    this.terminal.write('\r\n');
    
    const subtitlePadding = ' '.repeat(Math.floor((this.terminal.cols - subtitle.length) / 2));
    this.terminal.write(subtitlePadding + this.colors.dim + this.colors.white + subtitle);
    this.terminal.write(this.colors.reset + '\r\n\r\n');
  }

  async cyberBootSequence() {
    const bootMessages = [
      { delay: 50, text: '▸ Initializing ZeamiTerm Core...', color: 'cyan', prefix: '[BOOT]' },
      { delay: 100, text: '▸ Loading quantum encryption matrix...', color: 'cyan', prefix: '[CRYPT]' },
      { delay: 80, text: '  ✓ AES-256-GCM initialized', color: 'brightGreen', indent: true },
      { delay: 80, text: '  ✓ ED25519 keypair generated', color: 'brightGreen', indent: true },
      { delay: 150, text: '▸ Establishing neural link...', color: 'cyan', prefix: '[LINK]' },
      { delay: 100, text: '  ◆ Claude Code API connected', color: 'brightYellow', indent: true },
      { delay: 100, text: '  ◆ Real-time sync enabled', color: 'brightYellow', indent: true },
      { delay: 200, text: '▸ Loading terminal subsystems...', color: 'cyan', prefix: '[SYS]' },
      { delay: 50, text: '  → Shell integration: ACTIVE', color: 'green', indent: true },
      { delay: 50, text: '  → WebGL renderer: ACTIVE', color: 'green', indent: true },
      { delay: 50, text: '  → Paste handler: OPTIMIZED', color: 'green', indent: true },
      { delay: 100, text: '▸ System initialization complete!', color: 'brightGreen', prefix: '[OK]' },
      { delay: 50, text: '', color: 'reset' },
      { delay: 100, text: '◉ ZeamiTerm READY', color: 'brightGreen', blink: true }
    ];

    // Calculate left padding for boot messages
    const maxLength = Math.max(...bootMessages.filter(m => m.text).map(m => 
      (m.prefix ? m.prefix.length + 1 : 0) + m.text.length + (m.indent ? 2 : 0)
    ));
    const leftPadding = Math.floor((this.terminal.cols - maxLength) / 2);

    for (const msg of bootMessages) {
      await this.sleep(msg.delay);
      
      if (!msg.text) {
        this.terminal.write('\r\n');
        continue;
      }
      
      // Build the message
      let output = ' '.repeat(Math.max(0, leftPadding));
      
      if (msg.prefix) {
        output += this.colors.dim + this.colors.white + msg.prefix + ' ' + this.colors.reset;
      }
      
      if (msg.indent) {
        output += '  ';
      }
      
      output += this.colors[msg.color];
      if (msg.blink) {
        output += this.colors.blink;
      }
      
      // Typing effect for the final message
      if (msg.blink) {
        this.terminal.write(output);
        for (const char of msg.text) {
          this.terminal.write(char);
          await this.sleep(30);
        }
      } else {
        output += msg.text;
        this.terminal.write(output);
      }
      
      this.terminal.write(this.colors.reset + '\r\n');
    }
    
    this.terminal.write('\r\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in terminalManager
window.StartupAnimation = StartupAnimation;