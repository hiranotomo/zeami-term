/**
 * Message Center UI Controller
 */

class MessageCenterUI {
  constructor() {
    this.messageList = document.getElementById('message-list');
    this.messageCount = document.getElementById('message-count');
    this.filterTabs = document.querySelectorAll('.filter-tab');
    this.targetSelector = document.getElementById('target-selector');
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-btn');
    this.clearButton = document.getElementById('clear-history');
    this.emptyState = document.getElementById('empty-state');
    
    this.currentFilter = 'all';
    this.messages = [];
    this.routes = [];
    
    this.setupEventListeners();
    this.setupIPCListeners();
    this.requestInitialData();
  }
  
  setupEventListeners() {
    // Filter tabs
    this.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.setFilter(tab.dataset.filter);
      });
    });
    
    // Send button
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // Enter key in message input
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    
    // Enable/disable send button based on input
    this.messageInput.addEventListener('input', () => {
      this.updateSendButton();
    });
    
    this.targetSelector.addEventListener('change', () => {
      this.updateSendButton();
    });
    
    // Clear history button
    this.clearButton.addEventListener('click', async () => {
      if (confirm('すべてのメッセージ履歴を削除しますか？')) {
        await window.messageCenterAPI.clearHistory();
        this.messages = [];
        this.updateDisplay();
      }
    });
  }
  
  setupIPCListeners() {
    // New message
    window.messageCenterAPI.onNewMessage((message) => {
      this.addMessage(message);
    });
    
    // History load
    window.messageCenterAPI.onHistoryLoad((data) => {
      this.messages = data.messages || [];
      this.routes = data.routes || [];
      this.updateRoutes();
      this.updateDisplay();
    });
    
    // Routes update
    window.messageCenterAPI.onRoutesUpdate((routes) => {
      this.routes = routes;
      this.updateRoutes();
    });
    
    // History clear
    window.messageCenterAPI.onHistoryClear(() => {
      this.messages = [];
      this.updateDisplay();
    });
  }
  
  requestInitialData() {
    window.messageCenterAPI.requestInitialData();
  }
  
  setFilter(filter) {
    this.currentFilter = filter;
    
    // Update tab active state
    this.filterTabs.forEach(tab => {
      if (tab.dataset.filter === filter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    this.updateDisplay();
  }
  
  updateDisplay() {
    // Filter messages
    const filteredMessages = this.filterMessages(this.messages);
    
    // Clear and rebuild list
    this.messageList.innerHTML = '';
    
    if (filteredMessages.length === 0) {
      this.emptyState.style.display = 'block';
      this.messageList.style.display = 'none';
    } else {
      this.emptyState.style.display = 'none';
      this.messageList.style.display = 'block';
      
      filteredMessages.forEach(message => {
        this.messageList.appendChild(this.createMessageElement(message));
      });
    }
    
    // Update count
    this.messageCount.textContent = `${filteredMessages.length} messages`;
  }
  
  filterMessages(messages) {
    switch (this.currentFilter) {
      case 'notifications':
        return messages.filter(m => 
          m.type === 'notification' || 
          m.type === 'command-notification' ||
          m.type === 'zeami-cli-notification'
        );
      case 'messages':
        return messages.filter(m => 
          m.type === 'terminal-message' || 
          m.type === 'broadcast'
        );
      case 'errors':
        return messages.filter(m => 
          m.type === 'error' || 
          (m.data && m.data.exitCode && m.data.exitCode !== 0)
        );
      default:
        return messages;
    }
  }
  
  addMessage(message) {
    this.messages.unshift(message);
    
    // Check if message matches current filter
    const filtered = this.filterMessages([message]);
    if (filtered.length > 0) {
      const element = this.createMessageElement(message);
      this.messageList.insertBefore(element, this.messageList.firstChild);
      
      // Update empty state
      if (this.messageList.children.length > 0) {
        this.emptyState.style.display = 'none';
        this.messageList.style.display = 'block';
      }
      
      // Update count
      const currentCount = this.filterMessages(this.messages).length;
      this.messageCount.textContent = `${currentCount} messages`;
    }
  }
  
  createMessageElement(message) {
    const div = document.createElement('div');
    div.className = `message-item ${message.type}`;
    
    // Add error indicator
    if (message.data && message.data.exitCode && message.data.exitCode !== 0) {
      div.setAttribute('data-error', 'true');
    }
    
    div.innerHTML = `
      <div class="message-header">
        <span class="source">${this.formatSource(message.source)}</span>
        <span class="timestamp">${this.formatTime(message.timestamp)}</span>
      </div>
      <div class="message-body">
        ${this.formatMessageBody(message)}
      </div>
      <div class="message-actions">
        ${this.getMessageActions(message)}
      </div>
    `;
    
    // Add event listeners for actions
    const replyBtn = div.querySelector('.reply-btn');
    if (replyBtn) {
      replyBtn.addEventListener('click', () => {
        this.replyTo(replyBtn.dataset.windowId, replyBtn.dataset.terminalId);
      });
    }
    
    const resendBtn = div.querySelector('.resend-btn');
    if (resendBtn) {
      resendBtn.addEventListener('click', () => {
        this.resendNotification(resendBtn.dataset.messageId);
      });
    }
    
    return div;
  }
  
  formatSource(source) {
    if (!source) return 'System';
    
    if (source.terminalId && source.terminalName) {
      return `📺 ${source.terminalName}`;
    } else if (source.terminalId) {
      return `📺 Window ${source.windowId} - Terminal ${source.terminalId}`;
    } else if (source.windowId) {
      return `🪟 Window ${source.windowId}`;
    }
    
    return 'System';
  }
  
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    // Otherwise show date and time
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  formatMessageBody(message) {
    if (message.type === 'command-notification' && message.data) {
      const { command, duration, exitCode, isClaude } = message.data;
      const durationStr = duration ? `(${(duration / 1000).toFixed(1)}秒)` : '';
      const status = exitCode === 0 ? '✅ 成功' : `❌ 失敗 (exit code: ${exitCode})`;
      
      return `
        <div>
          ${isClaude ? '🤖 Claude Code: ' : ''}
          <code>${this.escapeHtml(command || 'Unknown command')}</code>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">
          ${status} ${durationStr}
        </div>
      `;
    }
    
    if (message.type === 'zeami-cli-notification' && message.data) {
      const { command, zeamiCommand, duration, exitCode, isClaude, cwd } = message.data;
      const durationStr = duration ? `(${(duration / 1000).toFixed(1)}秒)` : '';
      const status = exitCode === 0 ? '✅ 成功' : `❌ 失敗 (exit code: ${exitCode})`;
      
      return `
        <div>
          ${isClaude ? '🤖 Claude Code → ' : ''}
          <code>${this.escapeHtml(command || 'Unknown command')}</code>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: var(--text-secondary);">
          ${status} ${durationStr}
          ${cwd ? ` • 📁 ${this.escapeHtml(cwd)}` : ''}
        </div>
      `;
    }
    
    if (message.type === 'terminal-message' && message.content) {
      return `<div>💬 ${this.escapeHtml(message.content)}</div>`;
    }
    
    if (message.type === 'broadcast' && message.content) {
      return `<div>📢 ${this.escapeHtml(message.content)}</div>`;
    }
    
    if (message.notification) {
      return `
        <div><strong>${this.escapeHtml(message.notification.title)}</strong></div>
        <div style="margin-top: 4px;">${this.escapeHtml(message.notification.body)}</div>
      `;
    }
    
    if (message.body) {
      return this.escapeHtml(message.body);
    }
    
    return '<em>No content</em>';
  }
  
  getMessageActions(message) {
    const actions = [];
    
    // Reply button for terminal messages
    if (message.source && message.source.terminalId) {
      actions.push(`
        <button class="action-btn reply-btn" 
                data-window-id="${message.source.windowId}" 
                data-terminal-id="${message.source.terminalId}">
          返信
        </button>
      `);
    }
    
    // Resend notification button
    if (message.notification) {
      actions.push(`
        <button class="action-btn resend-btn" 
                data-message-id="${message.id}">
          通知を再送信
        </button>
      `);
    }
    
    return actions.join('');
  }
  
  updateRoutes() {
    // Clear existing options except the first two
    while (this.targetSelector.options.length > 2) {
      this.targetSelector.remove(2);
    }
    
    // Add routes
    this.routes.forEach(route => {
      const option = document.createElement('option');
      option.value = route.id;
      option.textContent = `📺 ${route.terminalName || `Window ${route.windowId} - Terminal ${route.terminalId}`}`;
      this.targetSelector.appendChild(option);
    });
  }
  
  updateSendButton() {
    const hasTarget = this.targetSelector.value !== '';
    const hasMessage = this.messageInput.value.trim() !== '';
    this.sendButton.disabled = !hasTarget || !hasMessage;
  }
  
  async sendMessage() {
    const target = this.targetSelector.value;
    const content = this.messageInput.value.trim();
    
    if (!target || !content) return;
    
    try {
      let result;
      
      if (target === 'broadcast') {
        result = await window.messageCenterAPI.broadcastMessage({
          content,
          source: { windowId: 'message-center' }
        });
      } else {
        // Parse target (format: "windowId-terminalId")
        const [windowId, terminalId] = target.split('-');
        result = await window.messageCenterAPI.sendToTerminal(
          parseInt(windowId),
          terminalId,
          {
            content,
            source: { windowId: 'message-center' }
          }
        );
      }
      
      if (result.success) {
        // Clear input
        this.messageInput.value = '';
        this.updateSendButton();
      } else {
        alert(`メッセージの送信に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('メッセージの送信中にエラーが発生しました');
    }
  }
  
  replyTo(windowId, terminalId) {
    // Set target selector
    const targetId = `${windowId}-${terminalId}`;
    for (let i = 0; i < this.targetSelector.options.length; i++) {
      if (this.targetSelector.options[i].value === targetId) {
        this.targetSelector.selectedIndex = i;
        break;
      }
    }
    
    // Focus message input
    this.messageInput.focus();
    this.updateSendButton();
  }
  
  async resendNotification(messageId) {
    try {
      const result = await window.messageCenterAPI.resendNotification(messageId);
      if (!result.success) {
        alert('通知の再送信に失敗しました');
      }
    } catch (error) {
      console.error('Failed to resend notification:', error);
      alert('通知の再送信中にエラーが発生しました');
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.messageCenterUI = new MessageCenterUI();
});