# トグルUIとマルチウィンドウ機能実装

日付: 2025-06-28
作成者: Claude + User

## 実装概要

ZeamiTermのスプリット機能をトグルボタン方式のUIに刷新し、マルチウィンドウ機能を追加しました。

## 実装された機能

### 1. トグルボタンUI

![Toggle UI]
```
[Tab] [Horizontal] [Vertical]
```

- **Tab**: 通常のタブモード（デフォルト）
- **Horizontal**: 水平分割（上下に2つのターミナル）
- **Vertical**: 垂直分割（左右に2つのターミナル）

### 2. マルチウィンドウ機能

- **新規ウィンドウボタン（⧉）**: 新しいZeamiTermウィンドウを開く
- **メニューショートカット**: Cmd+Shift+N (Mac) / Ctrl+Shift+N (Windows/Linux)
- 各ウィンドウは独立して動作
- 各ウィンドウで最大2つのターミナルをスプリット表示可能

### 3. ディレクトリ継承

- スプリット時に親ターミナルの現在ディレクトリを継承
- 新しいターミナルは同じディレクトリで開始
- `cwd`パラメータによる制御

## 技術的実装詳細

### UIコンポーネント

```javascript
// トグルボタングループ
const toggleGroup = document.createElement('div');
toggleGroup.className = 'split-toggle-group';

// 各ボタンの状態管理
this.buttons = {
  tab: tabBtn,
  horizontal: horizontalBtn,
  vertical: verticalBtn
};
```

### モード切り替え

```javascript
setMode(mode) {
  // ボタンの状態を更新
  Object.keys(this.buttons).forEach(key => {
    this.buttons[key].classList.toggle('active', 
      (key === 'tab' && mode === 'tab') ||
      (key === 'horizontal' && mode === 'split-horizontal') ||
      (key === 'vertical' && mode === 'split-vertical')
    );
  });
  
  // レイアウトを更新
  if (mode === 'tab') {
    this.switchToTabMode();
  } else {
    this.createSplitLayout();
  }
}
```

### マルチウィンドウ管理

```javascript
// メインプロセス側
const windows = new Set();

function createNewWindow() {
  const window = createWindow(false);
  windows.add(window);
  window.on('closed', () => {
    windows.delete(window);
  });
  return window;
}

// 全ウィンドウへのブロードキャスト
BrowserWindow.getAllWindows().forEach(win => {
  if (!win.isDestroyed()) {
    win.webContents.send('terminal:data', { id, data });
  }
});
```

### CSSスタイリング

```css
/* トグルボタングループ */
.split-toggle-group {
  display: flex;
  gap: 1px;
  background: #464647;
  border-radius: 4px;
  padding: 1px;
}

.toggle-button {
  background: transparent;
  border: none;
  color: #969696;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-button.active {
  background: #007acc;
  color: white;
}
```

## 使用方法

1. **モード切り替え**: ヘッダーのトグルボタンをクリック
2. **新規ウィンドウ**: ⧉ボタンまたはCmd+Shift+N
3. **境界線調整**: スプリットモードで境界線をドラッグ
4. **ターミナル追加**: スプリットモードで自動的に2つ目のターミナルが作成

## パフォーマンス最適化

- タブモードでは非表示のターミナルをDOM上で保持
- スプリットモード切り替え時のみレイアウト再構築
- ウィンドウ間の通信は必要最小限に

## セキュリティ考慮事項

- 各ウィンドウは独立したプロセス
- IPCによる安全な通信
- contextIsolation有効

## 今後の拡張案

1. **フレキシブルグリッド**: 2x2や3分割などのレイアウト
2. **ウィンドウ間ドラッグ&ドロップ**: タブの移動
3. **レイアウトプリセット**: よく使う配置の保存
4. **キーボードナビゲーション**: ペイン間の移動ショートカット

## 結論

トグルボタンUIとマルチウィンドウ機能により、ZeamiTermはより直感的で柔軟なターミナル環境となりました。ユーザーは作業スタイルに応じて最適なレイアウトを選択でき、複数のプロジェクトを効率的に管理できます。