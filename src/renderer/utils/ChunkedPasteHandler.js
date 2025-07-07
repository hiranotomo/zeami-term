/**
 * ChunkedPasteHandler - Handles large paste operations by chunking them
 * to work around Claude Code's paste limitations
 */

export class ChunkedPasteHandler {
  constructor() {
    this.MAX_CHARS_PER_CHUNK = 500; // Conservative limit
    this.CHUNK_DELAY_MS = 100; // Delay between chunks
    this.isChunking = false;
  }
  
  /**
   * Check if data needs chunking
   */
  needsChunking(data) {
    // Check both size and line count
    const lineCount = data.split('\n').length;
    return data.length > this.MAX_CHARS_PER_CHUNK || lineCount > 50;
  }
  
  /**
   * Chunk data for paste
   */
  chunkData(data) {
    const chunks = [];
    const lines = data.split('\n');
    
    // Chunk by lines to avoid breaking in middle of content
    let currentChunk = '';
    let currentLineCount = 0;
    
    for (const line of lines) {
      if (currentChunk.length + line.length > this.MAX_CHARS_PER_CHUNK || 
          currentLineCount >= 50) {
        // Start new chunk
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = line + '\n';
        currentLineCount = 1;
      } else {
        currentChunk += line + '\n';
        currentLineCount++;
      }
    }
    
    // Add last chunk
    if (currentChunk) {
      chunks.push(currentChunk.trimEnd());
    }
    
    return chunks;
  }
  
  /**
   * Send chunks with delay
   */
  async sendChunks(chunks, sendFunction, onProgress) {
    this.isChunking = true;
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (!this.isChunking) {
          break; // Allow cancellation
        }
        
        // Progress callback
        if (onProgress) {
          onProgress(i + 1, chunks.length);
        }
        
        // Send chunk without bracketed paste markers
        // Claude Code will process each chunk as separate input
        sendFunction(chunks[i]);
        
        // Wait between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.CHUNK_DELAY_MS));
        }
      }
    } finally {
      this.isChunking = false;
    }
  }
  
  /**
   * Cancel ongoing chunked paste
   */
  cancel() {
    this.isChunking = false;
  }
}

export const chunkedPasteHandler = new ChunkedPasteHandler();