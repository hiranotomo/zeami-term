# ZeamiTerm リリースガイド

## 🚀 推奨リリース方法

### 安全なリリース（推奨）

```bash
# バージョンを上げる
npm version patch  # または minor/major

# 安全なリリースコマンド（自動検証付き）
npm run release:safe
```

このコマンドは以下を自動実行します：
1. ビルド
2. **リリースファイルの検証**（latest-mac.yml含む）
3. GitHubへの自動アップロード

### リリース前の確認

```bash
# リリースファイルが全て揃っているか確認
npm run release:validate
```

## ⚠️ 重要な注意事項

### 自動アップデートに必要なファイル

以下のファイルが**全て**GitHubリリースに含まれている必要があります：

1. `ZeamiTerm-{version}-arm64.dmg` - インストーラー
2. `ZeamiTerm-{version}-arm64.dmg.blockmap` - 差分更新用
3. **`latest-mac.yml`** - 自動アップデート用メタデータ（最重要！）
4. `ZeamiTerm-{version}-arm64-mac.zip` - ZIPアーカイブ
5. `ZeamiTerm-{version}-arm64-mac.zip.blockmap` - 差分更新用

### よくある失敗と対策

#### ❌ 手動でGitHubリリースを作成
- DMGとZIPだけアップロードして`latest-mac.yml`を忘れる
- **対策**: `npm run release:safe`を使用

#### ❌ ビルドだけして手動アップロード
```bash
npm run build  # これだけだと危険！
```
- **対策**: 必ず`npm run release:validate`で確認

#### ✅ 正しいリリース方法
```bash
npm run release:safe  # 全自動で安全
```

## 📋 手動リリース時のチェックリスト

手動でリリースする場合は、必ず以下を確認：

- [ ] `npm run build`でビルド完了
- [ ] `npm run release:validate`で全ファイル確認
- [ ] GitHubリリースページで新規リリース作成
- [ ] **5つ全てのファイル**をアップロード（特に`latest-mac.yml`）
- [ ] リリースを公開
- [ ] 自動アップデートのテスト

## 🔧 トラブルシューティング

### 自動アップデートが動かない場合

1. エラーメッセージを確認
   ```
   Cannot find latest-mac.yml
   ```

2. GitHubリリースページを確認
   - `latest-mac.yml`がアセットに含まれているか？

3. 修正方法
   - リリースを編集
   - `dist/latest-mac.yml`をアップロード
   - 保存

### 検証スクリプトでエラーが出る場合

```bash
npm run build  # 再ビルド
npm run release:validate  # 再確認
```

## 📚 関連ドキュメント

- [自動アップデートの仕組み](./AUTO_UPDATE_SYSTEM.md)
- [リリースチェックリスト](./release-checklist-v2.md)
- [Apple公証ガイド](./apple-notarization-guide.md)