# ZeamiTerm

A modern terminal emulator built with Electron and xterm.js, featuring advanced capabilities inspired by VS Code's terminal implementation.

## Features

- 🚀 **GPU Acceleration** - WebGL renderer for optimal performance
- 📑 **Tab Management** - Multiple terminal sessions with drag-and-drop tabs
- 🔍 **Search Functionality** - Find text within terminal output (Cmd/Ctrl+F)
- 📋 **Smart Selection** - Mouse selection with automatic copy to clipboard
- 🖼️ **Split View** - Horizontal/vertical split with resizable panes
- ⚡ **Performance Optimized** - Efficient handling of large outputs
- 🎨 **Modern UI** - Clean, VS Code-inspired interface

## Technologies

- **Electron** - Cross-platform desktop application framework
- **xterm.js** - Terminal emulator library
- **node-pty** - Pseudo terminal implementation via Python wrapper
- **WebGL** - Hardware-accelerated rendering

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zeami-term.git
cd zeami-term

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build standalone application
./create-standalone.sh
```

## Development

### Project Structure

```
zeami-term/
├── src/
│   ├── main/           # Main process (Electron)
│   ├── renderer/       # Renderer process (UI)
│   └── preload/        # Preload scripts
├── assets/             # Application assets
└── docs/               # Documentation
```

### Key Components

- **terminalManager.js** - Manages terminal instances and xterm.js integration
- **ptyService.js** - Handles PTY (pseudo-terminal) processes
- **splitManager.js** - Manages split view functionality
- **workingPty.js** - Python-based PTY implementation

## Usage

### Keyboard Shortcuts

- `Cmd/Ctrl + T` - New terminal tab
- `Cmd/Ctrl + W` - Close current tab
- `Cmd/Ctrl + K` - Clear terminal
- `Cmd/Ctrl + F` - Find in terminal
- `Cmd/Ctrl + 1-9` - Switch to tab by number
- `Cmd/Ctrl + Shift + ]` - Next tab
- `Cmd/Ctrl + Shift + [` - Previous tab

### Split View

Click the "Split" button to split the view. Click again to toggle between horizontal and vertical orientation. Drag the splitter to resize panes.

## Building

### macOS

```bash
./create-standalone.sh
# Application will be in dist/standalone/ZeamiTerm.app
```

### Windows/Linux

```bash
npm run build
npm run package
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System architecture and design decisions
- [Development Roadmap](docs/development/ROADMAP.md) - Feature roadmap and implementation phases
- [VS Code/xterm Feature Comparison](docs/development/FEATURE_COMPARISON.md) - Detailed feature analysis
- [Menu Systems](docs/MENU_SYSTEMS.md) - Understanding the dual menu system
- [Complete Refactoring Summary](docs/COMPLETE_REFACTORING_SUMMARY.md) - Recent architectural improvements

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Inspired by VS Code's terminal implementation
- Built on the excellent xterm.js library
- Part of the Zeami ecosystem