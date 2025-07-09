# ZeamiTerm Critical Fix - 2025-06-26

## 問題: 無限ループでアプリが使用不能

### 症状
- アプリ起動時に「Restoring session with 2 terminals」が無限ループ
- キーボード入力を一切受け付けない
- CPU使用率が高く、アプリが完全にフリーズ
- DevToolsが自動的に開く

### 原因
- セッション復元機能が無限ループを引き起こしていた
- 保存されたセッションデータが破損または不整合な状態

### 修正内容

1. **セッション管理の無効化**
   - `terminalManager.js`: `setupSessionManagement()` をコメントアウト
   - `terminalManager.js`: `restoreSession()` メソッドを早期リターンに変更
   - `main/index.js`: セッション復元の自動実行を無効化

2. **セッションデータのクリア**
   - `~/.zeamiterm/session.json` を削除
   - 起動時に localStorage と sessionStorage をクリア

3. **DevTools自動起動の無効化**
   - 開発環境でも自動的にDevToolsが開かないように設定

### 実装詳細

```javascript
// terminalManager.js - セッション管理の無効化
async init() {
  // Setup session management - DISABLED for now
  // this.setupSessionManagement();
  
  // Create initial terminal
  const firstSession = await this.createTerminal();
}

// terminalManager.js - セッション復元の無効化
async restoreSession(sessionData) {
  // Session restoration disabled to prevent infinite loops
  console.log('Session restoration is currently disabled');
  return;
}

// terminalManager.js - 起動時のストレージクリア
document.addEventListener('DOMContentLoaded', () => {
  // Clear any stored session data to prevent loops
  try {
    localStorage.removeItem('zeamiterm-session');
    sessionStorage.clear();
  } catch (e) {
    console.error('Failed to clear session storage:', e);
  }
  
  window.terminalManager = new TerminalManager();
});

// main/index.js - 自動復元の無効化
// Load previous session after window is ready - DISABLED
// setTimeout(() => {
//   const previousSession = sessionManager.loadSession();
//   if (previousSession) {
//     mainWindow.webContents.send('session:restore', previousSession);
//   }
// }, 500);
```

### テスト結果
- ✅ アプリが正常に起動
- ✅ キーボード入力が正常に動作
- ✅ 無限ループなし
- ✅ CPU使用率が正常

### 今後の対応
- セッション復元機能を安全に再実装する必要がある
- セッションデータの検証機能を追加
- 復元失敗時のフォールバック処理を実装