/**
 * Performance Test Suite for ZeamiTerm
 * Tests terminal performance under various load conditions
 */

const { performance } = require('perf_hooks');

class PerformanceTest {
  constructor() {
    this.results = [];
    this.metrics = {
      outputRate: [],
      renderTime: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }
  
  /**
   * Measure terminal output performance
   */
  async testOutputPerformance(terminal, duration = 5000) {
    console.log('🚀 Testing output performance...');
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    let lineCount = 0;
    let dataSize = 0;
    
    // Generate output for specified duration
    const interval = setInterval(() => {
      const line = `[${new Date().toISOString()}] Performance test line ${lineCount} - ` + 
                   'A'.repeat(80) + '\r\n';
      terminal.write(line);
      lineCount++;
      dataSize += line.length;
    }, 10); // 100 lines per second
    
    // Stop after duration
    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(interval);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const results = {
      duration: endTime - startTime,
      linesWritten: lineCount,
      dataSize,
      linesPerSecond: lineCount / (duration / 1000),
      bytesPerSecond: dataSize / (duration / 1000),
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external
      }
    };
    
    this.results.push({ test: 'outputPerformance', results });
    return results;
  }
  
  /**
   * Test scrolling performance with large buffer
   */
  async testScrollingPerformance(terminal, bufferSize = 50000) {
    console.log('📜 Testing scrolling performance...');
    
    // Fill buffer
    console.log(`  Filling buffer with ${bufferSize} lines...`);
    for (let i = 0; i < bufferSize; i++) {
      terminal.write(`Line ${i}: ${'='.repeat(70)}\r\n`);
      
      // Show progress every 5000 lines
      if (i % 5000 === 0 && i > 0) {
        console.log(`  Progress: ${i}/${bufferSize} lines`);
      }
    }
    
    // Measure scroll performance
    const scrollTests = [];
    
    // Test scroll to top
    const scrollTopStart = performance.now();
    terminal.scrollToTop();
    const scrollTopTime = performance.now() - scrollTopStart;
    scrollTests.push({ action: 'scrollToTop', time: scrollTopTime });
    
    // Test scroll to bottom
    const scrollBottomStart = performance.now();
    terminal.scrollToBottom();
    const scrollBottomTime = performance.now() - scrollBottomStart;
    scrollTests.push({ action: 'scrollToBottom', time: scrollBottomTime });
    
    // Test page scrolling
    const pageScrolls = 10;
    const pageScrollStart = performance.now();
    for (let i = 0; i < pageScrolls; i++) {
      terminal.scrollPages(1);
    }
    const pageScrollTime = performance.now() - pageScrollStart;
    scrollTests.push({ 
      action: `scroll${pageScrolls}Pages`, 
      time: pageScrollTime,
      avgPerPage: pageScrollTime / pageScrolls 
    });
    
    const results = {
      bufferSize,
      scrollTests,
      avgScrollTime: scrollTests.reduce((sum, t) => sum + t.time, 0) / scrollTests.length
    };
    
    this.results.push({ test: 'scrollingPerformance', results });
    return results;
  }
  
  /**
   * Test resize performance
   */
  async testResizePerformance(terminal, resizeCount = 20) {
    console.log('📐 Testing resize performance...');
    
    const originalCols = terminal.cols;
    const originalRows = terminal.rows;
    const resizeTimes = [];
    
    for (let i = 0; i < resizeCount; i++) {
      const newCols = 80 + (i % 2 === 0 ? 20 : -20);
      const newRows = 24 + (i % 2 === 0 ? 10 : -10);
      
      const resizeStart = performance.now();
      terminal.resize(newCols, newRows);
      const resizeTime = performance.now() - resizeStart;
      
      resizeTimes.push(resizeTime);
      
      // Small delay between resizes
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Restore original size
    terminal.resize(originalCols, originalRows);
    
    const results = {
      resizeCount,
      resizeTimes,
      avgResizeTime: resizeTimes.reduce((sum, t) => sum + t, 0) / resizeTimes.length,
      maxResizeTime: Math.max(...resizeTimes),
      minResizeTime: Math.min(...resizeTimes)
    };
    
    this.results.push({ test: 'resizePerformance', results });
    return results;
  }
  
  /**
   * Test ANSI escape sequence processing
   */
  async testAnsiPerformance(terminal, iterations = 1000) {
    console.log('🎨 Testing ANSI escape sequence performance...');
    
    const ansiSequences = [
      '\x1b[31mRed\x1b[0m',
      '\x1b[1;32mBold Green\x1b[0m',
      '\x1b[4;34mUnderlined Blue\x1b[0m',
      '\x1b[7;35mInverted Magenta\x1b[0m',
      '\x1b[38;5;196mExtended Color\x1b[0m',
      '\x1b[48;2;255;128;0mRGB Background\x1b[0m'
    ];
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const sequence = ansiSequences[i % ansiSequences.length];
      terminal.write(`${sequence} Test ${i}\r\n`);
    }
    
    const endTime = performance.now();
    
    const results = {
      iterations,
      totalTime: endTime - startTime,
      avgTimePerSequence: (endTime - startTime) / iterations,
      sequencesPerSecond: iterations / ((endTime - startTime) / 1000)
    };
    
    this.results.push({ test: 'ansiPerformance', results });
    return results;
  }
  
