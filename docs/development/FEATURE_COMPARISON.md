# ZeamiTerm Feature Comparison with VS Code & xterm.js

## 分析日: 2025-06-27

## 比較概要

このドキュメントは、VS Codeのターミナル実装とxterm.jsの高度な機能をZeamiTermと比較し、実装すべき機能を明確にします。

## 機能比較マトリックス

| カテゴリ | 機能 | VS Code | xterm.js | ZeamiTerm | 優先度 |
|---------|------|---------|----------|-----------|--------|
| **シェル統合** | | | | | |
| | コマンド検出（OSC 133） | ✅ | ✅ | ❌ | 高 |
| | 終了コード表示 | ✅ | - | ❌ | 高 |
| | コマンド実行時間 | ✅ | - | ❌ | 高 |
| | CWD追跡 | ✅ | ✅ | ❌ | 高 |
| | コマンドナビゲーション | ✅ | - | ❌ | 高 |
| **リンク検出** | | | | | |
| | Webリンク | ✅ | ✅ | ✅ | - |
| | ファイルパス検証 | ✅ | - | ❌ | 高 |
| | エラー出力解析 | ✅ | - | ❌ | 高 |
| | Gitリモート検出 | ✅ | - | ❌ | 中 |
| | ホバープレビュー | ✅ | - | ❌ | 中 |
| **プロファイル** | | | | | |
| | 複数シェル設定 | ✅ | - | ❌ | 高 |
| | 環境変数管理 | ✅ | - | ❌ | 高 |
| | アイコン/色設定 | ✅ | - | ❌ | 中 |
| **タブ管理** | | | | | |
| | 基本タブ | ✅ | - | ✅ | - |
| | タブグループ | ✅ | - | ❌ | 中 |
| | ドラッグ&ドロップ | ✅ | - | ❌ | 中 |
| | セッション永続化 | ✅ | - | ❌ | 高 |
| | 同期入力 | ✅ | - | ❌ | 低 |
| **検索** | | | | | |
| | 基本検索 | ✅ | ✅ | ✅ | - |
| | 装飾/ハイライト | ✅ | ✅ | ⚠️ | 高 |
| | 結果カウンター | ✅ | - | ❌ | 高 |
| | 検索履歴 | ✅ | - | ❌ | 中 |
| **アクセシビリティ** | | | | | |
| | スクリーンリーダー | ✅ | ✅ | ⚠️ | 高 |
| | 高コントラスト | ✅ | - | ❌ | 高 |
| | キーボードナビ | ✅ | ✅ | ⚠️ | 高 |
| **Unicode/国際化** | | | | | |
| | Unicode完全対応 | ✅ | ✅ | ⚠️ | 高 |
| | 絵文字 | ✅ | ✅ | ⚠️ | 中 |
| | リガチャ | ✅ | ✅ | ❌ | 中 |
| | BiDi | ✅ | ✅ | ❌ | 低 |
| | IME | ✅ | ✅ | ✅ | - |
| **パフォーマンス** | | | | | |
| | WebGL | ✅ | ✅ | ✅ | - |
| | GPU制御 | ✅ | ✅ | ⚠️ | 中 |
| | テクスチャアトラス | ✅ | ✅ | ⚠️ | 中 |
| | ダーティリージョン | ✅ | ✅ | ❌ | 中 |
| **グラフィックス** | | | | | |
| | Sixel | ❌ | ✅ | ❌ | 低 |
| | iTerm2画像 | ❌ | ✅ | ❌ | 低 |
| **プロセス管理** | | | | | |
| | プロセスツリー | ✅ | - | ❌ | 中 |
| | リソース監視 | ✅ | - | ❌ | 中 |
| | シグナルUI | ✅ | - | ❌ | 低 |

**凡例**: ✅ 完全実装 | ⚠️ 部分実装 | ❌ 未実装 | - 対象外

## 技術仕様詳細

### 1. シェル統合（Shell Integration）

**VS Code実装参考**: `vscode/src/vs/workbench/contrib/terminal/browser/xterm/shellIntegrationAddon.ts`

