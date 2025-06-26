#!/usr/bin/env zsh

# generate-code.zsh - 1万行のサンプルコードを生成して表示

# デフォルトの行数
LINES=${1:-10000}

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
RESET='\033[0m'

# プログラミング言語のサンプル
languages=("javascript" "python" "java" "cpp" "rust" "go" "typescript" "ruby" "php" "swift")

# JavaScript サンプル
generate_javascript() {
    local line_num=$1
    local samples=(
        "const data = await fetch('/api/data').then(res => res.json());"
        "function calculate(x, y) { return Math.sqrt(x * x + y * y); }"
        "const users = items.filter(item => item.active).map(item => item.name);"
        "class Component extends React.Component { render() { return <div>Hello</div>; } }"
        "app.get('/users/:id', async (req, res) => { res.json(await getUser(req.params.id)); });"
        "const [state, setState] = useState({ count: 0, loading: false });"
        "export default function debounce(func, wait) { let timeout; return function() { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, arguments), wait); }; }"
    )
    echo "${CYAN}${line_num}${RESET} | ${GREEN}// JavaScript${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# Python サンプル
generate_python() {
    local line_num=$1
    local samples=(
        "df = pd.read_csv('data.csv').groupby('category').mean()"
        "async def fetch_data(url): async with aiohttp.ClientSession() as session: return await session.get(url)"
        "@lru_cache(maxsize=128)\ndef fibonacci(n): return n if n < 2 else fibonacci(n-1) + fibonacci(n-2)"
        "model = tf.keras.Sequential([tf.keras.layers.Dense(128, activation='relu'), tf.keras.layers.Dense(10)])"
        "result = [x**2 for x in range(100) if x % 2 == 0]"
        "with open('file.txt', 'r') as f: data = json.load(f)"
        "class DataProcessor: def __init__(self): self.data = [] def process(self, item): return item.strip().lower()"
    )
    echo "${CYAN}${line_num}${RESET} | ${BLUE}# Python${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# Java サンプル
generate_java() {
    local line_num=$1
    local samples=(
        "public class Main { public static void main(String[] args) { System.out.println(\"Hello\"); } }"
        "List<String> filtered = items.stream().filter(s -> s.length() > 5).collect(Collectors.toList());"
        "@RestController\npublic class UserController { @GetMapping(\"/users\") public List<User> getUsers() { return userService.findAll(); } }"
        "CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> processData());"
        "try (BufferedReader br = new BufferedReader(new FileReader(\"file.txt\"))) { return br.lines().collect(Collectors.joining()); }"
        "public interface Repository<T> { Optional<T> findById(Long id); List<T> findAll(); }"
    )
    echo "${CYAN}${line_num}${RESET} | ${YELLOW}// Java${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# C++ サンプル
generate_cpp() {
    local line_num=$1
    local samples=(
        "#include <iostream>\nint main() { std::cout << \"Hello World\" << std::endl; return 0; }"
        "template<typename T> T max(T a, T b) { return (a > b) ? a : b; }"
        "std::vector<int> v = {1, 2, 3, 4, 5}; std::sort(v.begin(), v.end());"
        "auto lambda = [](int x, int y) { return x + y; };"
        "std::unique_ptr<Widget> widget = std::make_unique<Widget>();"
        "class Shape { public: virtual double area() const = 0; virtual ~Shape() = default; };"
    )
    echo "${CYAN}${line_num}${RESET} | ${PURPLE}// C++${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# Rust サンプル
generate_rust() {
    local line_num=$1
    local samples=(
        "fn main() { println!(\"Hello, world!\"); }"
        "let numbers: Vec<i32> = (1..=100).filter(|x| x % 2 == 0).collect();"
        "impl Display for Point { fn fmt(&self, f: &mut Formatter) -> Result { write!(f, \"({}, {})\", self.x, self.y) } }"
        "#[derive(Debug, Clone, PartialEq)]\nstruct User { name: String, age: u32 }"
        "match result { Ok(value) => println!(\"Success: {}\", value), Err(e) => eprintln!(\"Error: {}\", e) }"
        "async fn fetch_data(url: &str) -> Result<String, reqwest::Error> { Ok(reqwest::get(url).await?.text().await?) }"
    )
    echo "${CYAN}${line_num}${RESET} | ${RED}// Rust${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# Go サンプル
generate_go() {
    local line_num=$1
    local samples=(
        "func main() { fmt.Println(\"Hello, World!\") }"
        "type Server struct { addr string; handler http.Handler }"
        "go func() { for msg := range messages { fmt.Println(msg) } }()"
        "if err := json.NewEncoder(w).Encode(response); err != nil { log.Fatal(err) }"
        "defer file.Close()"
        "ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)"
    )
    echo "${CYAN}${line_num}${RESET} | ${CYAN}// Go${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# ヘッダー表示
echo "${GREEN}=== Generating ${LINES} lines of code ===${RESET}"
echo "${YELLOW}Language distribution: Mixed programming languages${RESET}"
echo "${BLUE}─────────────────────────────────────────────${RESET}"
echo ""

# プログレスバー関数
show_progress() {
    local current=$1
    local total=$2
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    
    printf "\r${GREEN}Progress: ["
    printf "%${filled}s" | tr ' ' '█'
    printf "%$((50 - filled))s" | tr ' ' '░'
    printf "] ${percent}%% (${current}/${total})${RESET}"
}

# メイン生成ループ
for ((i=1; i<=LINES; i++)); do
    # 100行ごとに進捗表示
    if ((i % 100 == 0)); then
        show_progress $i $LINES
    fi
    
    # ランダムに言語を選択
    lang_index=$((RANDOM % ${#languages[@]}))
    
    case ${languages[$lang_index]} in
        "javascript")
            generate_javascript $i
            ;;
        "python")
            generate_python $i
            ;;
        "java")
            generate_java $i
            ;;
        "cpp")
            generate_cpp $i
            ;;
        "rust")
            generate_rust $i
            ;;
        "go")
            generate_go $i
            ;;
        *)
            # その他の言語用のフォールバック
            echo "${CYAN}${i}${RESET} | ${WHITE}// Code line ${i}${RESET}"
            echo "${CYAN}${i}${RESET} | console.log('Line ${i}');"
            ;;
    esac
    
    # 10行ごとに空行を入れて見やすくする
    if ((i % 10 == 0)); then
        echo ""
    fi
done

# 完了メッセージ
echo ""
echo ""
echo "${GREEN}✓ Generated ${LINES} lines of code successfully!${RESET}"
echo "${YELLOW}Performance test complete. Check scrolling and rendering.${RESET}"