# 2025-06-27: コマンドシステム統一実装

## 実装内容

ZeamiTermのコマンドシステムを根本的に再設計し、統一的なアーキテクチャを実装しました。

### 主な変更点

1. **統一ヘルプシステム**
   - `HelpCommand`と`MenuCommand`を`UnifiedHelpCommand`に統合
   - モード（'help' or 'menu'）で動作を切り替え
   - コード内で設定を管理（将来的にJSON化予定）

2. **インタラクティブモード**
   - `ZeamiTerminal`に統一的なインタラクティブモードを実装
   - `enterInteractiveMode(name, handler)`と`exitInteractiveMode()`メソッド
   - すべてのインタラクティブコマンドが同じAPIを使用

3. **修正された問題**
   - ✅ 画面下1/3表示問題（MatrixCommandのcanvas配置を修正）
   - ✅ MenuCommandの数字キー選択
   - ✅ InfiniteCommandのCtrl+C対応
   - ✅ help vs ?の表示内容統一

## 技術的詳細

### UnifiedHelpCommand
```javascript
export class UnifiedHelpCommand {
  constructor(mode = 'help') {
    this.mode = mode; // 'help' or 'menu'
    // コマンド定義と性能テストをコード内で管理
  }
}
```

### インタラクティブモード
```javascript
// コマンドでの使用例
terminal.enterInteractiveMode('menu', (data) => {
  if (data === 'q') {
    terminal.exitInteractiveMode();
    return true; // handled
  }
  return false; // pass through
});
```

## 教訓

1. **統合の重要性**: 新しいコードを作ったら、古いコードは必ず統合・削除する
2. **設定の集約**: 設定をあちこちに散らばらせず、一箇所で管理
3. **APIの統一**: 同じような機能は同じAPIで実装

## 次のステップ

- コマンド設定のJSON化
- より高度なインタラクティブコマンドの実装
- パフォーマンステストの拡充