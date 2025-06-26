/**
 * Split View Manager - Handles terminal split view with resizable panes
 */

class SplitManager {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.isActive = false;
    this.orientation = 'horizontal'; // 'horizontal' or 'vertical'
    this.splitRatio = 0.5; // 50/50 split by default
    this.isDragging = false;
    this.container = document.getElementById('terminal-container');
    this.splitter = null;
    this.pane1 = null;
    this.pane2 = null;
  }
  
  toggle() {
    if (!this.isActive) {
      this.enable();
    } else {
      // Toggle orientation
      this.setOrientation(this.orientation === 'horizontal' ? 'vertical' : 'horizontal');
    }
  }
  
  enable() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Ensure we have at least 2 terminals
    if (this.terminalManager.terminals.size < 2) {
      this.terminalManager.createTerminal();
    }
    
    // Create split layout
    this.createSplitLayout();
    
    // Update button
    this.updateButton();
  }
  
  disable() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove split layout
    this.removeSplitLayout();
    
    // Update button
    const splitBtn = document.getElementById('split-terminal-btn');
    splitBtn.textContent = 'Split';
    splitBtn.classList.remove('active');
    
    // Restore normal tab view
    this.terminalManager.switchToTerminal(this.terminalManager.activeTerminalId);
  }
  
  createSplitLayout() {
    // Save existing terminal wrappers before modifying container
    const terminalWrappers = [];
    this.terminalManager.terminals.forEach((session, id) => {
      const wrapper = document.getElementById(`wrapper-${id}`);
      if (wrapper && wrapper.parentNode === this.container) {
        terminalWrappers.push({ id, wrapper });
      }
    });
    
    // Clear container but preserve terminal instances
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    
    this.container.classList.add('split-container', `split-${this.orientation}`);
    
    // Create panes
    this.pane1 = document.createElement('div');
    this.pane1.className = 'split-pane pane-1';
    
    this.splitter = document.createElement('div');
    this.splitter.className = `splitter splitter-${this.orientation}`;
    
    this.pane2 = document.createElement('div');
    this.pane2.className = 'split-pane pane-2';
    
    // Add to container
    this.container.appendChild(this.pane1);
    this.container.appendChild(this.splitter);
    this.container.appendChild(this.pane2);
    
    // Move terminals to panes
    if (terminalWrappers[0]) {
      const { wrapper } = terminalWrappers[0];
      this.pane1.appendChild(wrapper);
      wrapper.classList.add('active');
      // Ensure wrapper fills the pane
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.position = 'relative';
    }
    
    if (terminalWrappers[1]) {
      const { wrapper } = terminalWrappers[1];
      this.pane2.appendChild(wrapper);
      wrapper.classList.add('active');
      // Ensure wrapper fills the pane
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.position = 'relative';
    }
    
    // Setup resize
    this.setupResize();
    
    // Apply initial split ratio
    this.applySplitRatio();
    
    // Resize terminals
    this.resizeTerminals();
  }
  
  removeSplitLayout() {
    this.container.classList.remove('split-container', 'split-horizontal', 'split-vertical');
    
    // Move all terminals back to container
    this.terminalManager.terminals.forEach((session, id) => {
      const wrapper = document.getElementById(`wrapper-${id}`);
      if (wrapper) {
        wrapper.style.position = '';
        wrapper.style.top = '';
        wrapper.style.left = '';
        wrapper.style.right = '';
        wrapper.style.bottom = '';
        this.container.appendChild(wrapper);
      }
    });
    
    // Remove split elements
    if (this.pane1) this.pane1.remove();
    if (this.pane2) this.pane2.remove();
    if (this.splitter) this.splitter.remove();
    
    this.pane1 = null;
    this.pane2 = null;
    this.splitter = null;
  }
  
  setOrientation(orientation) {
    if (this.orientation === orientation) return;
    
    this.orientation = orientation;
    
    // Update container classes without recreating DOM
    this.container.classList.remove('split-horizontal', 'split-vertical');
    this.container.classList.add(`split-${orientation}`);
    
    // Update splitter classes
    if (this.splitter) {
      this.splitter.classList.remove('splitter-horizontal', 'splitter-vertical');
      this.splitter.classList.add(`splitter-${orientation}`);
    }
    
    // Reset split ratio
    this.splitRatio = 0.5;
    this.applySplitRatio();
    
    // Update button
    this.updateButton();
    
    // Force resize terminals after a delay to ensure DOM is updated
    requestAnimationFrame(() => {
      this.resizeTerminals();
      // Additional resize after transition completes
      setTimeout(() => {
        this.resizeTerminals();
      }, 300);
    });
  }
  
  setupResize() {
    if (!this.splitter) return;
    
    this.splitter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      document.body.style.cursor = this.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      
      // Add overlay to prevent iframe interference
      const overlay = document.createElement('div');
      overlay.className = 'resize-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.zIndex = '9999';
      overlay.style.cursor = document.body.style.cursor;
      document.body.appendChild(overlay);
      
      const handleMouseMove = (e) => {
        if (!this.isDragging) return;
        
        const rect = this.container.getBoundingClientRect();
        
        if (this.orientation === 'horizontal') {
          const ratio = (e.clientX - rect.left) / rect.width;
          this.splitRatio = Math.max(0.1, Math.min(0.9, ratio));
        } else {
          const ratio = (e.clientY - rect.top) / rect.height;
          this.splitRatio = Math.max(0.1, Math.min(0.9, ratio));
        }
        
        this.applySplitRatio();
      };
      
      const handleMouseUp = () => {
        this.isDragging = false;
        document.body.style.cursor = '';
        document.querySelector('.resize-overlay')?.remove();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Resize terminals after drag
        this.resizeTerminals();
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }
  
  applySplitRatio() {
    if (!this.pane1 || !this.pane2) return;
    
    if (this.orientation === 'horizontal') {
      this.pane1.style.width = `${this.splitRatio * 100}%`;
      this.pane2.style.width = `${(1 - this.splitRatio) * 100}%`;
      this.pane1.style.height = '100%';
      this.pane2.style.height = '100%';
    } else {
      this.pane1.style.height = `${this.splitRatio * 100}%`;
      this.pane2.style.height = `${(1 - this.splitRatio) * 100}%`;
      this.pane1.style.width = '100%';
      this.pane2.style.width = '100%';
    }
  }
  
  resizeTerminals() {
    if (!this.isActive) return;
    
    // Resize all visible terminals
    const terminalIds = Array.from(this.terminalManager.terminals.keys()).slice(0, 2);
    terminalIds.forEach((id, index) => {
      const session = this.terminalManager.terminals.get(id);
      if (session && session.fitAddon && session.terminal) {
        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          try {
            // Ensure terminal is visible before fitting
            const wrapper = document.getElementById(`wrapper-${id}`);
            if (wrapper && wrapper.offsetParent !== null) {
              // Force the terminal to recalculate its dimensions
              const pane = index === 0 ? this.pane1 : this.pane2;
              if (pane) {
                const rect = pane.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  session.fitAddon.fit();
                  // Force terminal refresh without clearing content
                  session.terminal.refresh(0, session.terminal.rows - 1);
                  // Trigger a second fit after a short delay
                  setTimeout(() => {
                    session.fitAddon.fit();
                    session.terminal.refresh(0, session.terminal.rows - 1);
                  }, 50);
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fit terminal:', e);
          }
        });
      }
    });
  }
  
  updateButton() {
    const splitBtn = document.getElementById('split-terminal-btn');
    splitBtn.classList.add('active');
    splitBtn.textContent = this.orientation === 'horizontal' ? '⟂ Vertical' : '⟃ Horizontal';
  }
}

// Export for use in terminalManager
window.SplitManager = SplitManager;