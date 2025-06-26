#!/bin/bash

# Test auto-update functionality
# This script helps test the auto-update feature locally

echo "🧪 ZeamiTerm Auto-Update Test Script"
echo "===================================="

# Check if GH_TOKEN is set
if [ -z "$GH_TOKEN" ]; then
    echo "❌ Error: GH_TOKEN environment variable is not set"
    echo ""
    echo "Please set your GitHub Personal Access Token:"
    echo "  export GH_TOKEN=your_token_here"
    echo ""
    echo "Or create a .env.local file with:"
    echo "  GH_TOKEN=your_token_here"
    exit 1
fi

# Load .env.local if exists
if [ -f ".env.local" ]; then
    export $(cat .env.local | xargs)
    echo "✅ Loaded environment variables from .env.local"
fi

# Current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Test options
echo ""
echo "Choose test option:"
echo "1. Build and create test release"
echo "2. Start app in production mode (test update check)"
echo "3. Bump version and build"
echo "4. Create GitHub release draft"
echo ""
read -p "Enter option (1-4): " option

case $option in
    1)
        echo "Building application..."
        npm run build
        echo "✅ Build complete. Files in dist/"
        echo ""
        echo "Next steps:"
        echo "1. Go to https://github.com/hiranotomo/zeami-term/releases/new"
        echo "2. Create a new release with version v$CURRENT_VERSION"
        echo "3. Upload the .dmg and .zip files from dist/"
        echo "4. Upload latest-mac.yml"
        echo "5. Publish as public release"
        ;;
        
    2)
        echo "Starting app in production mode..."
        NODE_ENV=production npm run dev
        ;;
        
    3)
        echo "Choose version bump:"
        echo "1. Patch (x.x.X)"
        echo "2. Minor (x.X.0)"
        echo "3. Major (X.0.0)"
        read -p "Enter option (1-3): " bump_option
        
        case $bump_option in
            1) npm version patch ;;
            2) npm version minor ;;
            3) npm version major ;;
            *) echo "Invalid option"; exit 1 ;;
        esac
        
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo "✅ Version bumped to $NEW_VERSION"
        echo ""
        echo "Building new version..."
        npm run build
        echo "✅ Build complete"
        ;;
        
    4)
        echo "Creating GitHub release..."
        if command -v gh &> /dev/null; then
            # Create release using GitHub CLI
            VERSION="v$CURRENT_VERSION"
            echo "Creating release $VERSION..."
            
            # Create release notes
            cat > release-notes.md << EOF
# ZeamiTerm $VERSION

## 新機能
- 自動アップデート機能を追加

## 改善
- パフォーマンスの最適化
- UIの改善

## バグ修正
- 各種バグ修正

---
[ダウンロード](https://github.com/hiranotomo/zeami-term/releases/download/$VERSION/ZeamiTerm-${CURRENT_VERSION}-arm64.dmg)
EOF
            
            # Create draft release
            gh release create $VERSION \
                --draft \
                --title "ZeamiTerm $VERSION" \
                --notes-file release-notes.md \
                dist/ZeamiTerm-${CURRENT_VERSION}-arm64.dmg \
                dist/ZeamiTerm-${CURRENT_VERSION}-arm64-mac.zip \
                dist/latest-mac.yml
                
            rm release-notes.md
            echo "✅ Draft release created. Visit GitHub to publish it."
        else
            echo "❌ GitHub CLI (gh) is not installed"
            echo "Install it with: brew install gh"
            echo ""
            echo "Or manually create release at:"
            echo "https://github.com/hiranotomo/zeami-term/releases/new"
        fi
        ;;
        
    *)
        echo "Invalid option"
        exit 1
        ;;
esac