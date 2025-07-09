# ZeamiTerm Menu Systems Documentation

## 概要

ZeamiTermには2つの独立したメニューシステムが存在します。

## 1. シェルメニュー（zeami-menu.zsh）

### 特徴
- Zshスクリプトとして実装
- ユーザーのシェル環境で動作
- `?` コマンドで起動
- 外部スクリプトを実行

### コマンド
1. `matrix` - Matrix風アニメーション
2. `generate` - 10,000行のコード生成
3. `infinite` - 無限コード生成（Ctrl+Cで停止）
4. `test` - パフォーマンステスト
5. `about` - ZeamiTermについて
6. `help` - 利用可能なコマンド表示

### 設定方法
```bash
# .zshrcに追加
source /path/to/zeami-term/scripts/zeami-shell-init.zsh
```

## 2. 内部メニュー（UnifiedHelpCommand）

### 特徴
- JavaScriptで実装
- Electronアプリ内で動作
- `help` コマンドで起動（`?`は避ける）
- 内部コマンドを実行

### コマンド
- `help` - コマンドヘルプ表示
- `clear` - 画面クリア
- `infinite` - 無限出力生成
- `matrix` - WebGL matrixエフェクト

### 問題と解決策

**問題**: `?` コマンドの競合
- シェルメニューが優先される
- 内部メニューにアクセスできない

**解決策**:
1. 内部メニューは `help` コマンドを使用
2. インタラクティブメニューが必要な場合は `Ctrl+?` などの別キーを使用
3. またはシェル統合を無効化

## 推奨される使い分け

- **開発/テスト用**: シェルメニュー（外部スクリプト実行）
- **通常使用**: 内部コマンド（統合された機能）

## 今後の改善案

1. メニューシステムの統合
2. 設定ファイルによる切り替え
3. コマンドプレフィックスによる明確な区別（例：`!?` for shell, `?` for internal）