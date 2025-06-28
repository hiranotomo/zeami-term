/**
 * Terminal Integration Layer
 * Phase 2-A実装の新機能を既存のTerminalManagerに統合
 */

class TerminalIntegration {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    
    // 新しいモジュールのインスタンス
    this.patches = null;
    this.claudeParser = null;
    this.claudeBridge = null;
    this.japaneseSupport = new Map(); // terminalId -> JapaneseInputSupport
    this.pluginManager = null;
    
    // 統合フラグ
    this.features = {
      patchesEnabled: true,
      claudeBridgeEnabled: true,
      japaneseEnabled: true,
      pluginsEnabled: true
    };
  }

  /**
   * 統合の初期化
   */
  async initialize() {
    console.log('[Integration] Initializing Phase 2-A features...');
    
    try {
      // 1. xterm.js パッチの適用
      if (this.features.patchesEnabled) {
        await this._applyPatches();
      }
      
      // 2. Claude Code 統合の初期化
      if (this.features.claudeBridgeEnabled) {
        await this._initializeClaudeBridge();
      }
      
      // 3. プラグインシステムの初期化
      if (this.features.pluginsEnabled) {
        await this._initializePluginSystem();
      }
      
      // 4. 既存のターミナルに新機能を適用
      this._applyToExistingTerminals();
      
      console.log('[Integration] Phase 2-A features initialized successfully');
    } catch (error) {
      console.error('[Integration] Initialization failed:', error);
    }
  }

  /**
   * xterm.js パッチの適用
   */
  async _applyPatches() {
    try {
      // 動的インポート（require回避）
      if (window.XtermPatches) {
        this.patches = window.XtermPatches;
      } else {
        // スクリプトタグで読み込み
        await this._loadScript('../core/xterm-patches.js');
        this.patches = window.XtermPatches;
      }
      
      if (this.patches && window.Terminal) {
        this.patches.applyAll(window.Terminal);
        console.log('[Integration] xterm.js patches applied');
      }
    } catch (error) {
      console.error('[Integration] Failed to apply patches:', error);
    }
  }

  /**
   * Claude Code ブリッジの初期化
   */
  async _initializeClaudeBridge() {
    try {
      // パーサーの初期化
      if (window.ClaudeOutputParser) {
        this.claudeParser = new window.ClaudeOutputParser();
      } else {
        await this._loadScript('../features/claude-bridge/claude-output-parser.js');
        this.claudeParser = new window.ClaudeOutputParser();
      }
      
      // ブリッジクラスの読み込み
      if (!window.ClaudeCodeBridge) {
        await this._loadScript('../features/claude-bridge/claude-code-bridge.js');
      }
      
      console.log('[Integration] Claude Code bridge initialized');
    } catch (error) {
      console.error('[Integration] Failed to initialize Claude bridge:', error);
    }
  }

  /**
   * プラグインシステムの初期化
   */
  async _initializePluginSystem() {
    try {
      if (!window.PluginManager) {
        await this._loadScript('../features/plugin-system/plugin-manager.js');
      }
      
      // グローバルプラグインマネージャー（全ターミナル共通）
      this.pluginManager = new window.PluginManager(null);
      await this.pluginManager.initialize();
      
      // ビルトインプラグインの登録
      await this._registerBuiltinPlugins();
      
      console.log('[Integration] Plugin system initialized');
    } catch (error) {
      console.error('[Integration] Failed to initialize plugin system:', error);
    }
  }

  /**
   * ターミナル作成時のフック
   */
  onTerminalCreated(terminalId, terminal, terminalData) {
    console.log(`[Integration] Enhancing terminal ${terminalId}`);
    
    // 1. 日本語サポートの追加
    if (this.features.japaneseEnabled) {
      this._addJapaneseSupport(terminalId, terminal);
    }
    
    // 2. Claude Code ブリッジの追加
    if (this.features.claudeBridgeEnabled && this.claudeParser) {
      this._addClaudeBridge(terminalId, terminal);
    }
    
    // 3. プラグインフックの実行
    if (this.pluginManager) {
      this.pluginManager.runHook('onTerminalCreated', { terminalId, terminal });
    }
    
    // 4. パフォーマンス最適化の適用
    this._optimizeTerminal(terminal);
  }

  /**
   * ターミナル破棄時のフック
   */
  onTerminalDestroyed(terminalId) {
    console.log(`[Integration] Cleaning up terminal ${terminalId}`);
    
    // 日本語サポートのクリーンアップ
    if (this.japaneseSupport.has(terminalId)) {
      this.japaneseSupport.get(terminalId).dispose();
      this.japaneseSupport.delete(terminalId);
    }
    
    // Claude ブリッジのクリーンアップ
    if (this.claudeBridges && this.claudeBridges.has(terminalId)) {
      this.claudeBridges.get(terminalId).dispose();
      this.claudeBridges.delete(terminalId);
    }
    
    // プラグインフックの実行
    if (this.pluginManager) {
      this.pluginManager.runHook('onTerminalDestroyed', { terminalId });
    }
  }

  /**
   * 日本語サポートの追加
   */
  async _addJapaneseSupport(terminalId, terminal) {
    try {
      if (!window.JapaneseInputSupport) {
        await this._loadScript('../features/japanese-support/japanese-input-support.js');
      }
      
      const support = new window.JapaneseInputSupport(terminal);
      this.japaneseSupport.set(terminalId, support);
      
      console.log(`[Integration] Japanese support added to terminal ${terminalId}`);
    } catch (error) {
      console.error('[Integration] Failed to add Japanese support:', error);
    }
  }

  /**
   * Claude Code ブリッジの追加
   */
  _addClaudeBridge(terminalId, terminal) {
    try {
      if (!this.claudeBridges) {
        this.claudeBridges = new Map();
      }
      
      const bridge = new window.ClaudeCodeBridge(terminal, this.claudeParser);
      this.claudeBridges.set(terminalId, bridge);
      
      // 構造化出力の検出
      bridge.on('structured', (parsed) => {
        this._handleStructuredOutput(terminalId, parsed);
      });
      
      console.log(`[Integration] Claude bridge added to terminal ${terminalId}`);
    } catch (error) {
      console.error('[Integration] Failed to add Claude bridge:', error);
    }
  }

  /**
   * ターミナルの最適化
   */
  _optimizeTerminal(terminal) {
    // レンダリング最適化が有効な場合
    if (terminal._renderQueue) {
      console.log('[Integration] Render queue optimization active');
    }
    
    // 文字幅キャッシュの監視
    if (terminal._charWidthCache) {
      setInterval(() => {
        if (terminal._charWidthCache.size > 5000) {
          console.log('[Integration] Optimizing character width cache');
          terminal._optimizeMemory();
        }
      }, 30000);
    }
  }

  /**
   * 構造化出力のハンドリング
   */
  _handleStructuredOutput(terminalId, parsed) {
    // プラグインに通知
    if (this.pluginManager) {
      this.pluginManager.runHook('onClaudeOutput', { terminalId, parsed });
    }
    
    // 特殊な処理が必要な出力タイプ
    for (const segment of parsed.segments) {
      switch (segment.type) {
        case 'zeami_command':
          this._highlightZeamiCommand(terminalId, segment);
          break;
        case 'error':
          this._handleError(terminalId, segment);
          break;
        case 'code':
          this._enhanceCodeBlock(terminalId, segment);
          break;
      }
    }
  }

  /**
   * 既存のターミナルに新機能を適用
   */
  _applyToExistingTerminals() {
    if (!this.terminalManager.terminals) return;
    
    this.terminalManager.terminals.forEach((terminalData, terminalId) => {
      this.onTerminalCreated(terminalId, terminalData.terminal, terminalData);
    });
  }

  /**
   * ビルトインプラグインの登録
   */
  async _registerBuiltinPlugins() {
    // Zeami統合プラグイン
    const zeamiPlugin = {
      name: 'zeami-integration',
      version: '1.0.0',
      
      init(api) {
        console.log('[Plugin] Zeami integration initialized');
        
        // Zeamiコマンドの自動補完
        api.addHook('onData', (data) => {
          if (data.includes('zeami')) {
            // ハイライト処理
          }
          return data;
        });
      },
      
      onClaudeOutput(data) {
        const { parsed } = data;
        if (parsed.metadata.hasZeamiCommand) {
          console.log('[Plugin] Zeami command detected in Claude output');
        }
      }
    };
    
    await this.pluginManager.register(zeamiPlugin);
  }

  /**
   * スクリプトの動的読み込み
   */
  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * 特殊処理メソッド
   */
  
  _highlightZeamiCommand(terminalId, segment) {
    // TODO: Zeamiコマンドのハイライト
    console.log(`[Integration] Zeami command in terminal ${terminalId}:`, segment.content);
  }
  
  _handleError(terminalId, segment) {
    // エラー記録
    if (window.api && window.api.recordError) {
      window.api.recordError('claude-output', segment.content, '');
    }
  }
  
  _enhanceCodeBlock(terminalId, segment) {
    // TODO: シンタックスハイライト
    console.log(`[Integration] Code block detected:`, segment.metadata.language);
  }

  /**
   * 公開API
   */
  
  getClaudeBridge(terminalId) {
    return this.claudeBridges?.get(terminalId);
  }
  
  getJapaneseSupport(terminalId) {
    return this.japaneseSupport.get(terminalId);
  }
  
  sendToClaude(terminalId, type, content, options) {
    const bridge = this.getClaudeBridge(terminalId);
    if (bridge) {
      return bridge.sendMessage(type, content, options);
    }
    throw new Error(`No Claude bridge for terminal ${terminalId}`);
  }
  
  parseClaudeOutput(output) {
    if (this.claudeParser) {
      return this.claudeParser.parse(output);
    }
    return null;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerminalIntegration;
} else {
  window.TerminalIntegration = TerminalIntegration;
}