/**
 * SimpleLayoutManager - Simplified layout management
 * 
 * A simpler approach that works with existing UI structure
 */

import { Splitter } from '../components/Splitter.js';

export class SimpleLayoutManager {
  constructor(container, terminalManager) {
    this.container = container;
    this.terminalManager = terminalManager;
    this.terminals = new Map();
    this.mode = 'tab'; // 'tab', 'split-vertical', 'split-horizontal'
    this.splitContainer = null;
    this.splitter = null;
    this.buttons = {};
  }
  
  init() {
    console.log('[SimpleLayoutManager] Initializing...');
    this.setupButtons();
  }
  
  setupButtons() {
    // Add split buttons to existing header
    const actionsDiv = document.querySelector('.header .actions');
    if (!actionsDiv) return;
    
    // Create toggle button group
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'split-toggle-group';
    
    // Create Tab button
    const tabBtn = document.createElement('button');
    tabBtn.className = 'toggle-button active';
    tabBtn.textContent = 'Tab';
    tabBtn.title = 'タブモード - 一度に1つのターミナルを表示';
    tabBtn.addEventListener('click', () => this.setMode('tab'));
    
    // Create Horizontal button
    const horizontalBtn = document.createElement('button');
    horizontalBtn.className = 'toggle-button';
    horizontalBtn.textContent = 'Horizontal';
    horizontalBtn.title = '水平分割 - 上下に2つのターミナルを表示';
    horizontalBtn.addEventListener('click', () => this.setMode('split-horizontal'));
    
    // Create Vertical button
    const verticalBtn = document.createElement('button');
    verticalBtn.className = 'toggle-button';
    verticalBtn.textContent = 'Vertical';
    verticalBtn.title = '垂直分割 - 左右に2つのターミナルを表示';
    verticalBtn.addEventListener('click', () => this.setMode('split-vertical'));
    
    // Add buttons to group
    toggleGroup.appendChild(tabBtn);
    toggleGroup.appendChild(horizontalBtn);
    toggleGroup.appendChild(verticalBtn);
    
    // Store button references
    this.buttons = {
      tab: tabBtn,
      horizontal: horizontalBtn,
      vertical: verticalBtn
    };
    
    // Create new window button
    const newWindowBtn = document.createElement('button');
    newWindowBtn.className = 'action-button';
    newWindowBtn.innerHTML = '⧉';
    newWindowBtn.title = '新規ウィンドウを開く (⌘⇧N)';
    newWindowBtn.addEventListener('click', () => this.createNewWindow());
    
    // Insert before preferences button
    const prefsBtn = document.getElementById('preferences-btn');
    actionsDiv.insertBefore(toggleGroup, prefsBtn);
    actionsDiv.insertBefore(newWindowBtn, prefsBtn);
  }
  
  addTerminal(id, wrapper) {
    console.log('[SimpleLayoutManager] Adding terminal:', id);
    this.terminals.set(id, wrapper);
    
    if (this.mode === 'tab') {
      // Hide all other terminals
      this.terminals.forEach((w, tid) => {
        w.style.display = tid === id ? 'block' : 'none';
      });
      
      // Add to container
      this.container.appendChild(wrapper);
    } else {
      // Add to split layout
      this.updateSplitLayout();
    }
  }
  
  removeTerminal(id) {
    console.log('[SimpleLayoutManager] Removing terminal:', id);
    const wrapper = this.terminals.get(id);
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    this.terminals.delete(id);
    
    // If no terminals left, reset to tab mode
    if (this.terminals.size === 0) {
      this.mode = 'tab';
      if (this.splitContainer) {
        this.splitContainer.remove();
        this.splitContainer = null;
      }
    } else {
      this.updateLayout();
    }
  }
  
