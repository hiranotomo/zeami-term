# ZeamiTerm 改善内容 - 2025-06-26

## 実装された主要な改善

### 1. ターミナル入力の修正
- **問題**: 入力時に最後の文字が表示されない
- **原因**: UTF-8バッファリングによる遅延
- **解決**: 
  - workingPty.jsでデータを即座に出力
  - Pythonスクリプトで1バイトずつ読み込み
  - DataBuffererの遅延を1msに削減

### 2. スプリットビューの修正
- **問題**: 分割時にターミナル内容が消える
- **原因**: innerHTML = '' によるDOM要素の破壊
- **解決**: splitManager.jsでDOM要素を保持しながら再配置

### 3. シェル初期化の改善
- **問題**: .zshrc/.bashrcが読み込まれない
- **原因**: インタラクティブシェルとして起動していない
- **解決**: 
  - ログインシェル（-l -i）として起動
  - shell-init.shで追加設定

### 4. Claude Codeの互換性
- **問題**: `env -S`オプションがmacOSで動作しない
- **解決**: 
  - nodeの場所を動的に検索
  - aliasでclaudeコマンドをラップ
  - 複数のnode.jsインストール場所に対応

### 5. セッション永続化
- **機能**: アプリ再起動時の状態復元
- **実装**:
  - sessionManager.jsで管理
  - 30秒ごとの自動保存
  - ウィンドウサイズも保存

### 6. CWD管理とファイルパス
- **機能**: プロジェクトコンテキストの自動認識
- **実装**:
  - cwdManager.jsでプロジェクトルート検出
  - claudeCodeHelper.jsで環境変数設定
  - shellConfig.jsでコマンドラッパー

### 7. タイトルバー
- **表示**: "ZEAMi Terminal from Teleport v0.1.0"
- **スタイル**: ドラッグ可能な黒いバー

## 技術的詳細

### PATH設定
```javascript
const devPaths = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  `${os.homedir()}/.npm-global/bin`,
  '/Users/Shared/bin',  // Claude Code location
  // ... 他の一般的な開発ツールパス
];
```

### シェル関数
```bash
# claudeコマンドのラッパー
claude() {
  local project_root=$(zeami_find_project_root)
  if [ -n "$project_root" ]; then
    (cd "$project_root" && command claude "$@")
  else
    command claude "$@"
  fi
}
```

## 配布時の考慮事項

1. **絶対パスの使用** - 相対パスの問題を回避
2. **ホームディレクトリベース** - ユーザー環境に依存しない
3. **動的なnode検索** - 複数のインストール方法に対応
4. **セッション情報** - ~/.zeamiterm/に保存

### 8. スクロール性能の最適化
- **問題**: スクロールが重い、カクカクする
- **解決**:
  - WebGLレンダラーの最適化設定
  - requestAnimationFrameを使用したスムーズなスクロール
  - Shift+スクロールで10倍速機能
  - scrollbackLimitを50000に増加

### 9. 初期化メッセージの保持
- **問題**: 初期化時のメッセージがclearで消える
- **解決**: configCommandからclearコマンドを削除

### 10. Split viewのフォーカス問題
- **問題**: Split view時にターミナル切り替えができない
- **解決**:
  - クリックハンドラーの追加
  - フォーカスイベントの改善
  - 初期フォーカスの設定

## 未実装の機能

- 日本語ファイル名・エンコーディング対応
- コマンド履歴の永続化
- VS Code連携（codeコマンド）
- ssh-agent転送サポート
- Zeami CLIとの深い統合