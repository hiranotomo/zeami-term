# xterm.jsフォーク実装計画書

## 1. エグゼクティブサマリー

### 目的
- xterm.jsをフォークし、ZeamiTerm専用にカスタマイズ
- 選択色透明化問題の根本解決
- 将来的な独自機能追加の基盤構築

### 期待される成果
- 完全に制御可能なターミナルレンダリングエンジン
- ZeamiTerm固有の拡張機能の実装基盤
- Claude Codeによる継続的な改善が可能な環境

## 2. フェーズ1: ZeamiTermコードベース完全調査（2日間）

### 2.1 アーキテクチャ分析

#### タスク1: 全体構造の把握
```bash
# 実行コマンド
find . -type f -name "*.js" -o -name "*.json" | grep -v node_modules | sort > codebase-structure.txt
```

**成果物**: `docs/architecture/zeami-term-architecture.md`
- 全体のディレクトリ構造
- 主要コンポーネントの関係図
- データフローダイアグラム

#### タスク2: 技術スタック調査
```bash
# 依存関係の完全リスト作成
npm list --depth=0 > dependencies.txt
npm list --prod --depth=0 > prod-dependencies.txt
```

**成果物**: `docs/architecture/technology-stack.md`
- 使用ライブラリとバージョン
- 各ライブラリの役割
- アップデート優先度

### 2.2 コードマッピング

#### タスク3: メインプロセス解析
**対象ファイル**:
- `src/main/index.js` - エントリポイント
- `src/main/terminalProcessManager.js` - PTY管理
- `src/main/messageRouter.js` - IPC通信
- `src/main/autoUpdater.js` - 自動更新
- `src/main/zeamiErrorRecorder.js` - エラー記録

**成果物**: `docs/architecture/main-process-guide.md`

#### タスク4: レンダラープロセス解析
**対象ファイル**:
- `src/renderer/terminalManager.js` - ターミナル管理の中核
- `src/renderer/themeManager-v2.js` - テーマシステム
- `src/renderer/splitManager.js` - 分割ビュー
- `src/renderer/errorStateIndicator.js` - エラー表示

**成果物**: `docs/architecture/renderer-process-guide.md`

#### タスク5: xterm.js統合ポイントの特定
```javascript
// 調査スクリプト
const analyzeXtermIntegration = () => {
  // xterm関連のimportを検索
  // Terminal インスタンスの作成箇所
  // アドオンの使用箇所
  // テーマ適用箇所
};
```

**成果物**: `docs/architecture/xterm-integration-points.md`

### 2.3 ドキュメント自動生成

#### タスク6: コードドキュメント生成システム
```javascript
// scripts/generate-code-docs.js
const fs = require('fs');
const path = require('path');

class CodeDocumentGenerator {
  generateModuleDoc(filePath) {
    // ファイルを解析
    // 関数、クラス、エクスポートを抽出
    // Markdown形式でドキュメント生成
  }
  
  generateDependencyGraph() {
    // import/require文を解析
    // 依存関係グラフを生成
    // Mermaid形式で出力
  }
}
```

**成果物**: 
- `docs/api/` - 各モジュールのAPIドキュメント
- `docs/architecture/dependency-graph.md` - 依存関係図

## 3. フェーズ2: xterm.jsソース解析（1日間）

### 3.1 xterm.js内部構造理解

#### タスク7: コア機能の把握
**調査対象**:
- Terminal クラスの構造
- レンダリングパイプライン
- テーマシステム
- 選択機能の実装

**成果物**: `docs/xterm-analysis/core-structure.md`

#### タスク8: カスタマイズポイントの特定
```bash
# 修正が必要なファイルをリストアップ
grep -r "selection" node_modules/xterm/src/ > xterm-selection-files.txt
grep -r "theme" node_modules/xterm/src/ > xterm-theme-files.txt
```

**成果物**: `docs/xterm-analysis/customization-points.md`

### 3.2 フォーク準備

#### タスク9: フォーク環境構築
```bash
# 実行手順
./scripts/setup-xterm-fork.sh
npm install --save-dev typescript @types/node
```

**成果物**: フォーク環境の構築完了

## 4. フェーズ3: フォーク実装（2日間）

