/**
 * Japanese Input Support
 * 日本語入力（IME）サポートの実装
 */

class JapaneseInputSupport {
  constructor(terminal) {
    this.terminal = terminal;
    this.element = terminal.element || terminal._core?.element;
    
    // IME状態
    this.imeState = {
      composing: false,
      startPosition: { x: 0, y: 0 },
      compositionData: '',
      preEditLength: 0
    };
    
    // 文字幅キャッシュ
    this.widthCache = new Map();
    this.widthCacheLimit = 10000;
    
    // 設定
    this.config = {
      enableIMEOverlay: true,
      showCandidateWindow: true,
      imeIndicatorPosition: 'cursor', // 'cursor' or 'statusbar'
      fontFamily: 'Hiragino Kaku Gothic ProN, Meiryo, sans-serif'
    };
    
    this._initialize();
  }

  /**
   * 初期化
   */
  _initialize() {
    if (!this.element) {
      console.error('[JapaneseSupport] Terminal element not found');
      return;
    }
    
    // IMEイベントハンドラーの設定
    this._setupIMEHandlers();
    
    // IMEオーバーレイの作成
    if (this.config.enableIMEOverlay) {
      this._createIMEOverlay();
    }
    
    // 文字幅測定用Canvasの準備
    this._setupMeasurementCanvas();
    
    // East Asian Width データの初期化
    this._initializeEAWData();
  }

  /**
   * IMEイベントハンドラーの設定
   */
  _setupIMEHandlers() {
    const textarea = this.terminal.textarea || this.element.querySelector('textarea');
    
    if (!textarea) {
      console.error('[JapaneseSupport] Textarea element not found');
      return;
    }
    
    // Composition開始
    textarea.addEventListener('compositionstart', (e) => {
      this.imeState.composing = true;
      this.imeState.startPosition = this._getCurrentCursorPosition();
      this.imeState.compositionData = '';
      
      // IMEオーバーレイ表示
      if (this.imeOverlay) {
        this._showIMEOverlay();
      }
      
      // イベント発火
      this._emit('imestart', e);
    });
    
    // Composition更新
    textarea.addEventListener('compositionupdate', (e) => {
      const oldData = this.imeState.compositionData;
      this.imeState.compositionData = e.data;
      
      // 変換候補の表示更新
      this._updateIMEDisplay(oldData, e.data);
      
      // イベント発火
      this._emit('imeupdate', e);
    });
    
    // Composition終了
    textarea.addEventListener('compositionend', (e) => {
      this.imeState.composing = false;
      
      // 確定文字列の処理
      this._commitIMEInput(e.data);
      
      // IMEオーバーレイ非表示
      if (this.imeOverlay) {
        this._hideIMEOverlay();
      }
      
      // 状態リセット
      this.imeState.compositionData = '';
      this.imeState.preEditLength = 0;
      
      // イベント発火
      this._emit('imeend', e);
    });
    
    // キーダウンイベント（IME制御用）
    textarea.addEventListener('keydown', (e) => {
      if (this.imeState.composing) {
        // IME中の特殊キー処理
        this._handleIMEKeydown(e);
      }
    });
  }

  /**
   * IMEオーバーレイの作成
   */
  _createIMEOverlay() {
    this.imeOverlay = document.createElement('div');
    this.imeOverlay.className = 'zeami-ime-overlay';
    this.imeOverlay.style.cssText = `
      position: absolute;
      display: none;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: ${this.config.fontFamily};
      font-size: 14px;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      pointer-events: none;
    `;
    
    // 候補ウィンドウ
    if (this.config.showCandidateWindow) {
      this.candidateWindow = document.createElement('div');
      this.candidateWindow.className = 'zeami-ime-candidates';
      this.candidateWindow.style.cssText = `
        position: absolute;
        display: none;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        max-width: 300px;
        max-height: 200px;
        overflow-y: auto;
        font-family: ${this.config.fontFamily};
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1001;
      `;
      
      this.element.appendChild(this.candidateWindow);
    }
    
    this.element.appendChild(this.imeOverlay);
  }

