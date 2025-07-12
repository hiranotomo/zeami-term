# Claude Code OSC シーケンステスト手順

## テスト1: Claude Code内でのコマンド実行確認

1. ZeamiTermを起動
2. 開発者ツールのコンソールを開く
3. Claude Codeを起動: `claude`
4. Claude Code内で以下を依頼:
   ```
   lsコマンドを実行してください
   ```

5. コンソールログを確認:
   - `[ShellIntegrationAddon] OSC 133 in Claude session: C` が表示されるか
   - Command Intelligence Hubに記録されるか

## テスト2: 手動OSCシーケンステスト

1. Claude Code内で以下のコマンドを実行:
   ```bash
   # 手動でOSCシーケンスを送信
   printf "\033]133;C\007"
   printf "\033]633;CommandLine=manual-test\007"
   echo "Testing manual OSC"
   printf "\033]133;D;0\007"
   ```

2. Command Intelligence Hubで「manual-test」が表示されるか確認

## テスト3: Claude Code終了後の確認

1. Claude Codeを終了（Ctrl+Cまたはexit）
2. 通常のシェルコマンドを実行: `ls`、`pwd`
3. これらがCommand Intelligence Hubに記録されるか確認

## 期待される結果

- Claude Code内で実行されるシェルコマンドは、OSCシーケンスで捕捉される
- Claude Codeの対話的操作（ファイル編集など）は、シェルを経由しないため記録されない
- Claude Code終了後も、シェル統合は正常に動作する

## デバッグ情報の確認

コンソールで以下のログを確認:
- `[ShellIntegrationAddon] Claude Code session detected`
- `[ShellIntegrationAddon] OSC 133 in Claude session:`
- `[ShellIntegrationAddon] Command execution registered successfully:`