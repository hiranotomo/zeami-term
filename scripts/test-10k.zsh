#!/usr/bin/env zsh

# test-10k.zsh - 最速で1万行を生成（パフォーマンステスト用）

echo "=== Generating 10,000 lines for performance test ==="
echo "Starting at: $(date)"
echo ""

# 方法1: printfとseqを使った最速版
time seq -f "Line %06g: The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet." 1 10000

echo ""
echo "Completed at: $(date)"
echo ""
echo "Alternative methods:"
echo "1. Random content: seq 1 10000 | while read i; do echo \"Line \$i: \$(openssl rand -hex 20)\"; done"
echo "2. Code-like output: seq 1 10000 | awk '{print NR\": function process_\" NR \"() { return Math.random() * \" NR \"; }\"}'"
echo "3. JSON output: seq 1 10000 | jq -R '{line: (. | tonumber), content: \"data\"}'"