  /**
   * IME表示の更新
   */
  _updateIMEDisplay(oldData, newData) {
    if (!this.terminal.buffer) return;
    
    // 古い表示をクリア
    if (oldData) {
      this._clearIMEDisplay(oldData);
    }
    
    // 新しい表示
    if (newData) {
      this._renderIMEDisplay(newData);
    }
    
    // オーバーレイ更新
    if (this.imeOverlay) {
      this.imeOverlay.textContent = newData;
      this._positionIMEOverlay();
    }
  }

  /**
   * IME表示のクリア
   */
  _clearIMEDisplay(text) {
    const width = this._getStringWidth(text);
    const cursorPos = this.imeState.startPosition;
    
    // 仮想的にスペースで埋める
    const spaces = ' '.repeat(width);
    
    // ターミナルバッファに直接書き込み（非推奨だが必要）
    if (this.terminal._core) {
      const buffer = this.terminal.buffer.active;
      let col = cursorPos.x;
      
      for (let i = 0; i < spaces.length; i++) {
        if (col >= this.terminal.cols) {
          // 改行処理
          break;
        }
        
        // セルをクリア
        const cell = buffer.getLine(cursorPos.y).getCell(col);
        if (cell) {
          cell.content = 0x20; // スペース
          cell.width = 1;
        }
        
        col++;
      }
    }
  }

  /**
   * IME表示のレンダリング
   */
  _renderIMEDisplay(text) {
    const cursorPos = this.imeState.startPosition;
    
    // 下線付きで表示（IME変換中を示す）
    if (this.terminal._core) {
      const buffer = this.terminal.buffer.active;
      let col = cursorPos.x;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const width = this._getCharWidth(char);
        
        if (col >= this.terminal.cols) {
          // 改行処理
          break;
        }
        
        // セルに文字を設定
        const line = buffer.getLine(cursorPos.y);
        if (line) {
          const cell = line.getCell(col);
          if (cell) {
            cell.content = char.charCodeAt(0);
            cell.width = width;
            // 下線を追加（IMEインジケーター）
            cell.fg |= 0x400000; // Underline flag
          }
        }
        
        col += width;
      }
      
      // カーソル位置を更新
      this.terminal.buffer.active.x = col;
    }
    
