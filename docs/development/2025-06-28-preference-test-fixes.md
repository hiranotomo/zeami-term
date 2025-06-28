# Preference Test Fixes - 2025-06-28

## Overview
Fixed multiple issues discovered by Playwright tests in the preferences system.

## Issues Fixed

### 1. Coming Soon Badge CSS Class Mismatch
**Problem**: Test was looking for `.coming-soon-badge` but CSS only defined `.badge.coming-soon`  
**Solution**: Added `.coming-soon-badge` as an additional selector in `preferences.css`

```css
/* Coming Soon Badge */
.badge.coming-soon,
.coming-soon-badge {
  display: inline-block;
  background: #666;
  /* ... */
}
```

### 2. Session Manager Button Missing ID
**Problem**: Test expected `#open-session-manager` but button had no ID  
**Solution**: Added the ID to the button in `PreferenceWindow.js`

```javascript
<button class="preference-button primary" id="open-session-manager" onclick="window.sessionManager && window.sessionManager.open()">
  Open Session Manager
</button>
```

### 3. Font Size Maximum Limit Not Enforced
**Problem**: Setting font size to 999 was not being clamped to the maximum value  
**Solution**: Added validation in two places:

1. In `PreferenceWindow.js` `handleInputChange()` method:
```javascript
// Enforce min/max limits
if (input.hasAttribute('min')) {
  const min = parseFloat(input.getAttribute('min'));
  if (value < min) value = min;
}
if (input.hasAttribute('max')) {
  const max = parseFloat(input.getAttribute('max'));
  if (value > max) value = max;
}
```

2. In `PreferenceManager.js` `set()` method:
```javascript
// Validate specific preferences
if (path === 'terminal.fontSize') {
  value = Math.max(8, Math.min(32, value)); // Clamp between 8 and 32
} else if (path === 'terminal.scrollback') {
  value = Math.max(100, Math.min(999999, value));
} 
// ... other validations
```

### 4. Keyboard Shortcut Platform Mismatch
**Problem**: Test used `Ctrl+T` but macOS requires `Cmd+T` (Meta+T)  
**Solution**: Made the test platform-aware:

```javascript
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+T' : 'Control+T');
```

### 5. Terminal Selector Ambiguity
**Problem**: After creating a new terminal, `.xterm-screen` selector matched multiple elements  
**Solution**: Used more specific selector for the active terminal:

```javascript
await page.locator('.terminal.xterm.focus .xterm-screen').click();
```

## Test Results
All 8 tests now pass successfully:
- ✅ Deleted categories verification
- ✅ Simplified Advanced settings
- ✅ Session functionality
- ✅ Settings save and apply
- ✅ Theme changes
- ✅ Performance tests
- ✅ Error handling
- ✅ Full integration scenario

## Validation Logic Added
The preference system now properly validates:
- Font size: 8-32px
- Scrollback: 100-999999 lines
- Line height: 1.0-2.0
- Window opacity: 0.1-1.0

This ensures robustness against invalid user input and prevents UI issues from extreme values.