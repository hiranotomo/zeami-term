# 2025-01-04: ZeamiTermのペースト処理問題を根本解決

## 問題の詳細
- ペースト時に「[Pasting...]」が表示されたまま固まる
- ブラケットペーストマーカー（`\x1b[200~`と`\x1b[201~`）は正しく送信されている
- しかし、レンダラー側で適切に処理されていない

## 原因分析

### データフローの調査
```
現在のフロー：
PTY → Main Process → IPC → Renderer → terminal.write() → xterm.js表示

期待されるフロー：
PTY → Main Process → IPC → Renderer → terminal._handleData() → ペースト処理 → xterm.js表示
```

### 根本原因
1. PTYからのデータは `session.terminal.write(data)` で直接書き込まれていた
2. これによりZeamiTerminal._handleData()がバイパスされ、ペースト検出ロジックが動作しなかった
3. ZeamiTerminalのペースト処理は、ユーザー入力時のみ動作し、PTYからのデータには反応しなかった

## 修正内容

### ZeamiTerminal.writeメソッドのオーバーライド
```javascript
write(data) {
  // Handle PTY data through our paste detection logic
  if (typeof data === 'string' && (data.includes('\x1b[200~') || data.includes('\x1b[201~') || this._isPasting)) {
    // Process through _handleData for paste detection
    this._handleDataFromPty(data);
  } else {
    // Normal write for non-paste data
    super.write(data);
  }
}
```

### 新しい_handleDataFromPtyメソッド
- _handleDataと同様の処理を行うが、PTYからのデータ用に最適化
- ペーストマーカーの検出とバッファリング
- タイムアウト機能（5秒）で無限ループを防止
- ペースト完了時の統計情報表示

## 技術的詳細
- ペーストバッファサイズ制限：10MB
- タイムアウト時間：5秒
- 不完全なUTF-8シーケンスの処理も考慮（将来の拡張用）

## 結果
- PTYからのペーストデータも適切に検出・処理されるようになった
- 「[Pasting...]」表示が正しく消えるようになった
- 大量のテキストペーストでも固まらない

## 今後の課題
- レンダラー側のコンソールログが開発環境で表示されない問題の調査
- ペースト処理のパフォーマンス最適化
- ペースト内容のプレビュー機能の追加検討