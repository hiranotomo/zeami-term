/**
 * RealtimeLogger - Real-time terminal session logging
 * 
 * Features:
 * - Record all terminal input/output with timestamps
 * - Efficient buffering and file writing
 * - Compression support
 * - Playback-ready format
 */

// For browser/Electron compatibility, we'll use conditional imports
const fs = typeof require !== 'undefined' ? require('fs') : null;
const zlib = typeof require !== 'undefined' ? require('zlib') : null;

export class RealtimeLogger {
  constructor(terminal, options = {}) {
    this.terminal = terminal;
    this.isRecording = false;
    this.recordBuffer = [];
    this.startTime = null;
    this.writeStream = null;
    this.metadata = {};
    
    // Options
    this.options = {
      bufferSize: options.bufferSize || 1000, // Flush every 1000 events
      flushInterval: options.flushInterval || 5000, // Flush every 5 seconds
      compress: options.compress || false,
      format: options.format || 'jsonl', // jsonl or binary
      includeKeystrokes: options.includeKeystrokes !== false,
      includeTimings: options.includeTimings !== false,
      ...options
    };
    
    this.flushTimer = null;
    this.eventHandlers = new Map();
  }

  /**
   * Start recording terminal session
   * @param {string} filename - Output filename
   * @param {Object} metadata - Session metadata
   */
  async startRecording(filename, metadata = {}) {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    this.isRecording = true;
    this.startTime = Date.now();
    this.recordBuffer = [];
    this.metadata = {
      version: '1.0',
      startTime: this.startTime,
      terminal: {
        cols: this.terminal.cols,
        rows: this.terminal.rows
      },
      ...metadata
    };

    // Setup output stream
    if (window.electronAPI) {
      // Use Electron file API
      this.filename = filename;
      this.writeBuffer = [];
    } else if (fs) {
      // Node.js environment
      if (this.options.compress && zlib) {
        const fileStream = fs.createWriteStream(filename);
        const gzipStream = zlib.createGzip();
        gzipStream.pipe(fileStream);
        this.writeStream = gzipStream;
      } else {
        this.writeStream = fs.createWriteStream(filename);
      }
    } else {
      // Browser environment - store in memory
      this.writeBuffer = [];
    }

    // Write metadata header
    this.writeEvent({
      type: 'metadata',
      data: this.metadata
    });

    // Setup event handlers
    this.setupEventHandlers();

    // Setup flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);

    console.log(`[RealtimeLogger] Started recording to ${filename}`);
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    // Clean up event handlers
    this.teardownEventHandlers();

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flush();

    // Write end marker
    this.writeEvent({
      type: 'end',
      duration: Date.now() - this.startTime
    });

    // Save buffered data if using buffer mode
    if (this.writeBuffer && this.filename && window.electronAPI) {
      const content = this.writeBuffer.map(e => JSON.stringify(e)).join('\n');
      await window.electronAPI.saveFile({
        content,
        defaultFilename: this.filename,
        filters: [
          { name: 'Log Files', extensions: ['log', 'jsonl'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
    }

    // Close stream
    if (this.writeStream) {
      await new Promise((resolve, reject) => {
        this.writeStream.end((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.writeStream = null;
    }

    console.log(`[RealtimeLogger] Stopped recording`);
  }

  /**
   * Setup event handlers for recording
   */
  setupEventHandlers() {
    // Terminal output
    const outputHandler = (data) => {
      if (this.isRecording) {
        this.recordEvent('output', data);
      }
    };
    this.terminal.onData(outputHandler);
    this.eventHandlers.set('output', outputHandler);

    // User input (if enabled)
    if (this.options.includeKeystrokes) {
      const inputHandler = (data) => {
        if (this.isRecording) {
          this.recordEvent('input', data);
        }
      };
      
      // Hook into terminal's input handler
      if (this.terminal._core && this.terminal._core._inputHandler) {
        const originalSendData = this.terminal._core._inputHandler.sendData;
        this.terminal._core._inputHandler.sendData = (data) => {
          inputHandler(data);
          return originalSendData.call(this.terminal._core._inputHandler, data);
        };
        this.eventHandlers.set('input', () => {
          this.terminal._core._inputHandler.sendData = originalSendData;
        });
      }
    }

    // Terminal resize
    const resizeHandler = ({ cols, rows }) => {
      if (this.isRecording) {
        this.recordEvent('resize', { cols, rows });
      }
    };
    this.terminal.onResize(resizeHandler);
    this.eventHandlers.set('resize', resizeHandler);

    // Selection changes
    const selectionHandler = () => {
      if (this.isRecording && this.terminal.hasSelection()) {
        const selection = this.terminal.getSelection();
        this.recordEvent('selection', selection);
      }
    };
    this.terminal.onSelectionChange(selectionHandler);
    this.eventHandlers.set('selection', selectionHandler);
  }

  /**
   * Tear down event handlers
   */
  teardownEventHandlers() {
    // Remove output handler
    const outputHandler = this.eventHandlers.get('output');
    if (outputHandler) {
      this.terminal.off('data', outputHandler);
    }

    // Restore original input handler
    const inputRestore = this.eventHandlers.get('input');
    if (inputRestore) {
      inputRestore();
    }

    // Remove resize handler
    const resizeHandler = this.eventHandlers.get('resize');
    if (resizeHandler) {
      this.terminal.off('resize', resizeHandler);
    }

    // Remove selection handler
    const selectionHandler = this.eventHandlers.get('selection');
    if (selectionHandler) {
      this.terminal.off('selectionChange', selectionHandler);
    }

    this.eventHandlers.clear();
  }

  /**
   * Record an event
   * @param {string} type - Event type
   * @param {*} data - Event data
   */
  recordEvent(type, data) {
    const event = {
      type,
      timestamp: this.options.includeTimings ? Date.now() - this.startTime : null,
      data
    };

    this.recordBuffer.push(event);

    // Auto-flush if buffer is full
    if (this.recordBuffer.length >= this.options.bufferSize) {
      this.flush();
    }
  }

  /**
   * Write event to stream
   * @param {Object} event - Event object
   */
  writeEvent(event) {
    try {
      if (this.writeBuffer) {
        // Buffer mode (Electron or browser)
        this.writeBuffer.push(event);
        return;
      }
      
      if (!this.writeStream) return;

      if (this.options.format === 'jsonl') {
        // JSON Lines format
        this.writeStream.write(JSON.stringify(event) + '\n');
      } else if (this.options.format === 'binary') {
        // Custom binary format for efficiency
        this.writeBinaryEvent(event);
      }
    } catch (error) {
      console.error('[RealtimeLogger] Error writing event:', error);
    }
  }

  /**
   * Write event in binary format
   * @param {Object} event - Event object
   */
  writeBinaryEvent(event) {
    // Binary format: [type:1][timestamp:8][length:4][data:length]
    const typeMap = { metadata: 0, output: 1, input: 2, resize: 3, selection: 4, end: 255 };
    const typeCode = typeMap[event.type] || 99;
    
    const dataStr = JSON.stringify(event.data || '');
    const dataBuffer = Buffer.from(dataStr, 'utf8');
    
    const buffer = Buffer.allocUnsafe(13 + dataBuffer.length);
    buffer.writeUInt8(typeCode, 0);
    buffer.writeBigUInt64LE(BigInt(event.timestamp || 0), 1);
    buffer.writeUInt32LE(dataBuffer.length, 9);
    dataBuffer.copy(buffer, 13);
    
    this.writeStream.write(buffer);
  }

  /**
   * Flush buffer to disk
   */
  async flush() {
    if (this.recordBuffer.length === 0 || !this.writeStream) {
      return;
    }

    const events = this.recordBuffer.splice(0);
    events.forEach(event => this.writeEvent(event));

    // Force flush to disk
    if (this.writeStream && typeof this.writeStream.flush === 'function') {
      await new Promise((resolve) => {
        this.writeStream.flush(resolve);
      });
    }
  }

  /**
   * Load recorded session
   * @param {string} filename - Recording filename
   * @returns {Object} Session data
   */
  static async loadRecording(filename) {
    const events = [];
    const isCompressed = filename.endsWith('.gz');

    // For Electron environment, we need to read via file API
    if (window.electronAPI && window.electronAPI.readFile) {
      try {
        const content = await window.electronAPI.readFile(filename);
        const lines = content.split('\n');
        
        lines.forEach(line => {
          if (line.trim()) {
            try {
              events.push(JSON.parse(line));
            } catch (error) {
              console.error('Error parsing line:', error);
            }
          }
        });
        
        const metadata = events.find(e => e.type === 'metadata');
        const sessionEvents = events.filter(e => e.type !== 'metadata' && e.type !== 'end');
        const endEvent = events.find(e => e.type === 'end');

        return {
          metadata: metadata ? metadata.data : {},
          events: sessionEvents,
          duration: endEvent ? endEvent.duration : null
        };
      } catch (error) {
        throw new Error(`Failed to load recording: ${error.message}`);
      }
    }

    // Node.js environment
    if (!fs) {
      throw new Error('File system not available');
    }

    return new Promise((resolve, reject) => {
      let stream = fs.createReadStream(filename);
      
      if (isCompressed && zlib) {
        const gunzip = zlib.createGunzip();
        stream = stream.pipe(gunzip);
      }

      let buffer = '';
      
      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line
        
        lines.forEach(line => {
          if (line.trim()) {
            try {
              events.push(JSON.parse(line));
            } catch (error) {
              console.error('Error parsing line:', error);
            }
          }
        });
      });

      stream.on('end', () => {
        // Parse any remaining data
        if (buffer.trim()) {
          try {
            events.push(JSON.parse(buffer));
          } catch (error) {
            console.error('Error parsing final buffer:', error);
          }
        }

        // Extract metadata and events
        const metadata = events.find(e => e.type === 'metadata');
        const sessionEvents = events.filter(e => e.type !== 'metadata' && e.type !== 'end');
        const endEvent = events.find(e => e.type === 'end');

        resolve({
          metadata: metadata ? metadata.data : {},
          events: sessionEvents,
          duration: endEvent ? endEvent.duration : null
        });
      });

      stream.on('error', reject);
    });
  }

  /**
   * Get recording statistics
   * @returns {Object} Recording stats
   */
  getStats() {
    if (!this.isRecording) {
      return null;
    }

    return {
      duration: Date.now() - this.startTime,
      eventCount: this.recordBuffer.length,
      isRecording: this.isRecording,
      startTime: this.startTime
    };
  }
}