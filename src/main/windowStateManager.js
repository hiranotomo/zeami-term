const { screen, app } = require('electron');
const fs = require('fs');
const path = require('path');

class WindowStateManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'window-states.json');
    this.states = this.loadStates();
    this.saveDebounceTimers = new Map();
  }

  /**
   * Load window states from disk
   */
  loadStates() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[WindowStateManager] Failed to load states:', error);
    }
    return {};
  }

  /**
   * Save window states to disk
   */
  saveStates() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.states, null, 2));
    } catch (error) {
      console.error('[WindowStateManager] Failed to save states:', error);
    }
  }

  /**
   * Get window state for specific window type
   * @param {string} windowType - Type of window ('main' or 'messageCenter')
   * @returns {Object} Window state with bounds and display info
   */
  getWindowState(windowType) {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    
    // Get saved state
    const savedState = this.states[windowType];
    
    // Default states for different window types
    const defaults = {
      main: {
        width: 1200,
        height: 800,
        x: primaryDisplay.bounds.x + Math.floor((primaryDisplay.bounds.width - 1200) / 2),
        y: primaryDisplay.bounds.y + Math.floor((primaryDisplay.bounds.height - 800) / 2)
      },
      messageCenter: {
        width: 800,
        height: 600,
        x: primaryDisplay.bounds.x + primaryDisplay.bounds.width - 820,
        y: primaryDisplay.bounds.y + 20
      }
    };
    
    if (!savedState) {
      return {
        ...defaults[windowType],
        displayId: primaryDisplay.id,
        isMaximized: false,
        isFullScreen: false
      };
    }
    
    // Check if the saved display still exists
    const savedDisplay = displays.find(d => d.id === savedState.displayId);
    
    if (savedDisplay) {
      // Validate that window is within display bounds
      const bounds = savedDisplay.bounds;
      const isWithinBounds = 
        savedState.x >= bounds.x &&
        savedState.y >= bounds.y &&
        savedState.x + savedState.width <= bounds.x + bounds.width &&
        savedState.y + savedState.height <= bounds.y + bounds.height;
      
      if (isWithinBounds) {
        return savedState;
      }
    }
    
    // If display doesn't exist or window is out of bounds, reset to defaults
    console.log(`[WindowStateManager] Resetting ${windowType} window position - display changed or out of bounds`);
    return {
      ...defaults[windowType],
      displayId: primaryDisplay.id,
      isMaximized: false,
      isFullScreen: false
    };
  }

  /**
   * Track window state changes
   * @param {BrowserWindow} window - Electron window instance
   * @param {string} windowType - Type of window
   */
  trackWindow(window, windowType) {
    // Initial state
    this.updateWindowState(window, windowType);
    
    // Track move and resize events with debouncing
    const updateState = () => {
      // Clear existing timer
      if (this.saveDebounceTimers.has(windowType)) {
        clearTimeout(this.saveDebounceTimers.get(windowType));
      }
      
      // Set new timer to save after 500ms of inactivity
      const timer = setTimeout(() => {
        this.updateWindowState(window, windowType);
        this.saveStates();
      }, 500);
      
      this.saveDebounceTimers.set(windowType, timer);
    };
    
    window.on('moved', updateState);
    window.on('resize', updateState);
    
    // Track maximize/restore
    window.on('maximize', () => {
      this.states[windowType] = {
        ...this.states[windowType],
        isMaximized: true
      };
      this.saveStates();
    });
    
    window.on('unmaximize', () => {
      this.states[windowType] = {
        ...this.states[windowType],
        isMaximized: false
      };
      this.saveStates();
    });
    
    // Track fullscreen
    window.on('enter-full-screen', () => {
      this.states[windowType] = {
        ...this.states[windowType],
        isFullScreen: true
      };
      this.saveStates();
    });
    
    window.on('leave-full-screen', () => {
      this.states[windowType] = {
        ...this.states[windowType],
        isFullScreen: false
      };
      this.saveStates();
    });
    
    // Clean up timer on window close
    window.on('closed', () => {
      if (this.saveDebounceTimers.has(windowType)) {
        clearTimeout(this.saveDebounceTimers.get(windowType));
        this.saveDebounceTimers.delete(windowType);
      }
    });
  }

  /**
   * Update window state
   * @param {BrowserWindow} window - Electron window instance
   * @param {string} windowType - Type of window
   */
  updateWindowState(window, windowType) {
    if (window.isDestroyed()) return;
    
    const bounds = window.getBounds();
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    
    this.states[windowType] = {
      ...bounds,
      displayId: display.id,
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen()
    };
  }

  /**
   * Apply saved state to window
   * @param {BrowserWindow} window - Electron window instance
   * @param {string} windowType - Type of window
   */
  restoreWindowState(window, windowType) {
    const state = this.getWindowState(windowType);
    
    // Set bounds
    window.setBounds({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height
    });
    
    // Restore maximize/fullscreen state
    if (state.isMaximized) {
      window.maximize();
    }
    
    if (state.isFullScreen) {
      window.setFullScreen(true);
    }
  }
}

module.exports = { WindowStateManager };