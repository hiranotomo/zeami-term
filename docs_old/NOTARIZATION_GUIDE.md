# Apple公証（Notarization）ガイド

## 公証なしの現状

現在、ZeamiTermは署名済みですが公証されていません。これにより：

- ⚠️ 初回起動時に「開発元を検証できません」の警告が表示
- ⚠️ ユーザーが手動で許可する必要がある
- ✅ 一度許可すれば、以降は警告なしで起動可能

## ユーザー向け：警告の回避方法

### 方法1: 右クリックで開く（推奨）
1. ダウンロードしたZeamiTermを**右クリック**
2. 「開く」を選択
3. 警告ダイアログで「開く」をクリック

### 方法2: システム環境設定から許可
1. ZeamiTermをダブルクリック（警告が表示される）
2. システム環境設定 → セキュリティとプライバシー
3. 「このまま開く」ボタンをクリック

## 開発者向け：公証の実装

### 前提条件
1. Apple Developer Program メンバーシップ（年間$99）
2. Xcode（コマンドラインツール）がインストール済み

### セットアップ手順

#### 1. App-specific passwordの作成
1. https://appleid.apple.com にログイン
2. セキュリティ → アプリ用パスワード
3. 「パスワードを生成」をクリック
4. 名前を入力（例：zeami-term-notarization）
5. 生成されたパスワードを安全に保管

#### 2. 環境変数の設定
```bash
# ~/.zshrc または ~/.bash_profile に追加
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
export APPLE_TEAM_ID="CV92DCV37B"  # TELEPORT Co., LTD
```

#### 3. ビルドと公証
```bash
# 環境変数を設定してビルド
APPLE_ID="your-id" APPLE_ID_PASSWORD="your-password" npm run build:mac
```

### GitHub Actionsでの自動公証

`.github/workflows/release.yml`に以下の環境変数を追加：

```yaml
env:
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

GitHubリポジトリのSecrets設定で上記の値を登録。

## 公証のメリット

1. **ユーザー体験の向上**
   - 警告なしでアプリを起動可能
   - 信頼性の向上

2. **企業環境での利用**
   - MDM管理下のMacでも問題なく動作
   - IT部門の承認が不要

3. **自動アップデート**
   - よりスムーズなアップデート体験

## 公証の仕組み

```
アプリをビルド
    ↓
コード署名
    ↓
Appleに送信
    ↓
自動スキャン（マルウェアチェック）
    ↓
公証チケット発行
    ↓
アプリに埋め込み（Staple）
    ↓
配布
```

## よくある質問

### Q: 公証には時間がかかりますか？
A: 通常5-15分程度です。初回は最大24時間かかる場合があります。

### Q: 公証は必須ですか？
A: macOS 10.15以降では強く推奨されます。将来的に必須になる可能性があります。

### Q: 個人開発者でも公証できますか？
A: はい、Apple Developer Programに参加すれば可能です。

### Q: 公証されているか確認する方法は？
A: ターミナルで以下を実行：
```bash
spctl -a -v /Applications/ZeamiTerm.app
```

公証済みの場合：
```
/Applications/ZeamiTerm.app: accepted
source=Notarized Developer ID
```

未公証の場合：
```
/Applications/ZeamiTerm.app: rejected
source=Unnotarized Developer ID
```