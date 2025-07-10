#!/bin/bash

# ZeamiTerm 統一リリーススクリプト
# このスクリプトがリリースプロセスの唯一の入口です

set -e  # エラーで即座に停止

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ZeamiTerm リリーススクリプト${NC}\n"

# ========================================
# 1. 環境チェック
# ========================================
echo -e "${YELLOW}📋 環境を確認中...${NC}"

# 現在のディレクトリチェック
if [ ! -f "package.json" ] || [ ! -f "electron-builder.yml" ]; then
    echo -e "${RED}❌ エラー: プロジェクトルートから実行してください${NC}"
    exit 1
fi

# .envファイルチェック
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ エラー: .envファイルが見つかりません${NC}"
    echo -e "${YELLOW}以下の内容で.envファイルを作成してください:${NC}"
    echo "APPLE_ID=your-apple-id@example.com"
    echo "APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App-specific password"
    echo "APPLE_TEAM_ID=XXXXXXXXXX"
    echo "GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # GitHub personal access token"
    exit 1
fi

# 環境変数を読み込み
source .env

# 必須環境変数の確認
REQUIRED_VARS=("APPLE_ID" "APPLE_ID_PASSWORD" "APPLE_TEAM_ID")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

# GH_TOKENはGitHub CLIを使用する場合はオプション
if ! command -v gh &> /dev/null; then
    if [ -z "$GH_TOKEN" ]; then
        MISSING_VARS+=("GH_TOKEN (or install GitHub CLI)")
    fi
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ エラー: 以下の環境変数が設定されていません:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

# 環境変数を統一（互換性のため両方設定）
export APPLE_ID
export APPLE_ID_PASSWORD
export APPLE_APP_SPECIFIC_PASSWORD="$APPLE_ID_PASSWORD"
export APPLE_TEAM_ID
export GH_TOKEN

echo -e "${GREEN}✅ 環境変数OK${NC}"

# ========================================
# 2. 証明書の確認
# ========================================
echo -e "\n${YELLOW}🔐 証明書を確認中...${NC}"
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application.*$APPLE_TEAM_ID"; then
    echo -e "${RED}❌ Developer ID証明書が見つかりません${NC}"
    echo "Xcodeまたは Apple Developer サイトから証明書をダウンロードしてください"
    exit 1
fi
echo -e "${GREEN}✅ 証明書OK${NC}"

# ========================================
# 3. バージョンの取得と確認
# ========================================
echo -e "\n${YELLOW}📦 バージョン情報...${NC}"
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "現在のバージョン: v$CURRENT_VERSION"

# リリースタイプを確認
if [ -z "$1" ]; then
    echo -e "\n${YELLOW}リリースタイプを選択してください:${NC}"
    echo "1) patch (バグ修正)"
    echo "2) minor (新機能)"
    echo "3) major (破壊的変更)"
    echo "4) 現在のバージョンのまま"
    read -p "選択 [1-4]: " choice
    
    case $choice in
        1) RELEASE_TYPE="patch";;
        2) RELEASE_TYPE="minor";;
        3) RELEASE_TYPE="major";;
        4) RELEASE_TYPE="current";;
        *) echo -e "${RED}無効な選択${NC}"; exit 1;;
    esac
else
    RELEASE_TYPE=$1
fi

# バージョンを更新
if [ "$RELEASE_TYPE" != "current" ]; then
    echo -e "\n${YELLOW}🔄 バージョンを更新中...${NC}"
    npm version $RELEASE_TYPE --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo -e "${GREEN}✅ バージョンを v$NEW_VERSION に更新しました${NC}"
else
    NEW_VERSION=$CURRENT_VERSION
fi

# ========================================
# 4. CHANGELOG更新の確認
# ========================================
echo -e "\n${YELLOW}📝 CHANGELOG.mdを確認してください${NC}"
echo "バージョン v$NEW_VERSION のエントリーが追加されているか確認してください"
read -p "続行しますか? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}キャンセルしました${NC}"
    exit 1
fi

# ========================================
# 5. クリーンビルド
# ========================================
echo -e "\n${YELLOW}🧹 クリーンビルドを開始...${NC}"
rm -rf dist node_modules/.cache

# ========================================
# 6. ビルドと公証
# ========================================
echo -e "\n${YELLOW}🔨 ビルドと公証を実行中...${NC}"
echo "これには数分かかる場合があります..."

npm run build:mac

# ビルド結果の確認
if [ ! -f "dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg" ]; then
    echo -e "${RED}❌ DMGファイルが作成されませんでした${NC}"
    exit 1
fi

