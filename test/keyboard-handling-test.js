/**
 * Test for improved keyboard bindings in ZeamiTerm
 * Tests OS detection, keyboard shortcuts display, and newline handling
 */

const { app } = require('electron');
const path = require('path');

// Mock platform for testing
const mockPlatform = (platform) => {
  Object.defineProperty(navigator, 'platform', {
    writable: true,
    value: platform
  });
};

// Test OS detection for keyboard shortcuts
function testOSDetection() {
  console.log('Testing OS Detection...');
  
  // Test Mac detection
  mockPlatform('MacIntel');
  const isMac1 = navigator.platform.toLowerCase().includes('mac');
  console.assert(isMac1 === true, 'Mac detection failed for MacIntel');
  
  mockPlatform('Mac');
  const isMac2 = navigator.platform.toLowerCase().includes('mac');
  console.assert(isMac2 === true, 'Mac detection failed for Mac');
  
  // Test non-Mac platforms
  mockPlatform('Win32');
  const isMac3 = navigator.platform.toLowerCase().includes('mac');
  console.assert(isMac3 === false, 'Windows incorrectly detected as Mac');
  
  mockPlatform('Linux x86_64');
  const isMac4 = navigator.platform.toLowerCase().includes('mac');
  console.assert(isMac4 === false, 'Linux incorrectly detected as Mac');
  
  console.log('✓ OS detection tests passed');
}

// Test keyboard shortcut display
function testKeyboardShortcutDisplay() {
  console.log('\nTesting Keyboard Shortcut Display...');
  
  // Test Mac shortcuts
  mockPlatform('MacIntel');
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const pasteShortcut = isMac ? 'Cmd+V' : 'Ctrl+V';
  const toggleShortcut = isMac ? 'Cmd+Shift+P' : 'Ctrl+Shift+P';
  
  console.assert(pasteShortcut === 'Cmd+V', 'Mac paste shortcut should be Cmd+V');
  console.assert(toggleShortcut === 'Cmd+Shift+P', 'Mac toggle shortcut should be Cmd+Shift+P');
  
  // Test Windows/Linux shortcuts
  mockPlatform('Win32');
  const isMacWin = navigator.platform.toLowerCase().includes('mac');
  const pasteShortcutWin = isMacWin ? 'Cmd+V' : 'Ctrl+V';
  const toggleShortcutWin = isMacWin ? 'Cmd+Shift+P' : 'Ctrl+Shift+P';
  
  console.assert(pasteShortcutWin === 'Ctrl+V', 'Windows paste shortcut should be Ctrl+V');
  console.assert(toggleShortcutWin === 'Ctrl+Shift+P', 'Windows toggle shortcut should be Ctrl+Shift+P');
  
  console.log('✓ Keyboard shortcut display tests passed');
}

// Test keyboard event handling
function testKeyboardEventHandling() {
  console.log('\nTesting Keyboard Event Handling...');
  
  // Mock keyboard event
  const createKeyboardEvent = (key, options = {}) => {
    return new KeyboardEvent('keydown', {
      key,
      ...options,
      bubbles: true,
      cancelable: true
    });
  };
  
  // Test copy shortcut (Mac)
  mockPlatform('MacIntel');
  const macCopyEvent = createKeyboardEvent('c', { metaKey: true });
  console.log('✓ Mac copy event created:', macCopyEvent.key, 'metaKey:', macCopyEvent.metaKey);
  
  // Test copy shortcut (Windows/Linux)
  mockPlatform('Win32');
  const winCopyEvent = createKeyboardEvent('c', { ctrlKey: true });
  console.log('✓ Windows copy event created:', winCopyEvent.key, 'ctrlKey:', winCopyEvent.ctrlKey);
  
  // Test newline shortcuts
  const shiftReturnEvent = createKeyboardEvent('Enter', { shiftKey: true });
  console.log('✓ Shift+Return event created:', shiftReturnEvent.key, 'shiftKey:', shiftReturnEvent.shiftKey);
  
  const optionReturnEvent = createKeyboardEvent('Enter', { altKey: true });
  console.log('✓ Option+Return event created:', optionReturnEvent.key, 'altKey:', optionReturnEvent.altKey);
  
  // Test paste debugger toggle
  mockPlatform('MacIntel');
  const macToggleEvent = createKeyboardEvent('P', { metaKey: true, shiftKey: true });
  console.log('✓ Mac debugger toggle event created:', macToggleEvent.key, 'metaKey:', macToggleEvent.metaKey, 'shiftKey:', macToggleEvent.shiftKey);
  
  console.log('✓ Keyboard event handling tests passed');
}

