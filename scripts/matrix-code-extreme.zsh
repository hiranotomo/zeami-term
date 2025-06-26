#!/usr/bin/env zsh

# matrix-code-extreme.zsh - 超派手なマトリックス風アニメーション（高負荷テスト版）

# カラーコード
GREEN='\033[0;32m'
BRIGHT_GREEN='\033[1;32m'
DIM_GREEN='\033[2;32m'
RED='\033[0;31m'
BRIGHT_RED='\033[1;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BRIGHT_CYAN='\033[1;36m'
MAGENTA='\033[0;35m'
BRIGHT_MAGENTA='\033[1;35m'
WHITE='\033[0;37m'
BRIGHT_WHITE='\033[1;37m'
RESET='\033[0m'
BOLD='\033[1m'
UNDERLINE='\033[4m'
BLINK='\033[5m'
REVERSE='\033[7m'

# 遅延時間（ミリ秒）
DELAY=${1:-10}  # デフォルト10ms（超高速）

# ターミナルサイズ取得
COLS=$(tput cols)
LINES=$(tput lines)

# 各種データ配列
typeset -a matrix_drops
typeset -a drop_speeds
typeset -a drop_chars
typeset -a drop_colors
typeset -a explosions
typeset -a glitch_zones

# パフォーマンス統計
start_time=$(date +%s)
frame_count=0
total_chars=0

# マトリックス文字セット（日本語も含む）
matrix_chars=(
    "0" "1" "2" "3" "4" "5" "6" "7" "8" "9"
    "A" "B" "C" "D" "E" "F" "G" "H" "I" "J" "K" "L" "M" "N" "O" "P" "Q" "R" "S" "T" "U" "V" "W" "X" "Y" "Z"
    "あ" "い" "う" "え" "お" "か" "き" "く" "け" "こ"
    "ア" "イ" "ウ" "エ" "オ" "カ" "キ" "ク" "ケ" "コ"
    "零" "壱" "弐" "参" "肆" "伍" "陸" "柒" "捌" "玖"
    "♠" "♥" "♦" "♣" "★" "☆" "◆" "■" "●" "▲"
    "Φ" "Ω" "Σ" "Δ" "Λ" "Ξ" "Π" "Ψ" "α" "β" "γ" "δ"
)

# コードフラグメント（表示用）
code_fragments=(
    "ACCESSING MAINFRAME..."
    "BYPASSING SECURITY PROTOCOLS..."
    "QUANTUM ENCRYPTION ACTIVE"
    "NEURAL NETWORK INITIALIZED"
    "DOWNLOADING DATABASE..."
    "COMPILING KERNEL MODULES..."
    "INJECTING PAYLOAD..."
    "ESTABLISHING BACKDOOR..."
    "ANALYZING TRAFFIC PATTERNS..."
    "DECRYPTING COMMUNICATIONS..."
    "SCANNING NETWORK TOPOLOGY..."
    "EXPLOITING VULNERABILITY..."
    "ELEVATING PRIVILEGES..."
    "EXTRACTING CREDENTIALS..."
    "TUNNELING THROUGH FIREWALL..."
)

# エフェクト関数：爆発
create_explosion() {
    local x=$1
    local y=$2
    local radius=$3
    
    for ((r=1; r<=radius; r++)); do
        for ((angle=0; angle<360; angle+=45)); do
            # Simplified calculation without bc
            local rad_angle=$((angle))
            local dx=0
            local dy=0
            
            # Approximate sin/cos for common angles
            case $rad_angle in
                0|360) dx=$r; dy=0 ;;
                45) dx=$((r * 7 / 10)); dy=$((r * 7 / 10)) ;;
                90) dx=0; dy=$r ;;
                135) dx=$((r * -7 / 10)); dy=$((r * 7 / 10)) ;;
                180) dx=$((-r)); dy=0 ;;
                225) dx=$((r * -7 / 10)); dy=$((r * -7 / 10)) ;;
                270) dx=0; dy=$((-r)) ;;
                315) dx=$((r * 7 / 10)); dy=$((r * -7 / 10)) ;;
            esac
            
            local px=$((x + dx))
            local py=$((y + dy))
            
            if ((px > 0 && px <= COLS && py > 0 && py <= LINES)); then
                echo -n "\033[${py};${px}H${BRIGHT_RED}*${RESET}"
            fi
        done
    done
}

# エフェクト関数：稲妻
draw_lightning() {
    local x=$((RANDOM % COLS + 1))
    local y=1
    
    echo -n "${BRIGHT_WHITE}"
    while ((y < LINES)); do
        echo -n "\033[${y};${x}H│"
        y=$((y + 1))
        if ((RANDOM % 10 > 7)); then
            x=$((x + (RANDOM % 3) - 1))
            if ((x < 1)); then x=1; fi
            if ((x > COLS)); then x=$COLS; fi
        fi
    done
    echo -n "${RESET}"
}

