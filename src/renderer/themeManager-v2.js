/**
 * Theme Manager V2 for ZeamiTerm
 * Properly handles xterm.js theme application for Canvas/WebGL renderers
 */

class ThemeManagerV2 {
  constructor() {
    this.currentTheme = null;
    this.themes = new Map();
    this.styleElement = null;
  }

  /**
   * Initialize theme manager and load default theme
   */
  async init() {
    console.log('[ThemeManagerV2] Initializing...');
    
    // Create style element for UI styles only (not terminal selection)
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'zeami-theme-v2';
    document.head.appendChild(this.styleElement);

    // Load default theme
    try {
      const theme = await this.loadTheme('default');
      console.log('[ThemeManagerV2] Default theme loaded:', theme);
      return theme;
    } catch (error) {
      console.error('[ThemeManagerV2] Failed to load default theme:', error);
      // Return fallback theme
      return this.getFallbackTheme();
    }
  }

  /**
   * Load a theme from file
   */
  async loadTheme(themeName) {
    try {
      const response = await fetch(`themes/${themeName}.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch theme: ${response.status}`);
      }
      
      const theme = await response.json();
      console.log('[ThemeManagerV2] Theme loaded from file:', theme);
      
      this.themes.set(themeName, theme);
      this.currentTheme = theme;
      this.applyUIStyles(theme);
      
      return theme;
    } catch (error) {
      console.error(`[ThemeManagerV2] Failed to load theme ${themeName}:`, error);
      const fallback = this.getFallbackTheme();
      this.currentTheme = fallback;
      return fallback;
    }
  }

  /**
   * Get fallback theme if file loading fails
   */
  getFallbackTheme() {
    return {
      name: "Fallback Theme",
      colors: {
        terminal: {
          foreground: "#cccccc",
          background: "#1e1e1e",
          cursor: "#ffffff",
          cursorAccent: "#000000",
          selectionBackground: "#7896C84D",
          black: "#000000",
          brightBlack: "#666666",
          red: "#cd3131",
          brightRed: "#f14c4c",
          green: "#0dbc79",
          brightGreen: "#23d18b",
          yellow: "#e5e510",
          brightYellow: "#f5f543",
          blue: "#2472c8",
          brightBlue: "#3b8eea",
          magenta: "#bc3fbc",
          brightMagenta: "#d670d6",
          cyan: "#11a8cd",
          brightCyan: "#29b8db",
          white: "#e5e5e5",
          brightWhite: "#ffffff"
        },
        ui: {
          background: "#1e1e1e",
          statusBar: "rgba(0, 122, 204, 0.8)",
          statusBarText: "#ffffff"
        }
      }
    };
  }

  /**
   * Apply UI styles (not terminal styles)
   */
  applyUIStyles(theme) {
    let css = ':root {\n';

    // UI colors only
    if (theme.colors.ui) {
      for (const [key, value] of Object.entries(theme.colors.ui)) {
        css += `  --ui-${this.kebabCase(key)}: ${value};\n`;
      }
    }

    css += '}\n\n';

    // Apply CSS variables to UI elements
    css += `
/* Status bar */
#status-bar,
.status-bar {
  background-color: var(--ui-status-bar);
  color: var(--ui-status-bar-text);
}
`;

    this.styleElement.textContent = css;
  }

  /**
   * Get xterm.js theme object
   * This is the ONLY place where terminal colors should be defined
   */
  getXtermTheme() {
    if (!this.currentTheme) {
      console.warn('[ThemeManagerV2] No current theme, using fallback');
      this.currentTheme = this.getFallbackTheme();
    }

    const colors = this.currentTheme.colors.terminal;
    const xtermTheme = {
      foreground: colors.foreground,
      background: colors.background,
      cursor: colors.cursor,
      cursorAccent: colors.cursorAccent,
      selectionBackground: colors.selectionBackground, // This is the key property for selection color
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

    console.log('[ThemeManagerV2] Returning xterm theme with selectionBackground:', xtermTheme.selectionBackground);
    return xtermTheme;
  }

  /**
   * Update existing terminals with new theme
   * This properly applies the theme to xterm.js instances
   */
  updateTerminals(terminals) {
    const xtermTheme = this.getXtermTheme();
    console.log('[ThemeManagerV2] Updating terminals with theme:', xtermTheme);

    for (const [id, session] of terminals.entries()) {
      if (session.terminal) {
        console.log(`[ThemeManagerV2] Updating terminal ${id}`);
        
        // Update the theme option
        session.terminal.options.theme = xtermTheme;
        
        // Force a refresh to apply the new theme
        if (session.terminal.refresh) {
          session.terminal.refresh(0, session.terminal.rows - 1);
        }
      }
    }
  }

  /**
   * Convert camelCase to kebab-case
   */
  kebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// Export for use in other modules
window.ThemeManagerV2 = ThemeManagerV2;