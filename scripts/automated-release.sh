#!/bin/bash

# ZeamiTerm 自動リリーススクリプト
# 公証エラーを防ぐための完全自動化

set -e  # エラーで即座に停止

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ZeamiTerm 自動リリーススクリプト${NC}\n"

# 1. 環境変数チェック
echo -e "${YELLOW}📋 環境変数を確認中...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}❌ .envファイルが見つかりません${NC}"
    exit 1
fi

# .envファイルを読み込み
source .env

# 必須環境変数の確認
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_ID_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo -e "${RED}❌ 必須の環境変数が設定されていません${NC}"
    echo "必要な環境変数:"
    echo "  - APPLE_ID"
    echo "  - APPLE_ID_PASSWORD (App-specific password)"
    echo "  - APPLE_TEAM_ID"
    exit 1
fi

# 環境変数をエクスポート
export APPLE_ID
export APPLE_ID_PASSWORD
export APPLE_APP_SPECIFIC_PASSWORD="$APPLE_ID_PASSWORD"
export APPLE_TEAM_ID

echo -e "${GREEN}✅ 環境変数OK${NC}"
echo "  Apple ID: $APPLE_ID"
echo "  Team ID: $APPLE_TEAM_ID"

# 2. 証明書の確認
echo -e "\n${YELLOW}🔐 証明書を確認中...${NC}"
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application.*$APPLE_TEAM_ID"; then
    echo -e "${RED}❌ Developer ID証明書が見つかりません${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 証明書OK${NC}"

# 3. 現在のバージョンを取得
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "\n${YELLOW}📦 現在のバージョン: v${CURRENT_VERSION}${NC}"

# 4. CHANGELOGの確認
echo -e "\n${YELLOW}📝 CHANGELOGを確認してください${NC}"
echo "最新のエントリ:"
head -n 30 CHANGELOG.md | grep -A 20 "## \[$CURRENT_VERSION\]" || {
    echo -e "${RED}❌ バージョン $CURRENT_VERSION のCHANGELOGエントリが見つかりません${NC}"
    echo "CHANGELOGを更新してから再度実行してください"
    exit 1
}

echo -e "\n変更内容は正しいですか？ (y/n)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}リリースを中止しました${NC}"
    exit 1
fi

# 5. クリーンビルド
echo -e "\n${YELLOW}🧹 クリーンビルドを準備中...${NC}"
rm -rf dist/mac-arm64
rm -f dist/*.dmg dist/*.zip

# 6. ビルド・公証・リリース
echo -e "\n${YELLOW}🔨 ビルド・公証・リリースを実行中...${NC}"
echo -e "${YELLOW}これには10-15分かかります...${NC}"

npm run publish:mac || {
    echo -e "${RED}❌ リリースが失敗しました${NC}"
    
    # 公証履歴を確認
    echo -e "\n${YELLOW}公証履歴を確認中...${NC}"
    xcrun notarytool history --apple-id "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --team-id "$APPLE_TEAM_ID" | head -20
    
    exit 1
}

# 7. 公証確認
echo -e "\n${YELLOW}🔍 公証を確認中...${NC}"
DMG_FILE="dist/ZeamiTerm-${CURRENT_VERSION}-arm64.dmg"
if [ -f "$DMG_FILE" ]; then
    if xcrun stapler validate "$DMG_FILE"; then
        echo -e "${GREEN}✅ 公証完了！${NC}"
    else
        echo -e "${RED}❌ 公証が完了していません${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ DMGファイルが見つかりません${NC}"
    exit 1
fi

# 8. GitHubリリースの確認
echo -e "\n${YELLOW}📦 GitHubリリースを確認中...${NC}"
gh release view "v${CURRENT_VERSION}" || {
    echo -e "${RED}❌ GitHubリリースが見つかりません${NC}"
    exit 1
}

# 9. タグのプッシュ
echo -e "\n${YELLOW}📤 Gitタグをプッシュ中...${NC}"
git push origin main --tags

# 10. 完了
echo -e "\n${GREEN}🎉 リリース完了！${NC}"
echo -e "バージョン ${GREEN}v${CURRENT_VERSION}${NC} が正常にリリースされました"
echo -e "\nGitHubリリースページ:"
echo -e "${BLUE}https://github.com/hiranotomo/zeami-term/releases/tag/v${CURRENT_VERSION}${NC}"

# クリーンアップの提案
echo -e "\n${YELLOW}💡 ヒント: 古いビルドファイルをクリーンアップしますか？${NC}"
echo "rm -rf dist/ZeamiTerm-*.dmg dist/ZeamiTerm-*.zip"