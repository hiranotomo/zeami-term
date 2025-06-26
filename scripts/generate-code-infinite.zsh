#!/usr/bin/env zsh

# generate-code-infinite.zsh - Ctrl+Cを押すまで無限にコードを生成

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
RESET='\033[0m'

# 遅延時間（ミリ秒）
DELAY=${1:-50}  # デフォルト50ms (1秒に20行)

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
        "import { useEffect, useMemo } from 'react'; const memoized = useMemo(() => expensiveCalc(data), [data]);"
        "const server = http.createServer((req, res) => { res.writeHead(200); res.end('Hello World'); });"
        "async function* generateSequence() { for (let i = 0; i < 100; i++) { yield await Promise.resolve(i); } }"
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
        "def decorator(func): @wraps(func) def wrapper(*args, **kwargs): return func(*args, **kwargs); return wrapper"
        "data = np.random.randn(1000, 100); pca = PCA(n_components=10).fit_transform(data)"
        "async with asyncio.TaskGroup() as tg: tasks = [tg.create_task(process(item)) for item in items]"
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
        "@Component public class ServiceImpl implements Service { @Autowired private Repository repo; }"
        "record Person(String name, int age) implements Comparable<Person> { public int compareTo(Person other) { return this.age - other.age; } }"
        "var result = switch(type) { case \"A\" -> processA(); case \"B\" -> processB(); default -> processDefault(); };"
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
        "constexpr int factorial(int n) { return n <= 1 ? 1 : n * factorial(n - 1); }"
        "std::ranges::for_each(numbers | std::views::filter([](int n) { return n % 2 == 0; }), [](int n) { std::cout << n; });"
        "template<typename... Args> void print(Args&&... args) { ((std::cout << args << \" \"), ...); }"
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
        "let mut map = HashMap::new(); map.entry(key).or_insert_with(Vec::new).push(value);"
        "fn parse<T: FromStr>(input: &str) -> Result<T, T::Err> { input.parse() }"
        "use std::sync::{Arc, Mutex}; let data = Arc::new(Mutex::new(vec![1, 2, 3]));"
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
        "var wg sync.WaitGroup; for i := 0; i < 10; i++ { wg.Add(1); go worker(&wg, i) }"
        "select { case msg := <-ch1: fmt.Println(msg) case <-time.After(1 * time.Second): fmt.Println(\"timeout\") }"
        "type Result[T any] struct { Value T; Error error }"
    )
    echo "${CYAN}${line_num}${RESET} | ${CYAN}// Go${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# TypeScript サンプル
generate_typescript() {
    local line_num=$1
    local samples=(
        "interface User { id: number; name: string; email?: string; }"
        "type Result<T> = { success: true; data: T } | { success: false; error: string };"
        "const fetchUser = async (id: number): Promise<User> => { return await api.get(\`/users/\${id}\`); }"
        "class Repository<T extends { id: number }> { constructor(private items: T[] = []) {} }"
        "const useDebounce = <T>(value: T, delay: number): T => { const [debounced, setDebounced] = useState(value); return debounced; }"
        "export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };"
        "const guard = (value: unknown): value is string => typeof value === 'string';"
        "enum Status { Pending = 'PENDING', Success = 'SUCCESS', Failed = 'FAILED' }"
    )
    echo "${CYAN}${line_num}${RESET} | ${BLUE}// TypeScript${RESET}"
    echo "${CYAN}${line_num}${RESET} | ${samples[$((RANDOM % ${#samples[@]}))]}"
}

# シグナルハンドラー設定
trap 'echo -e "\n\n${GREEN}✓ Code generation stopped by user (Ctrl+C)${RESET}\n${YELLOW}Generated ${line_num} lines total.${RESET}"; exit 0' INT

# ヘッダー表示
echo "${GREEN}=== Infinite Code Generator ===${RESET}"
echo "${YELLOW}Generating code continuously (${DELAY}ms delay between lines)${RESET}"
echo "${BLUE}Press Ctrl+C to stop${RESET}"
echo "${BLUE}─────────────────────────────────────────────${RESET}"
echo ""
echo "Usage: $0 [delay_ms]"
echo "  delay_ms: Delay between lines in milliseconds (default: 50)"
echo "  Examples:"
echo "    $0       # Default speed (50ms = 20 lines/sec)"
echo "    $0 100   # Slower (100ms = 10 lines/sec)"
echo "    $0 10    # Faster (10ms = 100 lines/sec)"
echo "    $0 200   # Very slow (200ms = 5 lines/sec)"
echo ""
echo "${BLUE}─────────────────────────────────────────────${RESET}"
echo ""

# カウンター
line_num=0
start_time=$(date +%s)

# 無限ループ
while true; do
    ((line_num++))
    
    # ランダムに言語を選択
    lang_index=$((RANDOM % ${#languages[@]}))
    
    case ${languages[$lang_index]} in
        "javascript")
            generate_javascript $line_num
            ;;
        "python")
            generate_python $line_num
            ;;
        "java")
            generate_java $line_num
            ;;
        "cpp")
            generate_cpp $line_num
            ;;
        "rust")
            generate_rust $line_num
            ;;
        "go")
            generate_go $line_num
            ;;
        "typescript")
            generate_typescript $line_num
            ;;
        *)
            # その他の言語用のフォールバック
            echo "${CYAN}${line_num}${RESET} | ${WHITE}// Code line ${line_num}${RESET}"
            echo "${CYAN}${line_num}${RESET} | console.log('Line ${line_num}');"
            ;;
    esac
    
    # 10行ごとに空行を入れて見やすくする
    if ((line_num % 10 == 0)); then
        echo ""
    fi
    
    # 100行ごとに統計情報を表示
    if ((line_num % 100 == 0)); then
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        rate=$((line_num / (elapsed > 0 ? elapsed : 1)))
        echo "${GREEN}[Stats] Lines: ${line_num}, Time: ${elapsed}s, Rate: ${rate} lines/sec${RESET}"
        echo ""
    fi
    
    # 指定された遅延を適用（ミリ秒をsleepの形式に変換）
    sleep $(echo "scale=3; $DELAY/1000" | bc)
done