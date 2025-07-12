/**
 * Message Center Application - Main entry point
 * Integrates Command Intelligence Hub with existing message functionality
 */

import { CommandIntelligenceHub } from './components/CommandIntelligence/dist/CommandIntelligenceHub.js';

// Global state
const state = {
  currentView: 'intelligence',
  messages: [],
  commandExecutions: [],
  routes: [],
  statistics: {
    global: {
      totalCommands: 0,
      successCount: 0,
      errorCount: 0,
      totalDuration: 0
    }
  }
};

// IPC service wrapper for React components
const ipcService = {
  invoke: async (channel, ...args) => {
    console.log('[IPC Service] Invoking:', channel, args);
    if (!window.messageCenterAPI) {
      console.error('[IPC Service] messageCenterAPI not found!');
      throw new Error('messageCenterAPI not available');
    }
    try {
      const result = await window.messageCenterAPI.invoke(channel, ...args);
      console.log('[IPC Service] Result:', result);
      return result;
    } catch (error) {
      console.error('[IPC Service] Error:', error);
      throw error;
    }
  },
  
  send: (channel, ...args) => {
    window.messageCenterAPI.send(channel, ...args);
  },
  
  on: (channel, listener) => {
    window.messageCenterAPI.on(channel, listener);
  },
  
  off: (channel, listener) => {
    window.messageCenterAPI.off(channel, listener);
  }
};

// Initialize the application
function initializeApp() {
  console.log('[MessageCenterApp] Initializing...');
  
  // Set up view switching
  setupViewSwitching();
  
  // Set up message functionality
  setupMessageHandlers();
  
  // Mount React component for Command Intelligence
  mountCommandIntelligence();
  
  // Set up IPC listeners
  setupIPCListeners();
  
  // Request initial data
  requestInitialData();
}

// Set up view switching between Intelligence and Messages
function setupViewSwitching() {
  const mainTabs = document.querySelectorAll('.main-tab');
  const viewContainers = {
    intelligence: document.getElementById('intelligence-view'),
    messages: document.getElementById('messages-view')
  };
  
  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      
      // Update active states
      mainTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show/hide views
      Object.entries(viewContainers).forEach(([key, container]) => {
        if (key === view) {
          container.style.display = 'block';
          container.classList.add('active');
        } else {
          container.style.display = 'none';
          container.classList.remove('active');
        }
      });
      
      state.currentView = view;
      updateStatusInfo();
    });
  });
}

// Mount the Command Intelligence React component
function mountCommandIntelligence() {
  const root = document.getElementById('command-intelligence-root');
  if (!root) {
    console.error('[MessageCenterApp] command-intelligence-root element not found!');
    return;
  }
  
  console.log('[MessageCenterApp] Mounting Command Intelligence Hub');
  console.log('[MessageCenterApp] React available:', typeof React !== 'undefined');
  console.log('[MessageCenterApp] ReactDOM available:', typeof ReactDOM !== 'undefined');
  console.log('[MessageCenterApp] CommandIntelligenceHub available:', typeof CommandIntelligenceHub !== 'undefined');
  
  try {
    // Create React element
    const element = React.createElement(CommandIntelligenceHub, {
      ipcService: ipcService
    });
    
    // Render using React 18 API
    if (ReactDOM.createRoot) {
      const reactRoot = ReactDOM.createRoot(root);
      reactRoot.render(element);
    } else {
      // Fallback to React 17
      ReactDOM.render(element, root);
    }
    console.log('[MessageCenterApp] Successfully mounted Command Intelligence Hub');
  } catch (error) {
    console.error('[MessageCenterApp] Failed to mount Command Intelligence Hub:', error);
  }
}

// Set up message-related handlers (legacy functionality)
function setupMessageHandlers() {
  // Filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const filter = tab.dataset.filter;
      filterMessages(filter);
    });
  });
  
  // Clear history button
  document.getElementById('clear-history').addEventListener('click', () => {
    if (confirm('すべての履歴をクリアしますか？')) {
      if (state.currentView === 'intelligence') {
        ipcService.send('command:clear-history');
      } else {
        ipcService.send('message:clear-history');
      }
    }
  });
  
  // Refresh button
  document.getElementById('refresh-data').addEventListener('click', () => {
    requestInitialData();
  });
  
  // Message composer
  const targetSelector = document.getElementById('target-selector');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  
  targetSelector.addEventListener('change', () => {
    sendBtn.disabled = !targetSelector.value || !messageInput.value.trim();
  });
  
  messageInput.addEventListener('input', () => {
    sendBtn.disabled = !targetSelector.value || !messageInput.value.trim();
  });
  
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) {
      sendMessage();
    }
  });
  
  sendBtn.addEventListener('click', sendMessage);
}

// Set up IPC event listeners
function setupIPCListeners() {
  // Message events
  ipcService.on('message:new', (event, message) => {
    state.messages.unshift(message);
    if (state.currentView === 'messages') {
      renderMessage(message, true);
    }
    updateStatusInfo();
  });
  
  ipcService.on('history:load', (event, data) => {
    state.messages = data.messages || [];
    state.routes = data.routes || [];
    updateRoutes();
    if (state.currentView === 'messages') {
      renderAllMessages();
    }
    updateStatusInfo();
  });
  
  ipcService.on('history:clear', () => {
    state.messages = [];
    if (state.currentView === 'messages') {
      document.getElementById('message-list').innerHTML = '';
    }
    updateStatusInfo();
  });
  
  ipcService.on('routes:update', (event, routes) => {
    state.routes = routes;
    updateRoutes();
  });
  
  // Command execution events (handled by React component)
  ipcService.on('command:execution-added', (event, execution) => {
    state.commandExecutions.unshift(execution);
    updateStatusInfo();
  });
  
  ipcService.on('command:history-cleared', () => {
    state.commandExecutions = [];
    updateStatusInfo();
  });
  
  // Statistics updates
  ipcService.on('statistics-updated', (event, stats) => {
    state.statistics = stats;
    updateStatusInfo();
  });
}

