# 🚀 Command Intelligence Hub クイックスタートガイド

> 🤖 **Claude Code専用**: 実装を始めるための最速手順

## 📋 実装チェックリスト

### 即座に実行すべきコマンド
```bash
# 1. 必要なディレクトリ構造を作成
mkdir -p src/renderer/components/CommandIntelligence/{views,widgets,utils}
mkdir -p src/main/models
mkdir -p docs/command-intelligence

# 2. 現在の状態を確認
npm run dev  # 開発環境が正常に動作するか確認
```

### Phase 1 並列実装タスク

以下のファイルを**同時に作成**してください：

#### タスク1: データモデル
```javascript
// 📍 src/main/models/CommandExecutionModel.js
// ブリーフケースの仕様に基づいて実装
```

#### タスク2: 拡張OSCハンドラー
```javascript
// 📍 既存の ShellIntegrationAddon.js を拡張
// OSC 0,1,2,52,1337 を追加
```

#### タスク3: サービス拡張
```javascript
// 📍 MessageCenterService.js に以下を追加
// - registerCommandExecution()
// - getCommandStatistics()
// - filterCommands()
```

#### タスク4: スタイルシート
```css
/* 📍 src/renderer/styles/command-intelligence.css */
/* タイムライン、スイムレーン、統計表示用 */
```

### 動作確認ポイント

1. **OSC統合の確認**
   ```bash
   # ターミナルで実行してOSCが機能しているか確認
   echo $ZEAMI_TERM  # "1"が表示されるはず
   ```

2. **Message Centerの確認**
   - Window → Message Center を開く
   - 既存の通知が表示されることを確認

3. **データフローの確認**
   ```
   Terminal → OSC → ShellIntegrationAddon → MessageCenterService → UI
   ```

## 🎯 最初の1時間でやること

1. **データ構造の実装**（30分）
   - CommandExecutionModel.js
   - 既存との互換性レイヤー

2. **UI基盤の準備**（30分）
   - CommandIntelligenceHub.js（空の枠組み）
   - Message Center内にタブ追加

これで基本的な土台が完成し、次のフェーズに進めます。

## ⚡ 効率化のヒント

- **並列作業**: ファイル作成は全て同時に実行
- **ホットリロード**: `npm run dev`で自動更新を活用
- **段階的テスト**: 各機能を小さく実装してすぐ確認

---

準備ができたら「Phase 1を開始」と伝えてください！