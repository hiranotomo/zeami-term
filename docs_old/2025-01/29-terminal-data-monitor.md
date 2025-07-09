# 2025-01-29: ターミナルデータモニター機能の実装

## 実装内容
リアルタイムでターミナルの入出力データを監視・記録できる専用モニターウィンドウを実装しました。

### 主な機能
- **リアルタイム表示**: ターミナルの全ての入出力をリアルタイムで表示
- **データ分類**: 入力（INPUT）と出力（OUTPUT）を色分けして表示
- **タイムスタンプ**: ミリ秒単位の正確なタイムスタンプ
- **HEX表示**: 非印字文字を含むデータはHEX形式でも表示
- **フィルタリング**: 入力/出力/タイムスタンプの表示切り替え
- **検索機能**: データ内のテキスト検索とハイライト
- **エクスポート**: セッションデータをJSON形式で保存

## 技術的詳細

### アーキテクチャ
```
Main Process (index.js)
    ├── PtyService → MonitorWindow
    ├── TerminalProcessManager → MonitorWindow
    └── MonitorWindow
         ├── データバッファ (最大10,000件)
         └── 別ウィンドウ表示
```

### 実装ファイル
- `src/monitor/monitor.html` - モニターウィンドウのUI
- `src/monitor/monitor.css` - VS Code風ダークテーマ
- `src/monitor/monitor.js` - クライアント側ロジック
- `src/monitor/preload.js` - IPC通信ブリッジ
- `src/main/monitorWindow.js` - ウィンドウ管理クラス

### データフロー
1. ターミナル入出力が発生
2. PtyService/TerminalProcessManagerがデータを受信
3. global.monitorWindowにデータを送信
4. MonitorWindowがバッファに保存 & IPCで表示

### アクセス方法
- メニュー: 表示 → データモニター
- ショートカット: Cmd+Shift+M (Mac) / Ctrl+Shift+M (Windows/Linux)

## 課題と解決
- **課題**: 大量のデータでのパフォーマンス
- **解決**: 最大10,000件のリングバッファで古いデータを自動削除

## 次のステップ
- データの永続化機能
- 複数セッションの同時モニタリング
- データ分析機能（コマンド実行時間の統計など）

## 学んだこと
- Electronの複数ウィンドウ管理
- IPCを使った効率的なデータストリーミング
- リングバッファによるメモリ管理