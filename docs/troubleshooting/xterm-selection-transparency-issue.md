# xterm.js 選択色の透明化問題 - トラブルシューティング記録

## 問題の概要

ZeamiTermでテキスト選択時の背景色を透明な青色（rgba(120, 150, 200, 0.3)）に設定しようとしたが、不透明なグレー色のままになる問題。

## 調査経過

### 1. 初期の誤った理解
- **誤り**: `theme.selection`プロパティを使用
- **症状**: 設定が反映されず、デフォルトのグレー色のまま

### 2. xterm.jsソースコード調査
`node_modules/xterm/src/browser/services/ThemeService.ts`を調査した結果：

```typescript
// 130行目
colors.selectionBackgroundTransparent = parseColor(theme.selectionBackground, DEFAULT_SELECTION);
colors.selectionBackgroundOpaque = color.blend(colors.background, colors.selectionBackgroundTransparent);
```

**発見**: xterm.jsは`theme.selection`ではなく`theme.selectionBackground`を使用

### 3. 内部色処理の理解
`node_modules/xterm/src/browser/renderer/shared/CellColorResolver.ts`より：

```typescript
// 71行目
$bg = (this._coreBrowserService.isFocused ? $colors.selectionBackgroundOpaque : $colors.selectionInactiveBackgroundOpaque).rgba >> 8 & 0xFFFFFF;
```

**発見**: 
- xterm.jsは内部的に`selectionBackgroundTransparent`と`selectionBackgroundOpaque`を使い分け
- Canvas/WebGLレンダラーでは色がIColorオブジェクト形式で管理される

### 4. 試みた解決策

#### 4.1 プロパティ名の修正
```javascript
// 誤り
theme: {
  selection: 'rgba(120, 150, 200, 0.3)'
}

// 正しい
theme: {
  selectionBackground: 'rgba(120, 150, 200, 0.3)'
}
```

#### 4.2 色形式の変更
```javascript
// rgba形式
selectionBackground: 'rgba(120, 150, 200, 0.3)'

// 16進数形式（アルファチャンネル付き）
selectionBackground: '#7896C84D'
```

### 5. 残された課題

デバッグログでは正しい色が設定されているように見えるが、実際の表示では反映されない：

```
[ThemeManagerV2] Returning xterm theme with selectionBackground: #7896C84D
[TerminalManager] Selection color: #7896C84D
```

しかし、内部的なthemeオブジェクトを確認すると、IColor形式に変換されている：

```javascript
// 実際の内部表現
selectionBackgroundTransparent: {
  css: "#7896C84D",
  rgba: 2023432269  // 内部的な数値表現
}
```

## 考えられる原因

1. **レンダラー固有の実装**: Canvas/WebGLレンダラーが選択色を異なる方法で処理している可能性
2. **色のブレンド処理**: `selectionBackgroundOpaque`が背景色とブレンドされて不透明になっている
3. **プラットフォーム固有の制限**: Electronやmacでの透明度処理の制限

## 次のステップ

1. xterm.jsのレンダラー実装を詳しく調査
2. 選択色のレンダリングパイプラインを追跡
3. xterm.jsのIssueやDiscussionsで同様の問題を検索
4. 代替的なアプローチ（CSSオーバーレイ、カスタムレンダラー等）を検討

## 関連ファイル

- `/src/renderer/terminalManager.js` - ターミナル設定
- `/src/renderer/themeManager-v2.js` - テーマ管理
- `/src/renderer/themes/default.json` - デフォルトテーマ
- `/src/renderer/fix-selection-final.js` - 修正試行

## 参考情報

- xterm.js ThemeService: `node_modules/xterm/src/browser/services/ThemeService.ts`
- xterm.js CellColorResolver: `node_modules/xterm/src/browser/renderer/shared/CellColorResolver.ts`
- xterm.js Color utilities: `node_modules/xterm/src/common/Color.ts`