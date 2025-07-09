# Changelog

All notable changes to ZeamiTerm will be documented in this file.

## [0.1.11] - 2025-01-09

### Fixed
- Fixed vertical split mode display issues caused by CSS position conflicts
- Resolved WebGL canvas rendering problems in split mode
- Fixed CSS !important declaration conflicts between terminal-fix.css and layout.css

### Improved
- Optimized resize handling with requestAnimationFrame instead of setTimeout
- Enhanced WebGL renderer resize notifications for better performance
- Added WebGL-specific CSS rules for split mode canvas handling
- Improved CSS specificity to prevent layout conflicts

### Technical Details
- Removed excessive !important declarations from terminal positioning CSS
- Added conditional CSS rules for tab mode vs split mode
- Implemented WebGL context-aware resize handling
- Added proper canvas max-width/height constraints for split mode

## [0.1.10] - 2025-01-09

### Fixed
- Fixed auto-updater release notes display issues with HTML tags
- Fixed truncation of long release notes in update dialog
- Added proper HTML entity decoding for cleaner text display

### Improved
- Added "View Details" button for long release notes (>500 characters)
- Release notes now display in a separate window when too long
- Better formatting and readability of update notifications
- App icon properly configured for all platforms

### Added
- New method `stripHtmlTags()` to clean release notes content
- New method `showReleaseNotesWindow()` for detailed release notes display
- Proper app icons from icons directory integrated into build

## [0.1.9] - 2025-01-08

### Fixed
- Fixed "onPaste is not a function" error by removing dependency on xterm.js onPaste API
- Implemented dynamic paste configuration through ZeamiTerminal's internal _handleData method
- Terminal now starts properly without errors

### Improved
- Added comprehensive build documentation (BUILD_RULES.md)
- Dynamic paste chunking configuration is now passed from ZeamiTermManager to ZeamiTerminal
- Better error handling for xterm.js API compatibility

### Technical Details
- Removed direct usage of terminal.onPaste() which may not be available in all builds
- Configuration object approach: `_dynamicPasteConfig` passed to ZeamiTerminal instance
- Maintained all paste optimization features from v0.1.7

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