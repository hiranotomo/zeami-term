#!/usr/bin/env zsh

# ZeamiTerm テスト用エイリアス

# 基本的な1万行生成
alias test10k='seq -f "Line %06g: The quick brown fox jumps over the lazy dog." 1 10000'

# カラフルな1万行生成
alias test10k-color='seq 1 10000 | while read i; do printf "\033[0;3$((i % 7 + 1))mLine %05d\033[0m: Sample text for line $i\n" $i; done'

# コードっぽい1万行生成
alias test10k-code='seq 1 10000 | while read i; do echo "function process_$i() { console.log(\"Processing item $i\"); return $i * 2; }"; done'

# ランダムデータの1万行生成
alias test10k-random='seq 1 10000 | while read i; do echo "[$i] $(head -c 32 /dev/urandom | base64)"; done'

# JSON形式の1万行生成
alias test10k-json='seq 1 10000 | while read i; do echo "{\"id\": $i, \"data\": \"item_$i\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"; done'

# プログレスバー付き1万行生成
alias test10k-progress='total=10000; seq 1 $total | while read i; do echo "Line $i of $total"; if ((i % 1000 == 0)); then printf "\rProgress: %d%%" $((i * 100 / total)); fi; done; echo'

# エラーログ風の1万行生成
alias test10k-logs='seq 1 10000 | while read i; do level=$((RANDOM % 4)); case $level in 0) echo "[ERROR] [$i] Critical error at line $i";; 1) echo "[WARN]  [$i] Warning: performance degradation detected";; 2) echo "[INFO]  [$i] Processing request $i";; 3) echo "[DEBUG] [$i] Variable state: {count: $i}";; esac; done'

# 使い方を表示
echo "ZeamiTerm Performance Test Commands:"
echo "-----------------------------------"
echo "test10k         - Basic 10,000 lines"
echo "test10k-color   - Colorful 10,000 lines"
echo "test10k-code    - Code-like 10,000 lines"
echo "test10k-random  - Random data 10,000 lines"
echo "test10k-json    - JSON format 10,000 lines"
echo "test10k-progress - With progress indicator"
echo "test10k-logs    - Error log format"
echo ""
echo "Or run the scripts directly:"
echo "./scripts/generate-code.zsh [lines]  - Generate mixed language code"
echo "./scripts/generate-lines.zsh [lines] - Generate simple lines"
echo "./scripts/test-10k.zsh              - Quick 10k line test"