### 4.1 基本セットアップ

#### タスク10: ビルドシステム構築
```json
// tsconfig.xterm.json
{
  "extends": "./src/vendor/xterm/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/xterm",
    "rootDir": "./src/vendor/xterm"
  }
}
```

**成果物**: 動作するビルドシステム

### 4.2 カスタマイズ実装

#### タスク11: 選択色透明化修正
**修正ファイル**:
1. `src/vendor/xterm/browser/services/ThemeService.ts`
2. `src/vendor/xterm/browser/renderer/shared/CellColorResolver.ts`

**修正内容**:
```typescript
// ThemeService.ts
// 透明度を保持する処理を追加

// CellColorResolver.ts  
// 選択色適用時に透明度を維持
```

#### タスク12: ZeamiTerm拡張の追加
**新規機能**:
- Zeamiコマンド認識
- エラーパターンマッチング
- AI連携フック

**成果物**: `src/vendor/xterm/zeami-extensions/`

### 4.3 統合とテスト

#### タスク13: 既存コードとの統合
```javascript
// terminalManager.js の更新
import { Terminal } from '../dist/xterm/Terminal.js';
// npmパッケージの代わりにフォーク版を使用
```

#### タスク14: 包括的テスト
**テスト項目**:
- 基本的なターミナル機能
- 選択色の透明度
- パフォーマンス
- 既存機能との互換性

## 5. フェーズ4: 継続的改善システム（1日間）

### 5.1 自動化システム構築

#### タスク15: 上流同期システム
```javascript
// scripts/xterm-upstream-monitor.js
class XtermUpstreamMonitor {
  async checkForUpdates() {
    // GitHub APIで最新リリースをチェック
    // 変更点を分析
    // レポート生成
  }
  
  async generateMergeStrategy() {
    // 安全にマージ可能な変更を特定
    // コンフリクトの可能性を評価
    // 推奨アクションを生成
  }
}
```

#### タスク16: ドキュメント自動更新
```bash
# package.jsonに追加
"scripts": {
  "docs:update": "node scripts/update-architecture-docs.js",
  "docs:api": "node scripts/generate-api-docs.js"
}
```

### 5.2 Claude Code向け最適化

#### タスク17: 開発ガイドライン作成
**成果物**: `docs/claude-code-guide.md`
- ファイル構造の説明
- よく使うコマンド集
- トラブルシューティング手順
- 拡張ポイントの説明

#### タスク18: コンテキスト管理
```javascript
// .zeami/claude-context.json
{
  "currentFocus": "xterm-fork",
  "keyFiles": [
    "src/vendor/xterm/browser/services/ThemeService.ts",
    "src/renderer/terminalManager.js"
  ],
  "recentChanges": [],
  "knownIssues": []
}
```

## 6. 成果物一覧

### ドキュメント
1. **アーキテクチャ文書**
   - `/docs/architecture/zeami-term-architecture.md`
   - `/docs/architecture/technology-stack.md`
   - `/docs/architecture/main-process-guide.md`
   - `/docs/architecture/renderer-process-guide.md`
   - `/docs/architecture/xterm-integration-points.md`
   - `/docs/architecture/dependency-graph.md`

2. **xterm分析文書**
   - `/docs/xterm-analysis/core-structure.md`
   - `/docs/xterm-analysis/customization-points.md`

3. **API文書**
   - `/docs/api/` (自動生成)

4. **開発ガイド**
   - `/docs/claude-code-guide.md`

### コード
1. **フォークされたxterm.js**
   - `/src/vendor/xterm/` (カスタマイズ済みソース)
   - `/dist/xterm/` (ビルド済み)

2. **自動化スクリプト**
   - `/scripts/generate-code-docs.js`
   - `/scripts/xterm-upstream-monitor.js`
   - `/scripts/update-architecture-docs.js`

3. **テスト**
   - `/test/xterm-fork/` (フォーク固有のテスト)

## 7. タイムライン

### Week 1
- Day 1-2: フェーズ1（コードベース調査）
- Day 3: フェーズ2（xterm.js解析）
- Day 4-5: フェーズ3前半（フォーク実装開始）

