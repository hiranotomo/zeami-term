/**
 * LayoutManager - Terminal layout management with split and tab support
 * 
 * Manages the layout tree structure and rendering of terminals
 * in various configurations (tabs, vertical split, horizontal split)
 */

export class LayoutManager {
  constructor(container, terminalManager) {
    this.container = container;
    this.terminalManager = terminalManager;
    
    // Layout tree root
    this.rootNode = {
      type: 'tabs',
      children: [],
      activeIndex: 0
    };
    
    // Keep track of layout mode
    this.layoutMode = 'tabs'; // 'tabs', 'split-vertical', 'split-horizontal'
    
    // Node ID counter for unique identification
    this.nodeIdCounter = 0;
    
    // Terminal to node mapping
    this.terminalNodeMap = new Map();
    
    // Bind methods
    this.render = this.render.bind(this);
    this.addTerminal = this.addTerminal.bind(this);
    this.removeTerminal = this.removeTerminal.bind(this);
    this.splitVertical = this.splitVertical.bind(this);
    this.splitHorizontal = this.splitHorizontal.bind(this);
    this.switchToTabs = this.switchToTabs.bind(this);
  }
  
  /**
   * Initialize the layout manager
   */
  init() {
    console.log('[LayoutManager] Initializing...');
    
    // Create initial layout structure
    this.createLayoutElements();
    
    // Render initial state
    this.render();
  }
  
