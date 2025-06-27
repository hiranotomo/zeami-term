#!/bin/bash

# Setup script for code signing and notarization
# This script helps you set up the required environment variables

echo "🔐 ZeamiTerm 署名・公証設定スクリプト"
echo "======================================="
echo ""

# Check if certificate is installed
echo "📝 証明書を確認中..."
CERT_CHECK=$(security find-identity -v -p codesigning | grep "TELEPORT")
if [ -z "$CERT_CHECK" ]; then
    echo "❌ エラー: Developer ID証明書が見つかりません"
    exit 1
else
    echo "✅ 証明書が見つかりました:"
    echo "$CERT_CHECK"
fi

echo ""
echo "📧 Apple IDとApp-specific passwordを設定します"
echo ""

# Get Apple ID
if [ -z "$APPLE_ID" ]; then
    read -p "Apple ID (メールアドレス): " APPLE_ID_INPUT
    export APPLE_ID="$APPLE_ID_INPUT"
fi

# Get App-specific password
if [ -z "$APPLE_ID_PASSWORD" ]; then
    echo "App-specific password (appleid.apple.comで生成):"
    read -s APPLE_ID_PASSWORD_INPUT
    echo ""
    export APPLE_ID_PASSWORD="$APPLE_ID_PASSWORD_INPUT"
fi

# Set Team ID
export APPLE_TEAM_ID="CV92DCV37B"

echo ""
echo "✅ 環境変数を設定しました:"
echo "   APPLE_ID: $APPLE_ID"
echo "   APPLE_TEAM_ID: $APPLE_TEAM_ID"
echo "   APPLE_ID_PASSWORD: ****"

echo ""
echo "📦 署名付きビルドを開始しますか？ (y/n)"
read -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🏗️  ビルドを開始します..."
    npm run build:mac
else
    echo "ℹ️  手動でビルドする場合は以下のコマンドを実行してください:"
    echo "   npm run build:mac"
fi