    this.imeState.preEditLength = this._getStringWidth(text);
  }

  /**
   * IME入力の確定
   */
  _commitIMEInput(text) {
    if (!text) return;
    
    // IME表示をクリア
    if (this.imeState.compositionData) {
      this._clearIMEDisplay(this.imeState.compositionData);
    }
    
    // カーソルを開始位置に戻す
    if (this.terminal.buffer) {
      this.terminal.buffer.active.x = this.imeState.startPosition.x;
      this.terminal.buffer.active.y = this.imeState.startPosition.y;
    }
    
    // 確定文字列を送信
    this.terminal.onData(text);
  }

  /**
   * 文字幅測定用Canvasの準備
   */
  _setupMeasurementCanvas() {
    this.measureCanvas = document.createElement('canvas');
    this.measureContext = this.measureCanvas.getContext('2d');
    
    // フォント設定
    const fontSize = this.terminal.options.fontSize || 14;
    const fontFamily = this.terminal.options.fontFamily || 'monospace';
    this.measureContext.font = `${fontSize}px ${fontFamily}`;
  }

  /**
   * 文字幅の取得（キャッシュ付き）
   */
  _getCharWidth(char) {
    // キャッシュチェック
    if (this.widthCache.has(char)) {
      return this.widthCache.get(char);
    }
    
    let width;
    const code = char.charCodeAt(0);
    
    // East Asian Widthによる判定
    if (this._isFullWidth(code)) {
      width = 2;
    } else if (this._isHalfWidth(code)) {
      width = 1;
    } else {
      // 実測
      width = this._measureCharWidth(char);
    }
    
    // キャッシュに保存
    this._addToCache(char, width);
    
    return width;
  }

  /**
   * 文字列の総幅を取得
   */
  _getStringWidth(str) {
    let width = 0;
    for (const char of str) {
      width += this._getCharWidth(char);
    }
    return width;
  }

  /**
   * 実際の文字幅測定
   */
  _measureCharWidth(char) {
    const metrics = this.measureContext.measureText(char);
    const charWidth = metrics.width;
    
    // 等幅フォントの1文字幅を基準に判定
    const monoWidth = this.measureContext.measureText('M').width;
    
    // 1.5倍以上なら全角扱い
    return charWidth >= monoWidth * 1.5 ? 2 : 1;
  }

  /**
   * East Asian Width データの初期化
   */
  _initializeEAWData() {
    // Unicode範囲による全角/半角判定
    this.fullWidthRanges = [
      [0x1100, 0x115F],   // Hangul Jamo
      [0x2E80, 0x9FFF],   // CJK
      [0xAC00, 0xD7AF],   // Hangul Syllables
      [0xF900, 0xFAFF],   // CJK Compatibility Ideographs
      [0xFE30, 0xFE4F],   // CJK Compatibility Forms
      [0xFF00, 0xFF60],   // Fullwidth Forms
      [0xFFE0, 0xFFE6],   // Fullwidth Forms
      [0x20000, 0x2FFFF], // CJK Extension
      [0x30000, 0x3FFFF]  // CJK Extension
    ];
    
    this.halfWidthRanges = [
      [0x20, 0x7E],       // ASCII
      [0xFF61, 0xFF9F]    // Halfwidth Katakana
    ];
  }

  /**
   * 全角文字判定
   */
  _isFullWidth(code) {
    return this.fullWidthRanges.some(([start, end]) => 
      code >= start && code <= end
    );
  }

  /**
   * 半角文字判定
   */
  _isHalfWidth(code) {
    return this.halfWidthRanges.some(([start, end]) => 
      code >= start && code <= end
    );
  }

  /**
   * 現在のカーソル位置を取得
   */
  _getCurrentCursorPosition() {
    if (this.terminal.buffer) {
      return {
        x: this.terminal.buffer.active.x,
        y: this.terminal.buffer.active.y
      };
    }
    return { x: 0, y: 0 };
  }

  /**
   * IMEオーバーレイの位置調整
   */
  _positionIMEOverlay() {
    if (!this.imeOverlay) return;
    
    const cursorPos = this._getCurrentCursorPosition();
    const cellWidth = this.terminal._core?.renderer?.dimensions?.actualCellWidth || 9;
    const cellHeight = this.terminal._core?.renderer?.dimensions?.actualCellHeight || 17;
    
    const x = cursorPos.x * cellWidth;
    const y = cursorPos.y * cellHeight;
    
    this.imeOverlay.style.left = `${x}px`;
    this.imeOverlay.style.top = `${y + cellHeight}px`;
  }

  /**
   * IMEオーバーレイの表示
   */
  _showIMEOverlay() {
    if (this.imeOverlay) {
      this.imeOverlay.style.display = 'block';
      this._positionIMEOverlay();
    }
  }

  /**
   * IMEオーバーレイの非表示
   */
  _hideIMEOverlay() {
    if (this.imeOverlay) {
      this.imeOverlay.style.display = 'none';
    }
  }

  /**
   * IME中のキー処理
   */
  _handleIMEKeydown(e) {
    // ESCキーでIMEキャンセル
    if (e.key === 'Escape') {
      // TODO: IMEキャンセル処理
    }
  }

  /**
   * キャッシュ管理
   */
  _addToCache(char, width) {
    this.widthCache.set(char, width);
    
    // サイズ制限
    if (this.widthCache.size > this.widthCacheLimit) {
      // 古いエントリを削除（FIFO）
      const firstKey = this.widthCache.keys().next().value;
      this.widthCache.delete(firstKey);
    }
  }

  /**
   * イベント発火
   */
  _emit(event, data) {
    if (this.terminal.onIMEEvent) {
      this.terminal.onIMEEvent(event, data);
    }
  }

  /**
   * 設定の更新
   */
  updateConfig(config) {
    Object.assign(this.config, config);
    
    // フォント変更時はキャッシュクリア
    if (config.fontFamily) {
      this.widthCache.clear();
      this._setupMeasurementCanvas();
    }
  }

  /**
   * クリーンアップ
   */
  dispose() {
    // イベントリスナーの削除
    // TODO: removeEventListener
    
    // DOM要素の削除
    if (this.imeOverlay) {
      this.imeOverlay.remove();
    }
    if (this.candidateWindow) {
      this.candidateWindow.remove();
    }
    
    // キャッシュクリア
    this.widthCache.clear();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JapaneseInputSupport;
} else {
  window.JapaneseInputSupport = JapaneseInputSupport;
}