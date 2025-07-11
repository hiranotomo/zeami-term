# 2025-01-20: 正統派なペースト処理の実装

## 問題
- 長文をペーストすると平文として表示される
- テキストが途中で切れる
- ブラケットペーストモードが正しく機能していない

## 原因
1. ZeamiTerminal.jsでペースト処理が完全に無効化されていた
2. フロー制御が長文ペーストに最適化されていなかった
3. 各層での責任分離が不明確だった

## 解決策

### 1. ZeamiTerminal.js - ペースト検出とチャンク処理
- ペースト検出ロジックの実装
  - ブラケットペーストマーカーの検出
  - 複数行や長いテキストのヒューリスティック検出
- 大量データのチャンク処理
  - 4KBチャンクに分割
  - チャンク間に5msの遅延
  - ブラケットペーストマーカーの適切な処理

### 2. ptyService.js - フロー制御の改善
- ペーストモードの自動検出と管理
  - ペースト開始/終了マーカーの検出
  - ペーストモード用の最適化されたパラメータ
  - 10秒のタイムアウト
- アダプティブな処理
  - 通常モード: 256バイトチャンク、5ms遅延
  - ペーストモード: 4KBチャンク、2ms遅延
  - スループット統計の記録

### 3. 実装の特徴
- **レイヤー分離**: 各層が明確な責任を持つ
- **パフォーマンス**: ペーストモードで高速処理
- **互換性**: Claude Codeのペースト処理と協調動作
- **堅牢性**: タイムアウトとエラーハンドリング

## テスト項目
1. 100行以上のコードをペースト
2. 1MB以上の大きなテキストをペースト
3. vim/nanoでのペースト動作
4. 通常の入力への影響がないことを確認

## 結果
正統派なペースト処理により、長文ペーストが適切に処理されるようになった。