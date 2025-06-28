/**
 * Plugin Manager
 * ZeamiTermの拡張可能なプラグインシステム
 */

class PluginManager {
  constructor(terminal) {
    this.terminal = terminal;
    this.plugins = new Map();
    this.hooks = {
      // ライフサイクルフック
      beforeInit: [],
      afterInit: [],
      beforeDestroy: [],
      
      // レンダリングフック
      beforeRender: [],
      afterRender: [],
      
      // データフック
      onData: [],
      beforeSend: [],
      afterSend: [],
      
      // コマンドフック
      onCommand: [],
      beforeCommand: [],
      afterCommand: [],
      
      // Claude Code関連フック
      onClaudeOutput: [],
      onClaudeInput: [],
      onClaudeResponse: [],
      
      // UI関連フック
      onResize: [],
      onThemeChange: [],
      onFocus: [],
      onBlur: [],
      
      // カスタムフック
      custom: new Map()
    };
    
    // プラグインAPI
    this.api = this._createAPI();
    
    // プラグイン設定
    this.config = {
      enabledPlugins: [],
      pluginDirectory: './plugins',
      autoLoad: true,
      sandboxed: true
    };
    
    // 内部状態
    this.state = {
      initialized: false,
      loading: false
    };
    
    // イベントエミッター
    this.events = new EventTarget();
  }

  /**
   * プラグインマネージャーの初期化
   */
  async initialize() {
    if (this.state.initialized) return;
    
    this.state.loading = true;
    
    try {
      // beforeInitフック実行
      await this._runHooks('beforeInit');
      
      // 自動ロード
      if (this.config.autoLoad) {
        await this._autoLoadPlugins();
      }
      
      // afterInitフック実行
      await this._runHooks('afterInit');
      
      this.state.initialized = true;
      this._emit('initialized');
    } catch (error) {
      console.error('[PluginManager] Initialization failed:', error);
      this._emit('error', { error });
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * プラグインの登録
   * @param {Object} plugin - プラグインオブジェクト
   */
  async register(plugin) {
    // バリデーション
    if (!this._validatePlugin(plugin)) {
      throw new Error(`Invalid plugin: ${plugin.name || 'unknown'}`);
    }
    
    const { name } = plugin;
    
    // 既存チェック
    if (this.plugins.has(name)) {
      console.warn(`[PluginManager] Plugin ${name} already registered`);
      return;
    }
    
    console.log(`[PluginManager] Registering plugin: ${name}`);
    
    // メタデータ設定
    plugin._metadata = {
      registered: Date.now(),
      enabled: true,
      hooks: []
    };
    
    // プラグイン保存
    this.plugins.set(name, plugin);
    
    // フック登録
    this._registerHooks(plugin);
    
    // プラグイン初期化
    if (plugin.init) {
      try {
        await plugin.init(this.api);
        console.log(`[PluginManager] Plugin ${name} initialized`);
      } catch (error) {
        console.error(`[PluginManager] Plugin ${name} initialization failed:`, error);
        this.unregister(name);
        throw error;
      }
    }
    
    this._emit('plugin:registered', { plugin });
  }

  /**
   * プラグインの登録解除
   * @param {string} name - プラグイン名
   */
  async unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    
    console.log(`[PluginManager] Unregistering plugin: ${name}`);
    
    // beforeDestroyフック実行
    await this._runHooks('beforeDestroy');
    
    // プラグインのdestroy実行
    if (plugin.destroy) {
      try {
        await plugin.destroy();
      } catch (error) {
        console.error(`[PluginManager] Plugin ${name} destroy failed:`, error);
      }
    }
    
    // フック削除
    this._unregisterHooks(plugin);
    
    // プラグイン削除
    this.plugins.delete(name);
    
    this._emit('plugin:unregistered', { name });
  }

  /**
   * プラグインの有効/無効切り替え
   * @param {string} name - プラグイン名
   * @param {boolean} enabled - 有効/無効
   */
  setEnabled(name, enabled) {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    
    plugin._metadata.enabled = enabled;
    
    if (enabled && plugin.onEnable) {
      plugin.onEnable();
    } else if (!enabled && plugin.onDisable) {
      plugin.onDisable();
    }
    
    this._emit('plugin:toggled', { name, enabled });
  }

  /**
   * フックの実行
   * @param {string} hookName - フック名
   * @param {any} data - フックに渡すデータ
   * @returns {any} 処理されたデータ
   */
  async runHook(hookName, data) {
    return this._runHooks(hookName, data);
  }

  /**
   * カスタムフックの登録
   * @param {string} name - フック名
   * @param {Function} handler - ハンドラー
   */
  addCustomHook(name, handler) {
    if (!this.hooks.custom.has(name)) {
      this.hooks.custom.set(name, []);
    }
    this.hooks.custom.get(name).push(handler);
  }

  /**
   * プラグインAPIの作成
   * @private
   */
  _createAPI() {
    return {
      // ターミナルアクセス
      terminal: this.terminal,
      
      // フック登録
      addHook: (hookName, handler) => {
        if (this.hooks[hookName]) {
          this.hooks[hookName].push(handler);
        } else {
          this.addCustomHook(hookName, handler);
        }
      },
      
      // イベント
      on: (event, handler) => this.events.addEventListener(event, handler),
      off: (event, handler) => this.events.removeEventListener(event, handler),
      emit: (event, data) => this._emit(event, data),
      
      // コマンド登録
      registerCommand: (command, handler) => {
        this._registerCommand(command, handler);
      },
      
      // UI拡張
      ui: {
        addToolbarButton: (config) => this._addToolbarButton(config),
        addContextMenu: (config) => this._addContextMenu(config),
        addPanel: (config) => this._addPanel(config),
        showNotification: (message, type) => this._showNotification(message, type)
      },
      
      // ストレージ
      storage: {
        get: (key) => this._getStorage(key),
        set: (key, value) => this._setStorage(key, value),
        remove: (key) => this._removeStorage(key)
      },
      
      // ユーティリティ
      utils: {
        debounce: this._debounce,
        throttle: this._throttle,
        uuid: this._uuid
      },
      
      // 他のプラグインへのアクセス
      getPlugin: (name) => this.plugins.get(name),
      
      // 設定アクセス
      getConfig: () => this.config,
      
      // Claude Codeブリッジ
      claude: {
        send: (message) => this._sendToClaude(message),
        onResponse: (handler) => this.addHook('onClaudeResponse', handler)
      }
    };
  }

  /**
   * プラグインのバリデーション
   * @private
   */
  _validatePlugin(plugin) {
    // 必須フィールド
    if (!plugin.name || typeof plugin.name !== 'string') {
      console.error('[PluginManager] Plugin must have a name');
      return false;
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      console.error('[PluginManager] Plugin must have a version');
      return false;
    }
    
    // 予約名チェック
    const reservedNames = ['core', 'system', 'internal'];
    if (reservedNames.includes(plugin.name)) {
      console.error(`[PluginManager] Plugin name '${plugin.name}' is reserved`);
      return false;
    }
    
    return true;
  }

  /**
   * フックの登録
   * @private
   */
  _registerHooks(plugin) {
    const hookNames = Object.keys(this.hooks);
    
    for (const hookName of hookNames) {
      if (hookName === 'custom') continue;
      
      if (typeof plugin[hookName] === 'function') {
        const handler = plugin[hookName].bind(plugin);
        this.hooks[hookName].push(handler);
        plugin._metadata.hooks.push({ name: hookName, handler });
      }
    }
  }

  /**
   * フックの登録解除
   * @private
   */
  _unregisterHooks(plugin) {
    for (const { name, handler } of plugin._metadata.hooks) {
      const index = this.hooks[name].indexOf(handler);
      if (index !== -1) {
        this.hooks[name].splice(index, 1);
      }
    }
  }

  /**
   * フックの実行
   * @private
   */
  async _runHooks(hookName, data) {
    const hooks = this.hooks[hookName] || this.hooks.custom.get(hookName) || [];
    let result = data;
    
    for (const hook of hooks) {
      try {
        const pluginName = this._getPluginNameByHook(hook);
        const plugin = pluginName ? this.plugins.get(pluginName) : null;
        
        // 無効なプラグインはスキップ
        if (plugin && !plugin._metadata.enabled) continue;
        
        // フック実行
        const hookResult = await hook(result);
        
        // 結果の更新（undefinedでない場合）
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`[PluginManager] Hook ${hookName} error:`, error);
      }
    }
    
    return result;
  }

