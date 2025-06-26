#!/bin/bash

# ZeamiTerm Performance Test Script
# Tests throttling, adaptive chunk sizing, and rendering performance

echo "=== ZeamiTerm Performance Test Suite ==="
echo "This script will test various performance features"
echo ""

# Test 1: Output throttling (> 1MB/s)
echo "Test 1: High-speed output throttling"
echo "Generating 10MB of random data at high speed..."
echo "You should see '[Output throttled]' messages"
echo "Press Enter to start..."
read

# Generate high-speed output
dd if=/dev/urandom bs=1024 count=10240 2>/dev/null | base64

echo ""
echo "Test 1 complete. Did you see throttling messages? (y/n)"
read response

# Test 2: Large scrollback test
echo ""
echo "Test 2: Large scrollback buffer"
echo "Generating 20,000 lines to test scrollback performance..."
echo "Press Enter to start..."
read

# Generate many lines
for i in {1..20000}; do
    echo "Line $i: $(date) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
done

echo ""
echo "Test 2 complete. Try scrolling up. Is it smooth? (y/n)"
read response

# Test 3: ANSI color stress test
echo ""
echo "Test 3: ANSI color rendering performance"
echo "Displaying complex colored output..."
echo "Press Enter to start..."
read

# Color test
for i in {1..1000}; do
    # Random foreground and background colors
    fg=$((30 + RANDOM % 8))
    bg=$((40 + RANDOM % 8))
    echo -e "\033[${fg};${bg}mColor test line $i: The quick brown fox jumps over the lazy dog\033[0m"
done

echo ""
echo "Test 3 complete. Was color rendering smooth? (y/n)"
read response

# Test 4: Unicode and emoji test
echo ""
echo "Test 4: Unicode and emoji rendering"
echo "Press Enter to start..."
read

echo "Unicode test: "
echo "日本語テスト: こんにちは世界"
echo "中文测试: 你好世界"
echo "한국어 테스트: 안녕하세요 세계"
echo "Emoji test: 😀 😃 😄 😁 😆 😅 😂 🤣 ☺️ 😊"
echo "Math symbols: ∑ ∏ ∫ √ ∞ ≈ ≠ ≤ ≥"
echo "Box drawing: ┌─┬─┐ │ │ │ ├─┼─┤ │ │ │ └─┴─┘"

echo ""
echo "Test 4 complete. Did all characters render correctly? (y/n)"
read response

# Test 5: Fast scrolling test
echo ""
echo "Test 5: Fast scrolling performance"
echo "Hold Shift and scroll to test fast scrolling (10 lines at a time)"
echo "Press Enter when ready to continue..."
read

# Test 6: Search performance
echo ""
echo "Test 6: Search functionality"
echo "Press Cmd/Ctrl+F to open search"
echo "Try searching for 'test' or use regex like 'Line \\d+'"
echo "Press Enter when done testing..."
read

echo ""
echo "=== Performance Test Complete ==="
echo ""
echo "Summary of features tested:"
echo "✓ Output throttling (>1MB/s)"
echo "✓ Large scrollback handling"
echo "✓ ANSI color rendering"
echo "✓ Unicode/emoji support"
echo "✓ Fast scrolling with Shift"
echo "✓ Search functionality"
echo ""
echo "Additional features to test manually:"
echo "- Tab management: Create multiple tabs with Cmd/Ctrl+T"
echo "- Tab switching: Use Cmd/Ctrl+1-9"
echo "- Selection: Select text with mouse (auto-copies to clipboard)"
echo "- WebGL rendering: Check console for 'WebGL renderer activated'"