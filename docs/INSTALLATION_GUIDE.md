# ZeamiTerm インストールガイド

## macOSでのインストール

### ダウンロード
1. [リリースページ](https://github.com/hiranotomo/zeami-term/releases)から最新の`.dmg`ファイルをダウンロード
2. ダウンロードした`.dmg`ファイルをダブルクリック
3. ZeamiTermをApplicationsフォルダにドラッグ

### 「アプリケーションが壊れている」エラーが出た場合

これは、アプリが開発者証明書で署名されていないために発生するmacOSのセキュリティ機能です。

#### 解決方法1: コマンドラインを使用（推奨）
```bash
# Terminalを開いて以下のコマンドを実行
xattr -cr /Applications/ZeamiTerm.app
```

#### 解決方法2: 右クリックで開く
1. Finderで`/Applications/ZeamiTerm.app`を右クリック
2. 「開く」を選択
3. 警告ダイアログで「開く」をクリック

#### 解決方法3: システム設定から許可
1. アプリをダブルクリックしてエラーが出たら「OK」
2. システム設定 → プライバシーとセキュリティ
3. 「"ZeamiTerm"は開発元を確認できないため...」の横にある「このまま開く」をクリック

## セキュリティについて

現在、ZeamiTermは個人開発のため、Apple Developer Programに参加しておらず、アプリケーションに署名がされていません。これは技術的な問題ではなく、年間$99のDeveloper Program費用によるものです。

アプリケーション自体は安全で、ソースコードは[GitHub](https://github.com/hiranotomo/zeami-term)で公開されています。

## 今後の予定

- Apple Developer Programへの参加を検討中
- 署名付きアプリケーションの配布
- Homebrew Caskでのインストール対応