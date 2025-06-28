#!/bin/bash

# ZeamiTerm Quick Release Script
# 素早くリリースを作成するためのスクリプト

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ZeamiTerm Quick Release${NC}"
echo "========================="
echo ""

# 引数チェック
if [ $# -eq 0 ]; then
    echo -e "${RED}エラー: バージョンタイプを指定してください${NC}"
    echo "使用方法: $0 [patch|minor|major]"
    echo ""
    echo "例:"
    echo "  $0 patch  # バグ修正 (0.1.2 → 0.1.3)"
    echo "  $0 minor  # 新機能 (0.1.2 → 0.2.0)"
    echo "  $0 major  # 破壊的変更 (0.1.2 → 1.0.0)"
    exit 1
fi

VERSION_TYPE=$1

# 現在のブランチ確認
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  警告: mainブランチではありません (現在: $CURRENT_BRANCH)${NC}"
    read -p "続行しますか？ (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 未コミットの変更チェック
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ エラー: 未コミットの変更があります${NC}"
    echo "先にコミットまたはstashしてください"
    exit 1
fi

# 現在のバージョン取得
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "現在のバージョン: ${GREEN}v$CURRENT_VERSION${NC}"

# バージョン更新
echo ""
echo "📝 バージョンを更新中..."
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version | sed 's/^v//')
echo -e "新しいバージョン: ${GREEN}v$NEW_VERSION${NC}"

# CHANGELOG.mdの存在確認
if [ ! -f CHANGELOG.md ]; then
    echo -e "${YELLOW}⚠️  CHANGELOG.mdが見つかりません${NC}"
    echo "作成しますか？ (Y/n)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "CHANGELOG.mdなしで続行します"
    else
        cat > CHANGELOG.md << EOF
# Changelog

## [${NEW_VERSION}] - $(date +%Y-%m-%d)

### Added
- 新機能の説明をここに記載

### Fixed
- バグ修正の説明をここに記載

### Changed
- 変更内容の説明をここに記載
EOF
        echo -e "${GREEN}✅ CHANGELOG.mdを作成しました${NC}"
    fi
fi

# リリースノート作成
echo ""
echo "📝 リリースノートを準備中..."
RELEASE_NOTES_FILE="release-notes-temp.md"

# CHANGELOGから最新エントリを抽出
if [ -f CHANGELOG.md ]; then
    # バージョンセクションを抽出
    awk -v version="$NEW_VERSION" '
        /^## \[/ { 
            if (found) exit; 
            if ($0 ~ "\\[" version "\\]") found=1 
        }
        found && /^## \[/ && !first { first=1; next }
        found && !first
    ' CHANGELOG.md > $RELEASE_NOTES_FILE
else
    # デフォルトのリリースノート
    cat > $RELEASE_NOTES_FILE << EOF
## ZeamiTerm v${NEW_VERSION}

このリリースの変更内容をここに記載してください。

### 新機能
- 

### 修正
- 

### 改善
- 
EOF
fi

# コミット
echo ""
echo "📦 変更をコミット中..."
git add package.json package-lock.json
if [ -f CHANGELOG.md ]; then
    git add CHANGELOG.md
fi
git commit -m "chore: bump version to v$NEW_VERSION"

# タグ作成
echo ""
echo "🏷️  タグを作成中..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# プッシュ
echo ""
echo "📤 GitHubにプッシュ中..."
git push origin $(git branch --show-current)
git push origin "v$NEW_VERSION"

# ビルド
echo ""
echo "🔨 アプリケーションをビルド中..."
echo "これには数分かかります..."

# 環境変数ファイルがあれば読み込み
if [ -f .env ]; then
    echo "🔐 環境変数を読み込み中..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Apple認証情報の確認
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_ID_PASSWORD" ]; then
    echo -e "${GREEN}✅ Apple公証が有効化されます${NC}"
else
    echo -e "${YELLOW}⚠️  Apple公証はスキップされます（認証情報がありません）${NC}"
    echo "   公証を有効にするには.envファイルを作成してください"
fi

npm run build:mac

# リリース作成
echo ""
echo "🎉 GitHubリリースを作成中..."
gh release create "v$NEW_VERSION" \
  --title "ZeamiTerm v$NEW_VERSION" \
  --notes-file "$RELEASE_NOTES_FILE" \
  dist/ZeamiTerm-*.dmg \
  dist/ZeamiTerm-*.dmg.blockmap \
  dist/latest-mac.yml \
  dist/ZeamiTerm-*.zip \
  dist/ZeamiTerm-*.zip.blockmap

# クリーンアップ
rm -f "$RELEASE_NOTES_FILE"

echo ""
echo -e "${GREEN}✨ リリース v$NEW_VERSION が完了しました！${NC}"
echo ""
echo "📋 次のステップ:"
echo "1. リリースページを確認: https://github.com/hiranotomo/zeami-term/releases/tag/v$NEW_VERSION"
echo "2. 必要に応じてリリースノートを編集"
echo "3. 前バージョンでアップデート機能をテスト"
echo ""
echo -e "${BLUE}お疲れ様でした！${NC}"