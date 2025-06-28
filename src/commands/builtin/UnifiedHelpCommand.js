/**
 * UnifiedHelpCommand - Single implementation for both help and menu
 */

export class UnifiedHelpCommand {
  constructor(mode = 'help') {
    this.mode = mode; // 'help' or 'menu'
    this.name = mode === 'help' ? 'help' : '?';
    this.description = mode === 'help' ? 'Show command help' : 'Interactive command menu';
    this.usage = mode === 'help' ? 'help [command]' : '?';
    this.category = 'builtin';
    this.aliases = mode === 'menu' ? ['menu'] : [];
    
    // Commands configuration
    this.commands = {
      help: { desc: 'Show command help', usage: 'help [command]' },
      '?': { desc: 'Interactive command menu', usage: '?' },
      clear: { desc: 'Clear terminal screen', usage: 'clear' },
      infinite: { desc: 'Generate endless output (Ctrl+C to stop)', usage: 'infinite [type]' },
      matrix: { desc: 'WebGL matrix rain effect', usage: 'matrix [start|stop|stress <level>]' }
    };
    
    // Performance tests
    this.perfTests = [
      { label: '無限コード生成（Ctrl+Cで停止）', cmd: 'infinite', args: [] },
      { label: '高速ログ出力', cmd: 'infinite', args: ['log'] },
      { label: 'JSON ストリーミング', cmd: 'infinite', args: ['json'] },
      { label: 'マトリックス文字ストリーム', cmd: 'infinite', args: ['matrix'] },
      { label: 'WebGL負荷テスト', cmd: 'matrix', args: ['stress', '4'] }
    ];
  }
  
  async execute(terminal, args = []) {
    if (this.mode === 'help' && args.length > 0) {
      // Show specific command help
      const cmdName = args[0];
      const cmd = this.commands[cmdName];
      if (cmd) {
        terminal.writeln(`\r\n\x1b[1;33m${cmdName}\x1b[0m - ${cmd.desc}`);
        terminal.writeln(`Usage: ${cmd.usage}\r\n`);
      } else {
        terminal.writeln(`\r\n\x1b[31mCommand not found: ${cmdName}\x1b[0m`);
      }
      return;
    }
    
    // Clear screen and show header
    terminal.write('\x1b[2J\x1b[H');
    terminal.writeln('\x1b[1;32m╔══════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;32m║          ZEAMITERM COMMAND CENTER                    ║\x1b[0m');
    terminal.writeln('\x1b[1;32m╚══════════════════════════════════════════════════════╝\x1b[0m\r\n');
    
    // Build command list
    let commandIndex = 1;
    const commandMap = new Map();
    
    // Regular commands
    terminal.writeln('\x1b[1;36mBuilt-in Commands:\x1b[0m');
    Object.entries(this.commands).forEach(([name, info]) => {
      if (this.mode === 'menu') {
        terminal.writeln(`\x1b[1;33m[${commandIndex}]\x1b[0m ${name} - ${info.desc}`);
        commandMap.set(commandIndex.toString(), { name, args: [] });
        commandIndex++;
      } else {
        terminal.writeln(`  \x1b[1;33m${name}\x1b[0m - ${info.desc}`);
      }
    });
    
    terminal.writeln('');
    
    // Performance tests (menu mode only)
    if (this.mode === 'menu') {
      terminal.writeln('\x1b[1;36mPerformance Testing:\x1b[0m');
      this.perfTests.forEach(test => {
        terminal.writeln(`\x1b[1;33m[${commandIndex}]\x1b[0m ${test.label}`);
        commandMap.set(commandIndex.toString(), { name: test.cmd, args: test.args });
        commandIndex++;
      });
      terminal.writeln('');
    }
    
    // Instructions
    terminal.writeln('\x1b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    
    if (this.mode === 'menu') {
      terminal.writeln('Select a command by number or type its name directly.');
      terminal.writeln('Press \x1b[1;33mQ\x1b[0m to quit menu.\r\n');
      
      // Enter interactive mode
      terminal.enterInteractiveMode('menu', (data) => {
        // Handle menu input
        if (data === 'q' || data === 'Q' || data === '\x03') {
          terminal.exitInteractiveMode();
          terminal.write('\x1b[2J\x1b[H');
          return true;
        }
        
        // Check if it's a number
        const cmd = commandMap.get(data);
        if (cmd) {
          terminal.exitInteractiveMode();
          terminal.write('\x1b[2J\x1b[H');
          terminal._processCommand(cmd.name, cmd.args);
          return true;
        }
        
        return false; // Let normal processing continue
      });
    } else {
      terminal.writeln('Type "help <command>" for detailed information.');
      terminal.writeln('Type "?" for interactive menu.\r\n');
    }
  }
}