// Request initial data from main process
async function requestInitialData() {
  try {
    console.log('[MessageCenterApp] Requesting initial data...');
    
    // Request message history
    ipcService.send('message:request-history');
    
    // Request command executions and statistics
    const [execResult, statsResult] = await Promise.all([
      ipcService.invoke('command:get-executions', {}),
      ipcService.invoke('command:get-statistics', {})
    ]);
    
    console.log('[MessageCenterApp] Command executions result:', execResult);
    console.log('[MessageCenterApp] Statistics result:', statsResult);
    
    if (execResult && execResult.success) {
      state.commandExecutions = execResult.data || [];
      console.log('[MessageCenterApp] Loaded', state.commandExecutions.length, 'command executions');
    }
    
    if (statsResult && statsResult.success) {
      state.statistics = statsResult.data || state.statistics;
      console.log('[MessageCenterApp] Loaded statistics:', state.statistics);
    }
    
    updateStatusInfo();
  } catch (error) {
    console.error('[MessageCenterApp] Failed to load initial data:', error);
  }
}

// Update status information in header
function updateStatusInfo() {
  const commandCount = document.getElementById('command-count');
  const messageCount = document.getElementById('message-count');
  
  commandCount.textContent = `${state.commandExecutions.length} commands`;
  messageCount.textContent = `${state.messages.length} messages`;
  
  // Update empty state
  const hasData = state.commandExecutions.length > 0 || state.messages.length > 0;
  document.getElementById('empty-state').style.display = hasData ? 'none' : 'flex';
}

// Update terminal routes in selector
function updateRoutes() {
  const selector = document.getElementById('target-selector');
  
  // Clear existing options except first two
  while (selector.options.length > 2) {
    selector.remove(2);
  }
  
  // Add route options
  state.routes.forEach(route => {
    const option = document.createElement('option');
    option.value = route.id;
    option.textContent = `${route.terminalName} (Window ${route.windowId})`;
    selector.appendChild(option);
  });
}

// Filter messages by type
function filterMessages(filter) {
  const messageList = document.getElementById('message-list');
  const messages = messageList.querySelectorAll('.message-item');
  
  messages.forEach(msg => {
    const type = msg.dataset.type;
    const shouldShow = filter === 'all' || 
                      (filter === 'notifications' && (type === 'notification' || type === 'command-notification')) ||
                      (filter === 'messages' && type === 'terminal-message') ||
                      (filter === 'errors' && (type === 'error' || msg.dataset.error === 'true'));
    
    msg.style.display = shouldShow ? 'flex' : 'none';
  });
}

// Render a single message
function renderMessage(message, prepend = false) {
  const messageList = document.getElementById('message-list');
  
  const messageEl = document.createElement('div');
  messageEl.className = 'message-item';
  messageEl.dataset.type = message.type;
  messageEl.dataset.error = message.data && message.data.exitCode !== 0 ? 'true' : 'false';
  
  // Icon based on type
  let icon = '';
  if (message.type === 'notification' || message.type === 'command-notification') {
    icon = '<i class="codicon codicon-bell"></i>';
  } else if (message.type === 'terminal-message') {
    icon = '<i class="codicon codicon-comment"></i>';
  } else if (message.type === 'error' || (message.data && message.data.exitCode !== 0)) {
    icon = '<i class="codicon codicon-error"></i>';
  } else {
    icon = '<i class="codicon codicon-info"></i>';
  }
  
  // Format timestamp
  const timestamp = new Date(message.timestamp).toLocaleTimeString('ja-JP');
  
  // Build content
  let content = '';
  if (message.data) {
    if (message.data.command) {
      content = `<code>${message.data.command}</code>`;
    } else if (message.data.message) {
      content = message.data.message;
    }
  } else if (message.notification) {
    content = `<strong>${message.notification.title}</strong>: ${message.notification.body}`;
  } else {
    content = message.content || 'No content';
  }
  
  // Source info
  let source = '';
  if (message.source) {
    source = `<span class="message-source">${message.source.terminalName || 'Terminal'}</span>`;
  }
  
  messageEl.innerHTML = `
    <div class="message-icon">${icon}</div>
    <div class="message-content">
      <div class="message-header">
        ${source}
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-body">${content}</div>
    </div>
  `;
  
  if (prepend) {
    messageList.prepend(messageEl);
  } else {
    messageList.appendChild(messageEl);
  }
}

// Render all messages
function renderAllMessages() {
  const messageList = document.getElementById('message-list');
  messageList.innerHTML = '';
  
  state.messages.forEach(message => {
    renderMessage(message, false);
  });
}

// Send a message
function sendMessage() {
  const targetSelector = document.getElementById('target-selector');
  const messageInput = document.getElementById('message-input');
  
  const target = targetSelector.value;
  const message = messageInput.value.trim();
  
  if (!target || !message) return;
  
  if (target === 'broadcast') {
    ipcService.send('message:broadcast', { content: message });
  } else {
    const [windowId, terminalId] = target.split('-');
    ipcService.send('message:send', {
      targetWindowId: parseInt(windowId),
      targetTerminalId: terminalId,
      message: { content: message }
    });
  }
  
  // Clear input
  messageInput.value = '';
  document.getElementById('send-btn').disabled = true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}