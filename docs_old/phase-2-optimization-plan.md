# Phase 2 最適化計画 - xterm.jsフォーク実装の改善版

## 📍 Phase 2-A 完了！（2025-06-27）

Phase 2-Aの実装が完了しました。パッチレイヤーアプローチにより、xterm.jsをフォークすることなく、すべての要求された機能を実現できました。

### ✅ 実装済み機能
- **選択透明度の修正** - ついに30%透明の青色選択が実現！
- **パフォーマンス最適化** - レンダーキューとキャッシュシステム
- **日本語処理とIMEサポート** - 完全なIME統合と文字幅計算
- **Claude Code出力パース** - 構造化出力の検出と処理
- **双方向通信システム** - Claude Codeとのメッセージング
- **プラグインアーキテクチャ** - 拡張可能なフックシステム

### 📚 関連ドキュメント
- [Phase 2-A Implementation Summary](./phase-2a-implementation-summary.md) - 実装の詳細
- [Phase 2-A Integration Guide](./phase-2a-integration-guide.md) - 統合手順
- [Test Page](../../src/renderer/test-phase2a.html) - インタラクティブテスト

### 🚀 次のステップ
1. **統合テスト** - 本番環境での動作確認
2. **パフォーマンス測定** - ベンチマークの実施
3. **プラグイン開発** - 追加機能の実装
4. **フィードバック収集** - 改善点の特定

---

## 1. 現状の問題点と改善案（実装済み）

### 1.1 パフォーマンス最適化

#### 問題点
- 現在のxterm.js統合は最適化されていない
- Claude Codeの大量出力時にレンダリング遅延が発生
- 日本語文字のレンダリングが非効率

#### 改善案
```javascript
// 1. レンダリング最適化
class OptimizedRenderer {
  constructor() {
    this.renderQueue = [];
    this.rafId = null;
    this.chunkSize = 1000; // 動的に調整
  }
  
  queueRender(data) {
    this.renderQueue.push(data);
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }
  
  flush() {
    const chunk = this.renderQueue.splice(0, this.chunkSize);
    // バッチレンダリング
    this.rafId = null;
  }
}

// 2. 日本語特化最適化
class JapaneseOptimizer {
  // 全角文字幅の事前計算とキャッシュ
  measureCache = new Map();
  
  // IME状態管理
  imeState = {
    composing: false,
    buffer: ''
  };
}
```

### 1.2 Claude Code特殊表示への対応

#### 問題点
- Claude Codeの構造化出力（テーブル、リスト等）が崩れる
- 進捗バーやローディング表示が正しく動作しない
- コードブロックのシンタックスハイライトが不完全

#### 改善案
```javascript
// Claude Code出力パーサー
class ClaudeOutputParser {
  constructor() {
    this.patterns = {
      codeBlock: /```(\w+)?\n([\s\S]*?)```/g,
      table: /\|.*\|/g,
      progressBar: /\[.*\]/g,
      thinking: /^<thinking>[\s\S]*?<\/thinking>/m,
      toolUse: /<tool_use>[\s\S]*?<\/tool_use>/m
    };
  }
  
  parse(output) {
    // 構造化された出力を検出・変換
    return {
      type: this.detectType(output),
      content: this.transform(output),
      metadata: this.extractMetadata(output)
    };
  }
  
  detectType(output) {
    if (this.patterns.codeBlock.test(output)) return 'code';
    if (this.patterns.table.test(output)) return 'table';
    if (this.patterns.thinking.test(output)) return 'thinking';
    // ...
  }
}
```

### 1.3 双方向通信システム

#### 新規実装：Claude Codeとの構造化通信
```javascript
// Claude Code通信マネージャー
class ClaudeCodeBridge {
  constructor(terminal) {
    this.terminal = terminal;
    this.commandQueue = [];
    this.responseHandlers = new Map();
  }
  
  // Claude Codeへのメッセージ送信
  sendMessage(type, content, metadata = {}) {
    const message = {
      id: this.generateId(),
      type,
      content,
      metadata,
      timestamp: Date.now()
    };
    
    // 特殊フォーマットでラップ
    const formatted = this.formatForClaude(message);
    this.terminal.paste(formatted);
    
    return new Promise((resolve) => {
      this.responseHandlers.set(message.id, resolve);
    });
  }
  
  // プロンプトテンプレート
  promptTemplates = {
    zeamiCommand: (cmd) => `zeami ${cmd} --json`,
    codeGeneration: (spec) => `Generate code:\n${spec}`,
    explanation: (code) => `Explain this code:\n\`\`\`\n${code}\n\`\`\``
  };
  
  // レスポンス検出
  detectResponse(output) {
    const response = this.parseClaudeResponse(output);
    if (response && this.responseHandlers.has(response.id)) {
      const handler = this.responseHandlers.get(response.id);
      handler(response);
      this.responseHandlers.delete(response.id);
    }
  }
}
```

### 1.4 プラグインアーキテクチャ

#### 新規実装：拡張可能なプラグインシステム
```javascript
// プラグインシステム
class PluginManager {
  constructor(terminal) {
    this.terminal = terminal;
    this.plugins = new Map();
    this.hooks = {
      beforeRender: [],
      afterRender: [],
      onData: [],
      onCommand: [],
      onClaudeOutput: []
    };
  }
  