### Week 2  
- Day 1-2: フェーズ3後半（統合・テスト）
- Day 3: フェーズ4（自動化システム）
- Day 4-5: 最終調整・ドキュメント仕上げ

## 8. リスクと対策

### リスク1: ビルドシステムの複雑化
**対策**: 段階的な移行、十分なドキュメント化

### リスク2: 上流との乖離
**対策**: 自動同期システム、選択的マージ戦略

### リスク3: パフォーマンス劣化
**対策**: ベンチマークテスト、プロファイリング

## 9. 成功基準

1. ✅ 選択色が正しく透明表示される
2. ✅ 全ての既存機能が動作する
3. ✅ ビルドプロセスが自動化されている
4. ✅ Claude Codeが容易に開発できる環境
5. ✅ 包括的なドキュメントが整備されている

## 10. フェーズ5: 継続的上流同期プロセス（継続的実施）

### 10.1 定期同期スケジュール

#### 月次同期サイクル
```yaml
# .github/workflows/xterm-upstream-sync.yml
name: xterm.js Upstream Sync Check
on:
  schedule:
    - cron: '0 0 1 * *'  # 毎月1日
  workflow_dispatch:      # 手動実行も可能

jobs:
  check-upstream:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check upstream updates
        run: npm run check:upstream
      - name: Create sync report
        run: npm run sync:report
      - name: Create issue if updates available
        if: steps.check.outputs.has-updates == 'true'
        uses: actions/create-issue@v2
```

#### 週次セキュリティチェック
```javascript
// scripts/security-check.js
async function checkSecurityUpdates() {
  // xterm.jsのセキュリティアドバイザリをチェック
  // 緊急度の高い更新を検出
  // 自動的にPRを作成
}
```

### 10.2 同期プロセスの詳細

#### ステップ1: 差分分析
```bash
# scripts/analyze-upstream-diff.sh
#!/bin/bash

# 上流の最新タグを取得
LATEST_TAG=$(git ls-remote --tags xterm-upstream | tail -1)

# 差分レポート生成
git diff our-fork-base..$LATEST_TAG --stat > diff-summary.txt

# 重要ファイルの詳細差分
for file in ThemeService.ts CellColorResolver.ts Terminal.ts; do
  git diff our-fork-base..$LATEST_TAG -- "*/$file" > "diff-$file.txt"
done
```

#### ステップ2: 自動マージ可能性評価
```javascript
// scripts/merge-analyzer.js
class MergeAnalyzer {
  constructor() {
    this.safeFiles = new Set([
      // カスタマイズしていないファイル
      'src/common/Types.d.ts',
      'src/browser/Linkifier.ts',
      // など
    ]);
    
    this.criticalFiles = new Set([
      // カスタマイズ済みファイル
      'src/browser/services/ThemeService.ts',
      'src/browser/renderer/shared/CellColorResolver.ts'
    ]);
  }
  
  analyzeMergeability(changedFiles) {
    const report = {
      autoMergeable: [],
      needsReview: [],
      conflicts: []
    };
    
    changedFiles.forEach(file => {
      if (this.safeFiles.has(file)) {
        report.autoMergeable.push(file);
      } else if (this.criticalFiles.has(file)) {
        report.conflicts.push(file);
      } else {
        report.needsReview.push(file);
      }
    });
    
    return report;
  }
}
```

#### ステップ3: 選択的マージ実行
```javascript
// scripts/selective-merge.js
class SelectiveMerger {
  async mergeUpstream(mergeReport) {
    // 1. 安全なファイルを自動マージ
    for (const file of mergeReport.autoMergeable) {
      await this.cherryPickFile(file);
    }
    
    // 2. レビューが必要なファイルのPR作成
    if (mergeReport.needsReview.length > 0) {
      await this.createReviewPR(mergeReport.needsReview);
    }
    
    // 3. コンフリクトファイルの手動マージ準備
    if (mergeReport.conflicts.length > 0) {
      await this.prepareManualMerge(mergeReport.conflicts);
    }
  }
  
  async cherryPickFile(file) {
    // 特定ファイルのみをcherry-pick
    execSync(`git checkout xterm-upstream/master -- ${file}`);
  }
}
```

### 10.3 マージ戦略

