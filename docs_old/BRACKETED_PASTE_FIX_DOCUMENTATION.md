# Bracketed Paste Mode Fix - Complete Documentation

## 問題の概要

ZeamiTermでClaude Codeに長文をペーストすると「Pasting text...」でフリーズする問題が発生していました。

## 根本原因

### 1. ブラケットペーストモードの仕組み
- ターミナルアプリケーションがペーストを検出するために、開始マーカー `\x1b[200~` と終了マーカー `\x1b[201~` でデータを囲む
- Claude Codeはこれらのマーカーを検出して「Pasting text...」を表示

### 2. 発見された問題
1. **xterm.jsの内部動作**: `bracketedPasteMode: true` の場合、xterm.jsが自動的にマーカーを追加
2. **データフローの競合**: `onData` と `onPaste` の両方でデータが処理され、二重送信が発生
3. **タイミングの問題**: Claude Codeがペーストモードに入る前にデータが到着するとフリーズ

## 解決策

### 最終的な実装（動作確認済み）

```javascript
// src/xterm-zeami/ZeamiTerminal.js
_handleData(data) {
  const hasStartMarker = data.includes('\x1b[200~');
  const hasEndMarker = data.includes('\x1b[201~');
  
  if (hasStartMarker || hasEndMarker) {
    // ブラケットペーストを検出 - 特別処理
    let content = data;
    if (hasStartMarker) {
      content = content.replace(/\x1b\[200~/g, '');
    }
    if (hasEndMarker) {
      content = content.replace(/\x1b\[201~/g, '');
    }
    
    if (this._ptyHandler) {
      // 1. 開始マーカー送信
      this._ptyHandler('\x1b[200~');
      
      // 2. 200ms待機（Claude Codeがペーストモードに入る時間）
      setTimeout(() => {
        // 3. コンテンツを1000文字ごとのチャンクに分割
        const CHUNK_SIZE = 1000;
        const chunks = [];
        for (let i = 0; i < content.length; i += CHUNK_SIZE) {
          chunks.push(content.substring(i, i + CHUNK_SIZE));
        }
        
        // 4. チャンクを10msごとに送信
        let chunkIndex = 0;
        const sendNextChunk = () => {
          if (chunkIndex < chunks.length) {
            this._ptyHandler(chunks[chunkIndex]);
            chunkIndex++;
            setTimeout(sendNextChunk, 10);
          } else {
            // 5. 50ms待機後、終了マーカー送信
            setTimeout(() => {
              this._ptyHandler('\x1b[201~');
            }, 50);
          }
        };
        
        sendNextChunk();
      }, 200);
    }
    
    return; // これ以上処理しない
  }
  
  // 通常のデータはそのまま送信
  if (this._ptyHandler) {
    this._ptyHandler(data);
  }
}
```

### 重要な設定

```javascript
// src/renderer/core/ZeamiTermManager.js
// ブラケットペーストモードを有効化
bracketedPasteMode: true,

// ターミナル作成後、ブラケットペーストモードを明示的に有効化
setTimeout(() => {
  if (session.terminal._ptyHandler) {
    session.terminal._ptyHandler('\x1b[?2004h');
    setTimeout(() => {
      session.terminal._ptyHandler('\r');
    }, 50);
  }
}, 500);
```

## なぜ解決できたか

### 1. 統一されたデータ処理
- すべてのペースト処理を `_handleData` に統一
- `onPaste` での二重処理を排除

### 2. 適切なタイミング制御
- **200ms待機が鍵**: Claude Codeがペーストモードに入るのに必要な時間
- チャンク送信により大量データでもバッファオーバーフローを防止

### 3. マーカーの分離送信
- マーカーとコンテンツを別々に送信
- Claude Codeが各フェーズを正しく処理できる

## 現在の制限事項

### 動作状況
- **長文（50行以上）**: `[Pasted text #2 +88 lines]` として正しく表示 ✅
- **中程度（30-40行）**: プレーンテキストとして表示されるが、完全にペーストされる ⚠️
- **短文**: 正常動作 ✅

### 今後の改善点
中程度のペーストも `[Pasted text]` として表示させるには、Claude Code側の閾値を調査し、それに合わせた処理が必要。

## 教訓

1. **タイミングは極めて重要**: 50ms vs 200msの違いで動作が大きく変わる
2. **データフローの理解が必須**: xterm.js → ZeamiTerminal → PTY → Claude Codeの各層の動作を理解
3. **既存の動作を尊重**: ブラケットペーストモードを無効化するのではなく、正しく実装することが重要

## デバッグ手法

1. **PasteDebugger**: ペーストデータの流れを可視化
2. **コンソールログ**: 各ステップでのタイミングとデータを確認
3. **段階的な検証**: 小さなペースト → 中程度 → 大量データで順次テスト