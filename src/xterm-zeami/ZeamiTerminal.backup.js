// Backup of working paste implementation
// This can be used to restore if the dynamic chunking doesn't work

// Original working implementation:
/*
        // 2. Send content in chunks after delay
        setTimeout(() => {
          // For large content, send in smaller chunks
          const CHUNK_SIZE = 1000; // 1000 chars per chunk
          const chunks = [];
          
          for (let i = 0; i < content.length; i += CHUNK_SIZE) {
            chunks.push(content.substring(i, i + CHUNK_SIZE));
          }
          
          console.log(`[ZeamiTerminal] Sending content in ${chunks.length} chunks`);
          
          // Send chunks with small delays
          let chunkIndex = 0;
          const sendNextChunk = () => {
            if (chunkIndex < chunks.length) {
              this._ptyHandler(chunks[chunkIndex]);
              console.log(`[ZeamiTerminal] Sent chunk ${chunkIndex + 1}/${chunks.length}: ${chunks[chunkIndex].length} chars`);
              chunkIndex++;
              setTimeout(sendNextChunk, 10); // 10ms between chunks
            } else {
              // All chunks sent, now send end marker
              setTimeout(() => {
                this._ptyHandler('\x1b[201~');
                console.log('[ZeamiTerminal] Sent END marker');
              }, 50); // Wait before end marker
            }
          };
          
          sendNextChunk();
        }, 200); // Increased delay after start marker to ensure Claude Code enters paste mode
*/