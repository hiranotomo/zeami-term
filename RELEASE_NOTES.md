# ZeamiTerm v0.1.2 リリースノート

リリース日: 2025-06-28

## 🎉 新機能

### Preference設定システム
- 包括的な設定画面を実装（⚙️ Preferencesボタンから開く）
- リアルタイムで設定が反映される
- 設定の保存と復元機能

### Session管理機能
- セッション保存・復元機能
- セッション録画とリプレイ
- Session Managerによる視覚的な管理

### 改善されたUI/UX
- より洗練されたPreferenceウィンドウ
- カテゴリ別の整理された設定項目
- レスポンシブなデザイン

## ✨ 主な改善点

### パフォーマンス
- xterm.jsフォーク統合による高速化
- 選択透明度の問題を根本的に解決
- WebGLレンダリングの最適化

### 設定項目（95%実装）
- **Terminal**: フォント、カーソル、スクロール設定
- **Appearance**: テーマ選択（VS Code Dark/Light、Monokai、Solarized Dark）
- **Shell & Profiles**: デフォルトシェル設定
- **Session**: 自動保存、バッファ制限
- **Keyboard**: ショートカットのカスタマイズ
- **Advanced**: レンダラータイプ、実験的機能

### 削除された機能
- **Privacy設定**: シンプルさのため削除
- **Window設定**: 将来の実装に向けてUI非表示化

## 🐛 修正されたバグ

- 複数ターミナル作成時の入力問題を修正
- フォントサイズの範囲制限を適切に実装（8〜32）
- shouldRestore未定義エラーを修正
- ES6モジュール形式のSyntaxErrorを修正

## 📝 既知の問題

- システム通知機能は一時的に削除（将来の適切な実装のため）
- Window透明度設定は未実装
- アプリケーションアイコンが未設定

## 🔧 技術的な変更

- PreferenceManagerによる設定の一元管理
- SessionPersistenceによるセッション永続化
- Coming Soonバッジによる未実装機能の明示
- Playwrightテストの充実（ポート9523使用）

## 📦 インストール

1. `ZeamiTerm-0.1.2-arm64.dmg`をダウンロード
2. DMGファイルを開く
3. ZeamiTermをApplicationsフォルダにドラッグ

## 🙏 謝辞

このリリースは、Claude Codeとの協働開発により実現しました。

## 📚 ドキュメント

詳細な開発記録は`docs/development/`ディレクトリを参照してください。

---

**注意**: このバージョンはmacOS Apple Silicon (arm64)向けです。