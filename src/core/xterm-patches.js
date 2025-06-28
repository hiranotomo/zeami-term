/**
 * xterm.js Patch Layer
 * xterm.jsの動作を外部から拡張・修正するパッチシステム
 */

class XtermPatches {
  static applied = false;

  /**
   * すべてのパッチを適用
   * @param {Terminal} Terminal - xterm.js Terminal クラス
   */
  static applyAll(Terminal) {
    if (this.applied) {
      console.warn('Patches already applied');
      return;
    }

    console.log('Applying xterm.js patches...');
    
    this.patchSelection(Terminal);
    this.patchRenderer(Terminal);
    this.patchJapaneseHandling(Terminal);
    this.patchPerformance(Terminal);
    this.patchAccessibility(Terminal);
    
    this.applied = true;
    console.log('All patches applied successfully');
  }

  /**
   * 選択色の透明度対応パッチ
   */
  static patchSelection(Terminal) {
    // 選択レンダリングのオーバーライド
    const originalRefreshSelection = Terminal.prototype._refreshSelection;
    
    Terminal.prototype._refreshSelection = function() {
      try {
        // オリジナルの処理を実行
        const result = originalRefreshSelection?.call(this);
        
        // カスタム選択色処理
        this._applyTransparentSelection();
        
        return result;
      } catch (error) {
        console.error('Selection patch error:', error);
        return originalRefreshSelection?.call(this);
      }
    };

    // 透明選択色の適用
    Terminal.prototype._applyTransparentSelection = function() {
      if (!this.element) return;
      
      // Canvas/WebGLレンダラーへの直接アクセス
      const renderer = this._core?._renderService?._renderer;
      if (!renderer) return;
      
      // 選択色のアルファ値を強制的に設定
      if (renderer._colors && this.options.theme?.selectionBackground) {
        const color = this.options.theme.selectionBackground;
        // RGBA形式の場合、アルファ値を保持
        if (color.includes('rgba') || color.match(/#[\da-f]{8}/i)) {
          renderer._colors.selectionTransparent = this._parseColorWithAlpha(color);
        }
      }
    };

    // アルファ値付き色のパース
    Terminal.prototype._parseColorWithAlpha = function(color) {
      if (color.startsWith('rgba')) {
        const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) {
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: parseFloat(match[4])
          };
        }
      } else if (color.match(/#[\da-f]{8}/i)) {
        // #RRGGBBAA形式
        return {
          r: parseInt(color.slice(1, 3), 16),
          g: parseInt(color.slice(3, 5), 16),
          b: parseInt(color.slice(5, 7), 16),
          a: parseInt(color.slice(7, 9), 16) / 255
        };
      }
      return null;
    };
  }

  /**
   * レンダリングパフォーマンスの最適化
   */
  static patchRenderer(Terminal) {
    // レンダリングキューの実装
    Terminal.prototype._renderQueue = [];
    Terminal.prototype._renderTimer = null;
    
    const originalWrite = Terminal.prototype.write;
    
    Terminal.prototype.write = function(data, callback) {
      // 大量データの場合はキューイング
      if (data.length > 1000) {
        this._queueRender(data, callback);
      } else {
        originalWrite.call(this, data, callback);
      }
    };
    
    Terminal.prototype._queueRender = function(data, callback) {
      // データをチャンクに分割
      const chunkSize = 1000;
      for (let i = 0; i < data.length; i += chunkSize) {
        this._renderQueue.push({
          data: data.slice(i, i + chunkSize),
          callback: i + chunkSize >= data.length ? callback : null
        });
      }
      
      if (!this._renderTimer) {
        this._renderTimer = requestAnimationFrame(() => this._flushRenderQueue());
      }
    };
    
    Terminal.prototype._flushRenderQueue = function() {
      const startTime = performance.now();
      const maxTime = 16; // 60fps target
      
      while (this._renderQueue.length > 0 && performance.now() - startTime < maxTime) {
        const item = this._renderQueue.shift();
        originalWrite.call(this, item.data, item.callback);
      }
      
      if (this._renderQueue.length > 0) {
        this._renderTimer = requestAnimationFrame(() => this._flushRenderQueue());
      } else {
        this._renderTimer = null;
      }
    };
  }