if [ ! -f "dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip" ]; then
    echo -e "${RED}❌ ZIPファイルが作成されませんでした${NC}"
    exit 1
fi

if [ ! -f "dist/latest-mac.yml" ]; then
    echo -e "${RED}❌ latest-mac.ymlが作成されませんでした${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ビルド成功${NC}"

# ========================================
# 7. ZIPファイルのシンボリックリンク確認
# ========================================
echo -e "\n${YELLOW}🔍 ZIPファイルを検証中...${NC}"
ZIP_SIZE=$(stat -f%z "dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip")
if [ $ZIP_SIZE -lt 50000000 ]; then  # 50MB未満の場合は問題がある可能性
    echo -e "${YELLOW}⚠️  ZIPファイルが小さすぎます（シンボリックリンクの問題の可能性）${NC}"
    echo "サイズ: $(($ZIP_SIZE / 1024 / 1024))MB"
    
    # ZIPを再作成
    echo -e "${YELLOW}🔧 ZIPファイルを再作成中...${NC}"
    cd dist/mac-arm64
    zip -ry "../ZeamiTerm-${NEW_VERSION}-arm64-mac.zip" ZeamiTerm.app
    cd ../..
    
    # SHA512を再計算
    NEW_SHA512=$(shasum -a 512 "dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip" | awk '{print $1}' | xxd -r -p | base64)
    NEW_SIZE=$(stat -f%z "dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip")
    
    # latest-mac.ymlを更新
    echo -e "${YELLOW}📝 latest-mac.ymlを更新中...${NC}"
    cat > dist/latest-mac.yml << EOF
version: ${NEW_VERSION}
files:
  - url: ZeamiTerm-${NEW_VERSION}-arm64-mac.zip
    sha512: ${NEW_SHA512}
    size: ${NEW_SIZE}
  - url: ZeamiTerm-${NEW_VERSION}-arm64.dmg
    sha512: $(shasum -a 512 "dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg" | awk '{print $1}' | xxd -r -p | base64)
    size: $(stat -f%z "dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg")
path: ZeamiTerm-${NEW_VERSION}-arm64-mac.zip
sha512: ${NEW_SHA512}
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF
fi

echo -e "${GREEN}✅ ファイル検証完了${NC}"

# ========================================
# 8. リリースファイルの最終確認
# ========================================
echo -e "\n${YELLOW}📋 リリースファイル:${NC}"
ls -lh dist/*.dmg dist/*.zip dist/*.yml

# ========================================
# 9. GitHubリリースの作成
# ========================================
echo -e "\n${YELLOW}🚀 GitHubリリースを作成しますか?${NC}"
read -p "続行しますか? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}手動でリリースを作成してください${NC}"
    echo "必要なファイル:"
    echo "  - dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg"
    echo "  - dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip"
    echo "  - dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip.blockmap"
    echo "  - dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg.blockmap"
    echo "  - dist/latest-mac.yml"
    exit 0
fi

# CHANGELOGから最新のエントリーを抽出
RELEASE_NOTES=$(awk "/^## \[${NEW_VERSION}\]/{flag=1; next} /^## \[/{flag=0} flag" CHANGELOG.md)

if [ -z "$RELEASE_NOTES" ]; then
    echo -e "${RED}❌ CHANGELOG.mdにv${NEW_VERSION}のエントリーが見つかりません${NC}"
    exit 1
fi

# GitHubリリースを作成
echo -e "\n${YELLOW}📤 GitHubリリースを作成中...${NC}"
gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --notes "$RELEASE_NOTES" \
    "dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg" \
    "dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip" \
    "dist/ZeamiTerm-${NEW_VERSION}-arm64-mac.zip.blockmap" \
    "dist/ZeamiTerm-${NEW_VERSION}-arm64.dmg.blockmap" \
    "dist/latest-mac.yml"

# ========================================
# 10. 完了
# ========================================
echo -e "\n${GREEN}🎉 リリース v${NEW_VERSION} が完了しました！${NC}"
echo -e "${BLUE}リリースページ: https://github.com/hiranotomo/zeami-term/releases/tag/v${NEW_VERSION}${NC}"

# Gitコミットの作成
echo -e "\n${YELLOW}💾 変更をコミットしますか?${NC}"
read -p "続行しますか? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add package.json package-lock.json CHANGELOG.md
    git commit -m "chore: bump version to ${NEW_VERSION}"
    git tag "v${NEW_VERSION}"
    echo -e "${GREEN}✅ コミットとタグを作成しました${NC}"
    echo -e "${YELLOW}プッシュするには以下を実行してください:${NC}"
    echo "  git push origin main --tags"
fi