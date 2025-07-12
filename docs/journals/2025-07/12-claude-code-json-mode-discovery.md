---
type: journal
category: development
date: 2025-07-12
author: Claude + Hirano
tags:
  - claude-code
  - json-mode
  - parallel-processing
  - meta-programming
---

# Claude CodeのJSONモード調査と革新的な発見

## 概要

Claude CodeのJSONモード（`--output-format stream-json`）について調査し、興味深い発見と新しい可能性を見出した。

## 主な発見

### 1. JSONモードの基本的な制約

**現状の仕様**：
- `--output-format stream-json`は`--print`オプションでのみ使用可能
- `--print`は1回のリクエスト/レスポンスで終了する非対話型
- 対話型セッションでJSONモードは使用できない

**使用例**：
```bash
# 出力のみJSON形式
echo "質問" | claude --print --output-format stream-json --verbose

# 入出力両方JSON形式
echo '{"type":"user","message":"質問"}' | claude --print --input-format stream-json --output-format stream-json --verbose
```

### 2. `--resume`オプションの限界

`--resume <sessionId>`を使用しても：
- 毎回新しいプロセスを起動（100-500msのオーバーヘッド）
- 会話履歴の再読み込みで累積的な遅延
- 本質的には対話型ではない

### 3. JSONモードの本来の用途

調査の結果、JSONモードは以下の用途で設計されていることが判明：

1. **CI/CD統合**
   ```bash
   git diff | claude -p "コードレビュー" --output-format json | jq '.result'
   ```

2. **自動化スクリプト**
   ```bash
   find . -name "*.py" | xargs -I {} claude -p "分析: {}" --output-format json
   ```

3. **監視・アラート**
   ```bash
   tail -f app.log | claude -p "異常検知" --output-format stream-json | alert.py
   ```

4. **構造化データ処理**
   - コスト追跡（`total_cost_usd`）
   - エラーハンドリング（`is_error`）
   - セッション管理（`session_id`）

## 革新的な発見：Claude内からClaude呼び出し

### メタプログラミングの可能性

**対話型Claude Code内から、JSONモードのClaude Codeを呼び出せる！**

```bash
# Claude内で実行
echo "What is 2+2?" | claude --print --output-format json
# 結果: {"type":"result","result":"4","total_cost_usd":0.03190725,...}
```

### 活用例

1. **並列処理**
   ```bash
   # 複数のタスクを並列実行
   echo "Task 1" | claude --print --output-format json &
   echo "Task 2" | claude --print --output-format json &
   echo "Task 3" | claude --print --output-format json &
   wait
   ```

2. **コスト追跡**
   ```bash
   echo "Hello" | claude --print --output-format json | jq '.total_cost_usd'
   # 0.03391895
   ```

3. **構造化処理**
   ```bash
   echo "質問" | claude --print --output-format json | jq -r '.result'
   ```

### アーキテクチャの比較

**通常のClaude Code**：
```
Claude Code本体（Node.js）
    ↓ HTTP/JSON
Anthropic API
    ↓
ツール実行（子プロセス：/bin/zsh）
```

**メタプログラミング方式**：
```
対話型Claude（オーケストレーター）
    ↓
JSONモードClaude（ワーカー）× N
    ↓
並列処理・構造化データ
```

## 考察

### 可能性

1. **無限の拡張性**：Claudeが自身を使ってより複雑なワークフローを構築
2. **並列処理の実現**：複数のClaude インスタンスで処理を高速化
3. **タスク分割**：大きなタスクを小さなサブタスクに分割して並列実行
4. **エラー耐性**：各ワーカーが独立しているため、エラーの影響が限定的

### 課題

1. **コスト**：各呼び出しにAPIコストが発生
2. **レート制限**：大量の並列実行時は制限に注意
3. **複雑性**：デバッグやエラー追跡が困難になる可能性

## 今後の展望

1. **専用インターフェースの開発**
   - JSONモードを活用した新しい開発環境
   - リアルタイムモニタリング
   - ビジュアルなタスク管理

2. **ワークフロー自動化**
   - 複雑なタスクの自動分割
   - 最適な並列度の自動決定
   - 結果の自動集約

3. **メタプログラミングパターンの確立**
   - ベストプラクティスの蓄積
   - 再利用可能なパターンの定義
   - ライブラリ化

## まとめ

Claude CodeのJSONモードは、一見すると制約の多い機能に見えるが、実は強力なメタプログラミングツールとしての可能性を秘めている。対話型Claudeをオーケストレーターとして、JSONモードのClaude をワーカーとして使うことで、従来では考えられなかった並列処理や自動化が可能になる。

この発見は、AI支援開発の新しいパラダイムを示唆しており、今後の開発手法に大きな影響を与える可能性がある。