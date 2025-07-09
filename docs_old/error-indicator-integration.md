# エラーインジケーター統合ガイド

## 概要

Zeami TermにClaude Codeの通信エラーを視覚的に表示し、Zeami CLIと連携する機能を追加します。

## 統合手順

### 1. terminalManager.jsの修正

#### A. インポートの追加
```javascript
// ファイルの先頭に追加
const ErrorStateIndicator = require('./errorStateIndicator');
```

#### B. createTerminalメソッドの修正
```javascript
// createTerminalメソッド内、session作成後に追加（約380行目付近）
session.errorIndicator = new ErrorStateIndicator(terminal, wrapper);
```

#### C. closeTerminalメソッドの修正
```javascript
// closeTerminalメソッド内、dispose処理に追加
if (session.errorIndicator) {
  session.errorIndicator.dispose();
}
```

### 2. main/index.jsの修正

#### A. エラーレコーダーの初期化
```javascript
// ファイルの先頭付近に追加
const ZeamiErrorRecorder = require('./zeamiErrorRecorder');
const errorRecorder = new ZeamiErrorRecorder();

// アプリ起動時にオフラインエラーを同期
app.whenReady().then(async () => {
  // 既存のコード...
  
  // オフラインエラーの同期
  await errorRecorder.syncOfflineErrors();
});
```

#### B. IPCハンドラーの追加
```javascript
// IPC handlers セクションに追加
ipcMain.handle('record-error', async (event, errorData) => {
  try {
    await errorRecorder.recordError(errorData);
    return { success: true };
  } catch (error) {
    console.error('Failed to record error:', error);
    return { success: false, error: error.message };
  }
});
```

### 3. preload.jsの修正

```javascript
// contextBridgeのexposeInMainWorldに追加
recordError: (errorData) => ipcRenderer.invoke('record-error', errorData),
```

## テスト方法

### 1. エラー表示のテスト
```bash
# Claude Codeのモックエラーを生成
echo "API Error (Connection error.)" | tee -a test.log

# 各種エラーパターンをテスト
echo "Request timed out." | tee -a test.log
echo "OAuth token has expired." | tee -a test.log
```

### 2. Zeami連携のテスト
```bash
# エラーが記録されているか確認
./bin/zeami learn find "Connection error"
```

### 3. オフライン同期のテスト
1. ネットワークを切断
2. エラーを発生させる
3. ネットワークを再接続
4. アプリを再起動して同期を確認

## 注意事項

1. **パフォーマンス**: ターミナル出力の監視は最小限のオーバーヘッドで実装
2. **メモリ**: エラー履歴は最新10件のみ保持
3. **セキュリティ**: エラーログから機密情報を除外

## 今後の拡張

1. エラー統計ダッシュボード
2. エラーパターンの自動学習
3. カスタムエラーハンドラーの設定
4. エラー通知のカスタマイズ