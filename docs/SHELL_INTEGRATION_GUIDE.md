# シェル統合ガイド

ZeamiTermでディレクトリ変更を自動的に検知するには、シェルにOSC 7シーケンスを送信する設定を追加する必要があります。

## zsh（macOSデフォルト）の設定

`~/.zshrc`に以下を追加してください：

```bash
# ZeamiTerm directory tracking
zeami_osc7_cwd() {
    printf '\033]7;file://%s%s\033\\' "$HOSTNAME" "$PWD"
}

# プロンプトが表示される前に実行
precmd_functions+=(zeami_osc7_cwd)

# 初回実行
zeami_osc7_cwd
```

## bashの設定

`~/.bashrc`に以下を追加してください：

```bash
# ZeamiTerm directory tracking
zeami_osc7_cwd() {
    printf '\033]7;file://%s%s\033\\' "$HOSTNAME" "$PWD"
}

# プロンプトに組み込む
PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }zeami_osc7_cwd"
```

## 設定の適用

設定を追加したら、以下のいずれかの方法で適用してください：

1. ターミナルを再起動する
2. 以下のコマンドを実行する：
   - zsh: `source ~/.zshrc`
   - bash: `source ~/.bashrc`

## 動作確認

設定が正しく適用されると：
- `cd`コマンドでディレクトリを変更すると、ステータスバーが自動的に更新されます
- ファイルエクスプローラーも現在のディレクトリを表示します

## トラブルシューティング

### ディレクトリが更新されない場合

1. デベロッパーツール（Cmd+Option+I）を開いて、コンソールに以下のようなログが表示されているか確認：
   ```
   [ShellIntegrationAddon] Directory changed via OSC 7: /path/to/directory
   ```

2. シェルの設定が正しく読み込まれているか確認：
   ```bash
   # 関数が定義されているか確認
   type zeami_osc7_cwd
   ```

3. 手動でOSCシーケンスを送信してテスト：
   ```bash
   printf '\033]7;file://%s%s\033\\' "$HOSTNAME" "$PWD"
   ```