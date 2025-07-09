# よくある問題と解決方法

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermの一般的な問題と解決方法。トラブル時の最初の参照先。

## 🎯 問題別クイックナビゲーション

| 症状 | 考えられる原因 | 解決方法 |
|-----|---------------|---------|
| [起動しない](#起動しない) | 権限/依存関係 | 再インストール |
| [文字化け](#文字化けする) | エンコーディング | UTF-8設定確認 |
| [ペーストが遅い](#ペーストが遅い) | 大量データ | チャンクサイズ調整 |
| [入力が二重になる](#入力が二重になる) | IME競合 | IME設定確認 |
| [ターミナルが応答しない](#ターミナルが応答しない) | プロセス停止 | 強制終了・再起動 |

## 🚨 緊急対処法

```bash
# ZeamiTermのプロセスを確認
ps aux | grep -i zeamiterm

# 強制終了（最終手段）
killall ZeamiTerm

# 設定リセット
rm -rf ~/Library/Application\ Support/zeami-term
rm -rf ~/.zeamiterm

# キャッシュクリア
rm -rf ~/Library/Caches/com.zeami.zeamiterm
```

## 🔧 一般的な問題

### 起動しない

#### 症状
- アプリケーションアイコンをクリックしても何も起きない
- 一瞬起動してすぐに終了する
- エラーダイアログが表示される

#### 原因と解決方法

**1. macOSのセキュリティ制限**
```bash
# Gatekeeperの確認
spctl --assess --verbose /Applications/ZeamiTerm.app

# 一時的に許可
sudo spctl --master-disable
# アプリを起動後、再度有効化
sudo spctl --master-enable

# または、システム環境設定 → セキュリティとプライバシー → 「このまま開く」
```

**2. 依存関係の問題**
```bash
# Electronのキャッシュクリア
rm -rf ~/.electron

# node_modulesの再インストール
cd /Applications/ZeamiTerm.app/Contents/Resources/app
npm rebuild
```

**3. 権限の問題**
```bash
# アプリケーションの権限修正
chmod -R 755 /Applications/ZeamiTerm.app
xattr -cr /Applications/ZeamiTerm.app
```

### 文字化けする

#### 症状
- 日本語が「???」や豆腐になる
- 特殊文字が正しく表示されない
- 絵文字が表示されない

#### 解決方法

**1. フォント設定**
```json
// ~/.zeamiterm/config.json
{
  "terminal": {
    "fontFamily": "Menlo, 'Hiragino Sans', monospace",
    "fontSize": 14,
    "unicodeVersion": 11
  }
}
```

**2. 環境変数の設定**
```bash
# .bashrc または .zshrc に追加
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8
export TERM=xterm-256color
```

**3. ターミナル設定のリセット**
```javascript
// デベロッパーツールで実行
termManager.terminals.forEach(term => {
    term.options.allowProposedApi = true;
    term.options.unicodeVersion = 11;
    term.reset();
});
```

### ペーストが遅い

#### 症状
- 大量のテキストをペーストすると固まる
- ペースト中にCPU使用率が上がる
- Claude Codeがペーストを受け付けない

#### 解決方法

**1. ペースト設定の調整**
```json
// ~/.zeamiterm/config.json
{
  "paste": {
    "chunkSize": 50,      // 行数を増やす
    "delayMs": 30,        // 遅延を減らす
    "dynamicDelay": true,
    "warningThreshold": 5000
  }
}
```

**2. 環境変数での調整**
```bash
# 起動時に設定
PASTE_CHUNK_SIZE=100 PASTE_DELAY=10 open /Applications/ZeamiTerm.app
```

**3. デバッグモードで確認**
```bash
# ペーストデバッグを有効化
PASTE_DEBUG=true open /Applications/ZeamiTerm.app
```

### 入力が二重になる

#### 症状
- キー入力が2回表示される
- IMEで入力した文字が重複する
- バックスペースが効かない

#### 原因と解決方法

**1. IME設定の確認**
```javascript
// macOSの場合
// システム環境設定 → キーボード → 入力ソース
// 「Windows風のキー操作」をオフ
```

**2. ターミナル設定**
```json
{
  "terminal": {
    "macOptionIsMeta": true,
    "macOptionClickForcesSelection": false
  }
}
```

**3. 一時的な回避策**
```javascript
// デベロッパーツールで実行
window.electronAPI.setIMEMode('disabled');
// 使用後は 'enabled' に戻す
```

### ターミナルが応答しない

#### 症状
- コマンドを入力しても反応しない
- プロンプトが表示されない
- Ctrl+Cが効かない

#### 解決方法

**1. プロセスの確認**
```bash
# PTYプロセスの確認
ps aux | grep -E "(bash|zsh|python.*pty)"

# 特定のプロセスを終了
kill -9 [PID]
```

**2. ターミナルのリセット**
- メニュー → ターミナル → リセット
- または `Cmd+K` でクリア

**3. セッションの再作成**
```javascript
// デベロッパーツールで実行
await termManager.recreateTerminal('terminal-a');
```

## 🐛 プラットフォーム固有の問題

### macOS固有

#### 問題: 通知が表示されない
```bash
# 通知センターの設定確認
# システム環境設定 → 通知とフォーカス → ZeamiTerm
# 「通知を許可」をオン
```

#### 問題: フルスクリーンで黒画面
```javascript
// WebGLの問題の可能性
// 設定でCanvasレンダラーに切り替え
{
  "performance": {
    "rendererType": "canvas"
  }
}
```

### Windows固有

#### 問題: PTYが作成できない
```powershell
# Visual C++ 再頒布可能パッケージのインストール
# https://support.microsoft.com/en-us/help/2977003/

# Windows Defenderの除外設定
Add-MpPreference -ExclusionPath "C:\Program Files\ZeamiTerm"
```

#### 問題: コンソールウィンドウが表示される
```javascript
// package.jsonの設定確認
{
  "build": {
    "win": {
      "target": "nsis",
      "requestedExecutionLevel": "asInvoker"
    }
  }
}
```

### Linux固有

#### 問題: AppImageが実行できない
```bash
# 実行権限の付与
chmod +x ZeamiTerm-*.AppImage

# FUSEの確認
sudo apt install fuse libfuse2

# AppImageの展開（問題がある場合）
./ZeamiTerm-*.AppImage --appimage-extract
./squashfs-root/AppRun
```

## 💡 パフォーマンス問題

### CPU使用率が高い

**1. レンダラーの切り替え**
```json
{
  "performance": {
    "rendererType": "canvas",  // WebGLから変更
    "maxFps": 30               // フレームレート制限
  }
}
```

**2. スクロールバックの制限**
```json
{
  "terminal": {
    "scrollback": 5000  // 10000から削減
  }
}
```

### メモリ使用量が多い

**1. セッションのクリーンアップ**
```bash
# セッションデータの削除
rm -rf ~/Library/Application\ Support/zeami-term/session.json
rm -rf ~/Library/Application\ Support/zeami-term/session.backup.json
```

**2. ターミナルバッファのクリア**
```javascript
// 定期的なバッファクリア
setInterval(() => {
    termManager.terminals.forEach(term => {
        if (term.buffer.active.length > 8000) {
            term.clear();
        }
    });
}, 300000); // 5分ごと
```

## 🔍 デバッグ情報の収集

### ログファイルの場所

```bash
# macOS
~/Library/Logs/zeami-term/main.log

# Windows
%USERPROFILE%\AppData\Roaming\zeami-term\logs\main.log

# Linux
~/.config/zeami-term/logs/main.log
```

### デバッグモードの起動

```bash
# 詳細ログを有効化
DEBUG=* /Applications/ZeamiTerm.app/Contents/MacOS/ZeamiTerm

# Electronデバッグ
ELECTRON_ENABLE_LOGGING=true open /Applications/ZeamiTerm.app
```

### 問題報告時の情報

```javascript
// デベロッパーツールで実行
const debugInfo = {
    version: await window.electronAPI.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    config: await window.electronAPI.getConfig(),
    terminals: Array.from(termManager.terminals.keys())
};

console.log(JSON.stringify(debugInfo, null, 2));
```

## 🆘 それでも解決しない場合

1. **GitHubイシューを確認**
   - [既存のイシュー](https://github.com/your-org/zeami-term/issues)を検索
   - 同じ問題がないか確認

2. **新しいイシューを作成**
   - デバッグ情報を含める
   - 再現手順を明記
   - スクリーンショットを添付

3. **コミュニティサポート**
   - Discord/Slackチャンネル
   - フォーラム

## 🔗 関連ドキュメント

- [デバッグガイド](./debugging-guide.md)
- [FAQ](./faq.md)
- [設定ガイド](../getting-started/configuration.md)

---

> 💡 **Claude Codeへのヒント**: 問題解決時は、まず簡単な解決方法（再起動、設定リセット）から試してください。デベロッパーツールは `Cmd+Option+I` で開けます。