# クイックスタートガイド

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermを5分で使い始める。基本操作から便利な機能まで。

## 🚀 5分で始めるZeamiTerm

### 1. 起動とターミナル作成

```bash
# アプリケーションを起動
npm run dev

# または、ビルド済みアプリをダブルクリック
```

起動すると自動的に：
- **Terminal A** - メインターミナル
- **Terminal B** - サブターミナル

が作成されます。

### 2. 基本操作

#### キーボードショートカット

| 操作 | Mac | Windows/Linux |
|-----|-----|---------------|
| 新規ターミナル | `Cmd+T` | `Ctrl+T` |
| レイアウト切替 | `Cmd+D` | `Ctrl+D` |
| ターミナル切替 | `Cmd+Tab` | `Ctrl+Tab` |
| コピー | `Cmd+C` | `Ctrl+Shift+C` |
| ペースト | `Cmd+V` | `Ctrl+Shift+V` |
| 検索 | `Cmd+F` | `Ctrl+F` |
| クリア | `Cmd+K` | `Ctrl+K` |
| フォント拡大 | `Cmd++` | `Ctrl++` |
| フォント縮小 | `Cmd+-` | `Ctrl+-` |

### 3. レイアウトモード

```javascript
// タブビュー（デフォルト）
[Terminal A] [Terminal B]
┌────────────────────────┐
│                        │
│    Active Terminal     │
│                        │
└────────────────────────┘

// 分割ビュー（Cmd+D で切替）
┌───────────┬────────────┐
│           │            │
│ Terminal A│ Terminal B │
│           │            │
└───────────┴────────────┘
```

## 🎯 主要機能の使い方

### Claude Codeとの連携

```bash
# Terminal Aで実行
claude --help

# プロジェクトディレクトリで
claude code .
```

ZeamiTermは自動的に：
- Claude Codeプロセスを検出
- ペースト処理を最適化
- 長時間実行コマンドを通知

### ペースト機能（特別対応）

```bash
# 大量のコードをペーストする場合
# 1. コードをコピー
# 2. Cmd+V でペースト
# 3. ZeamiTermが自動的にチャンク分割
```

⚠️ **30行以上のペースト時**：自動的に最適化モードに切り替わります

### 内蔵コマンド

```bash
# ヘルプ表示
help

# ターミナル内容を保存
save output.txt

# マトリックス表示（イースターエッグ）
matrix

# ターミナルクリア
clear
```

## 📊 実践的な使用例

### 開発ワークフロー

```bash
# Terminal A: コード編集
claude code src/

# Terminal B: ビルド監視
npm run watch

# レイアウトを分割表示に切替（Cmd+D）
# 両方のターミナルを同時に監視
```

### デバッグセッション

```bash
# Terminal A: アプリケーション実行
npm run dev

# Terminal B: ログ監視
tail -f logs/app.log

# エラー発生時、自動的に通知
```

### 長時間タスクの実行

```bash
# ビルドコマンド実行
npm run build:all

# 5秒以上かかるコマンドは完了時に通知
# 🔔 "ビルドが完了しました (2分35秒)"
```

## 🛠️ カスタマイズ

### テーマ変更

```javascript
// 設定ファイル: ~/.zeamiterm/config.json
{
  "theme": "monokai",  // vs-dark, monokai, solarized-dark
  "fontSize": 14,
  "fontFamily": "Monaco"
}
```

### プロファイル設定

```bash
# デフォルトシェルの変更
# メニュー → 設定 → プロファイル

# または設定ファイルで
{
  "profiles": {
    "default": {
      "shell": "/bin/zsh",
      "env": {
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

## 💡 便利なTips

### 1. スマートスクロール

```bash
# Shift + マウスホイール = 10倍速スクロール
# 大量の出力を素早く確認
```

### 2. ファイルパスのクリック

```bash
# エラーメッセージ内のファイルパスをクリック
src/main/index.js:123
# → エディタで該当行を開く
```

### 3. URL自動リンク

```bash
# URLは自動的にクリック可能に
echo "https://github.com/zeami/zeami-term"
# Cmd+クリックでブラウザで開く
```

### 4. セッション永続化

```bash
# アプリ終了時、自動的にセッション保存
# 次回起動時に復元するか選択可能
```

## 🚨 トラブルシューティング

### よくある質問

**Q: ペーストが遅い**
```bash
# 環境変数で調整
PASTE_CHUNK_SIZE=50 npm run dev
```

**Q: 文字が表示されない**
```bash
# フォント設定を確認
# メニュー → 表示 → フォントをリセット
```

**Q: ターミナルが応答しない**
```bash
# 強制リセット
# メニュー → ターミナル → リセット
```

## 🎓 次のステップ

基本操作をマスターしたら：

1. [設定ガイド](./configuration.md) - 詳細なカスタマイズ
2. [高度な機能](../features/README.md) - プロ向け機能
3. [キーボードショートカット一覧](../reference/keyboard-shortcuts.md)

## 🔗 リソース

- [公式ドキュメント](../README.md)
- [コマンドリファレンス](../api/commands.md)
- [FAQ](../troubleshooting/faq.md)

---

> 💡 **Claude Codeへのヒント**: ZeamiTermは通常のターミナルと違い、Claude Codeとの対話に最適化されています。特にペースト処理は独自実装なので、標準的な動作を期待しないでください。