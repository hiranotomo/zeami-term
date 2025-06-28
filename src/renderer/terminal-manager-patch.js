/**
 * Terminal Manager Patch
 * Phase 2-A機能を既存のTerminalManagerに追加するパッチ
 */

// 統合レイヤーの初期化
function initializeTerminalIntegration() {
  console.log('[Patch] Initializing Terminal Integration...');
  
  // 統合レイヤーのスクリプトを読み込み
  const script = document.createElement('script');
  script.src = './terminal-integration.js';
  script.onload = () => {
    console.log('[Patch] Terminal Integration script loaded');
    
    // TerminalManagerのプロトタイプを拡張
    if (window.TerminalManager && window.TerminalIntegration) {
      patchTerminalManager();
    }
  };
  script.onerror = (error) => {
    console.error('[Patch] Failed to load Terminal Integration:', error);
    // 統合なしでも選択色修正だけは適用
    applySelectionFix();
  };
  document.head.appendChild(script);
}

// TerminalManagerにPhase 2-A機能を追加
function patchTerminalManager() {
  const TerminalManager = window.TerminalManager;
  const TerminalIntegration = window.TerminalIntegration;
  
  if (!TerminalManager || !TerminalIntegration) {
    console.error('[Patch] Required classes not found');
    return;
  }
  
  // 元のinitメソッドを保存
  const originalInit = TerminalManager.prototype.init;
  
  // initメソッドをオーバーライド
  TerminalManager.prototype.init = async function() {
    // 元のinitを実行
    await originalInit.call(this);
    
    // 統合レイヤーを初期化
    this._integration = new TerminalIntegration(this);
    await this._integration.initialize();
    
    console.log('[Patch] Terminal Integration initialized');
  };
  
  // 元のcreateTerminalメソッドを保存
  const originalCreateTerminal = TerminalManager.prototype.createTerminal;
  
  // createTerminalメソッドをオーバーライド
  TerminalManager.prototype.createTerminal = async function(options = {}) {
    // 元のcreateTerminalを実行
    const session = await originalCreateTerminal.call(this, options);
    
    if (session && this._integration) {
      // 統合レイヤーのフックを実行
      this._integration.onTerminalCreated(session.id, session.terminal, session);
    }
    
    return session;
  };
  
  // 元のcloseTerminalメソッドを保存（存在する場合）
  const originalCloseTerminal = TerminalManager.prototype.closeTerminal;
  
  if (originalCloseTerminal) {
    // closeTerminalメソッドをオーバーライド
    TerminalManager.prototype.closeTerminal = function(terminalId) {
      // 統合レイヤーのクリーンアップ
      if (this._integration) {
        this._integration.onTerminalDestroyed(terminalId);
      }
      
      // 元のcloseTerminalを実行
      return originalCloseTerminal.call(this, terminalId);
    };
  }
  
  // 新しいメソッドを追加：Claude Codeへのメッセージ送信
  TerminalManager.prototype.sendToClaude = function(type, content, options) {
    const activeTerminalId = this.activeTerminalId;
    if (!activeTerminalId || !this._integration) {
      throw new Error('No active terminal or integration not initialized');
    }
    
    return this._integration.sendToClaude(activeTerminalId, type, content, options);
  };
  
  // 新しいメソッドを追加：Claude出力の解析
  TerminalManager.prototype.parseClaudeOutput = function(output) {
    if (!this._integration) {
      throw new Error('Integration not initialized');
    }
    
    return this._integration.parseClaudeOutput(output);
  };
  
  // 新しいメソッドを追加：プラグインマネージャーへのアクセス
  TerminalManager.prototype.getPluginManager = function() {
    return this._integration?.pluginManager;
  };
  
  // 新しいメソッドを追加：日本語サポートの取得
  TerminalManager.prototype.getJapaneseSupport = function(terminalId) {
    const id = terminalId || this.activeTerminalId;
    return this._integration?.getJapaneseSupport(id);
  };
  
  console.log('[Patch] TerminalManager patched successfully');
}

