# ZeamiTerm メッセージルーター＆自律開発支援機能 仕様書

## 概要

ZeamiTermにおけるメッセージルーター機能は、Claude CodeやZeami CLIとの通信を強化し、開発者の生産性を向上させる自律的な開発支援を実現する中核機能です。

## 現在の実装状況

### Phase 2完了（実装済み）
- ✅ 基本的なメッセージルーター構造（`src/main/messageRouter.js`）
- ✅ コマンドパスの自動補完（zeamiコマンドの相対パス解決）
- ✅ Claude Codeプロセスの検出と基本的な連携
- ✅ IPCによる双方向通信基盤

## 将来の実装計画

### Phase 5: インテリジェント機能（2025 Q3予定）

#### 🤖 高度なメッセージルーター機能

**1. メッセージの自動補強**
- **コンテキスト情報の自動付加**
  - 現在のプロジェクトパス
  - 作業中のファイル一覧
  - 直前のコマンド履歴
  - エラー履歴と解決パターン

- **インテリジェントな補完**
  - 曖昧なコマンドの自動解釈
  - 省略されたパラメータの推測
  - ベストプラクティスに基づく提案

**2. メッセージの傍受と応答**
- **パターンマッチング**
  ```javascript
  {
    pattern: /error|エラー|failed/i,
    action: async (message, context) => {
      // エラーパターンを分析
      const solution = await analyzError(message);
      // 自動的に解決策を提案
      return { suggest: solution, autoFix: true };
    }
  }
  ```

- **自動応答生成**
  - よくある質問への自動回答
  - エラーメッセージの解説
  - 次のアクションの提案

**3. 双方向通信の最適化**
- メッセージキューイング
- 優先度ベースのルーティング
- バッチ処理の自動化

#### 🎯 自律開発支援機能

**1. AIパワードコマンド提案**
- **コンテキスト認識**
  - 現在の作業内容を理解
  - 関連ドキュメントの自動表示
  - 必要なコマンドの先回り提案

- **学習ベースの最適化**
  ```javascript
  // 使用パターンを学習
  learnPattern({
    context: "TypeScriptエラー",
    command: "zeami type diagnose",
    success: true,
    time: 120
  });
  ```

**2. エラー回復の自動化**
- **パターン認識**
  - 既知のエラーパターンを検出
  - Zeami学習データベースとの連携
  - 解決策の自動適用オプション

- **予防的アクション**
  - 問題が発生する前に警告
  - リスクの高い操作の確認
  - 代替案の提示

**3. Zeami CLIとの深い統合**
- **コマンドチェーン自動化**
  ```bash
  # ユーザー: "型エラーを修正して"
  # 自動実行:
  zeami type diagnose --json | 
  zeami type fix | 
  zeami test affected | 
  zeami doc log fix "型エラー自動修正"
  ```

- **バッチ処理の提案**
  - 繰り返し作業の検出
  - 自動化スクリプトの生成
  - 効率化の機会を提示

## 実装アーキテクチャ

### メッセージルーターの拡張設計

```javascript
class EnhancedMessageRouter {
  constructor() {
    this.rules = new RuleEngine();
    this.learningModel = new LearningModel();
    this.contextManager = new ContextManager();
  }

  async processMessage(message, source) {
    // 1. コンテキスト収集
    const context = await this.contextManager.gather();
    
    // 2. メッセージ解析
    const analysis = await this.analyzeMessage(message, context);
    
    // 3. ルールベース処理
    const enhanced = await this.rules.apply(message, analysis);
    
    // 4. 学習モデル適用
    const suggestions = await this.learningModel.predict(enhanced);
    
    // 5. 応答生成
    return this.generateResponse(enhanced, suggestions);
  }
}
```

### 外部通信インターフェース

**Named Pipe方式の実装（推奨案）**
- パイプパス: 
  - Windows: `\\\\.\\pipe\\zeami-term-router`
  - Unix: `/tmp/zeami-term-router.sock`

**メッセージプロトコル**
```json
{
  "version": "1.0",
  "type": "command|query|notification|error",
  "source": "claude-code|zeami-cli|user",
  "content": {
    "text": "メッセージ本文",
    "command": "実行されたコマンド",
    "context": {
      "cwd": "/path/to/project",
      "env": {},
      "history": []
    }
  },
  "metadata": {
    "timestamp": 1234567890,
    "sessionId": "uuid",
    "priority": "high|normal|low"
  }
}
```

## 統合シナリオ例

### シナリオ1: 型エラーの自動解決
1. ユーザーが`npm run build`を実行
2. TypeScriptエラーを検出
3. メッセージルーターが自動的に`zeami type diagnose`を提案
4. ユーザーが承認すると自動実行
5. 修正案を表示し、適用可否を確認
6. 修正後、テストを自動実行

### シナリオ2: 開発パターンの学習
1. ユーザーが同じコマンドシーケンスを繰り返し実行
2. パターンを検出し、ルーチン化を提案
3. `zeami routine create`で自動化
4. 次回から1コマンドで実行可能

### シナリオ3: コンテキスト認識アシスト
1. READMEファイルを編集中
2. マークダウンのプレビューを自動表示
3. 関連ドキュメントへのリンクを提案
4. コミットメッセージのテンプレートを準備

## セキュリティと制限事項

### セキュリティ対策
- ローカル通信のみに制限
- メッセージサイズ制限（1MB）
- サニタイゼーション必須
- 実行権限の確認

### 制限事項
- 外部ネットワーク通信は不可
- システムレベルコマンドの制限
- ユーザー確認なしの破壊的操作は禁止

## 実装ロードマップ

### Phase 5.1: 基礎実装（1ヶ月）
- [ ] EnhancedMessageRouterクラスの実装
- [ ] ルールエンジンの基本実装
- [ ] Named Pipe通信の実装
- [ ] 基本的なパターンマッチング

### Phase 5.2: 学習機能（2ヶ月）
- [ ] 使用パターンの記録
- [ ] 学習モデルの実装
- [ ] 提案システムの構築
- [ ] Zeami学習DBとの連携

### Phase 5.3: 高度な統合（2ヶ月）
- [ ] コマンドチェーン自動化
- [ ] コンテキスト認識の高度化
- [ ] プラグインシステム対応
- [ ] パフォーマンス最適化

### Phase 5.4: UIとUX改善（1ヶ月）
- [ ] 提案UIの実装
- [ ] 確認ダイアログの最適化
- [ ] 進捗表示の改善
- [ ] ユーザー設定の充実

## 成功指標

- **応答時間**: < 100ms（95パーセンタイル）
- **提案精度**: > 80%（ユーザー承認率）
- **自動化効率**: 30%以上の作業時間削減
- **学習効果**: 使用1ヶ月で50%の精度向上

## 関連ドキュメント

- [ROADMAP.md](./ROADMAP.md) - 全体開発ロードマップ
- [external-message-center-integration.md](../proposals/external-message-center-integration.md) - 外部通信提案
- [CLAUDE.md](../../CLAUDE.md) - プロジェクトガイドライン

---
作成日: 2025-07-03
ステータス: 計画中
優先度: 中（Phase 5予定）