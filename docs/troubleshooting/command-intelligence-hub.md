# Command Intelligence Hub トラブルシューティング

## 症状：コマンドが表示されない

Command Intelligence Hubを開いても「0 commands」と表示され、実行したコマンドが記録されていない。

## 診断手順

### 1. シェル統合の確認

```bash
# シェル統合がインストールされているか確認
echo $ZEAMI_TERM_INTEGRATED

# 手動でシェル統合を有効化
source manual-shell-integration.sh

# OSCシーケンスが送信されているか確認（DevToolsコンソールで）
# "[ShellIntegrationAddon] OSC 133 received" のログが表示されるはず
```

### 2. データフローの診断

DevToolsコンソールで以下を実行：

```javascript
// 診断スクリプトを実行
await fetch('/path/to/debug-command-intelligence-flow.js').then(r => r.text()).then(eval)
```

このスクリプトは以下を確認します：
- ShellIntegrationAddonの状態
- IPCチャンネルの可用性
- テストコマンドの送信
- データの取得

### 3. データ永続化の確認

```bash
# データファイルの確認
ls -la ~/Library/Application\ Support/zeami-term/command-intelligence/

# ファイル内容の確認
cat ~/Library/Application\ Support/zeami-term/command-intelligence/command-executions.json | jq .
```

## 修正手順

### 自動修復スクリプト

```bash
# 修復スクリプトを実行
./fix-command-intelligence.sh
```

このスクリプトは以下を実行：
1. 既存データのバックアップ
2. データディレクトリの作成
3. データファイルの初期化
4. ファイル権限の修正

### 手動修正

1. **ZeamiTermを完全に終了**
   - すべてのウィンドウを閉じる
   - アプリケーションを終了

2. **データファイルをリセット**
   ```bash
   rm -f ~/Library/Application\ Support/zeami-term/command-intelligence/command-executions.json
   ```

3. **ZeamiTermを再起動**

4. **シェル統合を再インストール**
   ```bash
   ./install-shell-integration.sh
   ```

5. **新しいターミナルを開いてテスト**
   ```bash
   ./auto-test-command-intelligence.sh
   ```

## 実装の詳細

### データフロー

1. **OSCシーケンス受信** (ターミナル → ShellIntegrationAddon)
   - OSC 133 でコマンドの開始/終了を検知
   - OSC 633 で追加情報を受信

2. **コマンドデータの作成** (ShellIntegrationAddon)
   - CommandExecutionModel形式でデータを構築
   - 包括的なメタデータを付与

3. **IPCでメインプロセスへ送信** (Renderer → Main)
   - `command:execution-complete` チャンネルで送信
   - zeamiAPI.invoke() を使用

4. **MessageCenterServiceで処理** (Main Process)
   - データの検証
   - メモリに保存
   - ファイルに永続化（即座に保存）

5. **Message Center UIへ通知** (Main → MessageCenterWindow)
   - `command:execution-added` イベントを送信
   - UIがデータを再読み込み

### 主な修正内容

1. **即座のデータ永続化**
   - コマンド登録時に即座にsaveData()を呼び出すように変更
   - 30秒の自動保存に加えて、各コマンドで保存

2. **詳細なログ出力**
   - ShellIntegrationAddonでコマンド送信時の詳細ログ
   - MessageCenterServiceでの初期化時の状態ログ
   - UI側でのデータ読み込みログ

3. **エラーハンドリングの改善**
   - 各ステップでのエラーを詳細に記録
   - 失敗時の適切なフォールバック

## よくある問題

### Q: シェル統合は有効だがコマンドが記録されない
A: データファイルの権限を確認してください。修復スクリプトを実行すると自動的に修正されます。

### Q: 一部のコマンドだけが記録されない
A: 特殊文字を含むコマンドや、非常に短時間で終了するコマンドは記録されない場合があります。

### Q: Message Centerを開くとエラーが表示される
A: DevToolsでエラーの詳細を確認し、IPCチャンネルが正しく設定されているか確認してください。

## 関連ファイル

- `/src/renderer/addons/ShellIntegrationAddon.js` - OSCシーケンスの処理
- `/src/main/services/MessageCenterService.js` - コマンドデータの管理
- `/src/renderer/messageCenterApp.simple.js` - UI側のデータ表示
- `/src/main/index.js` - IPCハンドラーの設定