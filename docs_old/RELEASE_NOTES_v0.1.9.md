# ZeamiTerm v0.1.9 リリースノート

## 🛠️ xterm.js ビルド問題の修正

### 問題の概要

v0.1.8で発生した「session.terminal.onPaste is not a function」エラーを修正しました。

### 原因

xterm.jsのビルドプロセスで`onPaste`メソッドが正しく含まれていない、またはAPIの互換性の問題がありました。

### 修正内容

1. **APIの直接使用を回避**
   - `terminal.onPaste()`の直接呼び出しを削除
   - ZeamiTerminalの既存の`_handleData`メソッドを活用

2. **設定ベースのアプローチ**
   - `_dynamicPasteConfig`オブジェクトで動的チャンク設定を管理
   - ZeamiTermManagerからZeamiTerminalへ設定を渡す方式に変更

3. **ビルドドキュメントの追加**
   - `docs/BUILD_RULES.md`を作成
   - xterm.jsのビルドに関する重要な注意事項を文書化

## 🚀 機能は維持

- 長文ペーストの問題修正（v0.1.7の改善）はすべて維持
- 中程度のペースト（30-50行）の動的チャンク処理も正常動作
- 二重入力問題の修正も継続

## 📝 技術的詳細

```javascript
// 新しい設定ベースのアプローチ
session.terminal._dynamicPasteConfig = {
  enabled: true,
  mediumContentLines: { min: 30, max: 50 },
  mediumChunkSize: 500,
  standardChunkSize: 1000,
  chunkDelay: 10,
  mediumChunkDelay: 15,
  targetTotalTime: 60
};
```

## ⚠️ 重要

今後のビルドでは必ず`npm run build`または`npm run build:xterm`を実行してください。