# 正統派なペースト処理アーキテクチャ

## 設計原則

1. **各層での責任分離**
   - レンダラー：ユーザー入力の検出とフォーマット
   - IPC：データの効率的な転送
   - メインプロセス：PTYへの安全な書き込み

2. **大量データの適切な処理**
   - チャンク分割による段階的送信
   - バックプレッシャーによる流量制御
   - メモリ効率的なストリーミング

3. **標準準拠**
   - ブラケットペーストモード（Bracketed Paste Mode）のサポート
   - UTF-8エンコーディングの適切な処理
   - ターミナルエミュレータの標準的な動作

## 実装設計

### レイヤー1：ペーストイベントの検出と処理

```javascript
// ZeamiTerminal.js
class ZeamiTerminal extends Terminal {
  constructor(options) {
    super(options);
    this._setupPasteHandling();
  }
  
  _setupPasteHandling() {
    // ペーストイベントリスナー
    this.onData((data) => {
      this._handleTerminalData(data);
    });
    
    // ペースト検出の改善
    this._pasteDetector = {
      threshold: 10, // 10文字以上で複数行ならペーストと判定
      maxSingleLineLength: 1000 // 1行1000文字以上もペースト
    };
  }
  
  _handleTerminalData(data) {
    // ペースト検出ロジック
    const isPaste = this._detectPaste(data);
    
    if (isPaste) {
      this._handlePasteData(data);
    } else {
      this._handleRegularInput(data);
    }
  }
  
  _detectPaste(data) {
    // ブラケットペーストマーカーがある場合
    if (data.includes('\x1b[200~')) {
      return true;
    }
    
    // ヒューリスティック検出
    const lines = data.split('\n');
    if (lines.length > 1 && data.length > this._pasteDetector.threshold) {
      return true;
    }
    
    if (data.length > this._pasteDetector.maxSingleLineLength) {
      return true;
    }
    
    return false;
  }
  
  _handlePasteData(data) {
    // 大量データの場合はチャンク処理
    const CHUNK_SIZE = 4096; // 4KB chunks
    
    if (data.length > CHUNK_SIZE) {
      this._sendInChunks(data, CHUNK_SIZE);
    } else {
      this._sendToPty(data);
    }
  }
  
  async _sendInChunks(data, chunkSize) {
    // ブラケットペーストモードの開始マーカーを最初に送信
    let hasStartMarker = data.includes('\x1b[200~');
    let hasEndMarker = data.includes('\x1b[201~');
    
    // マーカーを分離
    let content = data;
    if (hasStartMarker) {
      content = content.replace('\x1b[200~', '');
      this._sendToPty('\x1b[200~');
      await this._delay(10); // PTYが準備できるまで待機
    }
    
    if (hasEndMarker) {
      content = content.replace('\x1b[201~', '');
    }
    
    // コンテンツをチャンクに分割
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      this._sendToPty(chunk);
      
      // フロー制御：チャンク間で短い遅延
      if (i + chunkSize < content.length) {
        await this._delay(5);
      }
    }
    
    // 終了マーカーを最後に送信
    if (hasEndMarker) {
      await this._delay(10);
      this._sendToPty('\x1b[201~');
    }
  }
  
  _sendToPty(data) {
    if (this._ptyHandler) {
      this._ptyHandler(data);
    }
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### レイヤー2：IPC通信の最適化

```javascript
// preload.js の拡張
contextBridge.exposeInMainWorld('electronAPI', {
  sendInput: (id, data) => {
    // 大量データの場合は分割送信
    const MAX_IPC_SIZE = 128 * 1024; // 128KB
    
    if (data.length > MAX_IPC_SIZE) {
      // 大きなデータは複数のIPCメッセージに分割
      const chunks = [];
      for (let i = 0; i < data.length; i += MAX_IPC_SIZE) {
        chunks.push(data.slice(i, i + MAX_IPC_SIZE));
      }
      
      chunks.forEach((chunk, index) => {
        ipcRenderer.send('pty-input-chunk', {
          id,
          chunk,
          index,
          total: chunks.length,
          isLast: index === chunks.length - 1
        });
      });
    } else {
      ipcRenderer.send('pty-input', id, data);
    }
  }
});
```

### レイヤー3：PTY書き込みの最適化

```javascript
// ptyService.js の改善
class ImprovedFlowController {
  constructor(config) {
    this.queue = [];
    this.writing = false;
    this.ptyWriteBuffer = Buffer.alloc(0);
    
    // ペースト用の設定
    this.pasteMode = {
      active: false,
      startTime: null,
      totalBytes: 0,
      chunkSize: 4096,    // ペースト時のチャンクサイズ
      delayMs: 5,         // チャンク間の遅延
      timeout: 10000      // 10秒のタイムアウト
    };
  }
  