  /**
   * プラグインの自動ロード
   * @private
   */
  async _autoLoadPlugins() {
    // ビルトインプラグインのロード
    const builtinPlugins = [
      './builtin/zeami-integration',
      './builtin/vim-mode',
      './builtin/syntax-highlighter'
    ];
    
    for (const path of builtinPlugins) {
      try {
        const plugin = require(path);
        await this.register(plugin);
      } catch (error) {
        console.warn(`[PluginManager] Failed to load builtin plugin ${path}:`, error);
      }
    }
    
    // カスタムプラグインのロード
    // TODO: ディレクトリスキャン実装
  }

  /**
   * コマンドの登録
   * @private
   */
  _registerCommand(command, handler) {
    // TODO: コマンドシステムとの統合
    console.log(`[PluginManager] Registering command: ${command}`);
  }

  /**
   * UI拡張メソッド
   * @private
   */
  _addToolbarButton(config) {
    // TODO: ツールバー実装
    console.log('[PluginManager] Adding toolbar button:', config);
  }

  _addContextMenu(config) {
    // TODO: コンテキストメニュー実装
    console.log('[PluginManager] Adding context menu:', config);
  }

  _addPanel(config) {
    // TODO: パネル実装
    console.log('[PluginManager] Adding panel:', config);
  }

  _showNotification(message, type = 'info') {
    // TODO: 通知システム実装
    console.log(`[PluginManager] Notification [${type}]:`, message);
  }

  /**
   * ストレージメソッド
   * @private
   */
  _getStorage(key) {
    const storageKey = `zeami-plugin:${key}`;
    const value = localStorage.getItem(storageKey);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  _setStorage(key, value) {
    const storageKey = `zeami-plugin:${key}`;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(storageKey, serialized);
  }

  _removeStorage(key) {
    const storageKey = `zeami-plugin:${key}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * ユーティリティメソッド
   * @private
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  _throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Claude Code連携
   * @private
   */
  _sendToClaude(message) {
    // TODO: Claude Codeブリッジとの統合
    console.log('[PluginManager] Sending to Claude:', message);
  }

  /**
   * イベント発火
   * @private
   */
  _emit(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    this.events.dispatchEvent(event);
  }

  /**
   * フックからプラグイン名を取得
   * @private
   */
  _getPluginNameByHook(hook) {
    for (const [name, plugin] of this.plugins) {
      for (const { handler } of plugin._metadata.hooks) {
        if (handler === hook) return name;
      }
    }
    return null;
  }

  /**
   * クリーンアップ
   */
  async dispose() {
    // 全プラグインの登録解除
    const pluginNames = Array.from(this.plugins.keys());
    for (const name of pluginNames) {
      await this.unregister(name);
    }
    
    // フッククリア
    for (const key in this.hooks) {
      if (Array.isArray(this.hooks[key])) {
        this.hooks[key] = [];
      }
    }
    
    this.hooks.custom.clear();
    this.state.initialized = false;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginManager;
} else {
  window.PluginManager = PluginManager;
}