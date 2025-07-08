# Changelog

All notable changes to ZeamiTerm will be documented in this file.

## [0.1.8] - 2025-01-08

### Fixed
- **CRITICAL**: Fixed initialization infinite loop caused by paste handler being set before PTY connection
- Moved paste handler setup to after PTY process is established

### Technical Details
- onPaste handler now properly waits for session.process to exist before setup
- Prevents null reference errors during terminal initialization

## [0.1.7] - 2025-01-08

### Fixed
- Fixed infinite initialization loop on startup
- Fixed double input issue where typed characters appeared twice
- Fixed long text paste in Claude Code getting stuck at "Pasting text..."
- Improved bracketed paste mode handling with proper timing (200ms delay)

### Improved
- Enhanced paste handling for medium-sized content (30-50 lines)
- Implemented dynamic chunking strategy for different paste sizes
- Added comprehensive paste debugging utilities
- Better error handling and recovery for paste operations

### Technical Details
- Resolved PTY echo configuration issue (set to false)
- Implemented proper bracketed paste mode marker handling
- Added critical 200ms delay after paste start marker for Claude Code compatibility
- Dynamic chunk sizing: 500 chars for medium pastes, 1000 chars for others

## [0.1.6] - 2025-01-07

### Added
- Initial release with basic terminal functionality
- xterm.js integration with custom fork
- Claude Code process management
- Split view support
- VS Code-inspired color themes