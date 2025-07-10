# Changelog

All notable changes to ZeamiTerm will be documented in this file.

## [0.1.16] - 2025-01-10

### 追加
- UIカラーの統一化: ヘッダーとファイルエクスプローラーの背景色をトグルボタンと統一
- ファイルエクスプローラーが現在のディレクトリ（ステータスバー表示）と自動連動
- シェル起動時に自動的にOSC 7ディレクトリ追跡を有効化

### 修正
- 起動時の永久ローディング問題を修正
- テンプレート文字列のシンタックスエラーを修正
- ファイルエクスプローラーのローディング問題を修正（process.env使用不可）
- ターミナルの現在ディレクトリとステータスバーの同期問題を解決

### 改善
- アクティブなタブの背景色をトグルボタンと同じブルー（#007acc）に変更
- リリースプロセスを統一して安定化（重複スクリプトを削除）
- 包括的なリリースドキュメントを追加

### 技術的詳細
- 7つの重複したリリーススクリプトを1つの統一スクリプトに集約
- OSC 7（標準的なディレクトリ変更通知）とOSC 1337（iTerm2互換）をサポート
- zsh/bashの両方に対応した自動ディレクトリ追跡設定

## [0.1.15] - 2025-01-10

### 改善
- 自動アップデートのエラーハンドリングを強化
- ダウンロード進行状況の表示を改善（速度・残り容量表示）
- ネットワークエラー時により詳細なエラーメッセージを表示
- アップデート関連のログ出力を詳細化（デバッグ用）

### 修正
- アップデートのインストール時のプロセス管理を改善
- quitAndInstallメソッドの呼び出し方法を修正

### 技術的詳細
- electron-updaterのログレベルをdebugに設定
- ダウンロード失敗時のリトライロジックを追加
- ウィンドウタイトルにダウンロード進行状況を表示

## [0.1.14] - 2025-01-10

### 修正
- 自動アップデートエラーを修正: "ditto: Couldn't read pkzip signature"
- アプリケーションバンドル内のHelperアプリ参照の欠落を修正
- macOS自動アップデート用のアプリケーションバンドル構造を適切に修正

### 技術的詳細
- 正しいHelperアプリ構造でアプリケーションを再ビルド
- すべてのElectron Helperアプリがバンドルに適切に含まれていることを確認

## [0.1.13] - 2025-01-09

### Added
- Icon-based mode toggle buttons for Tab/Horizontal/Vertical split modes
- Improved tab bar styling with brighter background colors

### Fixed
- Critical fix: Initialization infinite loop that prevented app from starting
- Added proper error handling and initialization state management
- Ensured `isInitializing` flag is properly reset in all scenarios

### Improved
- Tab bar background color changed from `#2d2d30` to `#3c3c3c` for better visibility
- Toggle button group background updated to match the new color scheme
- Enhanced hover states for better user feedback
- Better error reporting in the loading screen

### Technical Details
- Added comprehensive try-catch error handling in initialization process
- Improved initialization state management to prevent duplicate attempts
- Removed incomplete log panel implementation that was causing issues

## [0.1.12] - 2025-01-09

### Added
- Enhanced startup animation with Japanese katakana matrix rain effect
- Glitch transition effect between animation phases
- Gradient color effects and pulsing animations
- PTY output buffering during startup animation
- Automatic centering of logo based on terminal size

### Fixed
- Fixed startup logo being interrupted by terminal output
- Resolved initialization infinite loop issues
- Fixed undefined session variable errors
- Improved initialization timing for Terminal A and B

### Improved
- Redesigned compact logo that fits within terminal width
- Optimized message display timing and sequencing
- Enhanced visual effects with multiple animation layers
- Better separation of animation and terminal output

### Technical Details
- Implemented output buffering system for clean animation display
- Added dynamic terminal size calculation for initial dimensions
- Fixed bracketed paste mode initialization timing
- Improved startup sequence with proper async handling

## [0.1.11] - 2025-01-09

### Fixed
- Fixed vertical split mode display issues caused by CSS position conflicts
- Resolved WebGL canvas rendering problems in split mode
- Fixed CSS !important declaration conflicts between terminal-fix.css and layout.css

### Improved
- Optimized resize handling with requestAnimationFrame instead of setTimeout
- Enhanced WebGL renderer resize notifications for better performance
- Added WebGL-specific CSS rules for split mode canvas handling
- Improved CSS specificity to prevent layout conflicts

### Technical Details
- Removed excessive !important declarations from terminal positioning CSS
- Added conditional CSS rules for tab mode vs split mode
- Implemented WebGL context-aware resize handling
- Added proper canvas max-width/height constraints for split mode

## [0.1.10] - 2025-01-08

### Added
- Auto-updater with release notes viewer
- New release notes display window with proper styling
- Automatic update check on startup
- Update notification system

### Improved
- Update dialog now shows release notes in a dedicated window
- Better error handling for update process
- Cleaner update notification UI

### Fixed
- Update dialog styling and readability
- Auto-update error handling and recovery

## [0.1.9] - 2025-01-07

### Fixed
- Fixed xterm.js selection transparency issue with proper source code patching
- Resolved foreground color visibility problem in selected text
- Permanent fix integrated into build process

### Added
- Automated xterm.js patching during build
- Build-time verification of selection transparency fix

### Technical Details
- Modified SelectionRenderLayer.ts to use proper alpha channel (0.6)
- Integrated patch into automated build pipeline
- No runtime patching required

## Previous versions...

[Earlier changelog entries omitted for brevity]