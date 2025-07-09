# ZeamiTerm v0.1.13 Release Notes

## 🎉 New Features

### Enhanced UI Components
- **Icon-based Mode Toggle Buttons**: Tab/Horizontal/Vertical split modes now use intuitive SVG icons instead of text labels
- **Improved Tab Bar Styling**: Brighter background colors for better visibility and modern appearance

## 🐛 Bug Fixes

### Critical Fix: Initialization Infinite Loop
- Fixed a critical bug where the application would get stuck in an initialization loop
- Added proper error handling and initialization state management
- Ensured `isInitializing` flag is properly reset in all scenarios

### Code Cleanup
- Removed incomplete log panel implementation that was causing initialization issues
- Cleaned up unused imports and references

## 🎨 UI Improvements

- Tab bar background color changed from `#2d2d30` to `#3c3c3c` for better visibility
- Toggle button group background updated to match the new color scheme
- Enhanced hover states for better user feedback

## 🔧 Technical Improvements

- Added comprehensive error handling in the initialization process
- Improved initialization state management to prevent duplicate initialization attempts
- Better error reporting in the loading screen

## 📦 Installation

Download the appropriate installer for your system:
- macOS (Apple Silicon): `ZeamiTerm-0.1.13-arm64.dmg`
- macOS (Intel): `ZeamiTerm-0.1.13.dmg`

## 🔄 Auto-Update

This version includes auto-update functionality. The application will automatically check for updates and notify you when a new version is available.

---

Thank you for using ZeamiTerm! If you encounter any issues, please report them on our GitHub repository.