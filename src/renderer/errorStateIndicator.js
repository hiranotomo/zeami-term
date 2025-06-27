/**
 * エラー状態インジケーター
 * Claude Codeの通信エラーを検知して視覚的にフィードバックを提供
 */

class ErrorStateIndicator {
  constructor(terminal, container) {
    this.terminal = terminal;
    this.container = container;
    this.currentError = null;
    this.errorBanner = null;
    
    // エラーパターンと表示設定
    this.errorPatterns = {
      'Connection error': {
        color: '#ff6b6b',
        bgColor: 'rgba(255, 107, 107, 0.1)',
        icon: '🔌',
        message: 'ネットワーク接続エラー',
        suggestion: 'インターネット接続を確認してください'
      },
      'Request timed out': {
        color: '#ffd93d',
        bgColor: 'rgba(255, 217, 61, 0.1)',
        icon: '⏱️',
        message: 'リクエストタイムアウト',
        suggestion: 'しばらく待ってから再試行してください'
      },
      'OAuth token has expired': {
        color: '#ff9f1a',
        bgColor: 'rgba(255, 159, 26, 0.1)',
        icon: '🔑',
        message: '認証トークンの期限切れ',
        suggestion: 'Claude Codeに再ログインが必要です'
      },
      'API Error: 401': {
        color: '#ff9f1a',
        bgColor: 'rgba(255, 159, 26, 0.1)',
        icon: '🚫',
        message: '認証エラー',
        suggestion: 'アクセス権限を確認してください'
      },
      'fetch failed': {
        color: '#ff6b6b',
        bgColor: 'rgba(255, 107, 107, 0.1)',
        icon: '❌',
        message: 'ネットワークエラー',
        suggestion: 'ネットワーク設定を確認してください'
      }
    };
    
    this.setupTerminalHook();
  }

  /**
   * ターミナル出力を監視
   */
  setupTerminalHook() {
    // xterm.jsの出力をインターセプト
    const originalWrite = this.terminal.write.bind(this.terminal);
    
    this.terminal.write = (data) => {
      // エラーパターンをチェック
      this.detectErrors(data);
      
      // 元の書き込み処理を実行
      return originalWrite(data);
    };
  }

  /**
   * エラーパターンを検出
   */
  detectErrors(output) {
    const outputStr = typeof output === 'string' ? output : output.toString();
    
    for (const [pattern, config] of Object.entries(this.errorPatterns)) {
      if (outputStr.includes(pattern)) {
        this.showError(pattern, config);
        this.logError(pattern, outputStr);
        
        // Zeami CLIにエラーを記録
        this.recordToZeami(pattern, config.message);
        break;
      }
    }
    
    // エラーが解決したかチェック（成功パターン）
    if (this.currentError && this.isSuccessPattern(outputStr)) {
      this.hideError();
    }
  }

  /**
   * エラーバナーを表示
   */
  showError(errorType, config) {
    // 既存のバナーがあれば削除
    if (this.errorBanner) {
      this.errorBanner.remove();
    }
    
    // エラーバナーを作成
    this.errorBanner = document.createElement('div');
    this.errorBanner.className = 'zeami-error-banner';
    this.errorBanner.innerHTML = `
      <div class="error-content" style="
        background-color: ${config.bgColor};
        border-left: 4px solid ${config.color};
        padding: 12px 16px;
        margin: 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        animation: slideIn 0.3s ease-out;
      ">
        <span class="error-icon" style="font-size: 24px; margin-right: 12px;">
          ${config.icon}
        </span>
        <div class="error-details" style="flex: 1;">
          <div class="error-message" style="
            color: ${config.color};
            font-weight: bold;
            margin-bottom: 4px;
          ">
            ${config.message}
          </div>
          <div class="error-suggestion" style="
            color: #666;
            font-size: 0.9em;
          ">
            ${config.suggestion}
          </div>
        </div>
        <button class="error-dismiss" style="
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
          font-size: 20px;
        ">
          ×
        </button>
      </div>
    `;
    
    // 閉じるボタンのイベント
    this.errorBanner.querySelector('.error-dismiss').addEventListener('click', () => {
      this.hideError();
    });
    
    // コンテナの上部に挿入
    this.container.insertBefore(this.errorBanner, this.container.firstChild);
    
    this.currentError = errorType;
    
    // 自動非表示（30秒後）
    this.autoHideTimeout = setTimeout(() => {
      this.hideError();
    }, 30000);
  }

  /**
   * エラーバナーを非表示
   */
  hideError() {
    if (this.errorBanner) {
      this.errorBanner.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (this.errorBanner) {
          this.errorBanner.remove();
          this.errorBanner = null;
        }
      }, 300);
    }
    
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }
    
    this.currentError = null;
  }

  /**
   * 成功パターンの検出
   */
  isSuccessPattern(output) {
    const successPatterns = [
      'Connected',
      'Success',
      'Authenticated',
      'Ready',
      '200 OK'
    ];
    
    return successPatterns.some(pattern => output.includes(pattern));
  }

  /**
   * エラーログの記録
   */
  logError(errorType, fullOutput) {
    const timestamp = new Date().toISOString();
    console.error(`[Zeami Term Error] ${timestamp}: ${errorType}`);
    
    // ローカルストレージに最近のエラーを保存
    const recentErrors = JSON.parse(localStorage.getItem('zeami-term-errors') || '[]');
    recentErrors.push({
      timestamp,
      type: errorType,
      context: fullOutput.substring(0, 200) // 最初の200文字のみ
    });
    
    // 最新の10件のみ保持
    if (recentErrors.length > 10) {
      recentErrors.shift();
    }
    
    localStorage.setItem('zeami-term-errors', JSON.stringify(recentErrors));
  }

  /**
   * Zeami CLIに記録
   */
  async recordToZeami(errorType, message) {
    try {
      // IPCを通じてメインプロセスに送信
      if (window.electronAPI && window.electronAPI.recordError) {
        await window.electronAPI.recordError({
          error: errorType,
          solution: message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to record error to Zeami:', err);
    }
  }

  /**
   * 最近のエラー履歴を取得
   */
  getRecentErrors() {
    return JSON.parse(localStorage.getItem('zeami-term-errors') || '[]');
  }

  /**
   * クリーンアップ
   */
  dispose() {
    this.hideError();
    // 他のリソースのクリーンアップ
  }
}

// CSSアニメーション
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(-20px);
      opacity: 0;
    }
  }
  
  .zeami-error-banner {
    position: relative;
    z-index: 1000;
  }
  
  .error-dismiss:hover {
    color: #333 !important;
  }
`;
document.head.appendChild(style);

// Export as global for browser environment
window.ErrorStateIndicator = ErrorStateIndicator;