  /**
   * Test input handling performance
   */
  async testInputPerformance(terminal, inputLength = 1000) {
    console.log('⌨️  Testing input performance...');
    
    const inputChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const inputs = [];
    
    // Generate random input
    for (let i = 0; i < inputLength; i++) {
      inputs.push(inputChars[Math.floor(Math.random() * inputChars.length)]);
    }
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    // Send all inputs
    for (const char of inputs) {
      terminal.onData && terminal.onData(char);
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const results = {
      inputLength,
      totalTime: endTime - startTime,
      avgTimePerChar: (endTime - startTime) / inputLength,
      charsPerSecond: inputLength / ((endTime - startTime) / 1000),
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed
    };
    
    this.results.push({ test: 'inputPerformance', results });
    return results;
  }
  
  /**
   * Stress test with concurrent operations
   */
  async testConcurrentOperations(terminal) {
    console.log('🔥 Testing concurrent operations...');
    
    const operations = [];
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    // Output operation
    operations.push(
      new Promise(resolve => {
        let count = 0;
        const interval = setInterval(() => {
          terminal.write(`Concurrent output ${count++}\r\n`);
          if (count >= 100) {
            clearInterval(interval);
            resolve({ operation: 'output', count });
          }
        }, 10);
      })
    );
    
    // Scroll operation
    operations.push(
      new Promise(resolve => {
        let scrolls = 0;
        const interval = setInterval(() => {
          terminal.scrollLines(Math.random() > 0.5 ? 1 : -1);
          scrolls++;
          if (scrolls >= 50) {
            clearInterval(interval);
            resolve({ operation: 'scroll', scrolls });
          }
        }, 20);
      })
    );
    
    // Resize operation
    operations.push(
      new Promise(async resolve => {
        let resizes = 0;
        for (let i = 0; i < 10; i++) {
          terminal.resize(80 + (i * 2), 24 + i);
          resizes++;
          await new Promise(r => setTimeout(r, 100));
        }
        terminal.resize(80, 24); // Reset
        resolve({ operation: 'resize', resizes });
      })
    );
    
    // Wait for all operations
    const operationResults = await Promise.all(operations);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const results = {
      duration: endTime - startTime,
      operations: operationResults,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      avgCPU: process.cpuUsage()
    };
    
    this.results.push({ test: 'concurrentOperations', results });
    return results;
  }
  
  /**
   * Generate performance report
   */
  generateReport() {
    console.log('\n📊 Performance Test Report\n');
    console.log('=' .repeat(60));
    
    for (const result of this.results) {
      console.log(`\n### ${result.test}`);
      console.log('-'.repeat(40));
      
      const data = result.results;
      
      switch (result.test) {
        case 'outputPerformance':
          console.log(`Lines written: ${data.linesWritten}`);
          console.log(`Lines per second: ${data.linesPerSecond.toFixed(2)}`);
          console.log(`Data rate: ${(data.bytesPerSecond / 1024).toFixed(2)} KB/s`);
          console.log(`Memory delta: ${(data.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)} MB`);
          break;
          
        case 'scrollingPerformance':
          console.log(`Buffer size: ${data.bufferSize} lines`);
          console.log(`Average scroll time: ${data.avgScrollTime.toFixed(2)}ms`);
          data.scrollTests.forEach(test => {
            console.log(`  ${test.action}: ${test.time.toFixed(2)}ms`);
          });
          break;
          
        case 'resizePerformance':
          console.log(`Resize count: ${data.resizeCount}`);
          console.log(`Average resize time: ${data.avgResizeTime.toFixed(2)}ms`);
          console.log(`Min/Max: ${data.minResizeTime.toFixed(2)}ms / ${data.maxResizeTime.toFixed(2)}ms`);
          break;
          
        case 'ansiPerformance':
          console.log(`Sequences processed: ${data.iterations}`);
          console.log(`Sequences per second: ${data.sequencesPerSecond.toFixed(0)}`);
          console.log(`Average time per sequence: ${data.avgTimePerSequence.toFixed(3)}ms`);
          break;
          
        case 'inputPerformance':
          console.log(`Characters processed: ${data.inputLength}`);
          console.log(`Characters per second: ${data.charsPerSecond.toFixed(0)}`);
          console.log(`Average time per char: ${data.avgTimePerChar.toFixed(3)}ms`);
          break;
          
        case 'concurrentOperations':
          console.log(`Total duration: ${data.duration.toFixed(2)}ms`);
          console.log(`Memory delta: ${(data.memoryDelta / 1024 / 1024).toFixed(2)} MB`);
          data.operations.forEach(op => {
            console.log(`  ${op.operation}: completed ${op.count || op.scrolls || op.resizes} operations`);
          });
          break;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Performance tests completed\n');
    
    return this.results;
  }
}

// Export for use in tests
module.exports = { PerformanceTest };

// Run standalone if executed directly
if (require.main === module) {
  console.log('🧪 ZeamiTerm Performance Test Suite\n');
  console.log('Note: This test requires a terminal instance.');
  console.log('Run from within the application or use the test runner.\n');
}