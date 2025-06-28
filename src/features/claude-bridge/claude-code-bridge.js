/**
 * Claude Code Bridge
 * Claude Codeとの双方向通信を管理
 */

class ClaudeCodeBridge {
  constructor(terminal, parser) {
    this.terminal = terminal;
    this.parser = parser || new (require('./claude-output-parser'))();
    
    // 通信管理
    this.commandQueue = [];
    this.responseHandlers = new Map();
    this.activeCommands = new Map();
    
    // 設定
    this.config = {
      responseTimeout: 30000, // 30秒
      maxRetries: 3,
      enableDebug: false
    };
    
    // 統計情報
    this.stats = {
      sent: 0,
      received: 0,
      errors: 0,
      avgResponseTime: 0
    };
    
    // イベントエミッター
    this.eventHandlers = {
      response: [],
      error: [],
      timeout: [],
      structured: []
    };
    
    this._initialize();
  }

  /**
   * 初期化
   */
  _initialize() {
    // ターミナル出力の監視
    if (this.terminal.onData) {
      this._originalOnData = this.terminal.onData.bind(this.terminal);
      
      this.terminal.onData((data) => {
        // オリジナルの処理
        if (this._originalOnData) {
          this._originalOnData(data);
        }
        
        // Claude出力の検出
        this._detectResponse(data);
      });
    }
    
    // デバッグモード
    if (this.config.enableDebug) {
      this.on('response', (response) => {
        console.log('[ClaudeBridge] Response:', response);
      });
    }
  }

  /**
   * Claude Codeへメッセージを送信
   * @param {string} type - メッセージタイプ
   * @param {string} content - コンテンツ
   * @param {Object} options - オプション
   * @returns {Promise} レスポンスのPromise
   */
  async sendMessage(type, content, options = {}) {
    const message = {
      id: this._generateId(),
      type,
      content,
      metadata: options.metadata || {},
      timestamp: Date.now(),
      retryCount: 0
    };
    
    // フォーマット
    const formatted = this._formatMessage(message, options);
    
    // 送信前フック
    if (options.beforeSend) {
      await options.beforeSend(message);
    }
    
    // 統計更新
    this.stats.sent++;
    
    // レスポンスPromise作成
    const responsePromise = new Promise((resolve, reject) => {
      const handler = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this._handleTimeout(message);
          reject(new Error(`Timeout waiting for response to ${message.id}`));
        }, options.timeout || this.config.responseTimeout)
      };
      