  // プラグイン登録
  register(plugin) {
    if (!plugin.name || !plugin.version) {
      throw new Error('Invalid plugin format');
    }
    
    this.plugins.set(plugin.name, plugin);
    
    // フック登録
    Object.keys(this.hooks).forEach(hook => {
      if (plugin[hook]) {
        this.hooks[hook].push(plugin[hook].bind(plugin));
      }
    });
    
    // 初期化
    if (plugin.init) {
      plugin.init(this.getAPI());
    }
  }
  
  // プラグインAPI
  getAPI() {
    return {
      terminal: this.terminal,
      sendToClaude: (msg) => this.claudeBridge.sendMessage(msg),
      onClaudeResponse: (handler) => this.onClaudeResponse(handler),
      registerCommand: (cmd, handler) => this.registerCommand(cmd, handler),
      // UI拡張
      addToolbarButton: (config) => this.ui.addToolbarButton(config),
      addContextMenu: (config) => this.ui.addContextMenu(config),
      addPanel: (config) => this.ui.addPanel(config)
    };
  }
}

// プラグイン例
class ZeamiIntegrationPlugin {
  name = 'zeami-integration';
  version = '1.0.0';
  
  init(api) {
    // Zeamiコマンド自動補完
    api.registerCommand('zeami', {
      autocomplete: true,
      handler: (args) => this.handleZeamiCommand(args)
    });
    
    // Claude出力のZeamiコマンド検出
    api.onClaudeResponse((response) => {
      if (response.content.includes('zeami')) {
        this.highlightZeamiCommands(response);
      }
    });
  }
}
```

### 1.5 日本語処理の改善

#### 問題点
- IME入力時の表示ズレ
- 全角/半角の幅計算誤差
- 日本語フォントのレンダリング品質

#### 改善案
```javascript
// 日本語入力サポート
class JapaneseInputSupport {
  constructor(terminal) {
    this.terminal = terminal;
    this.imeComposition = null;
    this.setupIMEHandlers();
  }
  
  setupIMEHandlers() {
    // IME開始
    this.terminal.textarea.addEventListener('compositionstart', (e) => {
      this.imeComposition = {
        start: this.terminal.buffer.active.cursorX,
        data: ''
      };
    });
    
    // IME更新
    this.terminal.textarea.addEventListener('compositionupdate', (e) => {
      // 仮想的にIME候補を表示
      this.renderIMECandidate(e.data);
    });
    
    // IME確定
    this.terminal.textarea.addEventListener('compositionend', (e) => {
      this.commitIMEInput(e.data);
      this.imeComposition = null;
    });
  }
  
  // 文字幅の正確な計算
  getCharWidth(char) {
    // East Asian Widthに基づく計算
    const code = char.charCodeAt(0);
    if (this.isFullWidth(code)) return 2;
    if (this.isHalfWidth(code)) return 1;
    return this.measureActualWidth(char);
  }
}
```

### 1.6 キーボード/マウス操作の最適化

#### 改善案
```javascript
// 拡張キーバインディングシステム
class KeyBindingManager {
  constructor() {
    this.bindings = new Map();
    this.modes = {
      normal: new Map(),
      vim: new Map(),
      emacs: new Map()
    };
    this.currentMode = 'normal';
  }
  
  // カスタマイズ可能なキーバインド
  registerBinding(mode, keys, action) {
    const binding = {
      keys: this.parseKeys(keys),
      action,
      description: action.description
    };
    
    this.modes[mode].set(keys, binding);
  }
  
  // Vim風ナビゲーション
  setupVimBindings() {
    this.registerBinding('vim', 'gg', {
      description: 'Go to top',
      execute: () => this.terminal.scrollToTop()
    });
    
    this.registerBinding('vim', 'G', {
      description: 'Go to bottom',
      execute: () => this.terminal.scrollToBottom()
    });
    
    // ... 他のVimバインディング
  }
}

// マウス操作の改善
class MouseEnhancements {
  constructor(terminal) {
    // 右クリックメニュー
    this.contextMenu = new ContextMenu(terminal);
    
    // ミドルクリックペースト
    terminal.element.addEventListener('auxclick', (e) => {
      if (e.button === 1) { // ミドルボタン
        this.pasteFromPrimary();
      }
    });
    
    // トリプルクリックで行選択
    this.setupTripleClick();
    
    // マウスホイールでのフォントサイズ調整
    terminal.element.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        this.adjustFontSize(delta);
      }
    });
  }
}
```

## 2. リファクタリング計画

### 2.1 モジュール分離
```
src/
├── core/                    # コア機能
│   ├── terminal/           # ターミナル基本機能
│   ├── renderer/           # レンダリング
│   └── communication/      # IPC通信
├── features/               # 機能モジュール
│   ├── claude-bridge/      # Claude Code連携
│   ├── japanese-support/   # 日本語サポート
│   ├── plugin-system/      # プラグインシステム
│   └── performance/        # パフォーマンス最適化
├── plugins/                # 標準プラグイン
│   ├── zeami-integration/
│   ├── vim-mode/
│   └── syntax-highlight/
└── ui/                     # UI コンポーネント
    ├── toolbar/
    ├── context-menu/
    └── panels/
