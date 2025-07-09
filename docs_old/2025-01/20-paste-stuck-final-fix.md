# 2025-01-20: ペースト問題の最終解決

## 問題の深層分析

「Pasting text...」で止まる問題の根本原因：

### 1. ブラケットペーストモードの競合
- xterm.jsの`bracketedPasteMode: true`により、xterm.jsが自動的にペーストマーカーを追加
- Claude Codeも独自にブラケットペーストを処理
- 二重のマーカーや不正なシーケンスが発生

### 2. データフローの問題
```
xterm.js → ZeamiTerminal → PTY → WorkingPty(Python) → Claude Code
```
- どこかでマーカーが重複または欠落していた

## 実装した解決策

### 1. ブラケットペーストモードの無効化
```javascript
// ZeamiTermManager.js
bracketedPasteMode: false,  // xterm.jsの自動マーカー追加を無効化
```

### 2. カスタムペーストハンドラー
```javascript
terminal.onPaste = (data) => {
  // 手動でブラケットペーストマーカーを追加
  if (session.terminal._ptyHandler) {
    session.terminal._ptyHandler('\x1b[200~');  // 開始マーカー
    session.terminal._ptyHandler(data);          // ペーストデータ
    session.terminal._ptyHandler('\x1b[201~');  // 終了マーカー
  }
  return false; // デフォルト処理を無効化
};
```

## なぜこれが機能するか

1. **単一の制御点**: xterm.jsの自動処理を無効化し、手動で制御
2. **正確なタイミング**: マーカーとデータを正しい順序で送信
3. **競合の排除**: 二重のマーカー処理を防ぐ
4. **Claude Codeの期待に合致**: Claude Codeが期待する正確なシーケンスを送信

## 結果
- ペーストが正常に動作
- 「Pasting text...」で止まらない
- 長文も完全にペースト可能