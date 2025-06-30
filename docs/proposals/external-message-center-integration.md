# ZeamiTerm メッセージセンター外部送信機能

## 概要
ZeamiTermのメッセージセンターに外部プロセス（Claude Code、Zeami CLIなど）からメッセージを送信できる機能の実装提案。

## 背景
- 現在のメッセージセンターは内部のElectronプロセス間通信のみ対応
- Claude Codeなどから作業完了通知や進捗報告を送信できない
- 開発者の作業状況を可視化する手段が限定的

## 実装方式の比較

### 1. 名前付きパイプ（Named Pipe）方式 ⭐ 推奨
**メリット**
- 高速：OSレベルの効率的な通信
- セキュア：ローカルマシン内のみの通信
- シンプル：追加の依存関係不要
- 双方向通信可能

**実装概要**
- ZeamiTerm側：`ExternalMessageServer`でパイプサーバーを起動
- Zeami CLI側：`zeami message`コマンドでパイプに接続して送信

### 2. HTTPサーバー方式
**メリット**
- RESTful API設計が可能
- 言語非依存
- デバッグが容易

**デメリット**
- ポート管理が必要
- オーバーヘッドが大きい

### 3. ファイル監視方式
**メリット**
- 最も疎結合
- 非同期処理に適している
- クラッシュ耐性が高い

**デメリット**
- ファイルI/Oのオーバーヘッド
- リアルタイム性が低い

## 推奨実装の詳細

### パイプパス
- Windows: `\\\\.\\pipe\\zeami-term-message`
- macOS/Linux: `/tmp/zeami-term-message.sock`

### メッセージフォーマット
```json
{
  "type": "zeami-cli-notification",
  "content": "ビルドが完了しました",
  "data": {
    "zeamiCommand": "zeami message",
    "cwd": "/path/to/project",
    "timestamp": 1234567890,
    "exitCode": 0
  }
}
```

### 使用例
```bash
# 基本的な使用
zeami message "ビルドが完了しました"

# タイプを指定
zeami message "エラーを修正しました" --type success

# 追加データ付き
zeami message "テスト完了" --data '{"passed":10,"failed":0}'

# パイプラインでの使用
npm run build && zeami message "ビルド成功" || zeami message "ビルド失敗" --type error
```

## セキュリティ考慮事項
- ローカルマシン内の通信に限定
- メッセージサイズの制限（デフォルト1MB）
- 入力検証とサニタイゼーション

## 今後の拡張可能性
- 双方向通信（応答の受信）
- メッセージのフィルタリング・ルーティング
- プラグインシステムとの統合
- 通知の優先度設定

## 実装スケジュール案
1. Phase 1: 基本的な送信機能（単方向）
2. Phase 2: エラーハンドリングとリトライ
3. Phase 3: 双方向通信と応答処理
4. Phase 4: 高度なフィルタリングとルーティング

---
作成日: 2025-06-30
ステータス: 検討中