  setMode(mode) {
    if (this.mode === mode) return;
    
    console.log('[SimpleLayoutManager] Switching to mode:', mode);
    this.mode = mode;
    
    // Update button states
    Object.keys(this.buttons).forEach(key => {
      if (key === 'tab' && mode === 'tab') {
        this.buttons[key].classList.add('active');
      } else if (key === 'horizontal' && mode === 'split-horizontal') {
        this.buttons[key].classList.add('active');
      } else if (key === 'vertical' && mode === 'split-vertical') {
        this.buttons[key].classList.add('active');
      } else {
        this.buttons[key].classList.remove('active');
      }
    });
    
    if (mode === 'tab') {
      this.switchToTabMode();
    } else {
      // Ensure we have at least 2 terminals for split modes
      if (this.terminals.size < 2) {
        // Get current directory from active terminal
        const activeTerminal = this.terminalManager.terminals.get(this.terminalManager.activeTerminalId);
        const cwd = activeTerminal?.cwd || activeTerminal?.process?.cwd || undefined;
        console.log('[SimpleLayoutManager] Creating second terminal with cwd:', cwd);
        this.terminalManager.createTerminal({ cwd });
      }
      this.createSplitLayout();
    }
  }
  
  switchToTabMode() {
    console.log('[SimpleLayoutManager] Switching to tab mode');
    
    // Clean up splitter
    if (this.splitter) {
      this.splitter.destroy();
      this.splitter = null;
    }
    
    // Remove split container
    if (this.splitContainer) {
      this.splitContainer.remove();
      this.splitContainer = null;
    }
    
    // Show only active terminal
    const activeId = this.terminalManager.activeTerminalId;
    this.terminals.forEach((wrapper, id) => {
      wrapper.style.display = id === activeId ? 'block' : 'none';
      wrapper.style.position = '';
      wrapper.style.top = '';
      wrapper.style.left = '';
      wrapper.style.right = '';
      wrapper.style.bottom = '';
      wrapper.style.width = '';
      wrapper.style.height = '';
      if (wrapper.parentNode !== this.container) {
        this.container.appendChild(wrapper);
      }
    });
  }
  
  createNewWindow() {
    console.log('[SimpleLayoutManager] Creating new window');
    // Send IPC message to main process to create new window
    window.electronAPI.createNewWindow();
  }
  
