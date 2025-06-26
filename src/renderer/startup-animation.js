/**
 * Startup Animation for ZeamiTerm
 * Matrix-style terminal initialization effect
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
      reset: '\x1b[0m'
    };
  }

  async play() {
    // Clear screen
    this.terminal.write('\x1b[2J\x1b[H');
    
    // Matrix rain effect (simplified)
    await this.matrixRain(5);
    
    // Clear for logo
    this.terminal.write('\x1b[2J\x1b[H');
    
    // Display logo with typing effect
    await this.typewriterLogo();
    
    // System boot sequence
    await this.bootSequence();
  }

  async matrixRain(duration) {
    const cols = this.terminal.cols;
    const drops = new Array(Math.floor(cols / 2)).fill(0);
    
    for (let i = 0; i < duration * 10; i++) {
      let line = '';
      for (let j = 0; j < drops.length; j++) {
        const x = j * 2;
        if (drops[j] > 0 && drops[j] < this.terminal.rows) {
          const char = String.fromCharCode(0x30 + Math.floor(Math.random() * 10));
          const color = drops[j] > this.terminal.rows - 5 ? this.colors.dimGreen : this.colors.green;
          line += `\x1b[${drops[j]};${x}H${color}${char}${this.colors.reset}`;
        }
        if (Math.random() > 0.95) {
          drops[j] = 1;
        } else if (drops[j] > 0) {
          drops[j]++;
        }
        if (drops[j] > this.terminal.rows) {
          drops[j] = 0;
        }
      }
      this.terminal.write(line);
      await this.sleep(50);
    }
  }

  async typewriterLogo() {
    const logo = [
      '██████╗ ███████╗ █████╗ ███╗   ███╗██╗    ████████╗███████╗██████╗ ███╗   ███╗',
      '╚══███╔╝██╔════╝██╔══██╗████╗ ████║██║    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║',
      '  ███╔╝ █████╗  ███████║██╔████╔██║██║       ██║   █████╗  ██████╔╝██╔████╔██║',
      ' ███╔╝  ██╔══╝  ██╔══██║██║╚██╔╝██║██║       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║',
      '███████╗███████╗██║  ██║██║ ╚═╝ ██║██║       ██║   ███████╗██║  ██║██║ ╚═╝ ██║',
      '╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝'
    ];

    // Type each line with effect
    for (const line of logo) {
      this.terminal.write(this.colors.brightGreen);
      for (const char of line) {
        this.terminal.write(char);
        await this.sleep(1);
      }
      this.terminal.write('\r\n');
    }
    
    this.terminal.write(this.colors.reset + '\r\n');
    
    // Tagline with glow effect
    const tagline = 'Terminal from Teleport v0.1.0';
    const padding = ' '.repeat(Math.floor((80 - tagline.length) / 2));
    
    this.terminal.write(padding + this.colors.brightCyan + tagline + this.colors.reset + '\r\n');
    this.terminal.write(padding + this.colors.dimGreen + 'Advanced Terminal Emulator for Claude Code' + this.colors.reset + '\r\n\r\n');
  }

  async bootSequence() {
    const bootMessages = [
      { delay: 100, text: '[SYSTEM] Initializing quantum encryption matrix...', color: 'dimGreen' },
      { delay: 150, text: '[SYSTEM] Loading neural interface drivers...', color: 'dimGreen' },
      { delay: 200, text: '[SYSTEM] Establishing secure channel...', color: 'dimGreen' },
      { delay: 100, text: '[OK] Encryption: AES-256-GCM', color: 'green' },
      { delay: 100, text: '[OK] Authentication: ED25519', color: 'green' },
      { delay: 150, text: '[SYSTEM] Synchronizing with Claude Code runtime...', color: 'dimGreen' },
      { delay: 200, text: '[OK] Connection established', color: 'brightGreen' },
      { delay: 100, text: '[SYSTEM] Terminal ready for input', color: 'brightGreen' }
    ];

    for (const msg of bootMessages) {
      await this.sleep(msg.delay);
      this.terminal.write(this.colors[msg.color] + msg.text + this.colors.reset + '\r\n');
    }
    
    this.terminal.write('\r\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in terminalManager
window.StartupAnimation = StartupAnimation;