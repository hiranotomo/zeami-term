#!/bin/bash

# Signed build script for ZeamiTerm

echo "🔐 ZeamiTerm 署名付きビルド"
echo "=========================="
echo ""

# Set environment variables
export APPLE_ID="tomo@teleport.jp"
export APPLE_TEAM_ID="CV92DCV37B"

# Check if App-specific password is provided
if [ -z "$1" ]; then
    echo "❌ エラー: App-specific passwordが必要です"
    echo ""
    echo "使い方: ./scripts/build-signed.sh <app-specific-password>"
    echo ""
    echo "App-specific passwordの生成方法:"
    echo "1. https://appleid.apple.com にサインイン"
    echo "2. ログインとセキュリティ → アプリ固有のパスワード"
    echo "3. + をクリックして新しいパスワードを生成"
    echo "4. xxxx-xxxx-xxxx-xxxx 形式のパスワードをコピー"
    exit 1
fi

export APPLE_ID_PASSWORD="$1"

echo "📝 設定:"
echo "   Apple ID: $APPLE_ID"
echo "   Team ID: $APPLE_TEAM_ID"
echo "   Password: ****-****-****-****"
echo ""

echo "🏗️  署名付きビルドを開始します..."
npm run build:mac