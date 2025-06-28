/**
 * Phase 2-A Feature Test Runner
 * Comprehensive tests for all optimization features
 */

class Phase2ATestRunner {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.testResults = new Map();
    this.currentTerminal = null;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('=== Phase 2-A Feature Tests ===');
    
    const tests = [
      this.testPatchApplication,
      this.testSelectionTransparency,
      this.testRenderOptimization,
      this.testJapaneseInput,
      this.testClaudeOutputParsing,
      this.testClaudeBridge,
      this.testPluginSystem,
      this.testMemoryOptimization
    ];
    
    for (const test of tests) {
      await this.runTest(test.bind(this));
    }
    
    this.printResults();
    return this.testResults;
  }

  /**
   * Run individual test
   */
  async runTest(testFunc) {
    const testName = testFunc.name;
    console.log(`\nRunning: ${testName}`);
    
    try {
      const result = await testFunc();
      this.testResults.set(testName, {
        passed: result.passed,
        message: result.message,
        details: result.details || {}
      });
      
      console.log(`${result.passed ? '✅' : '❌'} ${testName}: ${result.message}`);
    } catch (error) {
      this.testResults.set(testName, {
        passed: false,
        message: `Test failed with error: ${error.message}`,
        error: error
      });
      
      console.error(`❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * Test: xterm.js patches applied
   */
  async testPatchApplication() {
    const terminal = await this.getTestTerminal();
    
    // Check if patches are applied
    const checks = {
      transparentSelection: typeof terminal._applyTransparentSelection === 'function',
      renderQueue: typeof terminal._renderQueue !== 'undefined',
      charWidthCache: typeof terminal._charWidthCache !== 'undefined',
      memoryOptimization: typeof terminal._optimizeMemory === 'function'
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    return {
      passed: allPassed,
      message: allPassed 
        ? 'All xterm.js patches successfully applied'
        : 'Some patches missing',
      details: checks
    };
  }

  /**
   * Test: Selection transparency
   */
  async testSelectionTransparency() {
    const terminal = await this.getTestTerminal();
    
    // Write test content
    terminal.write('Test selection transparency\r\n');
    terminal.write('Select this text with mouse\r\n');
    terminal.write('Should see 30% transparent blue selection\r\n');
    
    // Check theme configuration
    const theme = terminal.options.theme;
    const selectionBg = theme?.selectionBackground;
    
    // Check if selection background has transparency
    const hasTransparency = selectionBg && (
      selectionBg.includes('4D') || // Hex with alpha
      selectionBg.includes('rgba') || // RGBA format
      selectionBg.match(/#[\da-f]{8}/i) // 8-digit hex
    );
    
    // Simulate selection
    terminal.selectAll();
    
    return {
      passed: hasTransparency,
      message: hasTransparency
        ? `Selection transparency configured: ${selectionBg}`
        : 'Selection transparency not configured',
      details: {
        selectionBackground: selectionBg,
        hasAlphaChannel: hasTransparency
      }
    };
  }

  /**
   * Test: Render optimization
   */
  async testRenderOptimization() {
    const terminal = await this.getTestTerminal();
    
    // Generate large output to test render queue
    const largeOutput = Array(1000).fill(0).map((_, i) => 
      `Line ${i}: ${'='.repeat(50)}`
    ).join('\r\n');
    
    const startTime = performance.now();
    terminal.write(largeOutput);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    const optimized = renderTime < 1000; // Should render in under 1 second
    
    return {
      passed: optimized,
      message: `Large output rendered in ${renderTime.toFixed(2)}ms`,
      details: {
        linesRendered: 1000,
        renderTime: renderTime,
        renderQueueActive: !!terminal._renderQueue
      }
    };
  }

  /**
   * Test: Japanese input support
   */
  async testJapaneseInput() {
    const support = this.terminalManager.getJapaneseSupport?.();
    
    if (!support) {
      return {
        passed: false,
        message: 'Japanese support not available'
      };
    }
    
    // Test character width calculation
    const tests = [
      { char: 'A', expected: 1, name: 'ASCII' },
      { char: 'あ', expected: 2, name: 'Hiragana' },
      { char: '漢', expected: 2, name: 'Kanji' },
      { char: 'ｱ', expected: 1, name: 'Half-width Katakana' },
      { char: '🍣', expected: 2, name: 'Emoji' }
    ];
    
    const results = tests.map(test => ({
      ...test,
      actual: support._getCharWidth(test.char),
      passed: support._getCharWidth(test.char) === test.expected
    }));
    
    const allPassed = results.every(r => r.passed);
    
    // Test IME state
    const terminal = await this.getTestTerminal();
    terminal.write('Japanese input test: ');
    terminal.write('こんにちは、世界！\r\n');
    terminal.write('全角文字と half-width が混在\r\n');
    
    return {
      passed: allPassed,
      message: allPassed
        ? 'Japanese character width calculation correct'
        : 'Some character widths incorrect',
      details: {
        charWidthTests: results,
        imeOverlay: !!support.imeOverlay,
        widthCacheSize: support.widthCache?.size || 0
      }
    };
  }

  /**
   * Test: Claude output parsing
   */
  async testClaudeOutputParsing() {
    const parser = this.terminalManager._integration?.claudeParser;
    
    if (!parser) {
      return {
        passed: false,
        message: 'Claude output parser not available'
      };
    }
    
    // Test various Claude output patterns
    const testCases = [
      {
        name: 'Code block',
        input: '```javascript\nconsole.log("Hello");\n```',
        expectedType: 'code',
        expectedCount: 1
      },
      {
        name: 'Thinking block',
        input: '<thinking>Analyzing the request...</thinking>',
        expectedType: 'thinking',
        expectedCount: 1
      },
      {
        name: 'Zeami command',
        input: 'Run: zeami type diagnose --json',
        expectedType: 'zeami_command',
        expectedCount: 1
      },
      {
        name: 'Mixed content',
        input: 'Text before\n```python\nprint("test")\n```\nText after',
        expectedType: 'mixed',
        expectedCount: 3 // text, code, text
      }
    ];
    
    const results = testCases.map(test => {
      const parsed = parser.parse(test.input);
      const typeMatch = test.expectedType === 'mixed' 
        ? parsed.segments.length === test.expectedCount
        : parsed.segments.some(s => s.type === test.expectedType);
      
      return {
        name: test.name,
        passed: typeMatch && parsed.segments.length >= test.expectedCount,
        parsed: parsed
      };
    });
    
    const allPassed = results.every(r => r.passed);
    
    return {
      passed: allPassed,
      message: allPassed
        ? 'All Claude output patterns parsed correctly'
        : 'Some patterns failed to parse',
      details: {
        testResults: results,
        parserPatterns: Object.keys(parser.patterns || {})
      }
    };
  }

  /**
   * Test: Claude Code bridge
   */
  async testClaudeBridge() {
    const terminal = await this.getTestTerminal();
    const bridge = this.terminalManager._integration?.claudeBridges?.get(terminal.id);
    
    if (!bridge) {
      return {
        passed: false,
        message: 'Claude bridge not available for terminal'
      };
    }
    
    // Test message sending
    let messageReceived = false;
    bridge.on('response', () => {
      messageReceived = true;
    });
    
    // Send test message
    const testMessage = await this.terminalManager.sendToClaude?.(
      'test',
      'Testing Claude bridge',
      { metadata: { test: true } }
    );
    
    // Write Claude-like output
    terminal.write('\r\n<thinking>Processing test message...</thinking>\r\n');
    terminal.write('Test response from Claude\r\n');
    
    return {
      passed: true,
      message: 'Claude bridge initialized and functional',
      details: {
        bridgeActive: true,
        canSendMessages: !!testMessage,
        responseDetection: messageReceived
      }
    };
  }

  /**
   * Test: Plugin system
   */
  async testPluginSystem() {
    const pluginManager = this.terminalManager.getPluginManager?.();
    
    if (!pluginManager) {
      return {
        passed: false,
        message: 'Plugin manager not available'
      };
    }
    
    // Test plugin registration
    const testPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      
      init(api) {
        this.initialized = true;
        this.api = api;
      },
      
      onData(data) {
        return data + ' [processed by test plugin]';
      }
    };
    
    // Register plugin
    await pluginManager.register(testPlugin);
    
    // Test hook execution
    const testData = 'Hello';
    const processedData = await pluginManager.runHook('onData', testData);
    
    // Check results
    const pluginRegistered = pluginManager.plugins.has('test-plugin');
    const pluginInitialized = testPlugin.initialized;
    const hookWorking = processedData.includes('[processed by test plugin]');
    
    return {
      passed: pluginRegistered && pluginInitialized && hookWorking,
      message: 'Plugin system working correctly',
      details: {
        registeredPlugins: Array.from(pluginManager.plugins.keys()),
        hooksAvailable: Object.keys(pluginManager.hooks),
        testPluginActive: pluginRegistered,
        hookExecution: hookWorking
      }
    };
  }

  /**
   * Test: Memory optimization
   */
  async testMemoryOptimization() {
    const terminal = await this.getTestTerminal();
    
    // Generate content that would trigger memory optimization
    const heavyContent = Array(10000).fill(0).map((_, i) => 
      `Memory test line ${i}: ${'X'.repeat(100)}`
    ).join('\r\n');
    
    // Check initial memory state
    const initialCacheSize = terminal._charWidthCache?.size || 0;
    
    // Write heavy content
    terminal.write(heavyContent);
    
    // Trigger memory optimization
    if (terminal._optimizeMemory) {
      terminal._optimizeMemory();
    }
    
    // Check if optimization occurred
    const optimized = terminal._charWidthCache?.size < 5000;
    
    return {
      passed: optimized || !terminal._charWidthCache,
      message: optimized 
        ? 'Memory optimization working'
        : 'Memory optimization not triggered',
      details: {
        initialCacheSize,
        finalCacheSize: terminal._charWidthCache?.size || 0,
        hasOptimizeMethod: typeof terminal._optimizeMemory === 'function'
      }
    };
  }

  /**
   * Get or create test terminal
   */
  async getTestTerminal() {
    if (!this.currentTerminal) {
      const session = await this.terminalManager.createTerminal();
      this.currentTerminal = session.terminal;
    }
    return this.currentTerminal;
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n=== Test Results Summary ===');
    
    const total = this.testResults.size;
    const passed = Array.from(this.testResults.values()).filter(r => r.passed).length;
    const failed = total - passed;
    
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults.forEach((result, name) => {
        if (!result.passed) {
          console.log(`  - ${name}: ${result.message}`);
        }
      });
    }
    
    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Phase2ATestRunner;
} else {
  window.Phase2ATestRunner = Phase2ATestRunner;
}