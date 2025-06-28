# ZeamiTerm Architecture Documentation

## Overview

ZeamiTermは、Electron + xterm.js + node-ptyで構築された高性能ターミナルエミュレータです。
Claude Codeとの統合を念頭に設計されています。

## Architecture Layers

### 1. Main Process (Electron)
- **index.js**: アプリケーションのエントリーポイント
- **ptyService.js**: 疑似端末（PTY）プロセスの管理
- **sessionManager.js**: ターミナルセッションの管理
- **terminalProcessManager.js**: プロセスライフサイクル管理

### 2. Renderer Process
- **ZeamiTermManager.js**: 新しい統一されたターミナル管理システム
- **ZeamiTerminal.js**: xterm.jsを拡張したカスタムターミナルクラス
- **UnifiedHelpCommand.js**: 統一されたヘルプ/メニューシステム

### 3. Command Systems

#### Internal Commands (JavaScript)
- ZeamiTerminal内で実行される内部コマンド
- CommandRegistryで管理
- インタラクティブモードをサポート

#### Shell Commands (Zsh/Bash)
- シェル環境で実行される外部スクリプト
- zeami-menu.zshなどのシェルスクリプト
- シェル初期化時に設定

## Known Issues and Solutions

### 1. 画面下1/3表示問題

**原因**:
- Flexboxとabsolute positioningの混在
- xterm.jsの高さ計算タイミング
- FitAddonの初期化タイミング

**解決策**:
- 完全なCSSリセットと再構築
- ResizeObserverによる動的リサイズ
- 複数回のfit試行

### 2. メニューシステムの競合

**原因**:
- シェルコマンド（?）と内部コマンド（?）の競合
- コマンド処理の優先順位

**解決策**:
- 内部コマンドを別のキーに変更（例：Ctrl+?）
- またはシェル統合を無効化

## Best Practices

1. **コマンド追加時**
   - CommandRegistryに登録
   - インタラクティブモードが必要な場合は、enterInteractiveMode()を使用

2. **レイアウト変更時**
   - terminal-fix.cssで一元管理
   - Flexboxの階層を明確に

3. **新機能追加時**
   - 既存のアーキテクチャを理解
   - 必要に応じて全体を再設計
   - ドキュメントを更新

## Directory Structure

```
zeami-term/
├── src/
│   ├── main/           # Electronメインプロセス
│   ├── renderer/       # レンダラープロセス
│   │   ├── core/      # コアシステム
│   │   └── styles/    # スタイルシート
│   ├── xterm-zeami/   # xterm.js拡張
│   ├── commands/      # コマンドシステム
│   └── preload/       # プリロードスクリプト
├── scripts/           # シェルスクリプト
├── build/            # ビルド出力（xterm.js）
└── docs/             # ドキュメント
```

## Future Improvements

1. **コマンドシステムの統合**
   - シェルコマンドと内部コマンドの明確な分離
   - 設定ファイル（JSON/YAML）による管理

2. **レイアウトシステムの簡素化**
   - CSSグリッドへの移行検討
   - コンポーネント化の推進

3. **パフォーマンス最適化**
   - WebGL 2.0の完全活用
   - 仮想スクロールの実装