// 選択色修正を直接適用（フォールバック）
function applySelectionFix() {
  console.log('[Patch] Applying direct selection fix...');
  
  if (!window.Terminal) {
    console.error('[Patch] Terminal not found, cannot apply selection fix');
    return;
  }
  
  // TerminalManagerのdefaultOptionsを直接修正
  if (window.TerminalManager) {
    const tm = window.TerminalManager.prototype;
    const originalInit = tm.init;
    
    tm.init = async function() {
      // 選択色を透明に設定
      this.defaultOptions.theme.selectionBackground = 'rgba(120, 150, 200, 0.3)';
      console.log('[Patch] Selection color set to transparent blue');
      
      // 元のinitを実行
      return originalInit.call(this);
    };
  }
  
  // 既存のターミナルに適用
  if (window.terminalManager && window.terminalManager.terminals) {
    window.terminalManager.terminals.forEach((session) => {
      if (session.terminal && session.terminal.options) {
        session.terminal.options.theme.selectionBackground = 'rgba(120, 150, 200, 0.3)';
        // 再描画をトリガー
        session.terminal.refresh(0, session.terminal.rows - 1);
      }
    });
  }
  
  // Terminal prototypeにパッチを適用
  const originalConstructor = window.Terminal;
  window.Terminal = function(options = {}) {
    if (!options.theme) options.theme = {};
    options.theme.selectionBackground = 'rgba(120, 150, 200, 0.3)';
    return new originalConstructor(options);
  };
  
  // プロトタイプをコピー
  Object.setPrototypeOf(window.Terminal, originalConstructor);
  Object.setPrototypeOf(window.Terminal.prototype, originalConstructor.prototype);
  
  console.log('[Patch] Selection fix applied directly');
}

// 必要なスクリプトを読み込む
function loadRequiredScripts() {
  const scripts = [
    { src: '../core/xterm-patches.js', global: 'XtermPatches' },
    { src: '../features/claude-bridge/claude-output-parser.js', global: 'ClaudeOutputParser' },
    { src: '../features/claude-bridge/claude-code-bridge.js', global: 'ClaudeCodeBridge' },
    { src: '../features/japanese-support/japanese-input-support.js', global: 'JapaneseInputSupport' },
    { src: '../features/plugin-system/plugin-manager.js', global: 'PluginManager' }
  ];
  
  let loadedCount = 0;
  
  scripts.forEach(scriptInfo => {
    const script = document.createElement('script');
    script.src = scriptInfo.src;
    script.onload = () => {
      console.log(`[Patch] Loaded ${scriptInfo.global}`);
      loadedCount++;
      
      // すべてのスクリプトが読み込まれたら統合を初期化
      if (loadedCount === scripts.length) {
        console.log('[Patch] All required scripts loaded');
        
        // xterm.jsパッチを適用
        if (window.XtermPatches && window.Terminal) {
          window.XtermPatches.applyAll(window.Terminal);
        }
      }
    };
    script.onerror = (error) => {
      console.error(`[Patch] Failed to load ${scriptInfo.global}:`, error);
    };
    document.head.appendChild(script);
  });
}

// DOMContentLoadedの前に実行
if (document.readyState === 'loading') {
  // まず選択色修正を適用
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      applySelectionFix();
      initializeTerminalIntegration();
    }, 100); // TerminalManagerの初期化後に実行
  });
  
  // スクリプトを事前に読み込む（エラーになっても続行）
  try {
    loadRequiredScripts();
  } catch (e) {
    console.warn('[Patch] Failed to load required scripts:', e);
  }
} else {
  // すでにDOMが読み込まれている場合
  setTimeout(() => {
    applySelectionFix();
    initializeTerminalIntegration();
  }, 100);
  
  try {
    loadRequiredScripts();
  } catch (e) {
    console.warn('[Patch] Failed to load required scripts:', e);
  }
}

// グローバルに公開（デバッグ用）
window.terminalIntegrationPatch = {
  version: '2.0.0-phase2a',
  loadRequiredScripts,
  initializeTerminalIntegration,
  patchTerminalManager
};