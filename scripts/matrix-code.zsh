#!/usr/bin/env zsh

# matrix-code.zsh - マトリックス風にコードを流し続ける

# 引数チェック - "extreme"が指定されたら高負荷版を起動
if [[ "$1" == "extreme" ]]; then
    exec "${0:A:h}/matrix-code-extreme.zsh" "${@:2}"
fi

# カラーコード
GREEN='\033[0;32m'
BRIGHT_GREEN='\033[1;32m'
DIM_GREEN='\033[2;32m'
RESET='\033[0m'

# 遅延時間（ミリ秒）
DELAY=${1:-30}  # デフォルト30ms

# コードフラグメント
code_fragments=(
    "function encrypt(data) { return crypto.createHash('sha256').update(data).digest('hex'); }"
    "SELECT * FROM users WHERE status = 'active' AND last_login > NOW() - INTERVAL '1 day';"
    "docker run -d --name postgres -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:latest"
    "const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });"
    "if (request.headers['x-api-key'] !== API_KEY) { throw new UnauthorizedError(); }"
    "async function scanNetwork() { const devices = await network.scan('192.168.1.0/24'); }"
    "cipher = AES.new(key, AES.MODE_CBC, iv); encrypted = cipher.encrypt(pad(data, 16));"
    "ssh -i ~/.ssh/id_rsa user@remote-server.com 'tail -f /var/log/system.log'"
    "git push --force origin main # DANGER: Force push to production"
    "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';"
    "firewall-cmd --zone=public --add-port=8080/tcp --permanent"
    "const hash = await bcrypt.hash(password, 10); await db.users.update({ password: hash });"
    "nmap -sS -p- -T4 -A -v target.com"
    "for i in {1..255}; do ping -c 1 192.168.1.\$i & done; wait"
    "tcpdump -i eth0 -w capture.pcap 'port 443'"
    "iptables -A INPUT -s 10.0.0.0/8 -j DROP"
    "find / -name '*.log' -mtime +30 -exec rm {} \\;"
    "rsync -avz --delete /source/ user@backup-server:/destination/"
    "openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365"
    "grep -r 'password\\|secret\\|key' /etc/ 2>/dev/null"
)

# バイナリ風データ
binary_data() {
    echo -n "${DIM_GREEN}"
    for i in {1..80}; do
        if ((RANDOM % 10 > 7)); then
            echo -n "${BRIGHT_GREEN}$(((RANDOM % 2)))${DIM_GREEN}"
        else
            echo -n "$((RANDOM % 2))"
        fi
    done
    echo "${RESET}"
}

# ヘックスダンプ風
hex_dump() {
    echo -n "${GREEN}"
    printf "%08x: " $((RANDOM % 0xFFFFFF))
    for i in {1..16}; do
        printf "%02x " $((RANDOM % 256))
    done
    echo -n "  "
    for i in {1..16}; do
        local char=$((RANDOM % 94 + 33))
        printf "\\x$(printf %x $char)" | xargs -0 printf "%b"
    done
    echo "${RESET}"
}

# システムログ風
system_log() {
    local levels=("INFO" "WARN" "ERROR" "DEBUG" "TRACE")
    local level=${levels[$((RANDOM % ${#levels[@]}))]}
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S.%3N')
    
    case $level in
        "ERROR")
            echo "${BRIGHT_GREEN}[$timestamp] [${level}] System breach detected at 0x$(printf '%08x' $((RANDOM % 0xFFFFFFFF)))${RESET}"
            ;;
        "WARN")
            echo "${GREEN}[$timestamp] [${level}] Anomaly detected in sector $((RANDOM % 1000))${RESET}"
            ;;
        *)
            echo "${DIM_GREEN}[$timestamp] [${level}] Process ${RANDOM} executing normally${RESET}"
            ;;
    esac
}

# シグナルハンドラー
trap 'echo -e "\n\n${BRIGHT_GREEN}[SYSTEM] Connection terminated${RESET}\n${GREEN}Session lasted ${SECONDS} seconds${RESET}"; exit 0' INT

# クリアスクリーン
clear

# ヘッダー
echo "${BRIGHT_GREEN}"
echo "██████╗ ███████╗ █████╗ ███╗   ███╗██╗    ████████╗███████╗██████╗ ███╗   ███╗"
echo "╚══███╔╝██╔════╝██╔══██╗████╗ ████║██║    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║"
echo "  ███╔╝ █████╗  ███████║██╔████╔██║██║       ██║   █████╗  ██████╔╝██╔████╔██║"
echo " ███╔╝  ██╔══╝  ██╔══██║██║╚██╔╝██║██║       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║"
echo "███████╗███████╗██║  ██║██║ ╚═╝ ██║██║       ██║   ███████╗██║  ██║██║ ╚═╝ ██║"
echo "╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝"
echo "${RESET}"
echo "${DIM_GREEN}[SYSTEM] Initializing secure connection...${RESET}"
sleep 1
echo "${DIM_GREEN}[SYSTEM] Bypassing firewall...${RESET}"
sleep 0.5
echo "${BRIGHT_GREEN}[SYSTEM] Access granted${RESET}"
echo ""

# カウンター
line=0

# 無限ループ
while true; do
    ((line++))
    
    # ランダムに出力タイプを選択
    output_type=$((RANDOM % 10))
    
    case $output_type in
        0|1|2)
            # コードフラグメント
            echo "${GREEN}> ${code_fragments[$((RANDOM % ${#code_fragments[@]}))]}${RESET}"
            ;;
        3|4)
            # バイナリデータ
            binary_data
            ;;
        5|6)
            # ヘックスダンプ
            hex_dump
            ;;
        7|8)
            # システムログ
            system_log
            ;;
        9)
            # ランダムなアクセスログ
            ip="$((RANDOM % 256)).$((RANDOM % 256)).$((RANDOM % 256)).$((RANDOM % 256))"
            echo "${DIM_GREEN}[ACCESS] Connection from ${ip} - Status: $((RANDOM % 2 == 0 ? "ALLOWED" : "BLOCKED"))${RESET}"
            ;;
    esac
    
    # たまに警告を表示
    if ((line % 50 == 0)); then
        echo ""
        echo "${BRIGHT_GREEN}[ALERT] ====== INTRUSION DETECTION SYSTEM ======${RESET}"
        echo "${BRIGHT_GREEN}[ALERT] Scanning for anomalies... ${line} packets analyzed${RESET}"
        echo ""
    fi
    
    # 遅延
    sleep $(echo "scale=3; $DELAY/1000" | bc)
done