```typescript
// OSC シーケンス定義
const OSC = {
  PROMPT_START: '\x1b]133;A\x07',
  PROMPT_END: '\x1b]133;B\x07',
  COMMAND_START: '\x1b]133;C\x07',
  COMMAND_EXECUTED: '\x1b]133;D\x07',
  COMMAND_FINISHED: '\x1b]133;D;%s\x07', // %s = exit code
  CWD: '\x1b]1337;CurrentDir=%s\x07'
};

// 実装すべきインターフェース
interface IShellIntegration {
  onCommandStart: Event<ICommandStartEvent>;
  onCommandExecute: Event<ICommandExecuteEvent>;
  onCommandFinish: Event<ICommandFinishEvent>;
  onCwdChange: Event<string>;
  
  // コマンドナビゲーション
  navigateToPreviousCommand(): void;
  navigateToNextCommand(): void;
  selectCommand(commandId: number): void;
}
```

### 2. 高度なリンク検出

**VS Code実装参考**: `vscode/src/vs/workbench/contrib/terminal/browser/links/`

```typescript
// リンクプロバイダー拡張
interface ITerminalLinkProvider {
  provideLinks(line: string, metadata: ILinkMetadata): ITerminalLink[] | Promise<ITerminalLink[]>;
  handleLink(link: ITerminalLink): void;
}

// 実装すべきリンクタイプ
enum LinkType {
  LocalFile,      // ローカルファイル（存在確認付き）
  WorkspaceFile,  // ワークスペース相対
  Url,           // HTTP/HTTPS
  GitRemote,     // Git URL
  ErrorOutput,   // file:line:column形式
  StackTrace     // スタックトレース
}
```

### 3. ターミナルプロファイル

**設定形式**:
```json
{
  "terminal.profiles": {
    "bash": {
      "path": "/bin/bash",
      "args": ["--login"],
      "env": { "CUSTOM_VAR": "value" },
      "icon": "terminal-bash",
      "color": "terminal.ansiGreen"
    },
    "zsh": {
      "path": "/bin/zsh",
      "args": [],
      "env": {},
      "icon": "terminal",
      "color": "terminal.ansiBlue"
    }
  },
  "terminal.defaultProfile": "zsh"
}
```

### 4. コマンド装飾API

```typescript
// 装飾マーカー
interface ICommandDecoration {
  marker: IMarker;
  exitCode?: number;
  duration?: number;
  timestamp: number;
  command?: string;
  cwd?: string;
}

// レンダリング
class CommandDecorationRenderer {
  renderExitCode(decoration: ICommandDecoration): HTMLElement;
  renderDuration(decoration: ICommandDecoration): HTMLElement;
  renderGutter(decoration: ICommandDecoration): HTMLElement;
}
```

### 5. アクセシビリティ強化

```typescript
// アクセシビリティバッファ
interface IAccessibilityBuffer {
  // スクリーンリーダー用の最適化されたバッファ
  getLine(lineNumber: number): string;
  getCommand(commandId: number): IAccessibleCommand;
  
  // アナウンス
  announceCommand(command: string): void;
  announceResult(exitCode: number): void;
  announceCursorPosition(): void;
}
```

## 実装アプローチ

### Phase 3 実装計画（シェル統合）

1. **OSCシーケンスパーサー実装**
   - xterm.jsのカスタムOSCハンドラー登録
   - コマンドライフサイクルの追跡

2. **装飾レンダラー実装**
   - コマンド開始/終了マーカー
   - 終了コードインジケーター
   - 実行時間表示

3. **ナビゲーションシステム**
   - コマンド履歴の管理
   - キーボードショートカット実装

### 技術的課題と解決策

**課題1**: OSCシーケンスのシェル側サポート
- **解決**: シェル初期化スクリプトの提供
- bash/zsh/fish用のプロンプト設定

**課題2**: パフォーマンスへの影響
- **解決**: 装飾の遅延レンダリング
- ViewportOnlyレンダリング

**課題3**: 既存ターミナルとの互換性
- **解決**: プログレッシブエンハンスメント
- 機能検出による段階的有効化

## ベンチマーク目標

| メトリクス | 現在 | 目標 | VS Code |
|-----------|------|------|---------|
| 起動時間 | 800ms | 500ms | 400ms |
| メモリ使用量 | 250MB | 200MB | 180MB |
| 大量出力処理 | 50k行/秒 | 100k行/秒 | 120k行/秒 |
| レンダリングFPS | 45fps | 60fps | 60fps |

## 参考実装

- VS Code Terminal: https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/terminal
- xterm.js: https://github.com/xtermjs/xterm.js
- Hyper: https://github.com/vercel/hyper
- Windows Terminal: https://github.com/microsoft/terminal

## 更新履歴

- 2025-06-27: 初版作成 - VS Code/xtermソース分析に基づく機能比較