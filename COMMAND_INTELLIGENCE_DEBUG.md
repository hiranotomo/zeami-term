# Command Intelligence Hub デバッグガイド

## 現在の問題

1. ZeamiTermは正常に起動する
2. エラーメッセージが2回表示されて消える
3. コマンドを実行してもCommand Intelligence Hubに表示されない
4. シェル統合（OSC 133）が有効になっていない

## 診断手順

### 1. ZeamiTermを起動してDevToolsを開く

1. ZeamiTermを起動
2. メニューから「表示」→「開発者ツール」（または Alt+Cmd+I）
3. Consoleタブを開く

### 2. デバッグモードを有効にする

コンソールで以下を実行：

```javascript
// デバッグモードを有効化
localStorage.setItem('zeami:debug:command-intelligence', 'true');
window.zeamiCommandDebugger.enable();
```

### 3. シェル統合の診断

コンソールで以下を実行：

```javascript
// 診断スクリプトを実行
await fetch('/Users/hirano/develop/Zeami-1/projects/zeami-term/diagnose-shell-integration.js')
  .then(r => r.text())
  .then(eval);
```

### 4. 手動でシェル統合をテスト

ターミナルで以下のコマンドを実行：

```bash
# シェル統合スクリプトを手動で読み込む
source "/Users/hirano/Library/Application Support/zeami-term/shell-integration/zsh-integration.zsh"

# 関数が読み込まれたか確認
type __zeami_osc
type __zeami_preexec
type __zeami_precmd

# テストコマンドを実行
echo "test command"
```

### 5. OSCシーケンスを手動で送信

ターミナルで以下を実行：

```bash
# プロンプト開始
printf "\033]133;A\007"
# プロンプト終了
printf "\033]133;B\007"
# コマンド開始
printf "\033]133;C\007"
# コマンド終了（終了コード0）
printf "\033]133;D;0\007"
```

### 6. Message Centerを確認

1. Cmd+Shift+C でMessage Centerを開く
2. 「Command Intelligence」タブを確認
3. コマンドが表示されているか確認

## 問題の解決方法

### A. シェル統合が読み込まれていない場合

1. `.zshrc`に以下を追加：

```bash
# ZeamiTerm Shell Integration
if [ -n "$ZEAMI_TERM" ] && [ -z "$ZEAMI_TERM_INTEGRATED" ]; then
  export ZEAMI_TERM_INTEGRATED=1
  source "/Users/hirano/Library/Application Support/zeami-term/shell-integration/zsh-integration.zsh"
fi
```

2. ターミナルを再起動

### B. OSCハンドラーが動作していない場合

DevToolsコンソールで以下を実行：

```javascript
// ShellIntegrationAddonをテスト
window.testShellIntegration();
```

### C. IPCが動作していない場合

DevToolsコンソールで以下を実行：

```javascript
// テストコマンドを送信
const testCommand = {
  id: `test-${Date.now()}`,
  context: {
    app: { id: 'zeami-term', version: '0.1.16' },
    window: { id: 1 },
    terminal: { id: 'test', label: 'Test Terminal' }
  },
  executor: { type: 'manual', name: 'Test' },
  command: { raw: 'echo "test"' },
  execution: {
    startTime: Date.now() - 1000,
    endTime: Date.now(),
    exitCode: 0,
    status: 'completed'
  }
};

await window.zeamiAPI.invoke('command:execution-complete', testCommand);
```

## 期待される動作

1. コマンドを実行するとOSC 133シーケンスが自動的に送信される
2. ShellIntegrationAddonがOSCシーケンスを検出
3. コマンド実行データがIPCで送信される
4. MessageCenterServiceがデータを受信・保存
5. Command Intelligence Hubに表示される

## トラブルシューティング

### エラー: "Cannot read properties of undefined"

- ターミナルIDの参照エラー → 修正済み
- process.envの参照エラー → 修正済み

### エラー: "React module not found"

- React依存関係の問題 → バニラJSバージョンに置き換え済み

### シェル統合が無効

- terminalProcessManager.jsのメソッドが無効化されていた → 修正済み

## 次のステップ

1. 上記の診断手順を実行
2. 問題を特定
3. 必要に応じて手動でシェル統合を有効化
4. Command Intelligence Hubの動作を確認