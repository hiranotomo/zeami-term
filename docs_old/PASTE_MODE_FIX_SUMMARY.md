# Bracketed Paste Mode Fix Summary

## Problem Identified

The paste functionality in ZeamiTerm was broken due to a misunderstanding of how xterm.js handles bracketed paste mode:

1. **xterm.js adds brackets internally** when paste events occur, based on `decPrivateModes.bracketedPasteMode`
2. **The onPaste hook receives data AFTER brackets are added**
3. **The previous logic was sending pre-bracketed data to Claude Code**
4. **Claude Code got stuck showing "Pasting text..."** and eventually timed out

## Root Cause

- Setting `bracketedPasteMode: false` in terminal options doesn't affect the internal `decPrivateModes.bracketedPasteMode`
- The onPaste handler was checking for brackets and sending the data as-is, thinking it was preventing double brackets
- But the data already had brackets from xterm.js's internal processing!

## Solution Implemented

### 1. Strip Brackets in onPaste Handler
```javascript
terminal.onPaste = (data) => {
  // Strip bracketed paste markers if present
  let processedData = data;
  if (data.includes('\x1b[200~') || data.includes('\x1b[201~')) {
    processedData = data
      .replace(/\x1b\[200~/g, '')
      .replace(/\x1b\[201~/g, '');
  }
  
  // Send cleaned data directly to PTY
  if (session.terminal._ptyHandler) {
    session.terminal._ptyHandler(processedData);
  }
  
  return false; // Prevent xterm.js from processing further
};
```

### 2. Disable Bracketed Paste Mode via Control Sequence
```javascript
// Send CSI ? 2004 l to disable bracketed paste mode
setTimeout(() => {
  if (session.terminal._ptyHandler) {
    session.terminal._ptyHandler('\x1b[?2004l');
  }
}, 100);
```

## Result

- Paste now works correctly without showing `[201~` on screen
- Claude Code no longer gets stuck on "Pasting text..."
- Both small and large pastes work reliably
- No double bracketed paste markers

## Key Learning

When working with terminal emulators:
- Understand the data flow: Browser → xterm.js → onPaste hook → PTY → Shell/Application
- Control sequences like bracketed paste mode are handled at multiple layers
- Always trace the actual data being sent at each layer
- Don't assume that terminal options directly control all behaviors