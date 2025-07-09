# ZeamiTerm 実装ロードマップ

## 🎯 実装優先順位（VS Code分析に基づく）

### ✅ Phase 1: 基本機能の完成（1-2週間）

#### 1.1 Shell Integration（最優先）
```javascript
// 実装例
class ShellIntegration {
  constructor(terminal) {
    this.terminal = terminal;
    this.commands = [];
    this.setupPromptDetection();
  }
  
  setupPromptDetection() {
    // ANSIエスケープシーケンスを使用したプロンプト検出
    this.terminal.registerMarker();
  }
  
  detectCommandStart(line) {
    // $ や > などのプロンプト記号を検出
    const promptRegex = /^[\$>]\s/;
    return promptRegex.test(line);
  }
  
  detectCommandEnd(exitCode) {
    // コマンド終了を検出して実行時間を記録
    const duration = Date.now() - this.currentCommand.startTime;
    this.currentCommand.duration = duration;
    this.currentCommand.exitCode = exitCode;
  }
}
```

#### 1.2 リンク検出システム
- ファイルパス検出: `/path/to/file:123:45`
- URL検出: `https://...`
- エラーメッセージ内のファイル参照

#### 1.3 基本的な検索機能の改善
- 検索UI の改善
- 大文字小文字の切り替え
- 検索履歴

### 🚀 Phase 2: Zeami独自機能（2-3週間）

#### 2.1 エラーパターン学習と提案
```javascript
class ZeamiErrorLearning {
  async detectAndSuggest(output) {
    const error = this.detectError(output);
    if (error) {
      // Zeami学習DBから解決策を検索
      const solutions = await zeami.learn.find(error.message);
      
      // インラインで提案を表示
      this.showQuickFix(solutions);
    }
  }
  
  async learnNewSolution(error, solution) {
    // 新しい解決策を学習DBに保存
    await zeami.learn.error(error, solution);
  }
}
```

#### 2.2 Claude Code との深い統合
- メッセージルーティングの実装
- コンテキスト補強機能
- Zeami CLIコマンドの自動提案

#### 2.3 プロジェクトコンテキスト認識
- 現在のプロジェクトタイプを認識
- プロジェクト固有のコマンド提案
- `.zeami-knowledge/` の活用

### 🔮 Phase 3: 高度な機能（1ヶ月以降）

#### 3.1 パフォーマンス最適化
- WebGLレンダラーの実装
- 仮想スクロール
- 大量出力の最適化

#### 3.2 拡張機能サポート
- Terminal API の実装
- カスタムリンクプロバイダー
- 環境変数コレクション

#### 3.3 リモート開発
- SSH統合
- リモートPTYサポート

## 📊 機能比較マトリックス

| 機能カテゴリ | VS Code | ZeamiTerm現状 | 実装優先度 |
|------------|---------|--------------|-----------|
| **基本機能** |
| xterm.js統合 | ✅ 完全 | ⚠️ 基本実装 | 高 |
| マルチタブ | ✅ 高度 | ⚠️ 基本実装 | 中 |
| 検索 | ✅ 高度 | ⚠️ 基本実装 | 高 |
| **Shell統合** |
| コマンド検出 | ✅ | ❌ | 最高 |
| 実行時間計測 | ✅ | ❌ | 高 |
| エラー検出 | ✅ | ❌ | 最高 |
| **リンク機能** |
| ファイルリンク | ✅ | ❌ | 最高 |
| URLリンク | ✅ | ⚠️ 部分的 | 高 |
| **AI/学習** |
| エラー提案 | ✅ Copilot | 🎯 Zeami独自 | 最高 |
| コマンド提案 | ✅ Copilot | 🎯 Zeami独自 | 高 |
| ローカル学習 | ❌ | 🎯 Zeami独自 | 最高 |

## 🛠️ 技術的実装詳細

### Shell Integration実装方法
1. **OSC (Operating System Command) シーケンスの使用**
   ```bash
   # プロンプト開始マーカー
   echo -e "\033]633;A\007"
   
   # コマンド実行開始
   echo -e "\033]633;B\007"
   
   # コマンド実行終了
   echo -e "\033]633;C;$?\007"
   
   # 作業ディレクトリ通知
   echo -e "\033]633;P;Cwd=$PWD\007"
   ```

2. **シェル固有の統合スクリプト**
   - Bash: PS1カスタマイズ
   - Zsh: precmd/preexec フック
   - Fish: fish_prompt関数

### リンク検出の正規表現パターン
```javascript
const patterns = {
  // Unix系ファイルパス
  unixPath: /(?:\.?\.?\/)?(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+(?::\d+(?::\d+)?)?/g,
  
  // Windowsファイルパス  
  windowsPath: /[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]+(?::\d+(?::\d+)?)?/g,
  
  // URL
  url: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
  
  // エラー形式 (file.js:10:5)
  errorFormat: /(?:[a-zA-Z0-9._/-]+\.[a-zA-Z]+):(\d+)(?::(\d+))?/g
};
```

## 🎯 差別化戦略

### VS Code + Copilot に対する優位性

1. **完全ローカル処理**
   - データプライバシーの保証
   - オフライン動作
   - 企業での採用しやすさ

2. **Zeamiエコシステム統合**
   - Zeami CLIのネイティブサポート
   - プロジェクト知識の自動活用
   - チーム内での知識共有

3. **軽量・高速**
   - Electronアプリとしての最小構成
   - 起動時間 < 1秒目標
   - メモリ使用量最小化

4. **カスタマイズ性**
   - オープンソース
   - プラグイン開発の容易さ
   - 企業固有の要件に対応

## 📅 実装スケジュール

### Week 1-2: Phase 1
- [ ] Shell Integration基本実装
- [ ] ファイルリンク検出
- [ ] 検索機能改善

### Week 3-4: Phase 2  
- [ ] エラーパターン学習
- [ ] Zeami CLI統合
- [ ] Quick Fix基本実装

### Month 2+: Phase 3
- [ ] パフォーマンス最適化
- [ ] 拡張機能API
- [ ] リモート開発対応

## 🔗 参考リソース

- [VS Code Terminal Architecture](https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/terminal)
- [xterm.js Documentation](https://xtermjs.org/docs/)
- [Shell Integration Protocol](https://code.visualstudio.com/docs/terminal/shell-integration)