  write(data, callback) {
    // ペーストモードの検出
    if (data.includes('\x1b[200~')) {
      this.enterPasteMode();
    }
    
    if (this.pasteMode.active) {
      this.handlePasteData(data, callback);
    } else {
      this.handleRegularData(data, callback);
    }
    
    if (data.includes('\x1b[201~')) {
      this.exitPasteMode();
    }
  }
  
  enterPasteMode() {
    console.log('[FlowController] Entering paste mode');
    this.pasteMode.active = true;
    this.pasteMode.startTime = Date.now();
    this.pasteMode.totalBytes = 0;
    
    // タイムアウト設定
    this.pasteMode.timeoutId = setTimeout(() => {
      console.warn('[FlowController] Paste mode timeout');
      this.exitPasteMode();
    }, this.pasteMode.timeout);
  }
  
  exitPasteMode() {
    console.log('[FlowController] Exiting paste mode');
    this.pasteMode.active = false;
    clearTimeout(this.pasteMode.timeoutId);
    
    const duration = Date.now() - this.pasteMode.startTime;
    const throughput = this.pasteMode.totalBytes / (duration / 1000);
    console.log(`[FlowController] Paste completed: ${this.pasteMode.totalBytes} bytes in ${duration}ms (${Math.round(throughput)} bytes/sec)`);
  }
  
  handlePasteData(data, callback) {
    this.pasteMode.totalBytes += data.length;
    
    // ペースト時は大きめのチャンクで効率的に処理
    this.queue.push({
      data,
      callback,
      isPaste: true,
      timestamp: Date.now()
    });
    
    this.processQueue();
  }
  
  async processQueue() {
    if (this.writing || this.queue.length === 0) return;
    
    this.writing = true;
    const item = this.queue.shift();
    
    try {
      // ペーストデータは遅延を短くして高速処理
      const delay = item.isPaste ? this.pasteMode.delayMs : this.config.delay;
      
      await this.writeToProcess(item.data);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      if (item.callback) {
        item.callback();
      }
    } catch (error) {
      console.error('[FlowController] Write error:', error);
    } finally {
      this.writing = false;
      
      // 次のアイテムを処理
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }
}
```

## エラーハンドリング

1. **バッファオーバーフロー対策**
   - PTYのバッファが満杯の場合は書き込みを一時停止
   - `drain`イベントを待って再開

2. **文字エンコーディング**
   - UTF-8の不完全なバイトシーケンスを検出
   - 次のチャンクと結合して処理

3. **タイムアウト処理**
   - ペーストモードが長時間続く場合は自動的に終了
   - 部分的なデータでも確実に送信

## パフォーマンス最適化

1. **アダプティブチャンクサイズ**
   - PTYの応答速度に応じてチャンクサイズを動的調整
   - 高速な環境では大きなチャンク、低速では小さなチャンク

2. **メモリ効率**
   - 大量データをメモリに保持せずストリーミング処理
   - 不要なバッファリングを避ける

3. **非同期処理**
   - I/O操作を非ブロッキングで実行
   - 複数のペースト操作を並行処理可能