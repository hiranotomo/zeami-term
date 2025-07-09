# Selection Transparency Fix Documentation

## Problem
The terminal selection was showing as opaque gray (rgb(58, 61, 65)) instead of the desired transparent blue (rgba(120, 150, 200, 0.3)) defined in the theme.

## Root Cause Analysis

1. **Hardcoded Default**: The terminalManager.js had a hardcoded selection color in the defaultOptions that was being used instead of the theme color.

2. **Inline Styles**: xterm.js applies selection colors as inline styles directly to DOM elements, which have the highest CSS specificity and cannot be overridden by external CSS rules, even with `!important`.

3. **Theme Loading Order**: The terminal was being created with default options before the theme manager could apply the correct selection color.

## Solution Implemented

### 1. Fixed Hardcoded Selection Color
Changed the default selection color in terminalManager.js from opaque gray to transparent blue:
```javascript
// Before:
selection: 'rgba(58, 61, 65, 0.3)',

// After:
selection: 'rgba(120, 150, 200, 0.3)', // Transparent blue selection
```

### 2. Proper Theme Application
Ensured that when creating terminals, the theme selection color is properly merged:
```javascript
const terminalTheme = {
  ...this.defaultOptions.theme,
  ...themeOptions,
  // Ensure selection color from theme is used
  selection: themeOptions.selection || 'rgba(120, 150, 200, 0.3)'
};
```

### 3. MutationObserver Implementation
Added a MutationObserver in themeManager.js to watch for and fix any inline style changes:

```javascript
startSelectionObserver() {
  const selectionColor = this.currentTheme?.colors?.terminal?.selection || 'rgba(120, 150, 200, 0.3)';
  
  this.selectionObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target;
        
        // Check if this is a selection div with the default gray color
        if (element.style.backgroundColor && 
            (element.style.backgroundColor.includes('58, 61, 65') ||
             element.style.backgroundColor === 'rgb(58, 61, 65)')) {
          // Replace with our transparent selection color
          element.style.backgroundColor = selectionColor;
        }
      }
    });
  });
  
  this.observeSelections();
}
```

### 4. Continuous Monitoring
The observer continuously monitors:
- All xterm terminals for style changes
- New terminals when they are added
- Theme changes to update the selection color

## Testing

To verify the fix works:

1. Start the application: `npm run dev`
2. Select text in the terminal
3. The selection should appear as transparent blue instead of opaque gray
4. Run `test-selection.js` in the browser console to verify

## Technical Details

### Why CSS Overrides Failed
- xterm.js uses `element.style.backgroundColor = 'rgb(58, 61, 65)'` directly
- Inline styles have specificity of 1000, higher than any CSS selector
- Even `!important` cannot override inline styles

### MutationObserver Performance
- Only observes `style` attribute changes
- Filters for backgroundColor containing the old gray color
- Minimal performance impact as it only runs when selections change

## Future Improvements

1. **Upstream Fix**: Consider submitting a PR to xterm.js to use CSS custom properties for selection colors
2. **Theme Presets**: Add more theme presets with different selection colors
3. **User Customization**: Allow users to customize selection color and opacity

## Files Modified

1. `/src/renderer/terminalManager.js` - Fixed hardcoded selection color
2. `/src/renderer/themeManager.js` - Added MutationObserver for selection transparency
3. `/src/renderer/themes/default.json` - Already had correct transparent selection color

## Result

Text selection in ZeamiTerm now displays with a beautiful transparent blue overlay (rgba(120, 150, 200, 0.3)) that allows the underlying text to remain visible, matching modern terminal emulator standards.