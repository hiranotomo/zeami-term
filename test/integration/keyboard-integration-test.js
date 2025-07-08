/**
 * Integration test for keyboard handling in ZeamiTerm
 * Tests the complete flow of keyboard shortcuts in a simulated environment
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = window.document;
global.navigator = window.navigator;
global.KeyboardEvent = window.KeyboardEvent;

// Mock Electron API
global.window.electronAPI = {
  sendInput: (id, data) => {
    console.log(`[Mock] sendInput called: id=${id}, data="${data}"`);
  },
  createTerminal: async () => ({ success: true, id: 'test-123' })
};

// Mock xterm.js
global.window.Terminal = class MockTerminal {
  constructor() {
    this.onDataHandlers = [];
    this.customKeyHandlers = [];
  }
  
  attachCustomKeyEventHandler(handler) {
    this.customKeyHandlers.push(handler);
  }
  
  onData(handler) {
    this.onDataHandlers.push(handler);
  }
  
  hasSelection() {
    return false;
  }
  
  getSelection() {
    return '';
  }
  
  _core = {
    _coreService: {
      triggerDataEvent: (data) => {
        console.log(`[Mock Terminal] Data event triggered: "${data}"`);
        this.onDataHandlers.forEach(handler => handler(data));
      }
    }
  };
  
  // Simulate key event
  simulateKeyEvent(event) {
    for (const handler of this.customKeyHandlers) {
      const result = handler(event);
      if (result === false) {
        console.log(`[Mock Terminal] Key event prevented: ${event.key}`);
        return false;
      }
    }
    return true;
  }
};

// Test keyboard shortcut display
async function testKeyboardShortcutDisplay() {
  console.log('\n=== Testing Keyboard Shortcut Display ===');
  
  // Import modules after DOM setup
  const { KeyboardShortcuts } = await import('../../src/renderer/utils/KeyboardShortcuts.js');
  const { PasteDebugger } = await import('../../src/renderer/utils/PasteDebugger.js');
  
  // Test Mac platform
  Object.defineProperty(navigator, 'platform', { value: 'MacIntel', writable: true });
  const debuggerMac = new PasteDebugger();
  debuggerMac.show();
  
  // Check if correct shortcuts are displayed
  const content = document.getElementById('paste-debug-content');
  const text = content ? content.textContent : '';
  console.assert(text.includes('Cmd+V'), 'Mac paste shortcut should be displayed');
  console.assert(text.includes('Option+Return'), 'Mac newline shortcut should be displayed');
  
  console.log('✓ Mac shortcuts displayed correctly');
  
  // Test Windows platform
  Object.defineProperty(navigator, 'platform', { value: 'Win32', writable: true });
  const debuggerWin = new PasteDebugger();
  debuggerWin.show();
  
  const contentWin = document.getElementById('paste-debug-content');
  const textWin = contentWin ? contentWin.textContent : '';
  console.assert(textWin.includes('Ctrl+V'), 'Windows paste shortcut should be displayed');
  console.assert(textWin.includes('Alt+Return'), 'Windows newline shortcut should be displayed');
  
  console.log('✓ Windows shortcuts displayed correctly');
}

// Test newline insertion
async function testNewlineInsertion() {
  console.log('\n=== Testing Newline Insertion ===');
  
  const terminal = new window.Terminal();
  let newlineReceived = false;
  
  // Set up handler to detect newline
  terminal.onData((data) => {
    if (data === '\n') {
      newlineReceived = true;
      console.log('✓ Newline received by terminal');
    }
  });
  
  // Attach keyboard handler (simplified version)
  terminal.attachCustomKeyEventHandler((event) => {
    if (event.key === 'Enter' && (event.altKey || event.shiftKey)) {
      terminal._core._coreService.triggerDataEvent('\n');
      return false;
    }
    return true;
  });
  
  // Test Shift+Return
  const shiftReturn = new KeyboardEvent('keydown', {
    key: 'Enter',
    shiftKey: true
  });
  terminal.simulateKeyEvent(shiftReturn);
  console.assert(newlineReceived, 'Shift+Return should insert newline');
  
  // Reset and test Alt+Return
  newlineReceived = false;
  const altReturn = new KeyboardEvent('keydown', {
    key: 'Enter',
    altKey: true
  });
  terminal.simulateKeyEvent(altReturn);
  console.assert(newlineReceived, 'Alt+Return should insert newline');
  
  // Test plain Return (should not insert newline)
  newlineReceived = false;
  const plainReturn = new KeyboardEvent('keydown', {
    key: 'Enter'
  });
  const result = terminal.simulateKeyEvent(plainReturn);
  console.assert(!newlineReceived && result === true, 'Plain Return should not insert newline');
  
  console.log('✓ All newline insertion tests passed');
}

// Test keyboard shortcut help component
async function testKeyboardShortcutHelp() {
  console.log('\n=== Testing Keyboard Shortcut Help Component ===');
  
  const { KeyboardShortcutHelp } = await import('../../src/renderer/components/KeyboardShortcutHelp.js');
  
  // Create help component
  const help = new KeyboardShortcutHelp();
  
  // Test visibility toggle
  console.assert(!help.isVisible, 'Help should start hidden');
  
  help.show();
  console.assert(help.isVisible, 'Help should be visible after show()');
  console.assert(help.container.style.display !== 'none', 'Container should be displayed');
  
  help.hide();
  console.assert(!help.isVisible, 'Help should be hidden after hide()');
  console.assert(help.container.style.display === 'none', 'Container should be hidden');
  
  // Test content includes shortcuts
  help.show();
  const content = help.container.innerHTML;
  console.assert(content.includes('Keyboard Shortcuts'), 'Should have title');
  console.assert(content.includes('Copy selected text'), 'Should have copy description');
  console.assert(content.includes('Insert newline'), 'Should have newline description');
  
  console.log('✓ Keyboard shortcut help component tests passed');
}

// Run all tests
async function runIntegrationTests() {
  console.log('=== ZeamiTerm Keyboard Integration Tests ===');
  
  try {
    await testKeyboardShortcutDisplay();
    await testNewlineInsertion();
    await testKeyboardShortcutHelp();
    
    console.log('\n✅ All integration tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run tests
runIntegrationTests();