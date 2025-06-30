# ZeamiTerm

Claude Codeとの対話を強化するElectronベースのスマートターミナルエミュレータ。VS Codeのターミナル実装を参考に、Zeamiエコシステムと統合されたモダンなターミナル環境を提供します。

## 主な機能

- 🚀 **GPUアクセラレーション** - WebGLレンダラーによる高速描画
- 📑 **タブ管理** - 複数ターミナルセッションの管理
- 🔍 **検索機能** - ターミナル出力内のテキスト検索 (Cmd/Ctrl+F)
- 📋 **スマート選択** - マウス選択でクリップボードに自動コピー
- 🖼️ **スプリットビュー** - Tab/Horizontal/Verticalの3モード切替
- ⚡ **パフォーマンス最適化** - 大量出力の効率的な処理
- 🎨 **モダンUI** - VS Code風のクリーンなインターフェース
- 🔄 **自動アップデート** - 新バージョンの自動検出とワンクリック更新
- 🇯🇵 **日本語対応** - メニューとツールチップの完全日本語化

## 技術スタック

- **Electron** - クロスプラットフォームデスクトップアプリケーションフレームワーク
- **xterm.js** - ターミナルエミュレータライブラリ（カスタムフォーク版）
- **node-pty** - 疑似ターミナル実装
- **WebGL** - ハードウェアアクセラレーションレンダリング
- **electron-updater** - 自動アップデート機能

## インストール

### ユーザー向け（推奨）

[最新リリース](https://github.com/hiranotomo/zeami-term/releases/latest)から、お使いのOSに対応したインストーラーをダウンロードしてください。

- **macOS**: `ZeamiTerm-x.x.x-arm64.dmg` (Apple Silicon)

#### 初回起動時の注意（v0.1.5まで）

macOSのセキュリティ機能により、初回起動時に警告が表示される場合があります：

**回避方法：**
1. Finderでアプリを**右クリック**
2. 「開く」を選択
3. 警告ダイアログで「開く」をクリック

※ v0.1.6以降はApple公証済みとなり、この手順は不要になります。

### 開発者向け

```bash
# リポジトリをクローン
git clone https://github.com/hiranotomo/zeami-term.git
cd zeami-term

# 依存関係をインストール
npm install

# 開発モードで実行
npm run dev

# アプリケーションをビルド
npm run build:mac
```

## Development

### Project Structure

```
zeami-term/
├── src/
│   ├── main/           # Main process (Electron)
│   ├── renderer/       # Renderer process (UI)
│   └── preload/        # Preload scripts
├── assets/             # Application assets
└── docs/               # Documentation
```

### Key Components

- **terminalManager.js** - Manages terminal instances and xterm.js integration
- **ptyService.js** - Handles PTY (pseudo-terminal) processes
- **splitManager.js** - Manages split view functionality
- **workingPty.js** - Python-based PTY implementation

## 使い方

### キーボードショートカット

- `Cmd/Ctrl + T` - 新規ターミナルタブ
- `Cmd/Ctrl + W` - 現在のタブを閉じる
- `Cmd/Ctrl + K` - ターミナルをクリア
- `Cmd/Ctrl + F` - ターミナル内検索
- `Cmd/Ctrl + 1-9` - タブ番号で切り替え
- `Cmd/Ctrl + Shift + ]` - 次のタブ
- `Cmd/Ctrl + Shift + [` - 前のタブ
- `Cmd/Ctrl + Shift + N` - 新規ウィンドウ

### スプリットビュー

ヘッダーのTab/Horizontal/Verticalボタンで表示モードを切り替えます。境界線をドラッグしてペインのサイズを調整できます。

### 自動アップデート

- アプリ起動5秒後に自動的に新バージョンをチェック
- メニュー → ヘルプ → アップデートを確認 から手動チェックも可能
- アップデートがある場合は通知され、ワンクリックで更新できます

## ビルド

### macOS

```bash
npm run build:mac
# アプリケーションは dist/ZeamiTerm-x.x.x-arm64.dmg に作成されます
```

### Windows/Linux

```bash
npm run build:win   # Windows
npm run build:linux # Linux
```

## リリース

新しいバージョンをリリースする場合：

```bash
# 簡単リリース（推奨）
./scripts/quick-release.sh patch  # バグ修正
./scripts/quick-release.sh minor  # 新機能
./scripts/quick-release.sh major  # 破壊的変更

# または手動リリース
./scripts/prepare-release.sh
```

詳細は [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) を参照してください。

## 自動アップデート機能

ZeamiTermは以下のタイミングで自動的にアップデートをチェックします：
- アプリ起動時（5秒後）
- 2時間ごとの定期チェック

### アップデートの流れ
1. 新しいバージョンが見つかると通知ダイアログが表示されます
2. 「ダウンロード」を選択すると、バックグラウンドでダウンロードが開始されます
3. ダウンロード進捗はタスクバー/Dockに表示されます
4. ダウンロード完了後、再起動してアップデートを適用できます

### 開発環境でのテスト
開発環境でアップデート機能をテストするには：
```bash
UPDATE_TEST=true npm run dev
```

### 手動チェック
メニューの「ヘルプ」→「アップデートを確認...」からいつでも手動でチェックできます。

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System architecture and design decisions
- [Development Roadmap](docs/development/ROADMAP.md) - Feature roadmap and implementation phases
- [VS Code/xterm Feature Comparison](docs/development/FEATURE_COMPARISON.md) - Detailed feature analysis
- [Menu Systems](docs/MENU_SYSTEMS.md) - Understanding the dual menu system
- [Complete Refactoring Summary](docs/COMPLETE_REFACTORING_SUMMARY.md) - Recent architectural improvements

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Inspired by VS Code's terminal implementation
- Built on the excellent xterm.js library
- Part of the Zeami ecosystem