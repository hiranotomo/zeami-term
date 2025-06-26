#!/usr/bin/env zsh

# generate-lines.zsh - シンプルに1万行を高速生成

# 行数（デフォルト: 10000）
LINES=${1:-10000}

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo "${GREEN}=== Generating ${LINES} lines of text ===${RESET}"
echo ""

# 高速版: seqとprintfを使用
time (
    seq 1 $LINES | while read i; do
        # 行番号を5桁でパディング
        printf "${CYAN}%05d${RESET} | " $i
        
        # いくつかのパターンをランダムに選択
        case $((RANDOM % 5)) in
            0)
                echo "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Line $i"
                ;;
            1)
                echo "const result = data.filter(x => x.id === $i).map(x => x.value);"
                ;;
            2)
                echo "System.out.println(\"Processing item $i of $LINES\");"
                ;;
            3)
                echo "def process_item_$i(): return {\"id\": $i, \"status\": \"complete\"}"
                ;;
            4)
                echo "SELECT * FROM users WHERE id = $i ORDER BY created_at DESC;"
                ;;
        esac
    done
)

echo ""
echo "${GREEN}✓ Completed generating ${LINES} lines!${RESET}"