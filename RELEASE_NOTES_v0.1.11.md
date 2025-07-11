# ZeamiTerm v0.1.11 リリースノート

## 🎉 主な修正内容

### 🐛 垂直分割モードの表示問題を修正
- CSSのposition競合による表示崩れを解決しました
- WebGLキャンバスが正しくレンダリングされるようになりました
- スプリットモードでのレイアウトが安定しました

### ⚡ パフォーマンス改善
- リサイズ処理を`requestAnimationFrame`で最適化
- WebGLレンダラーへのリサイズ通知を改善
- 不要な再描画を削減

### 🎨 技術的な改善
- CSS `!important`宣言の競合を解消
- タブモードとスプリットモード用の条件付きCSSを実装
- WebGLコンテキストを考慮したリサイズ処理
- キャンバスのサイズ制約を適切に設定

## 修正された問題

- 垂直分割時にターミナルが正しく表示されない問題
- スプリッターのドラッグ時の表示崩れ
- WebGLキャンバスのオーバーフロー問題
- リサイズ時のちらつき

## アップデート方法
ZeamiTermは自動アップデート機能を搭載しています。
アプリケーション起動時に自動的に新しいバージョンをチェックし、通知します。

---
🚀 ZeamiTerm - Smart Terminal for Claude Code