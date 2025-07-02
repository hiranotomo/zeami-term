/**
 * FileExplorer - macOS-style file explorer sidebar component
 */

export class FileExplorer {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.container = null;
    this.treeContainer = null;
    this.isVisible = false;
    this.currentPath = null;
    this.fileTree = new Map();
    this.expandedFolders = new Set();
    this.selectedItem = null;
    
    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.updatePath = this.updatePath.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleItemDoubleClick = this.handleItemDoubleClick.bind(this);
  }

  init() {
    this.createDOM();
    this.setupEventListeners();
    this.applyStyles();
  }

  createDOM() {
    // Main container
    this.container = document.createElement('div');
    this.container.className = 'file-explorer';
    this.container.id = 'file-explorer';
    
    // Header
    const header = document.createElement('div');
    header.className = 'file-explorer-header';
    header.innerHTML = `
      <div class="file-explorer-title">Files</div>
      <div class="file-explorer-path" id="file-explorer-path" title="">~/</div>
    `;
    
    // Search bar
    const searchBar = document.createElement('div');
    searchBar.className = 'file-explorer-search';
    searchBar.innerHTML = `
      <input type="text" class="file-explorer-search-input" placeholder="Search files..." />
    `;
    
    // Tree container
    this.treeContainer = document.createElement('div');
    this.treeContainer.className = 'file-explorer-tree';
    
    // Loading indicator
    const loading = document.createElement('div');
    loading.className = 'file-explorer-loading';
    loading.innerHTML = 'Loading...';
    loading.style.display = 'none';
    
    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(searchBar);
    this.container.appendChild(this.treeContainer);
    this.container.appendChild(loading);
    
    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'file-explorer-resize-handle';
    this.container.appendChild(resizeHandle);
    
    // Insert into DOM (hidden by default)
    // Add to body to avoid interfering with the main app layout
    document.body.appendChild(this.container);
  }

  applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .file-explorer {
        position: fixed;
        left: 0;
        top: 97px; /* Below titlebar (32px) + header (65px) */
        bottom: 24px; /* Above status bar */
        width: 250px;
        background-color: var(--vscode-sideBar-background);
        border-right: 1px solid var(--vscode-panel-border);
        display: flex;
        flex-direction: column;
        transform: translateX(-100%);
        transition: transform 0.2s ease-out;
        z-index: 10;
        pointer-events: none;
      }
      
      .file-explorer.visible {
        transform: translateX(0);
        pointer-events: auto;
      }
      
      .file-explorer-header {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--vscode-panel-border);
        user-select: none;
      }
      
      .file-explorer-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        opacity: 0.8;
      }
      
      .file-explorer-path {
        font-size: 12px;
        color: var(--vscode-foreground);
        opacity: 0.7;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 4px 8px;
        background-color: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        cursor: default;
      }
      
      .file-explorer-path:hover {
        opacity: 1;
      }
      
      .file-explorer-actions {
        display: flex;
        gap: 4px;
      }
      
      .file-explorer-action {
        background: none;
        border: none;
        color: var(--vscode-foreground);
        padding: 4px;
        cursor: pointer;
        opacity: 0.6;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .file-explorer-action:hover {
        opacity: 1;
        background-color: var(--vscode-toolbar-hoverBackground);
      }
      
      .file-explorer-search {
        padding: 8px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      
      .file-explorer-search-input {
        width: 100%;
        padding: 4px 8px;
        background-color: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        color: var(--vscode-input-foreground);
        border-radius: 3px;
        font-size: 12px;
        outline: none;
      }
      
      .file-explorer-search-input:focus {
        border-color: var(--vscode-focusBorder);
      }
      
      .file-explorer-tree {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 4px 0;
      }
      
      .file-explorer-item {
        display: flex;
        align-items: center;
        padding: 2px 8px;
        cursor: pointer;
        user-select: none;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .file-explorer-item:hover {
        background-color: var(--vscode-list-hoverBackground);
      }
      
      .file-explorer-item.selected {
        background-color: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
      }
      
      .file-explorer-item-icon {
        width: 16px;
        height: 16px;
        margin-right: 6px;
        flex-shrink: 0;
      }
      
      .file-explorer-item-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .file-explorer-folder > .file-explorer-item-icon {
        transition: transform 0.1s;
      }
      
      .file-explorer-folder.expanded > .file-explorer-item > .file-explorer-item-icon {
        transform: rotate(90deg);
      }
      
      .file-explorer-children {
        display: none;
      }
      
      .file-explorer-folder.expanded > .file-explorer-children {
        display: block;
      }
      
      .file-explorer-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: 0;
        width: 4px;
        cursor: col-resize;
        background-color: transparent;
      }
      
      .file-explorer-resize-handle:hover {
        background-color: var(--vscode-focusBorder);
      }
      
      .file-explorer-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--vscode-foreground);
        opacity: 0.6;
        font-size: 12px;
      }
      
      /* Adjust terminal container when file explorer is visible */
      .terminal-container-wrapper {
        display: flex;
        position: relative;
        height: 100%;
      }
      
      #terminal-container {
        flex: 1;
        transition: margin-left 0.2s ease-out;
      }
      
      #terminal-container.file-explorer-visible {
        margin-left: 250px;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Toggle visibility with Cmd+1
    document.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === '1') {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // Search functionality
    const searchInput = this.container.querySelector('.file-explorer-search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterTree(e.target.value);
    });
    
    // Action buttons
    this.container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        this.handleAction(action.dataset.action);
      }
    });
    
    // Resize handle
    const resizeHandle = this.container.querySelector('.file-explorer-resize-handle');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.container.offsetWidth;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const width = Math.max(150, Math.min(500, startWidth + e.clientX - startX));
      this.container.style.width = width + 'px';
      document.getElementById('terminal-container').style.marginLeft = width + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.cursor = '';
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
    return this.isVisible;
  }

  show() {
    this.isVisible = true;
    this.container.classList.add('visible');
    document.getElementById('terminal-container').classList.add('file-explorer-visible');
    
    // Update file tree for current terminal
    const activeTerminal = this.terminalManager.terminals.get(this.terminalManager.activeTerminalId);
    if (activeTerminal && activeTerminal.cwd) {
      this.updatePath(activeTerminal.cwd);
    }
  }

  hide() {
    this.isVisible = false;
    this.container.classList.remove('visible');
    document.getElementById('terminal-container').classList.remove('file-explorer-visible');
  }

  async updatePath(path) {
    if (this.currentPath === path) return;
    
    this.currentPath = path;
    this.showLoading(true);
    
    // Update path display
    const pathElement = document.getElementById('file-explorer-path');
    if (pathElement) {
      // Convert home directory to ~
      const displayPath = path.replace(process.env.HOME || '/Users/' + process.env.USER, '~');
      pathElement.textContent = displayPath;
      pathElement.title = path; // Show full path on hover
    }
    
    try {
      const files = await this.loadDirectory(path);
      this.renderTree(files, path);
    } catch (error) {
      console.error('[FileExplorer] Failed to load directory:', error);
      this.showError('Failed to load directory');
    } finally {
      this.showLoading(false);
    }
  }

  async loadDirectory(path) {
    // Request directory listing from main process
    const result = await window.electronAPI.listDirectory(path);
    if (result.success) {
      return result.files;
    } else {
      throw new Error(result.error);
    }
  }

  renderTree(files, basePath) {
    this.treeContainer.innerHTML = '';
    this.fileTree.clear();
    
    // Sort files: folders first, then alphabetically
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Render each file/folder
    files.forEach(file => {
      const item = this.createTreeItem(file, basePath);
      this.treeContainer.appendChild(item);
      this.fileTree.set(file.path, file);
    });
  }

  createTreeItem(file, basePath) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = file.isDirectory ? 'file-explorer-folder' : 'file-explorer-file';
    itemWrapper.dataset.path = file.path;
    
    const item = document.createElement('div');
    item.className = 'file-explorer-item';
    item.dataset.path = file.path;
    
    // Icon
    const icon = document.createElement('div');
    icon.className = 'file-explorer-item-icon';
    icon.innerHTML = file.isDirectory ? this.getFolderIcon() : this.getFileIcon(file.name);
    
    // Name
    const name = document.createElement('div');
    name.className = 'file-explorer-item-name';
    name.textContent = file.name;
    
    item.appendChild(icon);
    item.appendChild(name);
    itemWrapper.appendChild(item);
    
    // Event handlers
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleItemClick(file, itemWrapper);
    });
    
    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.handleItemDoubleClick(file);
    });
    
    // Context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(file, e.clientX, e.clientY);
    });
    
    // Drag and drop
    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', file.path);
    });
    
    // Children container for folders
    if (file.isDirectory) {
      const children = document.createElement('div');
      children.className = 'file-explorer-children';
      children.style.paddingLeft = '20px';
      itemWrapper.appendChild(children);
    }
    
    return itemWrapper;
  }

  handleItemClick(file, element) {
    // Select item
    this.container.querySelectorAll('.file-explorer-item').forEach(item => {
      item.classList.remove('selected');
    });
    element.querySelector('.file-explorer-item').classList.add('selected');
    this.selectedItem = file;
    
    // Toggle folder expansion
    if (file.isDirectory) {
      element.classList.toggle('expanded');
      if (element.classList.contains('expanded') && !this.expandedFolders.has(file.path)) {
        this.expandedFolders.add(file.path);
        this.loadFolderContents(file, element);
      } else {
        this.expandedFolders.delete(file.path);
      }
    }
  }

  async loadFolderContents(folder, element) {
    const childrenContainer = element.querySelector('.file-explorer-children');
    childrenContainer.innerHTML = 'Loading...';
    
    try {
      const files = await this.loadDirectory(folder.path);
      childrenContainer.innerHTML = '';
      
      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      files.forEach(file => {
        const item = this.createTreeItem(file, folder.path);
        childrenContainer.appendChild(item);
      });
    } catch (error) {
      childrenContainer.innerHTML = 'Error loading folder';
    }
  }

  handleItemDoubleClick(file) {
    if (file.isDirectory) {
      // Change directory in terminal
      const command = `cd "${file.path.replace(/"/g, '\\"')}"`;
      this.terminalManager.sendToActiveTerminal(command + '\n');
    } else {
      // Open file in default editor (could be customized)
      window.electronAPI.openExternal(file.path);
    }
  }

  handleAction(action) {
    switch (action) {
      case 'refresh':
        if (this.currentPath) {
          this.updatePath(this.currentPath);
        }
        break;
      case 'new-file':
        this.createNewFile();
        break;
      case 'new-folder':
        this.createNewFolder();
        break;
    }
  }

  showContextMenu(file, x, y) {
    // TODO: Implement context menu
    console.log('[FileExplorer] Context menu for:', file.path);
  }

  filterTree(searchTerm) {
    const term = searchTerm.toLowerCase();
    this.container.querySelectorAll('.file-explorer-item').forEach(item => {
      const name = item.querySelector('.file-explorer-item-name').textContent.toLowerCase();
      const matches = name.includes(term);
      item.parentElement.style.display = matches ? '' : 'none';
    });
  }

  showLoading(show) {
    this.container.querySelector('.file-explorer-loading').style.display = show ? 'block' : 'none';
  }

  showError(message) {
    this.treeContainer.innerHTML = `<div style="padding: 20px; text-align: center; opacity: 0.6;">${message}</div>`;
  }

  getFolderIcon() {
    return `<svg width="16" height="16" viewBox="0 0 16 16">
      <path fill="currentColor" d="M2.5 2h4l1.5 1.5H13c.827 0 1.5.673 1.5 1.5v7.5c0 .827-.673 1.5-1.5 1.5H2.5c-.827 0-1.5-.673-1.5-1.5v-9c0-.827.673-1.5 1.5-1.5z"/>
    </svg>`;
  }

  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      js: '#f7df1e',
      ts: '#3178c6',
      jsx: '#61dafb',
      tsx: '#61dafb',
      json: '#f7df1e',
      md: '#083fa1',
      html: '#e34c26',
      css: '#1572b6',
      py: '#3776ab',
      sh: '#89e051',
      yml: '#cb171e',
      yaml: '#cb171e'
    };
    
    const color = iconMap[ext] || '#888';
    
    return `<svg width="16" height="16" viewBox="0 0 16 16">
      <path fill="${color}" d="M9 1H3.5C2.673 1 2 1.673 2 2.5v11c0 .827.673 1.5 1.5 1.5h9c.827 0 1.5-.673 1.5-1.5V6l-5-5zm0 1.5L12.5 6H9V2.5z"/>
    </svg>`;
  }

  createNewFile() {
    // TODO: Implement new file creation
    console.log('[FileExplorer] Create new file');
  }

  createNewFolder() {
    // TODO: Implement new folder creation
    console.log('[FileExplorer] Create new folder');
  }
}