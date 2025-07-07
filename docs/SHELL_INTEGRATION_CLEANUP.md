# ZeamiTerm シェル統合自動削除システム

## 概要

ZeamiTermのシェル統合機能は、ペーストモードの問題を引き起こす可能性があるため、自動削除システムを実装しました。このシステムは、アプリ起動時に一度だけ実行され、ユーザーの確認を得てから既存のシェル統合を削除します。

## 実装内容

### 1. ShellIntegrationCleaner クラス

**ファイル**: `src/main/shellIntegrationCleaner.js`

主な機能：
- シェル統合の検出
- ユーザーへの確認ダイアログ表示
- シェル設定ファイルのクリーンアップ
- 統合関連ファイルの削除
- 一度だけの実行を保証

### 2. 削除対象

#### シェル設定ファイル
- `~/.zshrc`
- `~/.bashrc`
- `~/.profile`
- `~/.bash_profile`

#### 統合関連ファイル・ディレクトリ
- `~/Library/Application Support/zeami-term/shell-integration/`
- `~/.config/zeami-term/shell-integration.zsh`
- `~/.config/zeami-term/shell-integration.bash`
- `~/.config/zeami-term/shell-integration/`

### 3. 削除される内容

#### ZeamiTerm統合ブロック
```bash
# Added on YYYY-MM-DD
if [ -z "${ZEAMI_TERM_INTEGRATED+x}" ]; then
  export ZEAMI_TERM_INTEGRATED=1
  source "path/to/integration.zsh"
fi
```

#### その他の関連行
- `ZEAMI_TERM_INTEGRATED` 関連
- `zeami-term/shell-integration` パス参照
- `precmd_zeami` / `preexec_zeami` フック
- OSC 133関連のzeami実装
- `PROMPT_COMMAND` のzeami関連設定

## 動作フロー

1. **アプリ起動時**（`src/main/index.js`）
   ```javascript
   // Clean shell integration if needed (runs only once)
   try {
     const shellCleaner = new ShellIntegrationCleaner();
     await shellCleaner.clean();
   } catch (err) {
     console.warn('Failed to clean shell integration:', err);
     // Continue even if cleanup fails
   }
   ```

2. **既に削除済みチェック**
   - `~/.config/zeami-term/.shell-integration-cleaned` ファイルの存在確認
   - 存在する場合は処理をスキップ

3. **シェル統合の検出**
   - シェル設定ファイルの内容確認
   - 統合ディレクトリの存在確認

4. **ユーザー確認ダイアログ**
   ```
   タイトル: シェル統合の削除
   メッセージ: ZeamiTermのシェル統合を削除しますか？
   詳細: 以前のバージョンでインストールされたシェル統合機能を削除します。
         これにより、OSC 133によるコマンド追跡機能が無効になります。
   
   ボタン: [削除する] [キャンセル]
   ```

5. **削除実行**
   - シェル設定ファイルのバックアップ作成（`.zeami-backup-{timestamp}`）
   - 統合関連の設定を削除
   - 統合ファイル・ディレクトリを削除

6. **結果表示**
   - 成功時：削除されたファイルのリスト表示
   - エラー時：エラー内容の表示

7. **削除済みマーキング**
   - `~/.config/zeami-term/.shell-integration-cleaned` ファイルを作成
   - 次回起動時の重複実行を防止

## 無効化された機能

### TerminalProcessManager での無効化
```javascript
// Shell integration methods - DISABLED
async isShellIntegrationInstalled(shellPath) {
  // DISABLED: Always return false
  return false;
}

async installShellIntegration(shellPath) {
  // DISABLED: Do nothing
  return { success: false, message: 'Shell integration is disabled' };
}

getShellIntegrationCommand(shellPath) {
  // DISABLED: Return empty string
  return '';
}
```

### ShellIntegrationSetup UIでの無効化
```javascript
async show(shellPath) {
  // DISABLED: Shell integration is no longer supported
  console.log('[ShellIntegrationSetup] Shell integration is disabled');
  return { action: 'skip' };
}
```

### ZeamiTermManager でのアドオン無効化
```javascript
// DISABLED: Shell integration addon - may interfere with paste
// const shellIntegrationAddon = new ShellIntegrationAddon();
// terminal.loadAddon(shellIntegrationAddon);
const shellIntegrationAddon = null;
```

## 安全性の考慮

1. **バックアップの作成**
   - 設定ファイルを変更する前に必ずバックアップを作成
   - バックアップファイル名に タイムスタンプを含める

2. **ユーザー確認**
   - 自動削除前に必ずユーザーの確認を取得
   - キャンセル可能な設計

3. **エラーハンドリング**
   - 削除に失敗してもアプリの起動は継続
   - エラー内容をユーザーに表示

4. **一度だけの実行**
   - 削除済みフラグで重複実行を防止
   - ユーザーがキャンセルした場合も再度確認しない

## ペーストモード問題との関連

シェル統合（OSC 133）は、ブラケットペーストモードの処理に干渉する可能性があります：

1. **タイミング競合**
   - OSC 133シーケンスとペーストマーカーが混在
   - PTYバッファでの処理順序の問題

2. **Claude Codeとの非互換性**
   - Claude Codeは独自のペースト処理を実装
   - 追加のエスケープシーケンスが干渉

3. **解決策**
   - シェル統合を完全に無効化
   - ペーストマーカーを直接パススルー
   - バッファリングを最小限に

## 今後の改善案

1. **選択的な削除**
   - 特定の機能のみを無効化するオプション
   - ユーザーが選択可能な削除項目

2. **復元機能**
   - バックアップからの復元オプション
   - 統合の再インストール機能（将来的に問題が解決した場合）

3. **詳細なログ**
   - 削除プロセスの詳細なログ記録
   - トラブルシューティング用の情報収集

## 更新履歴

- 2025-01-21: 初版作成 - シェル統合自動削除システムの実装