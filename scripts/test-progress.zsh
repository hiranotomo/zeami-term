#!/bin/zsh
# Test script for progress indicators in ZeamiTerm

echo "Testing progress indicators in ZeamiTerm..."
echo ""

# Test 1: Simple percentage progress
echo "Test 1: Simple percentage progress"
for i in {1..100}; do
    printf "\rProgress: %d%%" $i
    sleep 0.02
done
echo ""
echo ""

# Test 2: Progress bar
echo "Test 2: Progress bar"
for i in {0..50}; do
    filled=$(printf "%-${i}s" | tr ' ' '█')
    empty=$(printf "%-$((50-i))s" | tr ' ' '░')
    printf "\r[%s%s] %d%%" "$filled" "$empty" $((i*2))
    sleep 0.02
done
echo ""
echo ""

# Test 3: File processing simulation
echo "Test 3: File processing"
files=("file1.txt" "file2.js" "file3.py" "file4.md" "file5.json")
for i in {0..4}; do
    printf "\rProcessing %s... %d%%" "${files[$i]}" $(((i+1)*20))
    sleep 0.5
done
echo ""
echo ""

# Test 4: Build progress
echo "Test 4: Build progress"
for i in {1..10}; do
    printf "\rBuilding [%d/10] modules..." $i
    sleep 0.3
done
echo ""
echo ""

# Test 5: Loading animation
echo "Test 5: Loading animation"
spinner=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
for i in {1..30}; do
    printf "\r%s Loading..." "${spinner[$((i % 10))]}"
    sleep 0.1
done
echo ""
echo ""

# Test 6: Claude Code style progress
echo "Test 6: Claude Code style progress"
echo "Analyzing codebase..."
for i in {1..100}; do
    bar_length=40
    filled_length=$((i * bar_length / 100))
    filled=$(printf "%-${filled_length}s" | tr ' ' '█')
    empty=$(printf "%-$((bar_length - filled_length))s" | tr ' ' '░')
    printf "\r[%s%s] %d%% - Processing files..." "$filled" "$empty" $i
    sleep 0.02
done
echo ""
echo ""

echo "All tests completed!"