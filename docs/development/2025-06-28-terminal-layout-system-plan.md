# ターミナルレイアウトシステム実装計画

日付: 2025-06-28
プロジェクト: ZeamiTerm
作成者: Claude + User

## 要件定義

### 機能要件
1. **3つのレイアウトモード**
   - Split Vertical（垂直分割）
   - Split Horizontal（水平分割）
   - Split Tab（タブ分割）

2. **サイズ調整機能**
   - 垂直・水平分割時の境界線ドラッグによるサイズ変更
   - 最小サイズ制限（ターミナルが見えなくなることを防ぐ）
   - リアルタイムリサイズ

3. **レイアウト永続化**
   - 分割サイズの記憶
   - レイアウト構造の保存
   - アプリ再起動時の復元

### 非機能要件
- パフォーマンス：分割数が増えても遅延なし
- ユーザビリティ：直感的な操作
- 拡張性：将来的な機能追加を考慮

## 現状分析

### 現在の実装
- ターミナルは単一の`terminal-container`に配置
- ターミナル管理は`ZeamiTermManager`が担当
- 各ターミナルは`terminal-wrapper`でラップ
- 現在はタブやスプリット機能なし

### 技術的課題
1. 既存のターミナル管理との統合
2. xterm.jsインスタンスの効率的な管理
3. リサイズイベントの適切な処理
4. フォーカス管理の複雑化

## アーキテクチャ設計

### 1. レイアウトモデル（ツリー構造）

```javascript
// レイアウトノードの定義
class LayoutNode {
  type: 'terminal' | 'split' | 'tabs'
  direction?: 'horizontal' | 'vertical'  // splitの場合のみ
  size?: number  // 親ノードに対する割合（0-1）
  children?: LayoutNode[]
  terminalId?: string  // terminalの場合のみ
  activeTab?: number  // tabsの場合のみ
}
```

### 2. コンポーネント構成

```
LayoutManager
├── SplitPane（分割ペイン管理）
│   ├── Splitter（境界線ドラッグ）
│   └── PaneContent（コンテンツ領域）
├── TabContainer（タブ管理）
│   ├── TabBar（タブバー）
│   └── TabContent（タブコンテンツ）
└── TerminalContainer（ターミナル配置）
```

### 3. クラス設計

#### LayoutManager
```javascript
class LayoutManager {
  // レイアウトツリーの管理
  rootNode: LayoutNode
  
  // 操作メソッド
  splitTerminal(terminalId, direction)
  convertToTabs(terminalId)
  resizePane(nodeId, newSize)
  
  // 永続化
  saveLayout()
  loadLayout()
  
  // レンダリング
  render()
}
```

#### SplitPane
```javascript
class SplitPane {
  // 分割ペインの管理
  direction: 'horizontal' | 'vertical'
  firstPane: HTMLElement
  secondPane: HTMLElement
  splitter: Splitter
  
  // サイズ管理
  setSize(ratio)
  onResize(callback)
}
```

#### Splitter
```javascript
class Splitter {
  // ドラッグ可能な境界線
  element: HTMLElement
  direction: 'horizontal' | 'vertical'
  
  // ドラッグ処理
  onDragStart()
  onDragMove()
  onDragEnd()
}
```

## 実装の段階的計画

### Phase 1: 基本的な分割機能（MVP）
1. **LayoutManager基本実装**
   - レイアウトツリーのデータ構造
   - 基本的なレンダリング

2. **垂直分割のみ実装**
   - SplitPaneコンポーネント
   - 固定サイズ（50:50）での分割
   - フォーカス管理

3. **動作確認**
   - 2つのターミナルが表示される
   - 両方とも正常に動作する
   - 入力フォーカスが切り替わる

### Phase 2: サイズ調整機能
1. **Splitterコンポーネント実装**
   - ドラッグ可能な境界線
   - マウスイベント処理
   - リアルタイムリサイズ

2. **最小サイズ制限**
   - ペインの最小幅/高さ設定
   - 境界値でのストップ

3. **xterm.jsのリサイズ対応**
   - fitAddonの適切な呼び出し
   - パフォーマンス最適化（debounce）

### Phase 3: 水平分割とタブ機能
1. **水平分割の追加**
   - 方向パラメータの実装
   - UIの調整

2. **タブコンテナの実装**
   - TabBarコンポーネント
   - タブ切り替えロジック
   - タブの追加/削除

3. **レイアウト変換機能**
   - 分割→タブへの変換
   - タブ→分割への変換

### Phase 4: 永続化とUI改善
1. **レイアウト保存/復元**
   - レイアウトツリーのシリアライズ
   - LocalStorageへの保存
   - 起動時の復元

2. **UI/UXの改善**
   - 分割メニューの追加
   - キーボードショートカット
   - ビジュアルフィードバック

3. **エッジケース対応**
   - 最大分割数の制限
   - エラーハンドリング
   - メモリリーク対策

## 技術的実現可能性の検証項目

### 検証が必要な項目
1. **パフォーマンス**
   - [ ] 10個以上のターミナル分割でのレスポンス
   - [ ] リサイズ時のCPU使用率
   - [ ] メモリ使用量の増加傾向

2. **xterm.js統合**
   - [ ] 複数インスタンスの同時動作
   - [ ] fitAddonの正確な動作
   - [ ] WebGLレンダラーの制限確認

3. **ブラウザ互換性**
   - [ ] ResizeObserver APIのサポート
   - [ ] Pointer Events APIのサポート
   - [ ] CSS Grid/Flexboxの動作

### 技術選定
- **レイアウトエンジン**: CSS Grid（柔軟性が高い）
- **リサイズ検知**: ResizeObserver API
- **ドラッグ処理**: Pointer Events API
- **状態管理**: 既存のPreferenceManagerを拡張

## リスクと対策

### リスク1: パフォーマンス劣化
- **対策**: 
  - 仮想化技術の導入（表示されていないターミナルは非アクティブ化）
  - リサイズのdebounce/throttle
  - WebWorkerでの重い処理

### リスク2: 複雑なフォーカス管理
- **対策**:
  - 明確なフォーカスインジケーター
  - キーボードナビゲーション
  - フォーカストラップの実装

### リスク3: メモリリーク
- **対策**:
  - 適切なクリーンアップ処理
  - WeakMapの使用
  - 定期的なメモリプロファイリング

## テスト戦略

### 単体テスト
- LayoutNodeのツリー操作
- サイズ計算ロジック
- 永続化/復元処理

### 統合テスト
- ターミナル作成/削除
- レイアウト変更
- リサイズ動作

### E2Eテスト
- ユーザーシナリオベース
- パフォーマンステスト
- ストレステスト

## 実装スケジュール案

- **Phase 1**: 2日（基本機能）
- **Phase 2**: 2日（サイズ調整）
- **Phase 3**: 3日（完全な機能）
- **Phase 4**: 2日（品質向上）
- **テスト**: 1日

合計: 約10日

## まとめ

この計画は段階的実装を重視し、各フェーズで動作確認を行いながら進めることで、リスクを最小化します。最初のMVPで基本的な価値を提供し、そこから機能を拡張していくアプローチを取ります。