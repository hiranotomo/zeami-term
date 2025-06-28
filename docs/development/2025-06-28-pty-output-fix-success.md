# 2025-06-28: PTY出力表示問題の解決

## 問題の概要
コマンド入力は受信されているが、PTYからの出力がターミナル画面に表示されない問題が発生していた。

## 根本原因
レンダラープロセスでのIPCイベントハンドラーの登録方法に問題があった。具体的には：
1. イベントハンドラーが正しく登録されていなかった
2. 複数のリスナーが競合していた可能性

## 解決策

### 1. IPCイベントハンドラーの修正
`src/renderer/core/ZeamiTermManager.js`の`connectTerminal`メソッドで、以下の修正を実施：

```javascript
// 修正前：データハンドラーがローカル関数として定義され、適切に登録されていなかった
const dataHandler = ({ id, data }) => {
  if (id === session.process.id || id === session.process.sessionId) {
    session.terminal.write(data);
  }
};

// 修正後：既存のリスナーをクリアし、直接ハンドラーを登録
if (window.electronAPI) {
  // Remove any existing listeners first
  window.electronAPI.removeAllListeners('terminal:data');
  
  window.electronAPI.onTerminalData(({ id, data }) => {
    console.log(`[Renderer] Received terminal data: id=${id}, length=${data ? data.length : 0}`);
    if (id === session.process.id) {
      console.log(`[Renderer] Writing to terminal: ${data ? data.substring(0, 50) : 'null'}...`);
      if (data) {
        session.terminal.write(data);
      }
    }
  });
}
```

### 2. デバッグログの追加
問題の特定のため、データフローの各段階にデバッグログを追加：
- PtyService: WorkingPtyからのデータ受信
- DataBufferer: データ処理とコールバック呼び出し
- Main Process: レンダラーへのIPC送信
- Preload: IPCイベントの受信
- Renderer: ターミナルへのデータ書き込み

## テスト実施

### 1. ミニマルテストアプリ作成
問題の切り分けのため、最小限の機能のみを持つテストアプリを作成し、基本的なPTY動作を確認。結果：正常動作

### 2. 統合テスト
`npm run test:integration`で自動テストを実施。結果：PASSED

### 3. 実機動作確認
- `ls`コマンド: 正常に出力表示
- `matrix`コマンド: アニメーション正常動作
- 日本語入力: 正常に表示

## 学んだこと

1. **Electronのイベントシステム**
   - 同じチャンネルに複数のリスナーが登録されると予期しない動作をする可能性がある
   - 新しいリスナーを登録する前に、既存のリスナーをクリアすることが重要

2. **デバッグ手法**
   - データフローの各段階にログを追加することで、問題の発生箇所を特定できる
   - ミニマルテストケースの作成は問題の切り分けに有効

3. **アーキテクチャの重要性**
   - PtyServiceとTerminalProcessManagerの2つのシステムが混在していたことが混乱の原因
   - 統一されたアーキテクチャの重要性を再認識

## 今後の改善点

1. **アーキテクチャの統一**
   - PtyServiceとTerminalProcessManagerのどちらか一方に統一
   - データフローの簡素化

2. **自動テストの拡充**
   - E2Eテストでの出力表示確認
   - IPCイベントフローのユニットテスト

3. **エラーハンドリングの強化**
   - IPCイベントの登録失敗時の処理
   - データ送信エラーの適切な処理

## 結論
問題は解決され、ZeamiTermは正常に動作するようになった。今回の経験から、Electronアプリケーションにおけるプロセス間通信の重要性と、適切なイベントハンドラー管理の必要性を学んだ。