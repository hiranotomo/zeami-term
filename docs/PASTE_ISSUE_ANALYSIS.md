# 長文ペースト問題の分析と解決策

## 問題の詳細

1. **症状**
   - 長文をペーストすると平文として表示される
   - テキストが途中で切れる
   - ブラケットペーストモードが正しく機能していない

2. **原因分析**
   - ZeamiTermはブラケットペーストモードを有効にしている（`bracketedPasteMode: true`）
   - しかし、ペースト処理は完全にClaude Codeに委ねられている
   - バッファサイズまたはチャンク処理に問題がある可能性

## 解決策

### 1. 即時対応：ペーストモードの強化

```javascript
// ZeamiTerminal.js の onData ハンドラーを修正
onData(data) {
  // ペースト検出の改善
  const isPaste = data.length > 50 || data.includes('\n') || data.includes('\t');
  
  if (isPaste && !data.includes('\x1b[200~')) {
    // ブラケットペーストマーカーを追加
    data = '\x1b[200~' + data + '\x1b[201~';
  }
  
  // チャンク処理（大量データの分割送信）
  if (data.length > 1000) {
    const chunks = [];
    for (let i = 0; i < data.length; i += 1000) {
      chunks.push(data.slice(i, i + 1000));
    }
    
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        if (this._ptyHandler) {
          this._ptyHandler(chunk);
        }
      }, index * 10); // 10ms間隔で送信
    });
    return;
  }
  
  // 通常の処理
  if (this._ptyHandler) {
    this._ptyHandler(data);
  }
}
```

### 2. より根本的な解決：適切なフロー制御

```javascript
// ptyService.js でのバッファリング改善
class PasteBufferManager {
  constructor() {
    this.maxBufferSize = 1024 * 1024; // 1MB
    this.chunkSize = 4096; // 4KB chunks
    this.sendDelay = 5; // ms between chunks
  }
  
  async sendLargeData(pty, data) {
    if (data.length <= this.chunkSize) {
      pty.write(data);
      return;
    }
    
    // 大きなデータをチャンクに分割
    for (let i = 0; i < data.length; i += this.chunkSize) {
      const chunk = data.slice(i, i + this.chunkSize);
      pty.write(chunk);
      
      // バックプレッシャーを避けるため短い遅延
      await new Promise(resolve => setTimeout(resolve, this.sendDelay));
    }
  }
}
```

### 3. xterm.jsのペーストイベントを適切に処理

```javascript
// ZeamiTermManager.js での修正
terminal.attachCustomKeyEventHandler((event) => {
  // Cmd+V / Ctrl+V でのペースト処理
  if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
    event.preventDefault();
    
    navigator.clipboard.readText().then(text => {
      if (text.length > 100) {
        // 長文の場合はブラケットペーストモードを強制
        const pasteData = '\x1b[200~' + text + '\x1b[201~';
        terminal.paste(pasteData);
      } else {
        terminal.paste(text);
      }
    });
    
    return false;
  }
  
  return true;
});
```

## 推奨される実装順序

1. **Phase 1**: ペースト検出とマーカー追加（ZeamiTerminal.js）
2. **Phase 2**: チャンク処理の実装（大量データ対応）
3. **Phase 3**: フロー制御の改善（ptyService.js）
4. **Phase 4**: クリップボードイベントの適切な処理

## テスト方法

1. 100行以上のテキストをペースト
2. タブや特殊文字を含むコードをペースト
3. 1MB以上の大きなファイルの内容をペースト
4. vim/nanoなどのエディタ内でのペースト

## 期待される結果

- ペーストされたテキストがシェルコマンドとして実行されない
- 長文が途中で切れない
- エディタ内で正しくペーストされる
- ペースト完了まで適切に待機する