  /**
   * 日本語処理の改善
   */
  static patchJapaneseHandling(Terminal) {
    // IME状態管理
    Terminal.prototype._imeState = {
      composing: false,
      buffer: '',
      startCol: 0,
      startRow: 0
    };
    
    // 文字幅計算のキャッシュ
    Terminal.prototype._charWidthCache = new Map();
    
    // 文字幅計算の最適化
    const originalGetCharWidth = Terminal.prototype._getCharWidth;
    
    Terminal.prototype._getCharWidth = function(char) {
      // キャッシュチェック
      if (this._charWidthCache.has(char)) {
        return this._charWidthCache.get(char);
      }
      
      let width;
      const code = char.charCodeAt(0);
      
      // East Asian Width に基づく判定
      if (this._isFullWidthChar(code)) {
        width = 2;
      } else if (this._isHalfWidthChar(code)) {
        width = 1;
      } else {
        // オリジナルの処理にフォールバック
        width = originalGetCharWidth?.call(this, char) || 1;
      }
      
      // キャッシュに保存
      this._charWidthCache.set(char, width);
      
      return width;
    };
    
    // 全角文字判定
    Terminal.prototype._isFullWidthChar = function(code) {
      return (
        (code >= 0x1100 && code <= 0x115F) || // Hangul Jamo
        (code >= 0x2E80 && code <= 0x9FFF) || // CJK
        (code >= 0xAC00 && code <= 0xD7AF) || // Hangul Syllables
        (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility
        (code >= 0xFE30 && code <= 0xFE4F) || // CJK Compatibility Forms
        (code >= 0xFF00 && code <= 0xFF60) || // Fullwidth Forms
        (code >= 0xFFE0 && code <= 0xFFE6)    // Fullwidth Forms
      );
    };
    
    // 半角文字判定
    Terminal.prototype._isHalfWidthChar = function(code) {
      return (
        (code >= 0x20 && code <= 0x7E) ||     // ASCII
        (code >= 0xFF61 && code <= 0xFF9F)    // Halfwidth Katakana
      );
    };
  }

  /**
   * パフォーマンス最適化パッチ
   */
  static patchPerformance(Terminal) {
    // スクロールの最適化
    Terminal.prototype._scrollOptimized = true;
    
    const originalScrollLines = Terminal.prototype.scrollLines;
    
    Terminal.prototype.scrollLines = function(disp, suppressEvent) {
      // バッチスクロール
      if (Math.abs(disp) > 10) {
        // 大きなスクロールは段階的に実行
        const step = disp > 0 ? 10 : -10;
        const steps = Math.floor(disp / step);
        const remainder = disp % step;
        
        requestAnimationFrame(() => {
          for (let i = 0; i < steps; i++) {
            originalScrollLines.call(this, step, true);
          }
          if (remainder !== 0) {
            originalScrollLines.call(this, remainder, suppressEvent);
          }
        });
      } else {
        originalScrollLines.call(this, disp, suppressEvent);
      }
    };
    
    // メモリ使用量の最適化
    Terminal.prototype._optimizeMemory = function() {
      // 文字幅キャッシュのサイズ制限
      if (this._charWidthCache && this._charWidthCache.size > 10000) {
        // 古いエントリを削除
        const entries = Array.from(this._charWidthCache.entries());
        const toKeep = entries.slice(-5000);
        this._charWidthCache = new Map(toKeep);
      }
    };
    
    // 定期的なメモリ最適化
    setInterval(() => {
      const terminals = document.querySelectorAll('.xterm');
      terminals.forEach(term => {
        if (term.terminal && term.terminal._optimizeMemory) {
          term.terminal._optimizeMemory();
        }
      });
    }, 60000); // 1分ごと
  }

  /**
   * アクセシビリティ改善パッチ
   */
  static patchAccessibility(Terminal) {
    // スクリーンリーダー対応の改善
    Terminal.prototype._announceSelection = function() {
      const selection = this.getSelection();
      if (selection && this._accessibilityManager) {
        this._accessibilityManager.announce(`Selected: ${selection}`);
      }
    };
    
    // キーボードナビゲーションの改善
    Terminal.prototype._enhancedKeyboardNav = true;
    
    const originalAttachCustomKeyEventHandler = Terminal.prototype.attachCustomKeyEventHandler;
    
    Terminal.prototype.attachCustomKeyEventHandler = function(handler) {
      const enhancedHandler = (event) => {
        // 追加のキーボードショートカット
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'Home':
              this.scrollToTop();
              return false;
            case 'End':
              this.scrollToBottom();
              return false;
            case '+':
            case '=':
              if (event.shiftKey) {
                this.options.fontSize = Math.min(this.options.fontSize + 1, 30);
                this.refresh(0, this.rows - 1);
                return false;
              }
              break;
            case '-':
            case '_':
              this.options.fontSize = Math.max(this.options.fontSize - 1, 8);
              this.refresh(0, this.rows - 1);
              return false;
          }
        }
        
        // オリジナルのハンドラーを呼び出す
        return handler ? handler(event) : true;
      };
      
      return originalAttachCustomKeyEventHandler.call(this, enhancedHandler);
    };
  }

  /**
   * パッチの削除（必要に応じて）
   */
  static remove(Terminal) {
    // TODO: オリジナルのメソッドを復元
    console.log('Removing patches...');
    this.applied = false;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XtermPatches;
} else {
  window.XtermPatches = XtermPatches;
}