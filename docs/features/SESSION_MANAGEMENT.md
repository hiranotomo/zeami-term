# ZeamiTerm セッション管理機能

## 概要

ZeamiTermは、ターミナルセッションの保存、復元、記録、再生機能を提供します。これにより、作業の継続性を保ち、デモやトレーニング用のセッション記録が可能になります。

## 機能一覧

### 1. セッション永続化 (SessionPersistence)

#### バッファ内容の保存と復元
- ターミナルバッファを最大10,000行まで保存
- 起動時に前回のセッション内容を表示可能
- 24時間以内のセッションのみ復元対象

#### 作業ディレクトリの記憶
- 最後の作業ディレクトリを保存
- 復元時に自動的にそのディレクトリへ移動

#### スクロール位置の保存
- 現在のスクロール位置（viewportY）を記憶
- 復元時に同じ位置までスクロール

#### コマンド履歴
- シェル統合からコマンド履歴を抽出
- フォールバックとしてプロンプトパターンから推測

### 2. リアルタイムログ記録 (RealtimeLogger)

- すべての入出力をタイムスタンプ付きで記録
- 効率的なバッファリング（1000イベントまたは5秒ごと）
- JSON Lines形式またはバイナリ形式での保存
- 圧縮保存オプション（gzip）

### 3. セッション再生機能 (SessionPlayer)

- 記録したセッションをアニメーション再生
- 再生速度調整（0.5x〜4x）
- 一時停止/再開機能
- シーク機能（任意の時点へジャンプ）
- プログレスバー付きコントロールUI

## 使用方法

### セッション管理コマンド

```bash
# セッションの保存
session save [name]      # 現在のセッションを保存

# セッションの復元
session restore [name]   # 保存されたセッションを復元

# セッション一覧
session list            # 保存されているセッション一覧を表示

# セッションのクリア
session clear [name]    # 特定のセッション（または全て）を削除

# セッションのエクスポート/インポート
session export <name>   # セッションをファイルにエクスポート
session import <file>   # ファイルからセッションをインポート
```

### セッション記録コマンド

```bash
# 記録開始
session record <file> [options]
  --compress        # gzip圧縮を有効化
  --no-input       # キー入力を記録しない
  --binary         # バイナリ形式で保存

# 記録停止
session stop

# 記録の再生
session play <file> [options]
  --speed=2        # 再生速度（0.5-4x）
  --no-controls    # コントロールUIを表示しない
  --skip-silence   # 長い無活動期間をスキップ
  --show-input     # ユーザー入力を表示
```

### 自動保存

```bash
# 自動保存の有効化
session auto on [interval]   # intervalミリ秒ごとに自動保存（デフォルト: 30000）

# 自動保存の無効化
session auto off
```

## 自動機能

### 起動時の自動復元提案
- ZeamiTerm起動時、前回のセッションがある場合は自動的に復元を提案
- 最新のセッション情報（日時、ディレクトリ、バッファサイズ）を表示

### リアルタイム自動保存
- デフォルトで30秒ごとに自動保存
- ユーザー入力後5秒経過で自動保存（デバウンス機能付き）

## セキュリティとプライバシー

### ⚠️ 重要な注意事項

1. **APIキーとパスワード**
   - ターミナルに表示されたAPIキーやパスワードは**そのまま記録されます**
   - 記録ファイルは平文で保存されるため、取り扱いに注意

2. **環境変数**
   - SessionPersistenceは環境変数を部分的にサニタイズ
   - PASSWORD、TOKEN、KEY、SECRET、CREDENTIALを含む変数は除外
   - ただし、ターミナル出力内の環境変数は除外されません

3. **推奨事項**
   - 機密情報を扱うセッションは記録しない
   - 記録ファイルは安全な場所に保存
   - 共有する前に記録内容を確認

## 実装詳細

### アーキテクチャ

```
src/features/session/
├── SessionPersistence.js   # セッション永続化
├── RealtimeLogger.js      # リアルタイム記録
└── SessionPlayer.js       # セッション再生

src/commands/builtin/
├── SessionCommand.js      # sessionコマンド実装
└── SaveCommand.js         # sコマンド（簡易保存）
```

### データ形式

#### セッションメタデータ
```json
{
  "id": "session-123456789",
  "timestamp": 1234567890000,
  "buffer": ["line1", "line2", ...],
  "scrollPosition": 100,
  "workingDirectory": "/home/user/project",
  "environment": { ... },
  "dimensions": { "cols": 80, "rows": 24 },
  "commandHistory": [...],
  "metadata": {
    "version": "1.0",
    "terminalType": "bash",
    "platform": "darwin"
  }
}
```

#### 記録イベント形式（JSON Lines）
```jsonl
{"type":"metadata","data":{...}}
{"type":"output","timestamp":100,"data":"Hello World\r\n"}
{"type":"input","timestamp":200,"data":"ls"}
{"type":"resize","timestamp":300,"data":{"cols":100,"rows":30}}
{"type":"end","duration":5000}
```

### 保存場所

- **SessionPersistence**: ブラウザのlocalStorageまたはElectronアプリケーションデータ
- **RealtimeLogger**: ユーザー指定のファイルパス
- **SaveCommand**: ユーザーが選択した任意の場所

## トラブルシューティング

### セッションが復元されない
- セッションが24時間以上前の場合は自動的に無視されます
- localStorageがクリアされた可能性があります

### 記録ファイルが大きすぎる
- `--compress`オプションを使用してgzip圧縮を有効化
- 長時間の記録は定期的に分割することを推奨

### 再生が遅い/速い
- `--speed`オプションで再生速度を調整（0.5x〜4x）
- `--skip-silence`で無活動期間をスキップ

## 今後の拡張予定

- [ ] クラウド同期機能
- [ ] セッション共有機能
- [ ] 暗号化保存オプション
- [ ] セッション検索機能
- [ ] 差分記録による容量削減

## 更新履歴

- 2025-06-28: 初版作成 - 全機能実装完了