      this.responseHandlers.set(message.id, handler);
      this.activeCommands.set(message.id, message);
    });
    
    // 送信
    this._send(formatted);
    
    return responsePromise;
  }

  /**
   * プロンプトテンプレートを使用してメッセージ送信
   * @param {string} template - テンプレート名
   * @param {Object} params - パラメータ
   * @returns {Promise}
   */
  async sendWithTemplate(template, params) {
    const content = this.promptTemplates[template];
    
    if (!content) {
      throw new Error(`Unknown template: ${template}`);
    }
    
    // テンプレート処理
    const processed = typeof content === 'function' 
      ? content(params)
      : this._processTemplate(content, params);
    
    return this.sendMessage('template', processed, {
      metadata: { template, params }
    });
  }

  /**
   * プロンプトテンプレート
   */
  promptTemplates = {
    // Zeamiコマンド実行
    zeamiCommand: ({ command, args = [] }) => 
      `zeami ${command} ${args.join(' ')} --json`,
    
    // コード生成
    codeGeneration: ({ description, language = 'javascript', requirements = [] }) => `
Please generate ${language} code for the following:
${description}

Requirements:
${requirements.map(r => `- ${r}`).join('\n')}

Please include:
- Proper error handling
- JSDoc/TypeScript annotations
- Unit tests if applicable
`,
    
    // コード説明
    codeExplanation: ({ code, language = 'javascript' }) => `
Please explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Include:
- What the code does
- How it works
- Any potential issues or improvements
`,
    
    // エラー解決
    errorResolution: ({ error, context, stackTrace }) => `
I'm encountering this error:
\`\`\`
${error}
\`\`\`

Stack trace:
\`\`\`
${stackTrace || 'Not available'}
\`\`\`

Context: ${context}

Please help me:
1. Understand what's causing this error
2. How to fix it
3. How to prevent it in the future
`,
    
    // リファクタリング
    refactoring: ({ code, goals = [], language = 'javascript' }) => `
Please refactor this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Goals:
${goals.map(g => `- ${g}`).join('\n')}

Maintain the same functionality while improving the code quality.
`,
    
    // アーキテクチャ相談
    architecture: ({ description, constraints = [], technologies = [] }) => `
I need help with architecture design:

Project: ${description}

Constraints:
${constraints.map(c => `- ${c}`).join('\n')}

Available technologies:
${technologies.map(t => `- ${t}`).join('\n')}

Please suggest:
1. Overall architecture
2. Key components
3. Data flow
4. Potential challenges
`,
    
    // テスト生成
    testGeneration: ({ code, framework = 'jest', language = 'javascript' }) => `
Please generate ${framework} tests for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
- Unit tests for all functions
- Edge cases
- Error scenarios
- Mocking where appropriate
`
  };

  /**
   * Claude出力の検出と処理
   * @private
   */
  _detectResponse(data) {
    // バッファに追加
    if (!this._outputBuffer) {
      this._outputBuffer = '';
    }
    
    this._outputBuffer += data;
    
    // レスポンスの終了を検出
    if (this._isResponseComplete(this._outputBuffer)) {
      const response = this._outputBuffer;
      this._outputBuffer = '';
      
      // パース
      const parsed = this.parser.parse(response);
      
      // 構造化イベント発火
      this.emit('structured', parsed);
      
      // アクティブなコマンドへのレスポンスか確認
      this._matchResponse(parsed);
      
      // 統計更新
      this.stats.received++;
    }
  }

  /**
   * レスポンスの完了を検出
   * @private
   */
  _isResponseComplete(buffer) {
    // 複数の条件でレスポンス完了を判断
    const indicators = [
      /\n\$ $/, // プロンプトが表示された
      /<\/antml:function_calls>/, // function call終了
      /\n{2,}$/, // 複数の改行
      /\[DONE\]/, // 明示的な終了マーカー
    ];
    
    return indicators.some(pattern => pattern.test(buffer));
  }

  /**
   * レスポンスとコマンドのマッチング
   * @private
   */
  _matchResponse(parsed) {
    // メタデータからIDを探す
    let commandId = null;
    
    // レスポンス内のIDを検索
    for (const segment of parsed.segments) {
      if (segment.type === 'json') {
        try {
          const json = JSON.parse(segment.content);
          if (json.commandId) {
            commandId = json.commandId;
            break;
          }
        } catch (e) {
          // JSONパースエラーは無視
        }
      }
    }
    
    // IDが見つからない場合は最新のコマンドとマッチ
    if (!commandId && this.activeCommands.size > 0) {
      const commands = Array.from(this.activeCommands.keys());
      commandId = commands[commands.length - 1];
    }
    
    if (commandId && this.responseHandlers.has(commandId)) {
      const handler = this.responseHandlers.get(commandId);
      const command = this.activeCommands.get(commandId);
      
      // タイムアウトクリア
      clearTimeout(handler.timeout);
      
      // レスポンス時間計算
      const responseTime = Date.now() - command.timestamp;
      this._updateAvgResponseTime(responseTime);
      
      // ハンドラー実行
      handler.resolve({
        commandId,
        command,
        response: parsed,
        responseTime
      });
      
      // クリーンアップ
      this.responseHandlers.delete(commandId);
      this.activeCommands.delete(commandId);
    }
  }

  /**
   * メッセージのフォーマット
   * @private
   */
  _formatMessage(message, options) {
    let formatted = '';
    
    // デバッグモードではメタデータを含める
    if (this.config.enableDebug || options.includeMetadata) {
      formatted += `[CLAUDE_BRIDGE:${message.id}]\n`;
    }
    
    // 本文
    formatted += message.content;
    
    // コマンドIDを埋め込む（レスポンス検出用）
    if (!options.noId) {
      formatted += `\n<!-- commandId: ${message.id} -->`;
    }
    
    return formatted;
  }

  /**
   * 実際の送信処理
   * @private
   */
  _send(formatted) {
    // ターミナルにペースト
    if (this.terminal.paste) {
      this.terminal.paste(formatted);
    } else {
      // pasteがない場合はonDataを使用
      this.terminal.onData(formatted);
    }
    
    // 改行を送信してコマンド実行
    if (this.terminal.onData) {
      this.terminal.onData('\r');
    }
  }

  /**
   * タイムアウト処理
   * @private
   */
  _handleTimeout(message) {
    this.emit('timeout', message);
    
    // リトライ
    if (message.retryCount < this.config.maxRetries) {
      message.retryCount++;
      console.log(`[ClaudeBridge] Retrying command ${message.id} (${message.retryCount}/${this.config.maxRetries})`);
      
      // 再送信
      setTimeout(() => {
        this._send(this._formatMessage(message, {}));
      }, 1000 * message.retryCount);
    } else {
      // リトライ上限
      this.stats.errors++;
      this.emit('error', {
        type: 'timeout',
        message,
        error: new Error('Max retries exceeded')
      });
      
      // クリーンアップ
      this.responseHandlers.delete(message.id);
      this.activeCommands.delete(message.id);
    }
  }

  /**
   * イベントリスナー登録
   */
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * イベント発火
   */
  emit(event, data) {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[ClaudeBridge] Event handler error:`, error);
        }
      });
    }
  }

  /**
   * ユーティリティメソッド
   */
  
  _generateId() {
    return `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  _processTemplate(template, params) {
    let processed = template;
    
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    return processed;
  }
  
  _updateAvgResponseTime(responseTime) {
    const total = this.stats.avgResponseTime * (this.stats.received - 1) + responseTime;
    this.stats.avgResponseTime = Math.round(total / this.stats.received);
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    return {
      ...this.stats,
      activeCommands: this.activeCommands.size,
      pendingResponses: this.responseHandlers.size
    };
  }

  /**
   * クリーンアップ
   */
  dispose() {
    // タイムアウトクリア
    for (const handler of this.responseHandlers.values()) {
      clearTimeout(handler.timeout);
    }
    
    this.responseHandlers.clear();
    this.activeCommands.clear();
    this.commandQueue = [];
    this._outputBuffer = '';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClaudeCodeBridge;
} else {
  window.ClaudeCodeBridge = ClaudeCodeBridge;
}