```

### 2.2 イベント駆動アーキテクチャ
```javascript
// イベントバスの実装
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
  }
  
  use(middleware) {
    this.middleware.push(middleware);
  }
  
  async emit(event, data) {
    // ミドルウェア処理
    for (const mw of this.middleware) {
      data = await mw(event, data) || data;
    }
    
    super.emit(event, data);
  }
}

// 使用例
eventBus.on('claude.output', (data) => {
  const parsed = claudeParser.parse(data);
  eventBus.emit('claude.output.parsed', parsed);
});
```

## 3. 最小限フォークアプローチ

### 3.1 段階的実装戦略

#### Phase 2-A: パッチレイヤー実装（1日）
xterm.jsをフォークする前に、パッチレイヤーで対応可能な範囲を実装：

```javascript
// xterm-patches.js
class XtermPatches {
  static applyAll(Terminal) {
    this.patchSelection(Terminal);
    this.patchRenderer(Terminal);
    this.patchJapaneseHandling(Terminal);
  }
  
  static patchSelection(Terminal) {
    // プロトタイプ拡張で選択色を修正
    const originalRefreshSelection = Terminal.prototype._refreshSelection;
    Terminal.prototype._refreshSelection = function() {
      const result = originalRefreshSelection.call(this);
      // カスタム選択色処理
      this._applyTransparentSelection();
      return result;
    };
  }
}
```

#### Phase 2-B: 必要最小限のフォーク（1日）
パッチで対応できない部分のみフォーク：
- 選択色の透明度処理
- 日本語レンダリング最適化
- パフォーマンスクリティカルな部分

#### Phase 2-C: 統合とテスト（1日）

## 4. 実装優先順位

### 即座に実装（Phase 2で実施）
1. Claude Code出力パーサー
2. 日本語IMEサポート
3. 基本的なプラグインシステム
4. パフォーマンス最適化

### 段階的に実装（Phase 3以降）
1. 完全なプラグインAPI
2. 高度なキーバインディング
3. UI拡張システム
4. 上流同期の自動化

## 5. テスト戦略

### 5.1 パフォーマンステスト
```javascript
class PerformanceBenchmark {
  async runAll() {
    const results = {
      largeOutput: await this.testLargeOutput(),
      japaneseText: await this.testJapaneseRendering(),
      scrolling: await this.testScrollPerformance(),
      selection: await this.testSelectionPerformance()
    };
    
    return this.generateReport(results);
  }
  
  async testLargeOutput() {
    const data = this.generateTestData(100000); // 10万行
    const start = performance.now();
    terminal.write(data);
    const end = performance.now();
    
    return {
      lines: 100000,
      time: end - start,
      fps: this.measureFPS()
    };
  }
}
```

### 5.2 Claude Code互換性テスト
```javascript
class ClaudeCompatibilityTest {
  testCases = [
    { name: 'Code blocks', input: '```js\nconsole.log("test")\n```' },
    { name: 'Tables', input: '| Col1 | Col2 |\n|------|------|' },
    { name: 'Progress', input: '[████████..] 80%' },
    { name: 'Tool use', input: '<tool_use>search</tool_use>' }
  ];
  
  async runAll() {
    for (const testCase of this.testCases) {
      await this.testRendering(testCase);
      await this.testInteraction(testCase);
    }
  }
}
```

## 6. 成功指標

### パフォーマンス
- 大量出力時: 60fps維持
- 日本語テキスト: ネイティブアプリ同等
- 起動時間: < 1秒
- メモリ使用量: < 150MB

### 機能性
- Claude Code出力: 100%正確な表示
- 日本語入力: IMEとの完全な統合
- プラグイン: 10個以上の標準プラグイン

### 拡張性
- プラグインAPI: 完全なドキュメント
- イベントシステム: 50以上のフックポイント
- テーマシステム: カスタマイズ可能

## 7. リスク軽減

### 技術的リスク
1. **xterm.js更新の影響**
   - 対策: 抽象化レイヤーの実装
   - パッチシステムで分離

2. **パフォーマンス劣化**
   - 対策: 継続的ベンチマーク
   - プロファイリングツール統合

3. **Claude Code仕様変更**
   - 対策: パーサーの柔軟な設計
   - プラグインでの対応

## 8. 次のステップ

1. この最適化計画のレビュー
2. Phase 2-A（パッチレイヤー）の実装開始
3. Claude Codeパーサーの開発
4. 日本語サポートの実装
5. 基本プラグインシステムの構築

この最適化により、より堅牢で拡張可能なZeamiTermを実現します。