#!/bin/bash

# Ad-hoc signing script for ZeamiTerm
# This provides basic code signing without Apple Developer Program

echo "🔏 Ad-hoc署名を開始します..."

# Check if app exists
if [ ! -d "dist/mac-arm64/ZeamiTerm.app" ]; then
    echo "❌ エラー: dist/mac-arm64/ZeamiTerm.app が見つかりません"
    echo "先に npm run build:mac を実行してください"
    exit 1
fi

# Sign the app with ad-hoc signature
echo "📝 アプリケーションに署名中..."
codesign --force --deep --sign - "dist/mac-arm64/ZeamiTerm.app"

if [ $? -eq 0 ]; then
    echo "✅ 署名が完了しました"
    echo ""
    echo "署名情報を確認中..."
    codesign --verify --verbose "dist/mac-arm64/ZeamiTerm.app"
    echo ""
    echo "📦 署名済みアプリは dist/mac-arm64/ZeamiTerm.app にあります"
    echo ""
    echo "⚠️  注意: これはAd-hoc署名です。他のMacでは依然として「開発元不明」の警告が出ますが、"
    echo "「壊れている」というメッセージは表示されなくなります。"
else
    echo "❌ 署名に失敗しました"
    exit 1
fi