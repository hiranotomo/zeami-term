# 2025-06-28: 初期化ローディング問題の修正

## 問題の概要
アプリケーションが初期化画面でスタックし、起動できない問題が発生していた。

## 原因
ProfileSelectorコンポーネントが`window.electronAPI.getProfiles()`を呼び出していたが、メインプロセスに対応するIPCハンドラーが登録されていなかった。

## 修正内容

### 1. IPCハンドラーの追加 
`src/main/index.js`のsetupIpcHandlers関数に以下のハンドラーを追加：

- **プロファイル管理**
  - `profiles:get` - プロファイル一覧と既定プロファイルIDを返す
  - `profiles:add` - 新規プロファイルを追加
  - `profiles:update` - 既存プロファイルを更新
  - `profiles:delete` - プロファイルを削除
  - `profiles:setDefault` - 既定プロファイルを設定

- **ファイル操作**
  - `file:open` - ファイル選択ダイアログを開く
  - `shell:openExternal` - 外部URLを開く

### 2. 必要なモジュールのインポート
`dialog`モジュールをelectronからインポートし、ファイルダイアログ機能を有効化。

## 結果
- アプリケーションが正常に起動するようになった
- ProfileManagerが「No saved profiles found, using defaults」と表示（初回起動時の正常な動作）
- Phase 3の機能実装が可能になった

## 学び
レンダラープロセスで公開されているAPIに対して、必ずメインプロセス側で対応するハンドラーを実装する必要がある。preload.jsとmain/index.jsの同期が重要。

## 関連ファイル
- `src/main/index.js` - IPCハンドラーの追加
- `src/preload/index.js` - APIの定義（既存）
- `src/renderer/components/ProfileSelector.js` - APIを使用するコンポーネント