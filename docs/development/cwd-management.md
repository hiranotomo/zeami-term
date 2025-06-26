# Working Directory Management in ZeamiTerm

## 概要

ZeamiTermは、`claude code`を含むコマンドが正しいコンテキストで実行されるよう、作業ディレクトリ（CWD）を賢く管理します。

## 問題の背景

通常のターミナルでは、新しいセッションはホームディレクトリから開始されます。これにより、プロジェクト内で`claude code`を実行しても、CLAUDE.mdが見つからない問題が発生していました。

## 解決策

### 1. CwdManager

`src/main/cwdManager.js`が以下の優先順位でCWDを決定します：

1. **明示的に指定されたディレクトリ** - オプションで指定された場合
2. **プロジェクトルート** - CLAUDE.md、package.json、.gitなどを検索
3. **起動ディレクトリ** - ZeamiTermが起動された場所
4. **ホームディレクトリ** - フォールバック

### 2. プロジェクト検出

以下のファイルがプロジェクトルートの指標となります：
- `CLAUDE.md` - Zeamiプロジェクトの主要マーカー
- `package.json` - Node.jsプロジェクト
- `.git` - Gitリポジトリ
- `.zeami-context` - Zeamiコンテキストファイル
- `PROJECT_KNOWLEDGE.md` - プロジェクト知識ベース

### 3. Claude Code統合

`src/main/claudeCodeHelper.js`が以下を提供：

- **環境変数の設定**
  - `ZEAMI_PROJECT_ROOT` - プロジェクトルートパス
  - `ZEAMI_CLAUDE_MD_PATH` - CLAUDE.mdへの絶対パス
  - `ZEAMI_ROOT` - Zeamiルートディレクトリ

- **シェル関数**
  ```bash
  claude() {
    if [ -n "$ZEAMI_PROJECT_ROOT" ] && [ -f "$ZEAMI_PROJECT_ROOT/CLAUDE.md" ]; then
      (cd "$ZEAMI_PROJECT_ROOT" && command claude "$@")
    else
      command claude "$@"
    fi
  }
  ```

### 4. シェル設定

`src/main/shellConfig.js`が初期化時に以下を設定：

- 基本的な環境変数（TERM、LANG等）
- プロジェクトコンテキスト情報
- 便利なエイリアス：
  - `zcd` - プロジェクト/Zeamiルートへ移動
  - `zstatus` - 現在のコンテキストを表示
  - `claude` - プロジェクトルートから実行

## 使用例

### プロジェクト内での起動

```bash
cd /path/to/zeami-project/subdir
zeami-term  # または Electronアプリを起動
```

結果：
- ターミナルは`/path/to/zeami-project`から開始
- `claude code`は正しくCLAUDE.mdを読み込む
- ウェルカムメッセージにプロジェクト情報が表示

### 任意の場所からの起動

```bash
cd ~
zeami-term
```

結果：
- ターミナルはホームディレクトリから開始
- プロジェクトディレクトリに移動後、`claude`コマンドは自動的にプロジェクトルートから実行

## 技術的詳細

### IPCフロー

1. レンダラー → メイン: `terminal:create` (オプションでcwd指定可能)
2. メイン: CwdManagerでベストなCWDを決定
3. メイン: PTYプロセスを適切なCWDで起動
4. メイン → レンダラー: プロセス情報とコンテキストを返す
5. レンダラー → メイン: `terminal:getShellConfig`でシェル設定要求
6. メイン → レンダラー: 初期化コマンドとウェルカムメッセージ

### セキュリティ考慮事項

- ディレクトリ存在確認を実施
- 環境変数は安全にエスケープ
- シェル関数は`export -f`で明示的にエクスポート

## 今後の改善案

1. **プロジェクト履歴** - 最近使用したプロジェクトを記憶
2. **マルチプロジェクト対応** - タブごとに異なるプロジェクト
3. **動的コンテキスト切り替え** - `cd`時に自動的にコンテキスト更新
4. **GUI統合** - プロジェクトピッカーUI

## 更新履歴

- 2025-06-26: 初期実装 - CwdManager、ClaudeCodeHelper、ShellConfig追加