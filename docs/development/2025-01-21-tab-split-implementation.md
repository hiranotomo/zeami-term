# タブ・スプリット機能実装

## 実装日
2025年1月21日

## 実装内容

### 1. 3つのモード切り替え機能
- **Tab Mode**: 従来のタブ切り替えによる単一ターミナル表示
- **Split Vertical**: 左右2分割でのターミナル同時表示
- **Split Horizontal**: 上下2分割でのターミナル同時表示

### 2. UI改善
- トグルボタンによる直感的なモード切り替え
- 新規ウィンドウボタンの追加
- 初期状態で2つのターミナルを起動

### 3. ドラッグ可能な境界線
- Splitterコンポーネントによる実装
- ドラッグによるペインサイズの調整
- サイズの保存と復元機能

### 4. フォーカス管理
- スプリットモードでペインをクリックすると対応するタブがアクティブになる
- タブとスプリットビューの同期

## 技術的詳細

### SimpleLayoutManager
既存のタブシステムと統合した、シンプルで効率的なレイアウト管理システム。

```javascript
class SimpleLayoutManager {
  constructor(container, terminalManager) {
    this.container = container;
    this.terminalManager = terminalManager;
    this.mode = 'tab'; // 'tab', 'split-vertical', 'split-horizontal'
  }
  
  setMode(mode) {
    // モード切り替えロジック
    if (mode === 'tab') {
      this.switchToTabMode();
    } else {
      this.createSplitLayout();
    }
  }
}
```

### Splitterコンポーネント
ドラッグ可能な境界線の実装。

```javascript
class Splitter {
  constructor(container, direction, onResize) {
    this.container = container;
    this.direction = direction; // 'vertical' or 'horizontal'
    this.onResize = onResize;
    this.setupDragHandling();
  }
}
```

## 発見された問題と解決

### 1. 最初のターミナルの表示問題
- **問題**: 起動時にTerminal 1が正しく表示されない
- **原因**: 初期化タイミングとフォーカスの問題
- **解決**: 初期化後に明示的なフォーカスとリフレッシュを追加

### 2. ターミナル表示領域の最適化
- **問題**: 右側にスクロールバーが表示され、余分なスペースがある
- **原因**: xterm.jsのデフォルトパディングとスクロールバー設定
- **解決**: CSSでパディングを0に設定し、スクロールバーを非表示に

### 3. フォーカス同期の問題
- **問題**: スプリットモードでペインをクリックしてもタブが切り替わらない
- **原因**: イベントハンドラーでswitchToTerminalが正しく呼ばれていない
- **解決**: クリックイベントハンドラーを修正し、updateTabsUIを確実に呼び出す

## テスト戦略の改善

詳細は[テスト戦略の教訓](./2025-01-21-testing-lessons.md)を参照。

### 実装したテスト
1. **simple-tab-test.js**: 基本的な機能テスト
2. **detailed-functionality-test.js**: 詳細な機能テスト
3. **comprehensive-scenario-test.js**: 包括的なシナリオテスト
4. **terminal-display-test.js**: 表示内容の検証テスト

## 今後の改善案

1. **ターミナルの数を可変に**: 現在は2つ固定だが、動的に追加・削除できるように
2. **レイアウトの保存**: ウィンドウを閉じても次回起動時に復元
3. **4分割モード**: より複雑なレイアウトのサポート
4. **キーボードショートカット**: モード切り替えのショートカット追加

## 関連ファイル
- `/src/renderer/core/SimpleLayoutManager.js`
- `/src/renderer/components/Splitter.js`
- `/src/renderer/styles/layout.css`
- `/test/simple-tab-test.js`
- `/test/terminal-display-test.js`