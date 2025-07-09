# Apple公証セットアップ手順

## 🎯 目的
次回リリースからApple公証を適用し、ユーザーが警告なしでZeamiTermを起動できるようにします。

## 📋 前提条件

1. **Apple Developer Program** メンバーシップ（年間$99）
2. **macOS** 開発環境
3. **Xcode** コマンドラインツール

## 🔧 セットアップ手順

### ステップ1: Apple Developer Programに参加

1. https://developer.apple.com/programs/ にアクセス
2. 「Enroll」をクリック
3. 個人または組織として登録（年間$99）

### ステップ2: App-specific passwordの作成

1. https://appleid.apple.com にログイン
2. サインインとセキュリティ → アプリ用パスワード
3. 「+」をクリックして新規作成
4. 名前を入力: `zeami-term-notarize`
5. 生成されたパスワードをコピー（xxxx-xxxx-xxxx-xxxx形式）

### ステップ3: Team IDの確認

1. https://developer.apple.com/account にログイン
2. Membership → Team ID を確認
3. 現在の署名証明書のTeam ID: `CV92DCV37B`

### ステップ4: ローカル環境の設定

```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集
nano .env
```

以下の内容を設定：
```
APPLE_ID=your-apple-id@example.com
APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App-specific password
APPLE_TEAM_ID=CV92DCV37B  # または新しいTeam ID
```

### ステップ5: GitHub Secretsの設定（CI/CD用）

GitHubリポジトリで設定：

1. Settings → Secrets and variables → Actions
2. 「New repository secret」をクリック
3. 以下を追加：
   - `APPLE_ID`: あなたのApple ID
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Team ID

### ステップ6: 公証のテスト

```bash
# ローカルでビルドと公証をテスト
npm run build:mac

# ログを確認
# "Notarizing application..." が表示されれば成功
```

## 🚀 リリース時の動作

### 自動公証フロー

```
1. git tag v0.1.4
2. git push origin v0.1.4
   ↓
3. GitHub Actions起動
   ↓
4. ビルド → 署名 → 公証
   ↓
5. 公証済みアプリをリリース
```

### 手動リリース

```bash
# quick-releaseスクリプトを使用
npm run release:patch  # または minor/major

# スクリプトが自動的に：
# - .envから認証情報を読み込み
# - ビルドと公証を実行
# - GitHubにリリースを作成
```

## ✅ 公証の確認方法

### 公証状態の確認
```bash
# アプリの公証状態を確認
spctl -a -v /Applications/ZeamiTerm.app
```

期待される結果：
```
/Applications/ZeamiTerm.app: accepted
source=Notarized Developer ID
```

### 公証履歴の確認
```bash
# Apple Developerアカウントで公証履歴を確認
xcrun notarytool history --apple-id YOUR_APPLE_ID --team-id YOUR_TEAM_ID
```

## 🛠️ トラブルシューティング

### 公証が失敗する場合

1. **エンタイトルメントの確認**
   ```bash
   codesign -d --entitlements - /path/to/ZeamiTerm.app
   ```

2. **ハードened Runtimeの確認**
   ```bash
   codesign -dvv /path/to/ZeamiTerm.app | grep "Runtime"
   ```

3. **公証ログの確認**
   ```bash
   xcrun notarytool log [submission-id] --apple-id YOUR_APPLE_ID
   ```

### よくあるエラー

- **"The signature does not include a secure timestamp"**
  - 解決: インターネット接続を確認、時刻同期を確認

- **"The executable does not have the hardened runtime enabled"**
  - 解決: electron-builder.ymlで`hardenedRuntime: true`を確認

- **"The binary uses an SDK older than the 10.9"**
  - 解決: Xcodeを最新版に更新

## 📝 チェックリスト

- [ ] Apple Developer Programに登録
- [ ] App-specific passwordを作成
- [ ] .envファイルに認証情報を設定
- [ ] GitHub Secretsを設定（CI/CD用）
- [ ] ローカルでビルドと公証をテスト
- [ ] 公証済みアプリの動作確認

## 🎉 完了後

公証が成功すれば、次回リリースから：
- ユーザーは警告なしでアプリを起動可能
- 企業環境でも問題なく利用可能
- より信頼性の高いアプリとして配布可能