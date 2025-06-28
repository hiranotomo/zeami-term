# ZeamiTerm リリースプロセス

## 概要

ZeamiTermのリリースプロセスは、自動アップデート機能と連携して動作します。
このドキュメントでは、新しいバージョンをリリースする際の標準的な手順を説明します。

## 前提条件

- GitHubリポジトリ: `https://github.com/hiranotomo/zeami-term`
- macOS開発環境
- 署名証明書: `Developer ID Application: TELEPORT Co., LTD (CV92DCV37B)`
- Node.js 18以上
- GitHub CLI (`gh`) インストール済み
- (オプション) Apple Developer Programメンバーシップ（公証用）

## リリース手順

### 1. リリース準備スクリプトを実行

```bash
./scripts/prepare-release.sh
```

このスクリプトは以下を自動的に実行します：
- 現在のブランチとコミット状態の確認
- バージョン番号の選択（patch/minor/major）
- package.jsonのバージョン更新
- CHANGELOG.mdの更新プロンプト
- 変更のコミット
- Gitタグの作成

### 2. 変更をプッシュ

スクリプトの最後に表示されるコマンドを実行：

```bash
git push origin main
git push origin v0.1.x  # 実際のバージョン番号
```

### 3. GitHub Actionsによる自動ビルド（将来実装予定）

現在は手動ビルドが必要ですが、将来的にはタグプッシュで自動的にビルドされます。

### 4. 手動ビルド（現在の方法）

#### 公証あり（推奨）
```bash
# .envファイルを作成（初回のみ）
cp .env.example .env
# .envファイルを編集してApple ID情報を設定

# ビルド（自動的に公証されます）
npm run build:mac
```

#### 公証なし
```bash
# 公証をスキップしてビルド
SKIP_NOTARIZE=true npm run build:mac
```

### 5. GitHubリリースの作成

```bash
# リリースノートを準備
cat > release-notes.md << EOF
## 新機能
- 機能1の説明
- 機能2の説明

## 修正
- バグ修正1
- バグ修正2

## 改善
- パフォーマンス改善
- UI/UX改善
EOF

# リリースを作成
gh release create v0.1.x \
  --title "ZeamiTerm v0.1.x" \
  --notes-file release-notes.md \
  dist/ZeamiTerm-*.dmg \
  dist/ZeamiTerm-*.dmg.blockmap \
  dist/latest-mac.yml \
  dist/ZeamiTerm-*.zip \
  dist/ZeamiTerm-*.zip.blockmap

# 一時ファイルを削除
rm release-notes.md
```

## 自動アップデートの仕組み

### アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐
│  ZeamiTerm App  │────▶│  GitHub Releases │
│                 │     │  (Public)        │
│ electron-updater│◀────│                  │
└─────────────────┘     └──────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│  Check Update   │     │  Download Files  │
│  (5秒後/手動)   │     │  - .dmg          │
│                 │     │  - .yml          │
└─────────────────┘     └──────────────────┘
```

### 設定ファイル

1. **electron-builder.yml**
```yaml
publish:
  provider: github
  owner: hiranotomo
  repo: zeami-term
```

2. **autoUpdater.js**
- パッケージ化されたアプリでのみ有効
- 5秒後に自動チェック
- 手動チェックも可能

### アップデートフロー

1. **チェック**: アプリ起動5秒後、またはメニューから手動実行
2. **通知**: 新バージョンが見つかったらダイアログ表示
3. **ダウンロード**: ユーザーが承認したらダウンロード開始
4. **インストール**: ダウンロード完了後、再起動でインストール

## リリースチェックリスト

- [ ] 全ての変更がコミットされている
- [ ] テストが全て通過している
- [ ] CHANGELOG.mdが更新されている
- [ ] バージョン番号が適切に更新されている
- [ ] 前回のリリースからの全ての変更が含まれている

## トラブルシューティング

### ビルドエラー

```bash
# node_modulesをクリーンインストール
rm -rf node_modules package-lock.json
npm install

# Electronの再ビルド
npm run rebuild
```

### 署名エラー

```bash
# 証明書の確認
security find-identity -v -p codesigning

# キーチェーンのロック解除
security unlock-keychain -p "パスワード" login.keychain
```

### 公証エラー

```bash
# 公証ログの確認
xcrun notarytool log [submission-id] --apple-id YOUR_APPLE_ID

# 詳細は docs/NOTARIZATION_SETUP.md を参照
```

### アップデートが検出されない

1. `latest-mac.yml`がリリースに含まれているか確認
2. バージョン番号が正しく増加しているか確認
3. リリースが"Latest release"として公開されているか確認

## ベストプラクティス

1. **セマンティックバージョニング**を遵守
   - パッチ: バグ修正のみ
   - マイナー: 後方互換性のある新機能
   - メジャー: 破壊的変更

2. **リリースノート**は日本語で分かりやすく記載

3. **テスト**は必ず実施
   - 開発環境でのテスト
   - ビルド後の動作確認
   - アップデート機能のテスト

4. **バックアップ**を作成
   - 前バージョンのビルドを保管
   - ロールバック可能な状態を維持