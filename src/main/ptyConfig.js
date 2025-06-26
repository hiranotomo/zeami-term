/**
 * PTY Configuration - Terminal mode settings for proper input handling
 */

const os = require('os');

// Terminal mode flags for proper input handling
const getPtyConfig = () => {
  const baseConfig = {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || os.homedir(),
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      // Disable bracketed paste mode initially
      TERM_PROGRAM: 'ZeamiTerm',
      TERM_PROGRAM_VERSION: '0.1.0'
    }
  };

  // Platform-specific configurations
  if (process.platform === 'darwin' || process.platform === 'linux') {
    // Unix-like systems: Set proper terminal modes
    baseConfig.env.TERM_PROGRAM = 'ZeamiTerm';
    
    // Terminal input modes (stty settings equivalent)
    baseConfig.modes = {
      // Input modes
      echo: true,       // Enable echo (PTY will handle it properly)
      icanon: true,     // Enable canonical mode for proper line editing
      isig: true,       // Enable signals (Ctrl+C, etc.)
      iexten: true,     // Enable extended input processing
      
      // Output modes
      opost: true,      // Enable output processing
      onlcr: true,      // Convert NL to CR-NL
      
      // Control modes
      csize: 8,         // 8-bit characters
      parenb: false,    // No parity
      
      // Local modes
      echoe: true,      // Echo erase characters
      echok: true,      // Echo kill characters
      echoctl: true,    // Echo control characters
      echoke: true      // Visually erase killed lines
    };
  } else if (process.platform === 'win32') {
    // Windows: ConPTY configuration
    baseConfig.useConpty = true;
    baseConfig.conptyInheritCursor = false;
  }

  return baseConfig;
};

// Apply terminal modes after PTY creation
const applyTerminalModes = (pty) => {
  if (!pty || process.platform === 'win32') return;
  
  try {
    // Combine all stty commands into one to avoid multiple shell re-initializations
    const sttyCommand = 'stty sane erase ^? intr ^C susp ^Z cs8 -parenb -ixon 2>/dev/null';
    
    // Send as a single command to minimize shell prompt re-displays
    pty.write(sttyCommand + '\r');
    
    // Setup claude alias for the session
    setTimeout(() => {
      const claudeAlias = "alias claude='node --no-warnings --enable-source-maps $HOME/.npm-global/bin/claude'";
      pty.write(claudeAlias + '\r');
    }, 300);
    
    // Don't clear screen here - let terminalManager handle it
  } catch (error) {
    console.error('[PTY Config] Failed to apply terminal modes:', error);
  }
};

module.exports = {
  getPtyConfig,
  applyTerminalModes
};