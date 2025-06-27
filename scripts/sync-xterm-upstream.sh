#!/bin/bash

# Sync xterm.js upstream changes
# This script helps Claude Code to track and merge upstream changes

set -e

UPSTREAM_REPO="https://github.com/xtermjs/xterm.js.git"
VENDOR_PATH="src/vendor/xterm"
UPSTREAM_BRANCH="master"

echo "🔄 Syncing with xterm.js upstream..."

# 1. Add upstream remote if not exists
if ! git remote | grep -q "xterm-upstream"; then
  echo "➕ Adding upstream remote..."
  git remote add xterm-upstream $UPSTREAM_REPO
fi

# 2. Fetch upstream
echo "📥 Fetching upstream changes..."
git fetch xterm-upstream

# 3. Create temporary directory for comparison
TEMP_DIR=$(mktemp -d)
echo "📁 Creating temporary directory: $TEMP_DIR"

# 4. Clone upstream to temp
echo "🔽 Cloning upstream to temp..."
git clone --depth 1 --branch $UPSTREAM_BRANCH $UPSTREAM_REPO $TEMP_DIR/xterm-upstream

# 5. Generate diff report
echo "📊 Generating diff report..."
DIFF_REPORT="docs/upstream-sync/sync-report-$(date +%Y-%m-%d).md"
mkdir -p docs/upstream-sync

cat > $DIFF_REPORT << EOF
# xterm.js Upstream Sync Report - $(date +%Y-%m-%d)

## Summary
- Upstream version: $(cd $TEMP_DIR/xterm-upstream && git describe --tags --always)
- Our fork base: $(git log -1 --format=%h -- $VENDOR_PATH)

## Changed Files

### Added Files
\`\`\`
$(diff -qr $VENDOR_PATH $TEMP_DIR/xterm-upstream/src 2>/dev/null | grep "Only in $TEMP_DIR" | cut -d: -f2- || echo "None")
\`\`\`

### Modified Files
\`\`\`
$(diff -qr $VENDOR_PATH $TEMP_DIR/xterm-upstream/src 2>/dev/null | grep "differ" | cut -d' ' -f2 | sed "s|$VENDOR_PATH/||" || echo "None")
\`\`\`

### Deleted Files
\`\`\`
$(diff -qr $VENDOR_PATH $TEMP_DIR/xterm-upstream/src 2>/dev/null | grep "Only in $VENDOR_PATH" | cut -d: -f2- || echo "None")
\`\`\`

## Key Changes to Review

EOF

# 6. Check for important updates
echo "🔍 Analyzing important changes..."

# Check ThemeService changes (our main modification area)
if diff -q $VENDOR_PATH/browser/services/ThemeService.ts $TEMP_DIR/xterm-upstream/src/browser/services/ThemeService.ts >/dev/null 2>&1; then
  echo "✅ ThemeService.ts: No upstream changes" >> $DIFF_REPORT
else
  echo "⚠️  ThemeService.ts: Upstream changes detected!" >> $DIFF_REPORT
  echo "\`\`\`diff" >> $DIFF_REPORT
  diff -u $VENDOR_PATH/browser/services/ThemeService.ts $TEMP_DIR/xterm-upstream/src/browser/services/ThemeService.ts >> $DIFF_REPORT || true
  echo "\`\`\`" >> $DIFF_REPORT
fi

# 7. Check package.json for version changes
echo "" >> $DIFF_REPORT
echo "## Version Changes" >> $DIFF_REPORT
echo "\`\`\`" >> $DIFF_REPORT
echo "Upstream: $(cat $TEMP_DIR/xterm-upstream/package.json | grep '"version"' | cut -d'"' -f4)" >> $DIFF_REPORT
echo "Our fork: $(cat $VENDOR_PATH/package.json | grep '"version"' | cut -d'"' -f4 2>/dev/null || echo 'N/A')" >> $DIFF_REPORT
echo "\`\`\`" >> $DIFF_REPORT

# 8. Generate merge recommendations
echo "" >> $DIFF_REPORT
echo "## Merge Recommendations" >> $DIFF_REPORT
echo "" >> $DIFF_REPORT

# Count changes
CHANGED_FILES=$(diff -qr $VENDOR_PATH $TEMP_DIR/xterm-upstream/src 2>/dev/null | grep "differ" | wc -l || echo "0")

if [ "$CHANGED_FILES" -eq 0 ]; then
  echo "✅ No changes detected. Fork is up to date!" >> $DIFF_REPORT
elif [ "$CHANGED_FILES" -lt 10 ]; then
  echo "📌 Minor updates detected. Review and merge selectively:" >> $DIFF_REPORT
  echo "1. Review each change in the diff report" >> $DIFF_REPORT
  echo "2. Apply non-conflicting updates" >> $DIFF_REPORT
  echo "3. Test thoroughly after merging" >> $DIFF_REPORT
else
  echo "⚠️  Major updates detected ($CHANGED_FILES files changed)." >> $DIFF_REPORT
  echo "Consider:" >> $DIFF_REPORT
  echo "1. Creating a feature branch for the update" >> $DIFF_REPORT
  echo "2. Merging in stages" >> $DIFF_REPORT
  echo "3. Extensive testing required" >> $DIFF_REPORT
fi

# 9. Create automated merge script
MERGE_SCRIPT="scripts/apply-upstream-changes.sh"
cat > $MERGE_SCRIPT << 'EOF'
#!/bin/bash
# Auto-generated merge script
# Review and modify before running!

set -e

echo "🔨 Applying upstream changes..."

# Example selective merge commands:
# Copy specific non-conflicting files
# cp $TEMP_DIR/xterm-upstream/src/common/Types.d.ts src/vendor/xterm/common/

# Apply patches for specific changes
# git apply < patches/upstream-fix-001.patch

echo "✅ Merge complete. Remember to:"
echo "1. Run 'npm run build:xterm'"
echo "2. Test all functionality"
echo "3. Update CHANGELOG.md"
EOF

chmod +x $MERGE_SCRIPT

# 10. Cleanup
rm -rf $TEMP_DIR

echo ""
echo "✅ Sync analysis complete!"
echo ""
echo "📄 Report generated: $DIFF_REPORT"
echo "🔧 Merge script created: $MERGE_SCRIPT"
echo ""
echo "Next steps for Claude Code:"
echo "1. Review the diff report"
echo "2. Identify non-conflicting updates"
echo "3. Apply selective merges"
echo "4. Test thoroughly"