#### 優先度マトリックス
| 変更タイプ | セキュリティ | バグ修正 | 機能追加 | リファクタリング |
|-----------|------------|---------|---------|---------------|
| 自動マージ | ✅ 即時 | ✅ 24時間内 | ⚠️ 週次 | ❌ 月次評価 |
| レビュー必須 | ✅ 即時 | ⚠️ 3日内 | ⚠️ 週次 | ❌ 月次評価 |
| コンフリクト | ✅ 手動即時 | ⚠️ 1週間内 | ❌ 月次 | ❌ 必要時のみ |

#### コンフリクト解決プロトコル
```typescript
// docs/merge-conflict-protocol.md
interface ConflictResolution {
  file: string;
  strategy: 'keep-ours' | 'take-theirs' | 'manual-merge';
  reason: string;
}

const conflictStrategies: ConflictResolution[] = [
  {
    file: 'ThemeService.ts',
    strategy: 'manual-merge',
    reason: '選択色カスタマイズを保持しつつ、新機能を取り込む'
  },
  {
    file: 'package.json',
    strategy: 'manual-merge', 
    reason: 'バージョンとカスタム依存関係の調整'
  }
];
```

### 10.4 自動化ツール

#### GitHub Actions統合
```yaml
# .github/workflows/upstream-sync-automation.yml
name: Automated Upstream Sync
on:
  schedule:
    - cron: '0 2 * * 0'  # 毎週日曜日2時
  
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        
      - name: Setup Node
        uses: actions/setup-node@v3
        
      - name: Run sync analysis
        id: analyze
        run: |
          npm run sync:analyze
          echo "::set-output name=has-updates::$(cat .sync-status)"
          
      - name: Auto merge safe changes
        if: steps.analyze.outputs.has-updates == 'true'
        run: npm run sync:auto-merge
        
      - name: Create PR for review items
        if: steps.analyze.outputs.needs-review == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: xterm.js upstream sync'
          body: |
            ## xterm.js Upstream Sync
            
            自動同期プロセスが上流の変更を検出しました。
            
            ### 変更サマリー
            $(cat .sync-summary)
            
            ### レビューが必要な項目
            $(cat .sync-review-items)
          branch: auto-sync/xterm-upstream
```

#### Slack/Discord通知
```javascript
// scripts/sync-notifier.js
class SyncNotifier {
  async notifyUpdate(syncReport) {
    const message = {
      text: 'xterm.js Upstream Update Available',
      attachments: [{
        color: this.getPriorityColor(syncReport),
        fields: [
          {
            title: 'Version',
            value: syncReport.upstreamVersion,
            short: true
          },
          {
            title: 'Changed Files',
            value: syncReport.changedFiles.length,
            short: true
          },
          {
            title: 'Action Required',
            value: syncReport.actionRequired ? '要対応' : '自動処理中'
          }
        ]
      }]
    };
    
    await this.sendToWebhook(message);
  }
}
```

### 10.5 ドキュメント管理

#### 同期履歴の記録
```markdown
# docs/upstream-sync-history.md

## 2025-07-01 Sync Report
- Upstream version: v5.4.0
- Changes merged: 15 files
- Conflicts resolved: 2 files (ThemeService.ts, Terminal.ts)
- Custom modifications preserved: ✅

### Notable changes
- Performance improvements in renderer
- New accessibility features
- Bug fixes in selection handling
```

#### 変更ログ自動生成
```javascript
// scripts/generate-sync-changelog.js
function generateChangelog(syncReport) {
  const changelog = `
## [${new Date().toISOString().split('T')[0]}] xterm.js Sync

### Merged from upstream
${syncReport.merged.map(item => `- ${item}`).join('\n')}

### Conflicts resolved
${syncReport.conflicts.map(item => `- ${item.file}: ${item.resolution}`).join('\n')}

### ZeamiTerm customizations maintained
${syncReport.customizations.map(item => `- ${item}`).join('\n')}
`;
  
  fs.appendFileSync('CHANGELOG-SYNC.md', changelog);
}
```

## 11. 次のアクション

1. この計画書のレビューと承認
2. フェーズ1の開始（コードベース調査）
3. 調査結果に基づく計画の調整
4. 継続的同期システムのセットアップ