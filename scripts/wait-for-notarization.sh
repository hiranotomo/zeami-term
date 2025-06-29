#!/bin/bash

# 公証完了を待つスクリプト

echo "🔍 公証の状態を確認中..."

# 最新のDMGファイルをチェック
DMG_FILE="dist/ZeamiTerm-0.1.4-arm64.dmg"
ZIP_FILE="dist/ZeamiTerm-0.1.4-arm64-mac.zip"

# 公証が完了するまで待つ（最大30分）
MAX_WAIT=1800
WAITED=0
INTERVAL=30

while [ $WAITED -lt $MAX_WAIT ]; do
    # DMGファイルの公証状態を確認
    if xcrun stapler validate "$DMG_FILE" 2>/dev/null; then
        echo "✅ DMGファイルの公証が完了しました！"
        
        # ZIPファイルも確認
        if [ -f "$ZIP_FILE" ]; then
            echo "📦 ファイルをGitHubにアップロード中..."
            gh release upload v0.1.4 "$DMG_FILE" "$ZIP_FILE" --clobber
            echo "🎉 アップロード完了！"
            exit 0
        fi
    fi
    
    echo "⏳ 公証待機中... ($WAITED秒経過)"
    sleep $INTERVAL
    WAITED=$((WAITED + INTERVAL))
done

echo "❌ 公証がタイムアウトしました（30分経過）"
exit 1