  createSplitLayout() {
    // Clean up existing splitter
    if (this.splitter) {
      this.splitter.destroy();
      this.splitter = null;
    }
    
    // Remove existing split container if any
    if (this.splitContainer) {
      this.splitContainer.remove();
    }
    
    // Create split container
    this.splitContainer = document.createElement('div');
    this.splitContainer.className = 'simple-split-container';
    
    // Apply styles based on mode
    if (this.mode === 'split-vertical') {
      this.splitContainer.style.display = 'grid';
      this.splitContainer.style.gridTemplateColumns = '1fr 4px 1fr';
      this.splitContainer.style.height = '100%';
      this.splitContainer.style.width = '100%';
    } else if (this.mode === 'split-horizontal') {
      this.splitContainer.style.display = 'grid';
      this.splitContainer.style.gridTemplateRows = '1fr 4px 1fr';
      this.splitContainer.style.height = '100%';
      this.splitContainer.style.width = '100%';
    }
    
    // Clear container and add split layout
    this.container.innerHTML = '';
    this.container.appendChild(this.splitContainer);
    
    // Add terminals to split
    const terminalArray = Array.from(this.terminals.entries());
    
    // Get terminals in creation order (terminal-1, terminal-2, etc)
    // Don't sort by active terminal to maintain consistent order
    terminalArray.sort(([idA], [idB]) => {
      const numA = parseInt(idA.split('-')[1]);
      const numB = parseInt(idB.split('-')[1]);
      return numA - numB;
    });
    
    console.log('[SimpleLayoutManager] Terminal order for split:', terminalArray.map(([id]) => id));
    
    // First pane (for active terminal)
    const pane1 = document.createElement('div');
    pane1.className = 'split-pane';
    pane1.style.overflow = 'hidden';
    pane1.style.position = 'relative';
    
    if (terminalArray[0]) {
      const [id1, wrapper1] = terminalArray[0];
      wrapper1.style.display = 'block';
      wrapper1.style.position = 'absolute';
      wrapper1.style.top = '0';
      wrapper1.style.left = '0';
      wrapper1.style.right = '0';
      wrapper1.style.bottom = '0';
      wrapper1.style.width = '100%';
      wrapper1.style.height = '100%';
      pane1.appendChild(wrapper1);
      
      // Add click handler to focus terminal
      pane1.addEventListener('click', (e) => {
        console.log('[SimpleLayoutManager] Pane 1 clicked, switching to terminal:', id1);
        e.stopPropagation();
        this.terminalManager.switchToTerminal(id1);
      });
    }
    
    // Splitter
    const splitter = document.createElement('div');
    splitter.className = this.mode === 'split-vertical' ? 'splitter-vertical' : 'splitter-horizontal';
    splitter.style.background = '#3e3e42';
    splitter.style.cursor = this.mode === 'split-vertical' ? 'col-resize' : 'row-resize';
    
    // Second pane
    const pane2 = document.createElement('div');
    pane2.className = 'split-pane';
    pane2.style.overflow = 'hidden';
    pane2.style.position = 'relative';
    
    if (terminalArray[1]) {
      const [id2, wrapper2] = terminalArray[1];
      wrapper2.style.display = 'block';
      wrapper2.style.position = 'absolute';
      wrapper2.style.top = '0';
      wrapper2.style.left = '0';
      wrapper2.style.right = '0';
      wrapper2.style.bottom = '0';
      wrapper2.style.width = '100%';
      wrapper2.style.height = '100%';
      pane2.appendChild(wrapper2);
      
      // Add click handler to focus terminal
      pane2.addEventListener('click', (e) => {
        console.log('[SimpleLayoutManager] Pane 2 clicked, switching to terminal:', id2);
        e.stopPropagation();
        this.terminalManager.switchToTerminal(id2);
      });
    }
    
    // Add to split container
    this.splitContainer.appendChild(pane1);
    this.splitContainer.appendChild(splitter);
    this.splitContainer.appendChild(pane2);
    
    // Hide extra terminals
    terminalArray.slice(2).forEach(([id, wrapper]) => {
      wrapper.style.display = 'none';
    });
    
    // Initialize splitter component
    this.splitter = new Splitter(
      this.splitContainer,
      this.mode === 'split-vertical' ? 'vertical' : 'horizontal',
      (firstRatio, secondRatio) => {
        // Resize terminals when splitter is dragged
        this.resizeTerminals();
      }
    );
    
    // Load saved layout if exists
    this.splitter.loadLayout();
    
    // Trigger resize
    this.resizeTerminals();
  }
  
  updateLayout() {
    if (this.mode === 'tab') {
      // Show only active terminal
      const activeId = this.terminalManager.activeTerminalId;
      this.terminals.forEach((wrapper, id) => {
        wrapper.style.display = id === activeId ? 'block' : 'none';
      });
    } else {
      this.updateSplitLayout();
    }
  }
  
  updateSplitLayout() {
    if (!this.splitContainer) {
      this.createSplitLayout();
    }
    // Resize terminals after layout update
    this.resizeTerminals();
  }
  
  resizeTerminals() {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      this.terminals.forEach((wrapper, id) => {
        if (wrapper.offsetParent !== null) { // Terminal is visible
          const terminal = this.terminalManager.terminals.get(id);
          if (terminal && terminal.fitAddon) {
            terminal.fitAddon.fit();
          }
        }
      });
    }, 50);
  }
  
  focusTerminal(id) {
    const terminal = this.terminalManager.terminals.get(id);
    if (terminal) {
      terminal.terminal.focus();
    }
  }
}