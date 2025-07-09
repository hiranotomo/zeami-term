# ZeamiTerm ビルドルール

## 重要：xterm.js のビルドについて

### 問題の背景

ZeamiTermは独自のxterm.jsフォークを使用していますが、ビルドプロセスに注意が必要です。
v0.1.8で`onPaste`メソッドが見つからないエラーが発生した原因は、xterm.jsのビルドにあります。

### ビルドルール

#### 1. 必ずxterm.jsをビルドする

```bash
npm run build:xterm
```

または

```bash
npm run build  # これもxterm.jsビルドを含む
```

**注意**: 単に`electron-builder`を実行するだけではxterm.jsはビルドされません。

#### 2. ビルド順序

1. xterm.jsパッチの適用（`scripts/apply-xterm-patches.js`）
2. xterm.jsのビルド（`scripts/build-xterm.js`）
3. Electronアプリのパッケージング

#### 3. xterm.js APIの使用方法

ビルドされたxterm.jsは以下のように公開されます：

```javascript
// グローバル変数として
window.Terminal

// Terminalクラスは
const term = new Terminal.Terminal();  // または new window.Terminal.Terminal()

// ZeamiTerminalでは
export class ZeamiTerminal extends window.Terminal
```

#### 4. onPasteメソッドについて

`onPaste`はxterm.js v5.x以降のAPIです。以下のように使用します：

```javascript
// 正しい使用方法
terminal.onPaste((data) => {
  // ペースト処理
  return false; // デフォルト処理を防ぐ
});

// 注意：onPasteはTerminalインスタンスのメソッドであり、
// 必ずterminal.open()の後に設定する必要があります
```

### ビルドの検証

ビルドが正しく行われたか確認するには：

1. `build/xterm.js`ファイルが存在することを確認
2. ファイルサイズが適切（通常1MB以上）
3. テストページ（`test-xterm-build.html`）で動作確認

### トラブルシューティング

#### Terminal is not definedエラー

- xterm.jsのビルドが失敗している
- `build/xterm.js`が正しく読み込まれていない

#### onPaste is not a functionエラー

- xterm.jsのバージョンが古い
- ビルドプロセスで必要なメソッドが含まれていない
- Terminalインスタンスが正しく作成されていない

### 開発時の注意事項

1. **package.jsonの変更時**: 必ず`npm install`を実行
2. **xterm関連の変更時**: 必ず`npm run build:xterm`を実行
3. **リリース前**: 必ず完全なビルド（`npm run build`）を実行

### CI/CDへの統合

将来的には以下をGitHub Actionsに追加すべき：

```yaml
- name: Build xterm.js
  run: npm run build:xterm
  
- name: Verify xterm.js build
  run: |
    if [ ! -f build/xterm.js ]; then
      echo "xterm.js build failed!"
      exit 1
    fi
```