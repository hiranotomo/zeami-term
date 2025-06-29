# Changelog

All notable changes to ZeamiTerm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2025-01-29

### Added
- 🚀 **シェル統合の自動注入** - ターミナル起動時に自動的にOSC 133シーケンスを有効化
- 🎨 **ATARI風スタートアップ画面** - レトロなASCIIアートロゴとアニメーション
- 📊 **通知システムのデバッグ機能** - 詳細なログとトラブルシューティングガイド
- 🔧 **シェル統合セットアップスクリプト** - 手動設定用のヘルパースクリプト

### Fixed
- 🐛 通知システムが動作しない問題を修正
- 🐛 通知音が正しく変更されない問題を修正
- 🐛 Electronプロセス境界でのエラーを修正（`process is not defined`）
- 🐛 設定画面が開かない問題を修正
- 🐛 UpdateNotifierの初期化エラーを修正
- 🐛 スタートアップロゴの文字崩れを修正

### Changed
- 📝 通知閾値をテスト用に一時的に短縮（5秒）
- 🎨 スタートアップロゴのデザインを改善（ボックス枠付き）
- 📦 バージョン取得方法をIPCベースに変更

### Technical Details
- Electronのセキュリティモデルに準拠したAPI公開方法に統一
- preloadスクリプトでのpackage.json直接読み込みを廃止
- ShellIntegrationAddonのコマンドテキスト取得ロジックを改善
- bash、zsh、fishでのシェル統合自動設定に対応

## [0.1.3] - 2025-01-21

### Fixed
- 自動アップデート機能のテスト修正
- 開発環境での更新チェック改善

### Changed
- アップデートエラーメッセージを日本語で分かりやすく表示

## [Unreleased]

## [0.1.2] - 2025-01-20

### Added
- スプリットターミナル機能（Tab/Horizontal/Vertical）
- ドラッグ可能な境界線でサイズ調整
- 複数ウィンドウ対応
- 日本語メニューとツールチップ

### Fixed
- Tab 1の起動画面表示問題
- 垂直分割時の表示領域問題
- スクロールバーの重複表示

### Changed
- メニューを必要最小限に簡素化
- デバッグコンソールをデフォルトで非表示に

## [0.1.1] - 2025-01-19

### Fixed
- プライベートリポジトリでの自動アップデート問題を修正

## [0.1.0] - 2025-01-18

### Added
- 初回リリース
- xterm.jsベースのターミナルエミュレータ
- Claude Code統合
- VS Code風のUI/UX
- WebGLレンダリング対応
- 日本語入力サポート