# エフェクト関数：グリッチ
create_glitch() {
    local x=$((RANDOM % (COLS - 20) + 1))
    local y=$((RANDOM % (LINES - 5) + 1))
    local width=$((RANDOM % 20 + 10))
    local height=$((RANDOM % 5 + 2))
    
    for ((dy=0; dy<height; dy++)); do
        echo -n "\033[$((y+dy));${x}H"
        for ((dx=0; dx<width; dx++)); do
            case $((RANDOM % 10)) in
                0|1) echo -n "${REVERSE}${BRIGHT_GREEN}▓${RESET}" ;;
                2|3) echo -n "${BRIGHT_RED}█${RESET}" ;;
                4|5) echo -n "${DIM_GREEN}░${RESET}" ;;
                6) echo -n "${BLINK}${BRIGHT_CYAN}■${RESET}" ;;
                *) echo -n "${matrix_chars[RANDOM % ${#matrix_chars[@]} + 1]}" ;;
            esac
        done
    done
}

# エフェクト関数：波紋
create_ripple() {
    local cx=$((COLS / 2))
    local cy=$((LINES / 2))
    local max_radius=$((LINES / 4))
    
    for ((r=1; r<=max_radius; r+=3)); do
        # Draw circle using simple points
        for ((i=-r; i<=r; i++)); do
            local y=$((cy + i / 2))
            local dx=$((r * r - i * i / 4))
            if ((dx >= 0)); then
                # Integer square root approximation
                local x_offset=1
                while ((x_offset * x_offset <= dx)); do
                    ((x_offset++))
                done
                ((x_offset--))
                
                local x1=$((cx - x_offset))
                local x2=$((cx + x_offset))
                
                if ((x1 > 0 && x1 <= COLS && y > 0 && y <= LINES)); then
                    local color_index=$((r % 3))
                    case $color_index in
                        0) echo -n "\033[${y};${x1}H${BRIGHT_CYAN}○${RESET}" ;;
                        1) echo -n "\033[${y};${x1}H${CYAN}o${RESET}" ;;
                        2) echo -n "\033[${y};${x1}H${DIM_GREEN}.${RESET}" ;;
                    esac
                fi
                
                if ((x2 > 0 && x2 <= COLS && y > 0 && y <= LINES && x2 != x1)); then
                    local color_index=$((r % 3))
                    case $color_index in
                        0) echo -n "\033[${y};${x2}H${BRIGHT_CYAN}○${RESET}" ;;
                        1) echo -n "\033[${y};${x2}H${CYAN}o${RESET}" ;;
                        2) echo -n "\033[${y};${x2}H${DIM_GREEN}.${RESET}" ;;
                    esac
                fi
            fi
        done
    done
}

