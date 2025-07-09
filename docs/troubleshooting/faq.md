# FAQ（よくある質問）

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermについてよく寄せられる質問と回答集。

## 📋 一般的な質問

### Q: ZeamiTermとは何ですか？

**A**: ZeamiTermは、Claude Codeとの対話に最適化されたElectronベースのターミナルエミュレータです。通常のターミナルと異なり、Claude Code特有のペースト処理や長時間実行コマンドの通知など、AI開発アシスタントとの協働に特化した機能を提供します。

### Q: なぜ通常のターミナルではなくZeamiTermを使うのですか？

**A**: 主な理由は以下の通りです：

1. **Claude Code最適化**: 大量コードのペースト時の特別な処理
2. **スマート通知**: 長時間実行コマンドの完了通知
3. **セッション永続化**: 作業状態の完全な保存と復元
4. **プロファイル管理**: 複数の開発環境の簡単な切り替え
5. **シェル統合**: コマンドの自動追跡と分析

### Q: どのOSに対応していますか？

**A**: 以下のOSに対応しています：

- **macOS**: 10.15 (Catalina) 以降
- **Windows**: Windows 10 以降（64ビット）
- **Linux**: Ubuntu 20.04 以降、Fedora 32 以降

## 🔧 インストール・設定

### Q: インストール時に「開発元が未確認」と表示されます

**A**: これはmacOSのGatekeeperによる警告です。以下の方法で解決できます：

1. Finderでアプリを右クリック → 「開く」を選択
2. 警告ダイアログで「開く」をクリック
3. または、システム環境設定 → セキュリティとプライバシー → 「このまま開く」

### Q: 日本語が文字化けします

**A**: フォント設定を確認してください：

```json
{
  "terminal": {
    "fontFamily": "Menlo, 'Noto Sans Mono CJK JP', monospace"
  }
}
```

日本語フォントがインストールされていない場合は、[Noto Sans CJK](https://www.google.com/get/noto/)をインストールしてください。

### Q: 設定ファイルはどこにありますか？

**A**: OSによって異なります：

- **macOS**: `~/Library/Application Support/zeami-term/config.json`
- **Windows**: `%APPDATA%\zeami-term\config.json`
- **Linux**: `~/.config/zeami-term/config.json`

## 💻 使用方法

### Q: Terminal Bを削除できません

**A**: これは仕様です。ZeamiTermは固定2ターミナル構成（Terminal A/B）を採用しており、削除はできません。これにより、シンプルで予測可能な動作を実現しています。

### Q: ペーストが遅いです

**A**: Claude Code互換のため、大量テキストのペーストは自動的にチャンク分割されます。速度を優先する場合は以下を調整してください：

```json
{
  "paste": {
    "chunkSize": 100,    // デフォルト: 30
    "delayMs": 10        // デフォルト: 50
  }
}
```

### Q: キーボードショートカットをカスタマイズできますか？

**A**: はい、設定ファイルで変更可能です：

```json
{
  "keybindings": {
    "newTerminal": "cmd+t",
    "toggleLayout": "cmd+d",
    "copy": "cmd+c",
    "paste": "cmd+v"
  }
}
```

### Q: セッションが自動保存されません

**A**: 自動保存は30秒ごとに実行されます。即座に保存したい場合は`Cmd+S`を使用してください。自動保存が無効になっている可能性もあるので、設定を確認してください：

```json
{
  "session": {
    "autoSave": true,
    "saveInterval": 30000
  }
}
```

## 🚀 パフォーマンス

### Q: CPU使用率が高いです

**A**: 以下の設定でパフォーマンスを改善できます：

```json
{
  "terminal": {
    "rendererType": "canvas",  // WebGLの代わりに
    "scrollback": 5000         // 履歴を減らす
  },
  "performance": {
    "gpuAcceleration": false
  }
}
```

### Q: メモリ使用量が増え続けます

**A**: 長時間使用時のメモリリークの可能性があります。以下を試してください：

1. ターミナルをクリア: `Cmd+K`
2. セッションをリセット: メニュー → セッション → クリア
3. アプリを再起動

## 🔄 アップデート

### Q: 自動アップデートを無効にできますか？

**A**: はい、設定で無効化できます：

```json
{
  "general": {
    "autoUpdate": false
  }
}
```

手動でアップデートを確認する場合は、メニュー → ヘルプ → アップデートを確認

### Q: ベータ版を試したいです

**A**: ベータチャンネルに切り替えることができます：

```json
{
  "autoUpdate": {
    "channel": "beta",
    "allowPrerelease": true
  }
}
```

## 🔧 トラブルシューティング

### Q: ターミナルが応答しません

**A**: 以下の手順を試してください：

1. `Ctrl+C`で現在のプロセスを中断
2. メニュー → ターミナル → リセット
3. それでも解決しない場合は、アプリを再起動

### Q: Claude Codeが認識されません

**A**: PATHが正しく設定されているか確認してください：

```bash
# ターミナルで確認
which claude
echo $PATH

# プロファイルに追加
{
  "profiles": {
    "default": {
      "env": {
        "PATH": "/path/to/claude/bin:$PATH"
      }
    }
  }
}
```

### Q: エラーログはどこで確認できますか？

**A**: ログファイルの場所：

- **macOS**: `~/Library/Logs/ZeamiTerm/main.log`
- **Windows**: `%APPDATA%\ZeamiTerm\logs\main.log`
- **Linux**: `~/.config/ZeamiTerm/logs/main.log`

開発者ツールでも確認できます: `Cmd+Option+I`（macOS）または`Ctrl+Shift+I`（Windows/Linux）

## 🌐 その他

### Q: プライバシーは保護されますか？

**A**: はい、ZeamiTermは以下のプライバシー原則に従います：

- ローカルでのみ動作（テレメトリーなし）
- 外部サーバーへのデータ送信なし
- セッションデータは暗号化して保存

### Q: オープンソースですか？

**A**: はい、ZeamiTermはMITライセンスのオープンソースプロジェクトです。GitHubでソースコードを公開しています。

### Q: コントリビュートできますか？

**A**: もちろんです！以下の方法でコントリビュートできます：

1. バグ報告やフィーチャーリクエストをIssueで投稿
2. プルリクエストでコードを貢献
3. ドキュメントの改善
4. 他のユーザーへのサポート

### Q: サポートはどこで受けられますか？

**A**: 以下のチャンネルでサポートを提供しています：

1. [GitHub Issues](https://github.com/zeami/zeami-term/issues)
2. [Discord コミュニティ](https://discord.gg/zeami)
3. [公式ドキュメント](https://zeami-term.dev/docs)

## 💡 Tips & Tricks

### ショートカット一覧を表示

```bash
# ターミナル内で
help shortcuts
```

### 隠し機能

- `Shift + スクロール`: 10倍速スクロール
- `Cmd + クリック`: ファイルパスを開く
- `matrix`コマンド: イースターエッグ

### パフォーマンスモニター

開発環境では、以下でパフォーマンスモニターを表示：

```javascript
// DevToolsのコンソールで
window.perfMonitor.show()
```

---

> 💡 **Claude Codeへのヒント**: FAQは定期的に更新されます。新しい問題や質問が頻繁に寄せられる場合は、このドキュメントに追加してください。