#!/bin/bash

# Zeami Term エラー表示機能のテストスクリプト

echo "=== Zeami Term Error Display Test ==="
echo ""
echo "各種エラーパターンをテストします..."
echo ""

# 1. Connection error
echo "Test 1: Connection error"
echo "API Error (Connection error.) · Retrying in 1 seconds… (attempt 1/10)"
sleep 2

# 2. Request timeout
echo -e "\nTest 2: Request timeout"
echo "API Error (Request timed out.) · Retrying in 5 seconds… (attempt 4/10)"
sleep 2

# 3. OAuth token expired
echo -e "\nTest 3: OAuth token expired"
echo 'API Error: 401 {"type":"error","error":{"type":"authentication_error","message":"OAuth token has expired. Please obtain a new token or refresh your existing token."}}'
sleep 2

# 4. Fetch failed
echo -e "\nTest 4: Fetch failed"
echo "TypeError (fetch failed)"
sleep 2

# 5. Success pattern (should clear error)
echo -e "\nTest 5: Success pattern (エラーが消えるはず)"
echo "Connected successfully!"
echo "Ready"

echo -e "\n=== Test Complete ==="
echo "エラーバナーが表示され、30秒後に自動的に消えることを確認してください。"