# メインマトリックスレイン
matrix_rain() {
    # より多くの列を初期化（高密度）
    local num_drops=$((COLS * 3 / 4))
    
    # 配列を初期化
    matrix_drops=()
    drop_speeds=()
    drop_colors=()
    
    for ((i=0; i<num_drops; i++)); do
        matrix_drops+=($((RANDOM % LINES)))
        drop_speeds+=($((RANDOM % 3 + 1)))
        drop_colors+=($((RANDOM % 4)))
    done
    
    # メインループ
    while true; do
        ((frame_count++))
        
        # マトリックスドロップ描画
        for ((i=0; i<num_drops; i++)); do
            local col=$((i * COLS / num_drops + 1))
            local row=${matrix_drops[i+1]}
            local speed=${drop_speeds[i+1]}
            local color_type=${drop_colors[i+1]}
            
            # 前の文字を薄くする
            if ((row > 1)); then
                local prev_row=$((row - 1))
                echo -n "\033[${prev_row};${col}H${DIM_GREEN}${matrix_chars[RANDOM % ${#matrix_chars[@]} + 1]}${RESET}"
            fi
            
            # 現在の文字を明るく表示
            if ((row > 0 && row <= LINES)); then
                case $color_type in
                    0) echo -n "\033[${row};${col}H${BRIGHT_GREEN}${matrix_chars[RANDOM % ${#matrix_chars[@]} + 1]}${RESET}" ;;
                    1) echo -n "\033[${row};${col}H${BRIGHT_CYAN}${matrix_chars[RANDOM % ${#matrix_chars[@]} + 1]}${RESET}" ;;
                    2) echo -n "\033[${row};${col}H${BRIGHT_WHITE}${matrix_chars[RANDOM % ${#matrix_chars[@]} + 1]}${RESET}" ;;
                    3) echo -n "\033[${row};${col}H${BRIGHT_MAGENTA}${matrix_chars[RANDOM % ${#matrix_chars[@]} + 1]}${RESET}" ;;
                esac
                ((total_chars++))
            fi
            
            # 末尾を消す
            if ((row > 10)); then
                local tail_row=$((row - 10))
                echo -n "\033[${tail_row};${col}H "
            fi
            
            # ドロップを進める
            matrix_drops[i+1]=$((row + speed))
            if ((${matrix_drops[i+1]} > LINES + 10)); then
                matrix_drops[i+1]=$((RANDOM % 10 - 10))
                drop_speeds[i+1]=$((RANDOM % 3 + 1))
                drop_colors[i+1]=$((RANDOM % 4))
            fi
        done
        
        # ランダムエフェクト
        local effect=$((RANDOM % 100))
        
        # 爆発エフェクト（5%の確率）
        if ((effect < 5)); then
            local ex=$((RANDOM % COLS + 1))
            local ey=$((RANDOM % LINES + 1))
            create_explosion $ex $ey 5
        fi
        
        # 稲妻エフェクト（3%の確率）
        if ((effect >= 5 && effect < 8)); then
            draw_lightning
        fi
        
        # グリッチエフェクト（10%の確率）
        if ((effect >= 8 && effect < 18)); then
            create_glitch
        fi
        
        # 波紋エフェクト（2%の確率）
        if ((effect >= 18 && effect < 20)); then
            create_ripple
        fi
        
        # 警告メッセージ（5%の確率）
        if ((effect >= 20 && effect < 25)); then
            local msg_index=$((RANDOM % ${#code_fragments[@]}))
            local msg="${code_fragments[msg_index+1]}"
            local msg_x=$(((COLS - ${#msg}) / 2))
            local msg_y=$((RANDOM % (LINES - 5) + 3))
            echo -n "\033[${msg_y};${msg_x}H${REVERSE}${BRIGHT_RED}${msg}${RESET}"
        fi
        
        # パフォーマンス統計表示（100フレームごと）
        if ((frame_count % 100 == 0)); then
            local current_time=$(date +%s)
            local elapsed=$((current_time - ${start_time%.*}))
            if ((elapsed > 0)); then
                local fps=$((frame_count / elapsed))
                local cps=$((total_chars / elapsed))
                echo -n "\033[1;1H${REVERSE}${BRIGHT_YELLOW} FPS: $fps | Chars/sec: $cps | Frames: $frame_count ${RESET}"
            fi
        fi
        
        # CPU温度警告（擬似的）
        if ((frame_count % 500 == 0)); then
            echo -n "\033[2;1H${BLINK}${BRIGHT_RED}⚠ SYSTEM OVERLOAD - CPU: $((70 + RANDOM % 30))% ⚠${RESET}"
        fi
        
        # 遅延 (macOSのsleepは小数点をサポート)
        sleep 0.0$DELAY 2>/dev/null || sleep 1
    done
}

# シグナルハンドラー
cleanup() {
    # カーソルを表示
    echo -n "\033[?25h"
    # 画面クリア
    clear
    
    # 統計表示
    local end_time=$(date +%s)
    local total_elapsed=$((end_time - start_time))
    if ((total_elapsed > 0)); then
        local avg_fps=$((frame_count / total_elapsed))
        local avg_cps=$((total_chars / total_elapsed))
    else
        local avg_fps=0
        local avg_cps=0
    fi
    
    echo "${BRIGHT_GREEN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║            MATRIX EXTREME - TEST COMPLETE          ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo "${RESET}"
    echo ""
    echo "${CYAN}Performance Statistics:${RESET}"
    echo "  Total Runtime:     ${total_elapsed} seconds"
    echo "  Total Frames:      ${frame_count}"
    echo "  Average FPS:       ${avg_fps}"
    echo "  Total Characters:  ${total_chars}"
    echo "  Chars per Second:  ${avg_cps}"
    echo ""
    echo "${GREEN}Terminal stress test completed successfully!${RESET}"
    
    exit 0
}

trap cleanup INT TERM

# メイン実行
clear

# カーソルを非表示
echo -n "\033[?25l"

# スタートアップシーケンス
echo "${BRIGHT_GREEN}"
figlet -f small "MATRIX EXTREME" 2>/dev/null || echo "MATRIX EXTREME"
echo "${RESET}"
echo "${BRIGHT_RED}${BLINK}⚠ WARNING: HIGH PERFORMANCE TEST MODE ⚠${RESET}"
echo "${YELLOW}This will put significant load on your terminal renderer!${RESET}"
echo ""
echo "${CYAN}Controls:${RESET}"
echo "  Press ${BRIGHT_RED}Ctrl+C${RESET} to stop"
echo ""
echo "${GREEN}Starting in 3...${RESET}"
sleep 1
echo "${YELLOW}2...${RESET}"
sleep 1
echo "${BRIGHT_RED}1...${RESET}"
sleep 1
echo "${BRIGHT_GREEN}${BOLD}INITIATING MATRIX OVERLOAD!${RESET}"
sleep 0.5

# 画面クリアして開始
clear

# メインループ実行
matrix_rain