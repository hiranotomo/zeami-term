# 2025-01-21: シェル統合自動削除システムの実装

## 実装内容

ZeamiTermのペーストモード問題を根本的に解決するため、シェル統合（OSC 133）を自動削除するシステムを実装しました。

### 背景

Claude Codeでのペースト時に以下の問題が発生していました：
- 長文ペースト時に "Pasting text..." でフリーズ
- タイムアウト後に "[201~" が表示される
- ペーストしたテキストが失われる

原因調査の結果、シェル統合（OSC 133）がブラケットペーストモードの処理に干渉していることが判明しました。

### 技術的詳細

#### 1. ShellIntegrationCleaner クラス
```javascript
// src/main/shellIntegrationCleaner.js
class ShellIntegrationCleaner {
  async clean(showDialog = true) {
    // 既に削除済みかチェック
    if (await this.hasAlreadyCleaned()) {
      return { cleaned: false, userCancelled: false, alreadyCleaned: true };
    }
    
    // シェル統合の存在確認
    const hasIntegration = await this.detectShellIntegration();
    if (!hasIntegration) {
      await this.markAsCleaned();
      return { cleaned: false, userCancelled: false, alreadyCleaned: false };
    }
    
    // ユーザー確認ダイアログ
    if (showDialog) {
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['削除する', 'キャンセル'],
        title: 'シェル統合の削除',
        message: 'ZeamiTermのシェル統合を削除しますか？',
        detail: '以前のバージョンでインストールされたシェル統合機能を削除します。'
      });
      
      if (result.response === 1) {
        return { cleaned: false, userCancelled: true };
      }
    }
    
    // 削除実行
    // ... 削除処理 ...
  }
}
```

#### 2. アプリ起動時の自動実行
```javascript
// src/main/index.js
app.whenReady().then(async () => {
  // ... 他の初期化処理 ...
  
  // シェル統合の自動削除
  try {
    const shellCleaner = new ShellIntegrationCleaner();
    await shellCleaner.clean();
  } catch (err) {
    console.warn('Failed to clean shell integration:', err);
    // エラーが発生してもアプリは継続
  }
});
```

#### 3. 削除対象
- シェル設定ファイル（~/.zshrc, ~/.bashrc など）内の統合設定
- ~/Library/Application Support/zeami-term/shell-integration/
- ~/.config/zeami-term/shell-integration関連ファイル

### 課題と解決

#### 問題1: 重複実行の防止
**解決**: `~/.config/zeami-term/.shell-integration-cleaned` フラグファイルで管理

#### 問題2: ユーザーデータの保護
**解決**: 
- 設定ファイルの変更前にバックアップを作成
- ユーザー確認ダイアログを表示
- エラー時もアプリは継続動作

#### 問題3: 既存機能との整合性
**解決**: 
- TerminalProcessManagerのシェル統合メソッドを無効化
- ShellIntegrationSetup UIコンポーネントを無効化
- xterm.jsのshellIntegrationAddonを無効化

### 学んだこと

1. **ペーストモードとエスケープシーケンスの相互作用**
   - ブラケットペーストマーカー（ESC[200~/ESC[201~）は他のシーケンスと混在すると問題を起こす
   - Claude Codeは独自のペースト処理を持っており、追加の制御は不要

2. **段階的な問題解決アプローチ**
   - まずバッファリングを削除（データ損失を防ぐ）
   - 次に干渉要因（シェル統合）を特定
   - 最後に自動クリーンアップシステムを実装

3. **ユーザー体験の重要性**
   - 自動修正でも必ずユーザーの同意を得る
   - 成功/失敗を明確にフィードバック
   - 一度だけの実行で煩わしさを回避

### 次のステップ

1. シェル統合なしでのターミナル機能の最適化
2. 代替のコマンド追跡機能の検討
3. ペーストモードのさらなる改善（大容量テキスト対応など）

## 関連ファイル

- `/src/main/shellIntegrationCleaner.js` - クリーナー実装
- `/src/main/index.js` - 起動時の実行
- `/src/main/terminalProcessManager.js` - 無効化された統合機能
- `/docs/SHELL_INTEGRATION_CLEANUP.md` - 詳細なドキュメント