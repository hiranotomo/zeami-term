# ペースト機能のトラブルシューティング

## 症状：「Document is not focused」エラー

メニューからペーストを選択した時に以下のエラーが発生：
```
DOMException: Document is not focused.
```

## 原因

このエラーは、Clipboard APIを使用する際にドキュメントがフォーカスされていない時に発生します。
特に以下の状況で起こりやすい：

1. メニューバーからペーストを選択した時（フォーカスがメニューに移る）
2. DevToolsが開いている時
3. 別のウィンドウからZeamiTermに切り替えた直後

## 解決方法

### 修正内容

1. **自動フォーカス処理の追加**
   - ペースト前にドキュメントのフォーカス状態を確認
   - フォーカスされていない場合は、ターミナルにフォーカスを設定
   - フォーカスが有効になるまで少し待機

2. **エラーハンドリングの改善**
   - `clipboard.read()`が失敗した場合のフォールバック
   - テキストペーストへの自動切り替え
   - 最終的なフォールバックとして標準のペースト機能を使用

3. **複数のペースト方法のサポート**
   - Clipboard API（画像・テキスト）
   - 標準のペースト機能
   - キーボードショートカット（Cmd+V）

## 使用方法

### 推奨される方法

1. **キーボードショートカット使用**（最も確実）
   ```
   Cmd+V (macOS) / Ctrl+V (Windows/Linux)
   ```

2. **右クリックメニュー使用**
   - ターミナル内で右クリック → 「貼り付け」

3. **メニューバー使用**（修正済み）
   - 編集 → 貼り付け

### 画像のペースト

Claude Codeとの対話で画像をペーストする場合：
1. 画像をコピー（スクリーンショットなど）
2. ターミナル内でCmd+V
3. 自動的に画像として認識され、Claude Codeに送信

## 技術的詳細

### Clipboard APIの制限

- セキュリティ上の理由から、フォーカスされたドキュメントでのみ動作
- ユーザーの操作（クリック、キー入力）が必要
- HTTPSまたはローカルホストでのみ利用可能

### 実装の工夫

```javascript
// フォーカス確認と再設定
if (!document.hasFocus()) {
  activeTerminal.focus();
  await new Promise(resolve => setTimeout(resolve, 50));
}

// エラーハンドリングとフォールバック
try {
  const items = await navigator.clipboard.read();
  // 画像処理...
} catch (clipboardError) {
  // テキストペーストにフォールバック
}
```

## デバッグ方法

1. **コンソールログの確認**
   - DevTools（Cmd+Option+I）でコンソールを確認
   - `[ZeamiTermManager]`で始まるログを探す

2. **フォーカス状態の確認**
   ```javascript
   console.log('Document focused:', document.hasFocus());
   console.log('Active element:', document.activeElement);
   ```

3. **Clipboard APIの可用性確認**
   ```javascript
   console.log('Clipboard API available:', !!navigator.clipboard);
   console.log('Read method available:', !!navigator.clipboard?.read);
   ```

## 関連ファイル

- `/src/renderer/core/ZeamiTermManager.js` - ペースト処理の実装
- `/src/main/index.js` - メニューアクションのハンドリング
- `/docs/features/paste-handling.md` - ペースト機能の仕様