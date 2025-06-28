#!/bin/bash

# ZeamiTerm Release Preparation Script
# This script helps prepare a new release

set -e

echo "🚀 ZeamiTerm Release Preparation"
echo "================================"

# Check if we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo "⚠️  Warning: You're not on the main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes"
    echo "Please commit or stash them before releasing"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: v$CURRENT_VERSION"

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "1) Patch (bug fixes) - $(npm version patch --no-git-tag-version --dry-run)"
echo "2) Minor (new features) - $(npm version minor --no-git-tag-version --dry-run)"
echo "3) Major (breaking changes) - $(npm version major --no-git-tag-version --dry-run)"
echo "4) Custom version"
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        read -p "Enter custom version (without 'v' prefix): " CUSTOM_VERSION
        VERSION_TYPE="custom"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Update version
if [ "$VERSION_TYPE" = "custom" ]; then
    npm version $CUSTOM_VERSION --no-git-tag-version
    NEW_VERSION=$CUSTOM_VERSION
else
    NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version | sed 's/^v//')
fi

echo ""
echo "✅ Version updated to: v$NEW_VERSION"

# Update changelog
echo ""
echo "📝 Please update CHANGELOG.md with release notes"
echo "Press Enter when done..."
read

# Commit version bump
git add package.json package-lock.json
if [ -f CHANGELOG.md ]; then
    git add CHANGELOG.md
fi
git commit -m "chore: bump version to v$NEW_VERSION"

# Create and push tag
echo ""
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "📤 Ready to push!"
echo "Run the following commands to trigger the release:"
echo ""
echo "  git push origin $(git branch --show-current)"
echo "  git push origin v$NEW_VERSION"
echo ""
echo "This will trigger GitHub Actions to build and create the release."
echo ""
echo "After the release is created, remember to:"
echo "1. Check the release on GitHub"
echo "2. Edit release notes if needed"
echo "3. Test the auto-update functionality"