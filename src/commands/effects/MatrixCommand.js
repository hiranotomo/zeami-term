/**
 * MatrixCommand - WebGL-based matrix rain effect
 * Clean implementation using the new command system
 */

export class MatrixCommand {
  constructor() {
    this.name = 'matrix';
    this.description = 'WebGL matrix rain effect';
    this.usage = 'matrix [start|stop|stress <level>]';
    this.category = 'effects';
    this.webglEffect = null;
  }
  
  async execute(terminal, args = []) {
    const subcommand = args[0] || 'start';
    
    switch (subcommand) {
      case 'start':
        await this.start(terminal, args.slice(1));
        break;
      case 'stop':
        this.stop(terminal);
        break;
      case 'stress':
        await this.stress(terminal, args[1]);
        break;
      case 'help':
        this.showHelp(terminal);
        break;
      default:
        await this.start(terminal, args);
    }
  }
  
  async start(terminal, options = []) {
    if (this.webglEffect) {
      terminal.writeln('\r\n\x1b[33mMatrix effect is already running. Use "matrix stop" first.\x1b[0m');
      return;
    }
    
    terminal.writeln('\r\n\x1b[1;32mStarting Matrix WebGL Effect...\x1b[0m');
    
    try {
      // Get MatrixWebGL from window (it's loaded as a script)
      const MatrixWebGL = window.MatrixWebGL;
      
      if (!MatrixWebGL) {
        throw new Error('MatrixWebGL not loaded');
      }
      
      // Get terminal element
      const terminalElement = terminal.element;
      if (!terminalElement) {
        throw new Error('Terminal element not found');
      }
      
      // Create canvas overlay
      const canvas = this.createCanvas(terminalElement);
      
      // Initialize WebGL effect
      this.webglEffect = new MatrixWebGL(canvas);
      
      // Parse options
      this.parseOptions(options);
      
      // Start effect
      this.webglEffect.start();
      
      // Show controls
      terminal.writeln('\x1b[1;36mControls:\x1b[0m');
      terminal.writeln('  \x1b[33m↑↓\x1b[0m     Adjust speed');
      terminal.writeln('  \x1b[33m←→\x1b[0m     Adjust density');
      terminal.writeln('  \x1b[33m+/-\x1b[0m    Adjust glow');
      terminal.writeln('  \x1b[33mB\x1b[0m      Toggle blur');
      terminal.writeln('  \x1b[33mR\x1b[0m      Toggle rainbow');
      terminal.writeln('  \x1b[33mP\x1b[0m      Toggle 3D');
      terminal.writeln('  \x1b[33mSpace\x1b[0m  Pause/Resume');
      terminal.writeln('  \x1b[33mmatrix stop\x1b[0m to end\r\n');
      
      // Setup keyboard controls
      this.setupKeyboardControls(terminal);
      
    } catch (error) {
      terminal.writeln(`\r\n\x1b[31mError starting matrix effect: ${error.message}\x1b[0m`);
      this.cleanup();
    }
  }
  
  stop(terminal) {
    if (!this.webglEffect) {
      terminal.writeln('\r\n\x1b[33mMatrix effect is not running.\x1b[0m');
      return;
    }
    
    this.cleanup();
    terminal.writeln('\r\n\x1b[1;33mMatrix effect stopped.\x1b[0m');
  }
  
  async stress(terminal, level = '1') {
    const stressLevel = parseInt(level);
    if (isNaN(stressLevel) || stressLevel < 1 || stressLevel > 4) {
      terminal.writeln('\r\n\x1b[31mInvalid stress level. Use 1-4.\x1b[0m');
      return;
    }
    
    // Start with stress level
    await this.start(terminal, [`--stress=${stressLevel}`]);
  }
  
  showHelp(terminal) {
    terminal.writeln('\r\n\x1b[1;36mMatrix WebGL Command\x1b[0m');
    terminal.writeln('====================');
    terminal.writeln('');
    terminal.writeln('Usage: matrix [command] [options]');
    terminal.writeln('');
    terminal.writeln('Commands:');
    terminal.writeln('  start [options]  Start the matrix effect');
    terminal.writeln('  stop             Stop the effect');
    terminal.writeln('  stress [1-4]     Run stress test');
    terminal.writeln('');
    terminal.writeln('Options:');
    terminal.writeln('  --blur=<0-10>    Initial blur amount');
    terminal.writeln('  --glow=<0-5>     Initial glow intensity');
    terminal.writeln('  --3d             Enable 3D perspective');
    terminal.writeln('  --rainbow        Enable rainbow mode');
    terminal.writeln('  --stress=<1-4>   Start with stress level');
  }
  
