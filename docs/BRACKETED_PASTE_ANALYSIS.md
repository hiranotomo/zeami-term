# Bracketed Paste Mode Analysis - Deep Investigation

## Issue Summary

The paste functionality in ZeamiTerm has a critical issue where bracketed paste markers (`\x1b[200~` and `\x1b[201~`) are being added twice, causing Claude Code to get stuck showing "Pasting text..." and eventually timing out.

## Data Flow Analysis

### 1. Browser Paste Event Flow

1. **User pastes text** (Cmd+V or right-click paste)
2. **Browser clipboard event** is triggered
3. **xterm.js handles the paste event** internally
4. **xterm.js adds bracketed paste markers** if `bracketedPasteMode` is true
5. **onPaste hook** is called with the data (which already has markers!)
6. **Data is sent to PTY** through the terminal handler

### 2. Current Implementation Issues

#### In ZeamiTermManager.js (line 253-285):
```javascript
// CRITICAL: Override paste handling to fix double bracketed paste issue
terminal.onPaste = (data) => {
  // Check if data already contains paste markers (this is the problem!)
  const hasStartMarker = data.includes('\x1b[200~');
  const hasEndMarker = data.includes('\x1b[201~');
  
  if (hasStartMarker || hasEndMarker) {
    // Data already has markers - send it directly without letting xterm.js add more
    if (session.terminal._ptyHandler) {
      session.terminal._ptyHandler(data);
    }
    return false; // Prevent xterm.js from adding more markers
  }
  
  // No markers - let xterm.js handle it normally
  return true;
};
```

**Problem**: This code assumes that if data has markers, it should bypass xterm.js processing. But the data ALREADY has markers from xterm.js's internal paste handling!

#### In xterm.js Clipboard.ts (line 51-54):
```javascript
export function paste(text: string, textarea: HTMLTextAreaElement, coreService: ICoreService, optionsService: IOptionsService): void {
  text = prepareTextForTerminal(text);
  text = bracketTextForPaste(text, coreService.decPrivateModes.bracketedPasteMode && optionsService.rawOptions.ignoreBracketedPasteMode !== true);
  coreService.triggerDataEvent(text, true);
}
```

**Key insight**: When `paste()` is called, it adds brackets based on `coreService.decPrivateModes.bracketedPasteMode`, NOT the terminal options!

### 3. Root Cause

The issue occurs because:

1. **Terminal is created with `bracketedPasteMode: false`** in options
2. **But xterm.js internally uses `decPrivateModes.bracketedPasteMode`** which can be different
3. **The onPaste hook receives data AFTER xterm.js has already processed it**
4. **So the data already contains markers when onPaste is called**
5. **The current logic then sends this data directly to PTY, thinking it's preventing double markers**
6. **But Claude Code expects raw text, not pre-bracketed text**

### 4. Why Claude Code Gets Stuck

1. Claude Code receives paste data with brackets: `\x1b[200~[pasted text]\x1b[201~`
2. It shows "Pasting text..." and waits for more data
3. It times out after 3-5 seconds
4. It exits paste mode and processes `\x1b[201~` as regular input
5. This shows as `[201~` on screen

## Solution Approaches

### Option 1: Disable Bracketed Paste Mode Completely (Current Attempt)
- Set `bracketedPasteMode: false` in terminal options
- But this doesn't affect `decPrivateModes.bracketedPasteMode`
- Need to ensure the private mode is also disabled

### Option 2: Let xterm.js Handle Everything
- Remove the onPaste override
- Let xterm.js add brackets naturally
- Ensure Claude Code can handle bracketed paste properly

### Option 3: Strip Brackets in onPaste
- Check if data has brackets
- Strip them before sending to PTY
- Let Claude Code handle paste without brackets

### Option 4: Fix the Private Mode Setting
- Ensure `decPrivateModes.bracketedPasteMode` matches the terminal option
- May need to send the appropriate control sequence to disable it

## Implemented Solution

The implemented solution combines **Option 3** (strip brackets) with **Option 4** (disable private mode):

### 1. Strip Bracketed Paste Markers in onPaste Handler

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

### 2. Explicitly Disable Bracketed Paste Mode

```javascript
// Send control sequence to disable bracketed paste mode
setTimeout(() => {
  if (session.terminal._ptyHandler) {
    // Send CSI ? 2004 l (reset bracketed paste mode)
    session.terminal._ptyHandler('\x1b[?2004l');
  }
}, 100);
```

This ensures:
1. No double brackets - markers are stripped if present
2. Claude Code receives clean text without brackets
3. Terminal's private mode is explicitly disabled
4. Paste works reliably for all text sizes

## Testing Requirements

1. Test paste with small text (< 100 chars)
2. Test paste with large text (> 1000 chars)
3. Test paste with multi-line text
4. Test paste with special characters
5. Verify no `[201~` appears on screen
6. Verify Claude Code doesn't get stuck on "Pasting text..."