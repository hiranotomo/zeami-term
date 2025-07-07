/**
 * Paste debugging utility
 * Tracks and logs all paste-related events and data flow
 */
export class PasteDebugger {
  constructor() {
    this.enabled = true;
    this.events = [];
    this.maxEvents = 100;
    this.startTime = Date.now();
    
    // Create debug panel
    this.createDebugPanel();
  }
  
  createDebugPanel() {
    // Create floating debug panel
    const panel = document.createElement('div');
    panel.id = 'paste-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 400px;
      max-height: 300px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid #444;
      border-radius: 4px;
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      overflow-y: auto;
      z-index: 10000;
      padding: 10px;
      display: none;
    `;
    
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <strong>Paste Debugger</strong>
        <button id="paste-debug-close" style="background: none; border: none; color: #fff; cursor: pointer;">×</button>
      </div>
    `;
    panel.appendChild(header);
    
    const content = document.createElement('div');
    content.id = 'paste-debug-content';
    panel.appendChild(content);
    
    document.body.appendChild(panel);
    
    // Toggle with keyboard shortcut (Ctrl+Shift+P)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        this.toggle();
      }
    });
    
    // Close button
    document.getElementById('paste-debug-close').addEventListener('click', () => {
      this.hide();
    });
  }
  
  toggle() {
    const panel = document.getElementById('paste-debug-panel');
    if (panel.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
  
  show() {
    document.getElementById('paste-debug-panel').style.display = 'block';
    // Add initial message if no events
    if (this.events.length === 0) {
      this.log('info', 'Paste debugger started. Waiting for paste events...');
    }
    this.updateDisplay();
  }
  
  hide() {
    document.getElementById('paste-debug-panel').style.display = 'none';
  }
  
  log(type, message, data = {}) {
    if (!this.enabled) return;
    
    const timestamp = Date.now() - this.startTime;
    const event = {
      timestamp,
      type,
      message,
      data,
      time: new Date().toISOString()
    };
    
    this.events.push(event);
    
    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Log to console as well
    console.log(`[PasteDebug:${type}] ${message}`, data);
    
    // Update display if visible
    if (document.getElementById('paste-debug-panel').style.display !== 'none') {
      this.updateDisplay();
    }
  }
  
  updateDisplay() {
    const content = document.getElementById('paste-debug-content');
    if (!content) return;
    
    const html = this.events.map(event => {
      const color = this.getColorForType(event.type);
      const dataStr = Object.keys(event.data).length > 0 
        ? `\n  ${JSON.stringify(event.data, null, 2).replace(/\n/g, '\n  ')}`
        : '';
      
      return `<div style="margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 5px;">
        <span style="color: #888;">${event.timestamp}ms</span>
        <span style="color: ${color}; font-weight: bold;">[${event.type}]</span>
        ${event.message}${dataStr}
      </div>`;
    }).reverse().join('');
    
    content.innerHTML = html;
  }
  
  getColorForType(type) {
    const colors = {
      'paste-start': '#4CAF50',
      'paste-end': '#2196F3',
      'paste-data': '#FFC107',
      'paste-error': '#F44336',
      'bracketed-paste': '#9C27B0',
      'pty-send': '#00BCD4',
      'pty-receive': '#8BC34A',
      'flow-control': '#FF9800',
      'terminal': '#E91E63',
      'critical': '#FF0000',
      'warning': '#FF9800',
      'info': '#2196F3',
      'success': '#4CAF50'
    };
    return colors[type] || '#999';
  }
  
  clear() {
    this.events = [];
    this.startTime = Date.now();
    this.updateDisplay();
  }
  
  // Helper methods for specific paste tracking
  trackPasteStart(data) {
    this.log('paste-start', 'Paste operation started', {
      dataLength: data.length,
      preview: data.substring(0, 50) + (data.length > 50 ? '...' : ''),
      hasNewlines: data.includes('\n'),
      lineCount: data.split('\n').length
    });
  }
  
  trackBracketedPaste(marker, position) {
    this.log('bracketed-paste', `Bracketed paste marker: ${marker}`, {
      position,
      marker: marker.replace(/\x1b/g, 'ESC')
    });
  }
  
  trackPtyData(direction, data, metadata = {}) {
    const preview = typeof data === 'string' 
      ? data.substring(0, 100).replace(/\x1b/g, 'ESC')
      : '[Binary Data]';
    
    this.log(`pty-${direction}`, `PTY ${direction}: ${data.length} bytes`, {
      preview,
      ...metadata
    });
  }
  
  trackFlowControl(action, details) {
    this.log('flow-control', `Flow control: ${action}`, details);
  }
  
  trackError(error, context) {
    this.log('paste-error', `Error: ${error.message || error}`, {
      context,
      stack: error.stack
    });
  }
}

// Create global instance
export const pasteDebugger = new PasteDebugger();
window.pasteDebugger = pasteDebugger;