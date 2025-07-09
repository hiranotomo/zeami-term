# xterm.js フォーク実装記録

## 概要
ZeamiTermにおいて、xterm.jsをフォークしてソースコードレベルで統合しました。これにより、選択範囲の透明度問題を根本的に解決し、将来的なカスタマイズの自由度を大幅に向上させました。

## 実装内容

### 1. xterm.js v5.5.0 のソースコード統合
- **場所**: `/src/xterm/`
- **ビルドツール**: esbuildを採用（webpackより高速）
- **ビルドスクリプト**: `/scripts/build-xterm.js`

### 2. 選択透明度の修正
- **パッチファイル**: `/src/xterm/patches/selection-transparency.patch`
- **変更内容**: デフォルトの選択色を `rgba(120, 150, 200, 0.3)` に変更
- **適用スクリプト**: `/scripts/apply-xterm-patches.js`

### 3. ビルドプロセス
```bash
# パッチ適用とビルド
npm run build:xterm

# 全体のビルド
npm run build
```

### 4. カスタムローダー
- **ファイル**: `/src/renderer/xterm-custom-loader.js`
- **機能**: カスタムビルドのxterm.jsを優先的にロード

## 技術的詳細

### esbuildの設定
```javascript
{
  format: 'iife',
  globalName: 'Terminal',
  platform: 'browser',
  target: 'es2020',
  plugins: [
    // テストファイルを除外
    // common/browser エイリアスを解決
  ]
}
```

### TypeScript設定
- `experimentalDecorators: true` - xterm.jsが使用するデコレーターのサポート
- カスタムパスマッピングで内部インポートを解決

## 今後のメンテナンス

### xterm.jsのアップデート手順
1. 新バージョンのソースコードをクローン
2. `/scripts/sync-xterm-source.js` を実行
3. パッチの互換性を確認
4. ビルドとテスト

### カスタマイズポイント
- **選択処理**: `/src/xterm/src/browser/selection/`
- **レンダリング**: `/src/xterm/src/browser/renderer/`
- **入力処理**: `/src/xterm/src/common/InputHandler.ts`
- **IMEサポート**: `/src/xterm/src/browser/input/CompositionHelper.ts`

## 成果
1. ✅ 選択範囲の透明度問題を完全に解決
2. ✅ ソースレベルでのカスタマイズが可能に
3. ✅ アップストリームの変更を追跡しやすい構造
4. ✅ ビルド時間の短縮（esbuildの採用）

## 関連ドキュメント
- [xterm.jsリファクタリング分析](./analysis/xterm-refactoring-analysis.md)
- [xterm.jsソース統合ガイド](./xterm-source-integration.md)