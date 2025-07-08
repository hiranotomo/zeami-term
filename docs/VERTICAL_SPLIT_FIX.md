# Vertical Split Display Corruption Fix

## Problem
In vertical split mode, terminal output appeared corrupted/garbled on initial creation. The issue would be fixed by:
1. Switching to tab or horizontal mode
2. Typing any character
3. Returning to vertical split (the fix would persist)

## Root Cause
CSS stacking context conflict between:
- The `::before` overlay on `.terminal-wrapper` with `z-index: 100`
- Split mode's `position: relative` on `.terminal-wrapper`
- xterm.js text rendering

This created a rendering issue where the high z-index overlay interfered with text display, even though it was transparent.

## Solution
1. **CSS fixes in `layout.css`:**
   - Added `isolation: isolate` to create a new stacking context
   - Reduced overlay z-index to 1 in split mode
   - Ensured xterm content has z-index 2 to be above the overlay

2. **JavaScript fix in `SimpleLayoutManager.js`:**
   - Added forced CSS reflow when creating split layout
   - This ensures the browser properly recalculates stacking contexts

## Technical Details
The issue occurred because:
- All terminal wrappers have a `::before` pseudo-element for the inactive overlay
- In split mode, the wrapper uses `position: relative` instead of `absolute`
- The combination created a stacking context that interfered with WebGL/Canvas rendering
- Typing in another mode forced a browser reflow that fixed the stacking contexts globally

## Implementation Date
2025-07-08