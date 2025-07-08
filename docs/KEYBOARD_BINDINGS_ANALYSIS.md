# ZeamiTerm キーバインディング分析

## 現在の実装状況

### 1. コピー機能（Ctrl+C / Cmd+C）

現在の実装（`ZeamiTermManager.js`）：
```javascript
terminal.attachCustomKeyEventHandler((event) => {
  // Cmd+C on Mac, Ctrl+C on others
  if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
    if (terminal.hasSelection()) {
      // コピー処理
    }
  }
});
```

**既に両方対応済み**: `event.metaKey`（Command）と`event.ctrlKey`（Control）の両方をチェック

### 2. ペースト機能（Ctrl+V / Cmd+V）

現在の状況：
- **画像ペースト**: PasteDebuggerではCtrl+Vと表示されているが、実際のペースト処理はブラウザ標準
- **テキストペースト**: xterm.jsとブラウザの標準的なペーストイベントを使用

### 3. 改行（Option+Return / Shift+Return）

現在の実装：
- ターミナルではOption+Return（Alt+Enter）が標準的な改行
- Shift+Returnは通常、別の用途に予約されることが多い

## 技術的考察

### macOSでCommand+Vを使う理由

1. **macOSの標準**: macOSではCmd+Vがシステム全体のペースト
2. **ユーザー体験**: Mac用アプリでCtrl+Vは不自然
3. **xterm.jsの対応**: xterm.jsは自動的にOSを検出してキーマッピングを調整

### 改行キーの考慮事項

1. **Option+Return（推奨）**:
   - ターミナルアプリの標準的な改行キー
   - iTerm2、Terminal.appでも同じ
   - シェルやCLIツールとの互換性が高い

2. **Shift+Return（注意が必要）**:
   - 一部のターミナルアプリでは特殊な意味を持つ
   - VS Codeのターミナルでは改行として機能
   - Claude Codeでも使用可能

## 実装提案

### 1. ペーストのキーバインディング改善

```javascript
// PasteDebuggerの表示を改善
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const pasteKey = isMac ? 'Cmd+V' : 'Ctrl+V';
```

### 2. 改行の両方対応

```javascript
terminal.attachCustomKeyEventHandler((event) => {
  // Option+Return (Alt+Enter) または Shift+Return
  if ((event.altKey || event.shiftKey) && event.key === 'Enter') {
    // 改行を挿入
    terminal.write('\n');
    return false; // デフォルト動作を防ぐ
  }
});
```

### 3. キーバインディングの設定可能化

将来的には、ユーザーが設定できるようにすることを推奨：

```javascript
preferences.keybindings = {
  paste: ['Cmd+V', 'Ctrl+V'],
  copy: ['Cmd+C', 'Ctrl+C'],
  newline: ['Alt+Enter', 'Shift+Enter'],
  // ... 他のキーバインディング
};
```

## macOSでのペースト動作の詳細分析

### テキストペースト（Cmd+V）

1. **現在の動作**:
   - ブラウザの標準的なペーストイベントを使用
   - xterm.jsが自動的にペーストイベントを処理
   - ZeamiTerminalの`_handleData`でブラケットペーストモードを適用

2. **macOSでの動作確認**:
   - **Cmd+V**: ✅ 正常動作（ブラウザ標準）
   - **Ctrl+V**: ❌ macOSでは動作しない（これは正常）

### 画像ペースト（Cmd+V）

1. **現在の実装状況**:
   - 画像ペースト専用の処理は実装されていない
   - ターミナルは基本的にテキストベースのため、画像の直接ペーストは対応していない

2. **技術的制約**:
   - xterm.jsはテキストターミナルエミュレータのため、画像表示には対応していない
   - 画像をペーストしても、テキストに変換されるか無視される

3. **将来的な可能性**:
   - iTerm2のようなインライン画像プロトコル（imgcat）の実装
   - Sixelグラフィックスサポート
   - 画像をBase64エンコードしてテキストとして扱う

### 実装確認結果

```javascript
// 現在のペースト処理フロー
1. ユーザーがCmd+V（Mac）またはCtrl+V（Windows/Linux）を押す
2. ブラウザがペーストイベントを発火
3. xterm.jsがペーストイベントをキャッチ
4. ZeamiTerminalの_handleDataメソッドでブラケットペースト処理
5. PTYプロセスにデータを送信
```

## 結論

1. **テキストペースト（Cmd+V）**: ✅ 完全対応
   - macOSでCmd+V、Windows/LinuxでCtrl+Vが正常動作
   - 特別な実装は不要

2. **画像ペースト（Cmd+V）**: ❌ 未対応
   - ターミナルの性質上、画像の直接ペーストは不可能
   - 将来的にiTerm2互換の画像プロトコル実装を検討可能

3. **改行（Shift+Return）**: ✅ 実装可能
   - Option+ReturnとShift+Returnの両方をサポート可能
   - ユーザー体験向上に貢献

両方のキーバインディングをサポートすることは技術的に可能で、ユーザー体験を向上させる良い改善です。