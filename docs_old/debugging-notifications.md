# 通知システムのデバッグガイド

## 概要
ZeamiTermの通知システムは、長時間実行されるコマンドの完了を検出して通知を表示します。このガイドでは、通知が正常に動作しない場合のトラブルシューティング方法を説明します。

## 通知システムの仕組み

1. **シェル統合（OSC 133）**
   - シェルがOSC 133シーケンスを送信してコマンドの開始・終了を通知
   - ShellIntegrationAddonがこれらのシーケンスを受信して処理

2. **コマンド時間の計測**
   - コマンド開始時刻と終了時刻を記録
   - 設定された閾値（デフォルト5秒）を超えたら通知

3. **通知の表示**
   - Electronのネイティブ通知APIを使用
   - macOSでは指定された通知音を再生

## よくある問題と解決方法

### 1. 通知が全く表示されない

**確認事項：**
- システム設定で通知が有効か
- ZeamiTermの設定で通知が有効か
- ウィンドウがフォーカスされていない状態でテストしているか

**デバッグ方法：**
```javascript
// 開発者ツールのコンソールで実行
window.testNotification('command')  // テスト通知を表示
window.testLongCommand()  // 長時間コマンドをシミュレート
```

### 2. OSC 133シーケンスが受信されない

**確認事項：**
- シェル統合が正しく設定されているか
- ターミナルがOSCシーケンスをサポートしているか

**セットアップ：**
```bash
# シェル統合をセットアップ
./scripts/setup-shell-integration.sh

# 設定を再読み込み
source ~/.bashrc  # Bashの場合
source ~/.zshrc   # Zshの場合
```

**デバッグ方法：**
```bash
# OSCシーケンスを手動で送信してテスト
printf "\033]133;A\007"  # プロンプト開始
printf "\033]133;C\007"  # コマンド開始
sleep 6  # 6秒待機（閾値5秒を超える）
printf "\033]133;D;0\007"  # コマンド終了（終了コード0）
```

### 3. 通知音が変わらない

**確認事項：**
- macOSを使用しているか（通知音はmacOSのみ）
- 正しい音名が設定されているか
- 通知音が有効になっているか

**利用可能な通知音（macOS）：**
- Basso（低音）
- Blow（吹く音）
- Bottle（瓶）
- Frog（蛙）
- Funk（ファンク）
- Glass（ガラス）
- Hero（ヒーロー）
- Morse（モールス）
- Ping（ピン）
- Pop（ポップ）
- Purr（猫の鳴き声）
- Sosumi（そう済み）
- Submarine（潜水艦）
- Tink（チン）

## デバッグログの確認

開発者ツールのコンソールで以下のログを確認：

```
[ShellIntegrationAddon] OSC 133 received: C  // コマンド開始
[ShellIntegrationAddon] Command started: sleep 6  // コマンドテキスト
[ShellIntegrationAddon] OSC 133 received: D  // コマンド終了
[ShellIntegrationAddon] Command ended: {...}  // コマンド情報
[ShellIntegrationAddon] Checking notification for command: {...}
[ShellIntegrationAddon] Duration: 6000ms, Threshold: 5000ms
[ShellIntegrationAddon] Duration exceeds threshold, emitting notification event
[ZeamiTermManager] Long command completed, showing notification: {...}
[ZeamiTermManager] Using Electron notification API
```

## 設定の確認

```javascript
// 現在の通知設定を確認
const prefs = window.zeamiTermManager.preferenceManager;
console.log({
  enabled: prefs.get('notifications.enabled'),
  threshold: prefs.get('notifications.longCommandThreshold'),
  soundsEnabled: prefs.get('notifications.sounds.enabled'),
  commandSound: prefs.get('notifications.types.command.sound')
});
```

## テスト手順

1. **基本的なテスト**
   ```bash
   # 6秒のスリープコマンドを実行（閾値5秒を超える）
   sleep 6
   ```

2. **エラー通知のテスト**
   ```bash
   # 存在しないコマンドを実行
   nonexistentcommand
   ```

3. **Claude Codeのテスト**
   ```bash
   # Claude Codeコマンドをシミュレート（3秒以上かかる）
   claude --help && sleep 4
   ```

## 既知の問題

1. **Fish Shell**での統合が不完全な場合がある
2. **Windows/Linux**では通知音がサポートされていない
3. **古いバージョンのシェル**ではOSC 133がサポートされていない場合がある

## 問題が解決しない場合

1. ZeamiTermを再起動
2. シェルを再起動
3. 設定をリセット（設定画面から）
4. GitHubでissueを作成