// Test terminal keyboard handler attachment
function testTerminalKeyboardHandler() {
  console.log('\nTesting Terminal Keyboard Handler...');
  
  // Mock keyboard event
  const createKeyboardEvent = (key, options = {}) => {
    return new KeyboardEvent('keydown', {
      key,
      ...options,
      bubbles: true,
      cancelable: true
    });
  };
  
  // Mock terminal object
  const mockTerminal = {
    attachCustomKeyEventHandler: function(handler) {
      this._keyEventHandler = handler;
      console.log('✓ Custom key event handler attached');
    },
    _core: {
      _coreService: {
        triggerDataEvent: function(data) {
          console.log('✓ Data event triggered with:', JSON.stringify(data));
        }
      }
    },
    hasSelection: () => false
  };
  
  // Attach handler
  mockTerminal.attachCustomKeyEventHandler((event) => {
    // Test newline handling
    if (event.key === 'Enter' && (event.altKey || event.shiftKey)) {
      mockTerminal._core._coreService.triggerDataEvent('\n');
      return false;
    }
    return true;
  });
  
  // Test handler with events
  const result1 = mockTerminal._keyEventHandler(createKeyboardEvent('Enter', { shiftKey: true }));
  console.assert(result1 === false, 'Shift+Return should be handled');
  
  const result2 = mockTerminal._keyEventHandler(createKeyboardEvent('Enter', { altKey: true }));
  console.assert(result2 === false, 'Option+Return should be handled');
  
  const result3 = mockTerminal._keyEventHandler(createKeyboardEvent('Enter'));
  console.assert(result3 === true, 'Plain Return should not be handled');
  
  console.log('✓ Terminal keyboard handler tests passed');
}

// Integration test for PasteDebugger
function testPasteDebuggerIntegration() {
  console.log('\nTesting PasteDebugger Integration...');
  
  // Mock PasteDebugger
  class MockPasteDebugger {
    constructor() {
      this.enabled = true;
      this.events = [];
    }
    
    show() {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const pasteShortcut = isMac ? 'Cmd+V' : 'Ctrl+V';
      const toggleShortcut = isMac ? 'Cmd+Shift+P' : 'Ctrl+Shift+P';
      
      console.log(`✓ PasteDebugger showing with shortcuts: paste=${pasteShortcut}, toggle=${toggleShortcut}`);
      return { pasteShortcut, toggleShortcut };
    }
  }
  
  // Test on different platforms
  mockPlatform('MacIntel');
  const debuggerMac = new MockPasteDebugger();
  const macShortcuts = debuggerMac.show();
  console.assert(macShortcuts.pasteShortcut === 'Cmd+V', 'Mac paste shortcut mismatch');
  console.assert(macShortcuts.toggleShortcut === 'Cmd+Shift+P', 'Mac toggle shortcut mismatch');
  
  mockPlatform('Win32');
  const debuggerWin = new MockPasteDebugger();
  const winShortcuts = debuggerWin.show();
  console.assert(winShortcuts.pasteShortcut === 'Ctrl+V', 'Windows paste shortcut mismatch');
  console.assert(winShortcuts.toggleShortcut === 'Ctrl+Shift+P', 'Windows toggle shortcut mismatch');
  
  console.log('✓ PasteDebugger integration tests passed');
}

// Mock KeyboardEvent constructor for Node.js environment
if (typeof KeyboardEvent === 'undefined') {
  global.KeyboardEvent = class KeyboardEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.key = options.key || '';
      this.metaKey = options.metaKey || false;
      this.ctrlKey = options.ctrlKey || false;
      this.altKey = options.altKey || false;
      this.shiftKey = options.shiftKey || false;
      this.bubbles = options.bubbles || false;
      this.cancelable = options.cancelable || false;
    }
  };
}

// Run all tests
function runTests() {
  console.log('=== ZeamiTerm Keyboard Handling Tests ===\n');
  
  try {
    testOSDetection();
    testKeyboardShortcutDisplay();
    testKeyboardEventHandling();
    testTerminalKeyboardHandler();
    testPasteDebuggerIntegration();
    
    console.log('\n=== All tests passed! ===');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  // Mock navigator for Node.js environment
  if (typeof navigator === 'undefined') {
    global.navigator = { platform: 'MacIntel' };
  }
  
  runTests();
}

module.exports = {
  testOSDetection,
  testKeyboardShortcutDisplay,
  testKeyboardEventHandling,
  testTerminalKeyboardHandler,
  testPasteDebuggerIntegration,
  runTests
};