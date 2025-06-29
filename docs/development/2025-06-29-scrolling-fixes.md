# 2025-06-29: Scrolling Fixes Implementation

## Overview
Fixed two scrolling issues in ZeamiTerm:
1. Preference window content not scrollable when exceeding viewport height
2. Inactive terminals blocking scroll events

## Issues Addressed

### 1. Preference Window Scrolling
**Problem**: The preference window panels had `overflow-y: auto` but the parent container structure didn't properly support scrolling when content exceeded the viewport height.

**Root Cause**: 
- The flex container parent (`.preference-content`) didn't have `min-height: 0`, which is required for flex children to properly handle overflow
- The `.preference-panels` container wasn't set up correctly to constrain the panel height

**Solution**:
```css
/* Main Content */
.preference-content {
  min-height: 0; /* Important for flex child to allow overflow */
}

/* Panels container */
.preference-panels {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

/* Panel */
.preference-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
```

### 2. Inactive Terminal Scrolling
**Problem**: Inactive terminals in split view couldn't be scrolled because the overlay had `pointer-events: auto`, which blocked all mouse interactions including scroll events.

**Root Cause**:
- The inactive terminal overlay was designed to block all interactions to prevent accidental input
- This also blocked scroll events, making it impossible to review terminal content without activating it

**Solution**:
1. Changed the overlay to allow pointer events to pass through:
```css
.terminal-wrapper.inactive::before {
  pointer-events: none; /* Allow scrolling through the overlay */
}

.terminal-wrapper.inactive {
  cursor: pointer;
}
```

2. Added a click handler to activate terminals when clicked:
```javascript
wrapper.addEventListener('click', (e) => {
  if (wrapper.classList.contains('inactive') && 
      e.target === wrapper || e.target.classList.contains('xterm-viewport')) {
    this.switchToTerminal(id);
  }
});
```

## Testing

### Manual Testing Steps
1. **Preference Window**:
   - Open preferences (Cmd+,)
   - Navigate to Appearance panel (has many color settings)
   - Verify smooth scrolling through all content
   - Check scrollbar appearance and functionality

2. **Inactive Terminals**:
   - Switch to split view (Horizontal or Vertical)
   - Generate content in both terminals
   - Verify inactive terminal can be scrolled without activation
   - Click on inactive terminal to verify activation works

### Automated Tests
- Created `test/scrolling-fixes-test.html` for visual testing
- Created `test/verify-scrolling-fixes.js` to verify code changes

## Files Modified
1. `/src/renderer/styles/preferences.css` - Fixed preference panel scrolling
2. `/src/renderer/styles/layout.css` - Fixed inactive terminal pointer events
3. `/src/renderer/core/ZeamiTermManager.js` - Added click handler for terminal activation

## Benefits
- Users can now scroll through long preference panels without issues
- Split view is more usable - users can review inactive terminal content without switching
- Better UX for multi-terminal workflows

## Future Considerations
- Consider adding visual scroll indicators for long preference panels
- Could add keyboard shortcuts to quickly switch between terminals in split view
- Might want to add a "lock scroll" feature for terminals to keep them synchronized