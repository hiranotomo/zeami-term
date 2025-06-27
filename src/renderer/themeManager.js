/**
 * Theme Manager for ZeamiTerm
 * Manages terminal and UI themes with CSS variable support
 */

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.themes = new Map();
    this.styleElement = null;
    this.selectionStyleElement = null;
  }

  /**
   * Initialize theme manager and load default theme
   */
  async init() {
    // Create style elements
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'zeami-theme';
    document.head.appendChild(this.styleElement);

    // Create separate style element for selection (higher specificity)
    this.selectionStyleElement = document.createElement('style');
    this.selectionStyleElement.id = 'zeami-selection-theme';
    document.head.appendChild(this.selectionStyleElement);

    // Load default theme
    await this.loadTheme('default');
    
    // Start observing for selection changes
    this.startSelectionObserver();
  }

  /**
   * Load a theme from file
   */
  async loadTheme(themeName) {
    try {
      const response = await fetch(`themes/${themeName}.json`);
      const theme = await response.json();
      
      this.themes.set(themeName, theme);
      this.applyTheme(themeName);
      
      return theme;
    } catch (error) {
      console.error(`Failed to load theme ${themeName}:`, error);
      return null;
    }
  }

  /**
   * Apply a loaded theme
   */
  applyTheme(themeName) {
    const theme = this.themes.get(themeName);
    if (!theme) {
      console.error(`Theme ${themeName} not loaded`);
      return;
    }

    this.currentTheme = theme;

    // Generate CSS variables
    const cssVars = this.generateCSSVariables(theme);
    this.styleElement.textContent = cssVars;

    // Apply selection styles with high specificity
    this.applySelectionStyles(theme);

    // Update selection observer with new color
    if (this.selectionObserver) {
      this.selectionObserver.disconnect();
      this.startSelectionObserver();
    }

    // Emit theme change event
    this.emitThemeChange(theme);
  }

  /**
   * Generate CSS variables from theme
   */
  generateCSSVariables(theme) {
    let css = ':root {\n';

    // Terminal colors
    for (const [key, value] of Object.entries(theme.colors.terminal)) {
      css += `  --terminal-${this.kebabCase(key)}: ${value};\n`;
    }

    // UI colors
    for (const [key, value] of Object.entries(theme.colors.ui)) {
      css += `  --ui-${this.kebabCase(key)}: ${value};\n`;
    }

    css += '}\n\n';

    // Apply CSS variables to elements
    css += this.generateElementStyles(theme);

    return css;
  }

  /**
   * Generate element-specific styles
   */
  generateElementStyles(theme) {
    return `
/* Terminal container */
#terminal-container {
  background-color: var(--ui-background-transparent);
}

/* Status bar */
#status-bar,
.status-bar {
  background-color: var(--ui-status-bar);
  color: var(--ui-status-bar-text);
}

/* Tabs */
.tab {
  background-color: var(--ui-tab-inactive);
  color: var(--ui-tab-text);
}

.tab.active {
  background-color: var(--ui-tab-active);
  color: var(--ui-tab-active-text);
}

/* Scrollbar */
::-webkit-scrollbar-thumb {
  background: var(--ui-scrollbar);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--ui-scrollbar-hover);
}
`;
  }

  /**
   * Apply selection styles with maximum specificity
   */
  applySelectionStyles(theme) {
    const selectionColor = theme.css?.selectionLayer?.backgroundColor || theme.colors.terminal.selection;
    const blendMode = theme.css?.selectionLayer?.mixBlendMode || 'normal';

    // Use multiple approaches to ensure selection transparency works
    this.selectionStyleElement.textContent = `
/* Force transparent selection - Method 1: Direct targeting */
.xterm .xterm-selection-layer {
  mix-blend-mode: ${blendMode} !important;
}

.xterm .xterm-selection-layer > div {
  background-color: ${selectionColor} !important;
  opacity: 1 !important;
}

/* Method 2: Using attribute selectors for higher specificity */
[class*="xterm-selection-layer"] > div {
  background-color: ${selectionColor} !important;
}

/* Method 3: Target any div with selection background */
.xterm div[style*="background-color: rgb(58, 61, 65)"],
.xterm div[style*="background-color: rgba(58, 61, 65"],
.xterm div[style*="background-color:#3a3d41"] {
  background-color: ${selectionColor} !important;
}

/* Method 4: Override inline styles using CSS custom properties */
.xterm {
  --selection-bg-color: ${selectionColor};
}

.xterm-selection-layer > div {
  background-color: var(--selection-bg-color) !important;
}
`;
  }

  /**
   * Get xterm.js theme object
   */
  getXtermTheme() {
    if (!this.currentTheme) return null;

    const colors = this.currentTheme.colors.terminal;
    return {
      foreground: colors.foreground,
      background: colors.background,
      cursor: colors.cursor,
      cursorAccent: colors.cursorAccent,
      selection: colors.selection,
      black: colors.black,
      brightBlack: colors.brightBlack,
      red: colors.red,
      brightRed: colors.brightRed,
      green: colors.green,
      brightGreen: colors.brightGreen,
      yellow: colors.yellow,
      brightYellow: colors.brightYellow,
      blue: colors.blue,
      brightBlue: colors.brightBlue,
      magenta: colors.magenta,
      brightMagenta: colors.brightMagenta,
      cyan: colors.cyan,
      brightCyan: colors.brightCyan,
      white: colors.white,
      brightWhite: colors.brightWhite
    };
  }

  /**
   * Update existing terminals with new theme
   */
  updateTerminals(terminals) {
    const xtermTheme = this.getXtermTheme();
    if (!xtermTheme) return;

    for (const session of terminals.values()) {
      if (session.terminal) {
        session.terminal.options.theme = xtermTheme;
        
        // Force refresh
        if (session.terminal.refresh) {
          session.terminal.refresh(0, session.terminal.rows - 1);
        }
      }
    }
    
    // Re-observe selections after theme update
    setTimeout(() => {
      this.observeSelections();
    }, 100);
  }

  /**
   * Convert camelCase to kebab-case
   */
  kebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Emit theme change event
   */
  emitThemeChange(theme) {
    const event = new CustomEvent('theme-changed', { detail: theme });
    window.dispatchEvent(event);
    
    // Update selection fix with new color
    if (window.selectionFix) {
      const selectionColor = theme.css?.selectionLayer?.backgroundColor || theme.colors.terminal.selection;
      window.selectionFix.updateTargetColor(selectionColor);
    }
  }

  /**
   * Get list of available themes
   */
  getAvailableThemes() {
    return Array.from(this.themes.keys());
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Start observing for selection style changes
   * This ensures our transparent selection color is always applied
   */
  startSelectionObserver() {
    const selectionColor = this.currentTheme?.colors?.terminal?.selection || 'rgba(120, 150, 200, 0.3)';
    
    // Create observer to watch for inline style changes
    this.selectionObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const element = mutation.target;
          
          // Check if this is a selection div with the default gray color
          if (element.style.backgroundColor && 
              (element.style.backgroundColor.includes('58, 61, 65') ||
               element.style.backgroundColor === 'rgb(58, 61, 65)' ||
               element.style.backgroundColor === 'rgba(58, 61, 65, 0.3)')) {
            // Replace with our transparent selection color
            element.style.backgroundColor = selectionColor;
          }
        }
      });
    });

    // Start observing the entire document for style changes
    this.observeSelections();
    
    // Re-observe when new terminals are added
    const terminalObserver = new MutationObserver(() => {
      this.observeSelections();
    });
    
    terminalObserver.observe(document.getElementById('terminal-container'), {
      childList: true,
      subtree: true
    });
  }

  /**
   * Observe all terminal elements for selection changes
   */
  observeSelections() {
    // Find all xterm terminals
    document.querySelectorAll('.xterm').forEach(terminal => {
      // Observe the terminal and all its children for style changes
      this.selectionObserver.observe(terminal, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
      });
    });
    
    // Also specifically target selection layer divs
    document.querySelectorAll('.xterm-selection-layer div').forEach(div => {
      // Check and fix existing selection colors
      if (div.style.backgroundColor && 
          (div.style.backgroundColor.includes('58, 61, 65') ||
           div.style.backgroundColor === 'rgb(58, 61, 65)')) {
        const selectionColor = this.currentTheme?.colors?.terminal?.selection || 'rgba(120, 150, 200, 0.3)';
        div.style.backgroundColor = selectionColor;
      }
    });
  }

  /**
   * Clean up observer when theme manager is destroyed
   */
  dispose() {
    if (this.selectionObserver) {
      this.selectionObserver.disconnect();
    }
  }
}

// Export for use in other modules
window.ThemeManager = ThemeManager;