  createCanvas(terminalElement) {
    // Find the xterm viewport for correct dimensions
    const viewport = terminalElement.querySelector('.xterm-viewport');
    const screen = terminalElement.querySelector('.xterm-screen');
    const targetElement = viewport || screen || terminalElement;
    
    // Get the actual visible area
    const rect = targetElement.getBoundingClientRect();
    
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    
    // Set canvas size to match the actual container
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Append to terminal element, not wrapper
    terminalElement.style.position = 'relative';
    terminalElement.appendChild(canvas);
    
    // Also listen for resize events to update canvas size
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newRect = entry.contentRect;
        canvas.width = newRect.width;
        canvas.height = newRect.height;
        
        // Notify WebGL effect of resize
        if (this.webglEffect) {
          this.webglEffect.resize();
        }
      }
    });
    
    resizeObserver.observe(targetElement);
    this._resizeObserver = resizeObserver;
    
    this.canvas = canvas;
    return canvas;
  }
  
  parseOptions(options) {
    if (!this.webglEffect) return;
    
    options.forEach(opt => {
      if (opt.startsWith('--')) {
        const [key, value] = opt.substring(2).split('=');
        switch (key) {
          case 'blur':
            this.webglEffect.setEffect('blurAmount', parseFloat(value) || 0);
            break;
          case 'glow':
            this.webglEffect.setEffect('glowIntensity', parseFloat(value) || 1);
            break;
          case '3d':
            this.webglEffect.setEffect('perspective', 0.5);
            break;
          case 'rainbow':
            this.webglEffect.setEffect('rainbowMode', true);
            break;
          case 'stress':
            const level = parseInt(value) || 1;
            setTimeout(() => this.webglEffect.enableStressTest(level), 100);
            break;
        }
      }
    });
  }
  
  setupKeyboardControls(terminal) {
    if (!this.webglEffect) return;
    
    // Use interactive mode for keyboard controls
    terminal.enterInteractiveMode('matrix', (data) => {
      if (!this.webglEffect) return false;
      
      let handled = false;
      
      switch(data) {
        case '\x1b[A': // Up arrow
          this.webglEffect.params.dropSpeed = Math.min(1.0, this.webglEffect.params.dropSpeed + 0.05);
          this.showNotification(terminal, `Speed: ${this.webglEffect.params.dropSpeed.toFixed(2)}`);
          handled = true;
          break;
        case '\x1b[B': // Down arrow
          this.webglEffect.params.dropSpeed = Math.max(0.0, this.webglEffect.params.dropSpeed - 0.05);
          this.showNotification(terminal, `Speed: ${this.webglEffect.params.dropSpeed.toFixed(2)}`);
          handled = true;
          break;
        case '\x1b[C': // Right arrow
          this.webglEffect.params.dropDensity = Math.min(2.0, this.webglEffect.params.dropDensity + 0.1);
          this.showNotification(terminal, `Density: ${this.webglEffect.params.dropDensity.toFixed(1)}`);
          handled = true;
          break;
        case '\x1b[D': // Left arrow
          this.webglEffect.params.dropDensity = Math.max(0.0, this.webglEffect.params.dropDensity - 0.1);
          this.showNotification(terminal, `Density: ${this.webglEffect.params.dropDensity.toFixed(1)}`);
          handled = true;
          break;
        case '+':
        case '=':
          this.webglEffect.params.glowIntensity = Math.min(5.0, this.webglEffect.params.glowIntensity + 0.5);
          this.showNotification(terminal, `Glow: ${this.webglEffect.params.glowIntensity.toFixed(1)}`);
          handled = true;
          break;
        case '-':
          this.webglEffect.params.glowIntensity = Math.max(0.0, this.webglEffect.params.glowIntensity - 0.5);
          this.showNotification(terminal, `Glow: ${this.webglEffect.params.glowIntensity.toFixed(1)}`);
          handled = true;
          break;
        case 'b':
        case 'B':
          this.webglEffect.params.blurAmount = this.webglEffect.params.blurAmount > 0 ? 0 : 5;
          this.showNotification(terminal, `Blur: ${this.webglEffect.params.blurAmount > 0 ? 'ON' : 'OFF'}`);
          handled = true;
          break;
        case 'r':
        case 'R':
          this.webglEffect.params.rainbowMode = !this.webglEffect.params.rainbowMode;
          this.showNotification(terminal, `Rainbow: ${this.webglEffect.params.rainbowMode ? 'ON' : 'OFF'}`);
          handled = true;
          break;
        case 'p':
        case 'P':
          this.webglEffect.params.perspective = this.webglEffect.params.perspective > 0 ? 0 : 0.5;
          this.showNotification(terminal, `3D: ${this.webglEffect.params.perspective > 0 ? 'ON' : 'OFF'}`);
          handled = true;
          break;
        case ' ':
          if (this.webglEffect.animationId) {
            this.webglEffect.stop();
            this.showNotification(terminal, 'PAUSED');
          } else {
            this.webglEffect.start();
            this.showNotification(terminal, 'RESUMED');
          }
          handled = true;
          break;
      }
      
      return handled;
    });
  }
  
  showNotification(terminal, message) {
    const rows = terminal.rows;
    const cols = terminal.cols;
    const padding = Math.floor((cols - message.length - 4) / 2);
    const paddedMessage = ' '.repeat(Math.max(0, padding)) + `[ ${message} ]`;
    
    // Save cursor, show message, restore cursor
    terminal.write(`\x1b[s\x1b[${rows};1H\x1b[1;33m${paddedMessage}\x1b[0m\x1b[u`);
    
    // Clear message after 2 seconds
    if (this._notificationTimeout) {
      clearTimeout(this._notificationTimeout);
    }
    this._notificationTimeout = setTimeout(() => {
      terminal.write(`\x1b[s\x1b[${rows};1H\x1b[2K\x1b[u`);
    }, 2000);
  }
  
  cleanup() {
    if (this.webglEffect) {
      this.webglEffect.destroy();
      this.webglEffect = null;
    }
    
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    
    if (this._notificationTimeout) {
      clearTimeout(this._notificationTimeout);
      this._notificationTimeout = null;
    }
    
    // Exit interactive mode if still active
    if (this.webglEffect) {
      // Find terminal from element (if available)
      const terminalElement = this.canvas?.parentElement;
      if (terminalElement && terminalElement._terminal) {
        terminalElement._terminal.exitInteractiveMode();
      }
    }
  }
}