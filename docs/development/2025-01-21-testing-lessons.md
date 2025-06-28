# テスト戦略の教訓 - 表示内容の検証の重要性

## 問題の概要
2025年1月21日、タブ・スプリット機能の実装において、自動テストですべてのテストが成功したにもかかわらず、実際のアプリケーションでは最初のターミナル（Tab 1）の表示が不完全という問題が発生した。

## 自動テストで検出されなかった理由

### 1. テストはUIとデータ構造のみを検証していた
- ✅ ターミナルの存在（terminalCount）
- ✅ タブの存在（tabCount）
- ✅ アクティブなターミナルID
- ❌ **ターミナルの実際の表示内容は検証していない**

### 2. テスト環境の違い
- テストではIPCハンドラーがモック化されている
- 実際のPTYプロセスの出力は確認していない
- シェルの初期化状態を検証していない

## 教訓

### 1. 表示内容の検証は必須
```javascript
// ❌ 不十分なテスト
const state = await this.executeInRenderer(`
  window.zeamiTermManager.terminals.size
`);
assert(state === 2, 'Should have 2 terminals');

// ✅ 改善されたテスト
const content = await this.executeInRenderer(`
  const terminal = window.zeamiTermManager.terminals.get('terminal-1').terminal;
  const buffer = terminal.buffer.active;
  const firstLine = buffer.getLine(0)?.translateToString().trim();
  return {
    hasContent: firstLine && firstLine.length > 0,
    showsPrompt: firstLine && firstLine.includes('%'),
    content: firstLine
  };
`);
assert(content.hasContent, 'Terminal should have content');
assert(content.showsPrompt, 'Terminal should show shell prompt');
```

### 2. 実際の環境に近いテストの重要性
- モックは最小限に
- 実際のプロセス起動を含むインテグレーションテスト
- ユーザーが見る内容をそのまま検証

### 3. 視覚的な問題の検証
- スクロールバーの表示
- パディング/マージンの問題
- レイアウトのはみ出し

## 改善されたテスト戦略

### 1. 階層的なテストアプローチ
1. **単体テスト**: 個々のコンポーネントの動作
2. **統合テスト**: コンポーネント間の連携
3. **E2Eテスト**: 実際のユーザー操作と表示内容
4. **視覚的回帰テスト**: スクリーンショットの比較

### 2. ターミナル特有のテスト項目
- [ ] シェルプロンプトの表示
- [ ] コマンド入力と出力
- [ ] ANSIエスケープシーケンスの処理
- [ ] リサイズ時の表示
- [ ] スクロールバーの有無
- [ ] フォーカス状態の視覚的フィードバック

### 3. 実装例
```javascript
class TerminalDisplayTest {
  async testTerminalContent() {
    // 1. ターミナルバッファの内容を取得
    const bufferContent = await this.getTerminalBuffer();
    
    // 2. 期待される内容を検証
    this.assert(bufferContent.includes('$') || bufferContent.includes('%'), 
      'Should show shell prompt');
    
    // 3. 視覚的な要素を検証
    const displayMetrics = await this.getDisplayMetrics();
    this.assert(!displayMetrics.hasScrollbar, 'Should not show scrollbar');
    this.assert(displayMetrics.fillsContainer, 'Should fill entire container');
  }
}
```

## 結論
UIテストでは「存在する」だけでなく「正しく表示されている」ことを検証することが重要。特にターミナルのような複雑なUIコンポーネントでは、実際のコンテンツとレイアウトの両方を検証する必要がある。

## 関連ドキュメント
- [タブ・スプリット機能実装](./2025-01-21-tab-split-implementation.md)
- [テスト戦略ガイド](../specifications/TEST_STRATEGY.md)