  /**
   * Create the necessary DOM elements for layout
   */
  createLayoutElements() {
    // Use existing header structure for tabs
    this.tabsContainer = document.getElementById('tabs-container');
    if (!this.tabsContainer) {
      console.error('[LayoutManager] tabs-container not found in DOM');
      return;
    }
    
    // Create split container inside terminal-container
    this.splitContainer = document.createElement('div');
    this.splitContainer.className = 'layout-split-container';
    this.splitContainer.style.display = 'none';
    
    // Terminal content container for tabs mode
    this.tabsContent = document.createElement('div');
    this.tabsContent.className = 'tabs-content';
    this.tabsContent.style.display = 'block';
    
    // Add to container
    this.container.appendChild(this.tabsContent);
    this.container.appendChild(this.splitContainer);
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for layout controls
   */
  setupEventListeners() {
    // Tab container click events
    this.tabsContainer.addEventListener('click', (e) => {
      // Tab selection
      const tab = e.target.closest('.tab');
      if (tab && !e.target.closest('.tab-close')) {
        const terminalId = tab.dataset.terminalId;
        if (terminalId) {
          this.selectTerminal(terminalId);
        }
      }
      
      // Tab close
      if (e.target.closest('.tab-close')) {
        const terminalId = e.target.dataset.terminalId;
        if (terminalId) {
          this.terminalManager.closeTerminal(terminalId);
        }
      }
    });
    
    // Existing button event listeners
    const header = document.querySelector('.header');
    if (header) {
      // Add split buttons to existing header
      const actionsDiv = header.querySelector('.actions');
      if (actionsDiv) {
        // Add split buttons
        const splitVBtn = document.createElement('button');
        splitVBtn.className = 'action-button';
        splitVBtn.id = 'split-v-btn';
        splitVBtn.title = 'Split Vertical';
        splitVBtn.textContent = '⊟';
        splitVBtn.addEventListener('click', () => this.splitVertical());
        
        const splitHBtn = document.createElement('button');
        splitHBtn.className = 'action-button';
        splitHBtn.id = 'split-h-btn';
        splitHBtn.title = 'Split Horizontal';
        splitHBtn.textContent = '⊞';
        splitHBtn.addEventListener('click', () => this.splitHorizontal());
        
        const tabBtn = document.createElement('button');
        tabBtn.className = 'action-button';
        tabBtn.id = 'tabs-btn';
        tabBtn.title = 'Switch to Tabs';
        tabBtn.textContent = '⊡';
        tabBtn.style.display = 'none'; // Hidden initially
        tabBtn.addEventListener('click', () => this.switchToTabs());
        
        // Insert before preferences button
        const prefsBtn = document.getElementById('preferences-btn');
        actionsDiv.insertBefore(splitVBtn, prefsBtn);
        actionsDiv.insertBefore(splitHBtn, prefsBtn);
        actionsDiv.insertBefore(tabBtn, prefsBtn);
        
        // Store references
        this.splitVBtn = splitVBtn;
        this.splitHBtn = splitHBtn;
        this.tabBtn = tabBtn;
      }
    }
  }
  
  /**
   * Add a terminal to the layout
   */
  addTerminal(terminalId, wrapper) {
    console.log('[LayoutManager] Adding terminal:', terminalId);
    
    // Create a new node for the terminal
    const node = {
      id: `node-${++this.nodeIdCounter}`,
      type: 'terminal',
      terminalId: terminalId,
      wrapper: wrapper
    };
    
    // Store mapping
    this.terminalNodeMap.set(terminalId, node);
    
    // Add to layout tree based on current mode
    if (this.layoutMode === 'tabs') {
      this.rootNode.children.push(node);
      this.rootNode.activeIndex = this.rootNode.children.length - 1;
    } else {
      // For split mode, add to the focused pane
      // For now, just add to first available slot
      this.addToSplitLayout(node);
    }
    
    // Re-render
    this.render();
  }
  
  /**
   * Remove a terminal from the layout
   */
  removeTerminal(terminalId) {
    console.log('[LayoutManager] Removing terminal:', terminalId);
    
    const node = this.terminalNodeMap.get(terminalId);
    if (!node) return;
    
    // Remove from tree
    this.removeNodeFromTree(this.rootNode, node);
    
    // Remove mapping
    this.terminalNodeMap.delete(terminalId);
    
    // Re-render
    this.render();
  }
  
  /**
   * Switch to vertical split layout
   */
  splitVertical() {
    console.log('[LayoutManager] Switching to vertical split');
    
    if (this.layoutMode === 'split-vertical') return;
    
    // Get current terminals
    const terminals = Array.from(this.terminalNodeMap.values());
    if (terminals.length === 0) return;
    
    // Create split structure
    this.layoutMode = 'split-vertical';
    this.rootNode = {
      type: 'split',
      direction: 'vertical',
      children: [],
      sizes: [0.5, 0.5] // 50-50 split
    };
    
    // Add up to 2 terminals to the split
    if (terminals[0]) {
      this.rootNode.children[0] = terminals[0];
    }
    
    if (terminals[1]) {
      this.rootNode.children[1] = terminals[1];
    } else {
      // Create a new terminal for the second pane
      this.terminalManager.createTerminal();
      return; // Will re-render when terminal is added
    }
    
    this.render();
  }
  
  /**
   * Switch to horizontal split layout
   */
  splitHorizontal() {
    console.log('[LayoutManager] Switching to horizontal split');
    
    if (this.layoutMode === 'split-horizontal') return;
    
    // Similar to vertical but with horizontal direction
    const terminals = Array.from(this.terminalNodeMap.values());
    if (terminals.length === 0) return;
    
    this.layoutMode = 'split-horizontal';
    this.rootNode = {
      type: 'split',
      direction: 'horizontal',
      children: [],
      sizes: [0.5, 0.5]
    };
    
    if (terminals[0]) {
      this.rootNode.children[0] = terminals[0];
    }
    
    if (terminals[1]) {
      this.rootNode.children[1] = terminals[1];
    } else {
      this.terminalManager.createTerminal();
      return;
    }
    
    this.render();
  }
  
  /**
   * Switch back to tabs layout
   */
  switchToTabs() {
    console.log('[LayoutManager] Switching to tabs');
    
    if (this.layoutMode === 'tabs') return;
    
    this.layoutMode = 'tabs';
    this.rootNode = {
      type: 'tabs',
      children: Array.from(this.terminalNodeMap.values()),
      activeIndex: 0
    };
    
    this.render();
  }
  
  /**
   * Select a terminal by ID
   */
  selectTerminal(terminalId) {
    if (this.layoutMode === 'tabs') {
      // Find index of terminal
      const index = this.rootNode.children.findIndex(
        node => node.terminalId === terminalId
      );
      if (index >= 0) {
        this.rootNode.activeIndex = index;
        this.render();
      }
    }
    
    // Notify terminal manager
    this.terminalManager.focusTerminal(terminalId);
  }
  
  /**
   * Render the current layout
   */
  render() {
    console.log('[LayoutManager] Rendering layout:', this.layoutMode);
    
    // Update button visibility
    if (this.splitVBtn && this.splitHBtn && this.tabBtn) {
      if (this.layoutMode === 'tabs') {
        this.splitVBtn.style.display = '';
        this.splitHBtn.style.display = '';
        this.tabBtn.style.display = 'none';
      } else {
        this.splitVBtn.style.display = 'none';
        this.splitHBtn.style.display = 'none';
        this.tabBtn.style.display = '';
      }
    }
    
    // Show/hide appropriate containers
    if (this.layoutMode === 'tabs') {
      this.tabsContent.style.display = 'block';
      this.splitContainer.style.display = 'none';
      this.renderTabs();
    } else {
      this.tabsContent.style.display = 'none';
      this.splitContainer.style.display = 'grid';
      this.renderSplit();
    }
    
    // Trigger resize for all visible terminals
    this.resizeVisibleTerminals();
  }
  
  /**
   * Render tabs layout
   */
  renderTabs() {
    // Clear existing tabs
    this.tabsContainer.innerHTML = '';
    this.tabsContent.innerHTML = '';
    
    // Create tabs
    this.rootNode.children.forEach((node, index) => {
      // Tab button
      const tab = document.createElement('div');
      tab.className = 'tab';
      if (index === this.rootNode.activeIndex) {
        tab.classList.add('active');
      }
      tab.dataset.terminalId = node.terminalId;
      tab.innerHTML = `
        <span class="tab-title">Terminal ${node.terminalId.split('-')[1]}</span>
        <span class="tab-close" data-terminal-id="${node.terminalId}">×</span>
      `;
      this.tabsContainer.appendChild(tab);
      
      // Terminal wrapper
      const wrapper = node.wrapper;
      wrapper.style.display = index === this.rootNode.activeIndex ? 'block' : 'none';
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.right = '0';
      wrapper.style.bottom = '0';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.classList.toggle('active', index === this.rootNode.activeIndex);
      this.tabsContent.appendChild(wrapper);
    });
  }
  
  /**
   * Render split layout
   */
  renderSplit() {
    const { direction, children, sizes } = this.rootNode;
    
    // Clear split container
    this.splitContainer.innerHTML = '';
    
    // Set grid template
    if (direction === 'vertical') {
      this.splitContainer.style.gridTemplateColumns = `${sizes[0]}fr 4px ${sizes[1]}fr`;
      this.splitContainer.style.gridTemplateRows = '1fr';
    } else {
      this.splitContainer.style.gridTemplateColumns = '1fr';
      this.splitContainer.style.gridTemplateRows = `${sizes[0]}fr 4px ${sizes[1]}fr`;
    }
    
    // Add first pane
    if (children[0]) {
      const pane1 = this.createPane(children[0]);
      this.splitContainer.appendChild(pane1);
    }
    
    // Add splitter
    const splitter = document.createElement('div');
    splitter.className = `layout-splitter layout-splitter-${direction}`;
    this.splitContainer.appendChild(splitter);
    
    // Add second pane
    if (children[1]) {
      const pane2 = this.createPane(children[1]);
      this.splitContainer.appendChild(pane2);
    }
    
    // Hide tabs content when in split mode
    const tabsContent = this.tabsContainer.querySelector('.tabs-content');
    tabsContent.style.display = 'none';
  }
  
  /**
   * Create a pane for split layout
   */
  createPane(node) {
    const pane = document.createElement('div');
    pane.className = 'layout-pane';
    
    if (node.type === 'terminal') {
      // Move terminal wrapper to pane
      const wrapper = node.wrapper;
      wrapper.style.display = 'block';
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      pane.appendChild(wrapper);
    }
    
    return pane;
  }
  
  /**
   * Resize all visible terminals
   */
  resizeVisibleTerminals() {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      this.terminalNodeMap.forEach((node, terminalId) => {
        const wrapper = node.wrapper;
        if (wrapper && wrapper.offsetParent !== null) {
          // Terminal is visible
          const session = this.terminalManager.terminals.get(terminalId);
          if (session && session.fitAddon) {
            try {
              session.fitAddon.fit();
              // Force terminal refresh after fit
              if (session.terminal) {
                session.terminal.refresh(0, session.terminal.rows - 1);
              }
            } catch (error) {
              console.warn('[LayoutManager] Failed to fit terminal:', error);
            }
          }
        }
      });
    }, 50); // Increased delay to ensure DOM is fully updated
  }
  
  /**
   * Add node to split layout
   */
  addToSplitLayout(node) {
    // Find empty slot or create nested split
    if (!this.rootNode.children[0]) {
      this.rootNode.children[0] = node;
    } else if (!this.rootNode.children[1]) {
      this.rootNode.children[1] = node;
    } else {
      // Need to create nested split (future enhancement)
      console.warn('[LayoutManager] Split layout full, adding as tab');
      this.switchToTabs();
      this.rootNode.children.push(node);
    }
  }
  
  /**
   * Remove node from tree recursively
   */
  removeNodeFromTree(parent, nodeToRemove) {
    if (parent.children) {
      const index = parent.children.indexOf(nodeToRemove);
      if (index >= 0) {
        parent.children.splice(index, 1);
        
        // Adjust active index if needed
        if (parent.type === 'tabs' && parent.activeIndex >= parent.children.length) {
          parent.activeIndex = Math.max(0, parent.children.length - 1);
        }
        
        return true;
      }
      
      // Recursively search in children
      for (const child of parent.children) {
        if (this.removeNodeFromTree(child, nodeToRemove)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Get current layout state for persistence
   */
  getLayoutState() {
    return {
      mode: this.layoutMode,
      tree: this.serializeNode(this.rootNode)
    };
  }
  
  /**
   * Serialize a node for storage
   */
  serializeNode(node) {
    const serialized = {
      type: node.type,
      id: node.id
    };
    
    if (node.type === 'terminal') {
      serialized.terminalId = node.terminalId;
    } else if (node.type === 'split') {
      serialized.direction = node.direction;
      serialized.sizes = node.sizes;
      serialized.children = node.children.map(child => this.serializeNode(child));
    } else if (node.type === 'tabs') {
      serialized.activeIndex = node.activeIndex;
      serialized.children = node.children.map(child => this.serializeNode(child));
    }
    
    return serialized;
  }
}