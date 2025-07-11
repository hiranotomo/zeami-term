---
type: journal
category: development
date: 2025-01-10
author: Claude + Hirano
tags:
  - release-process
  - automation
  - lessons-learned
---

# リリースプロセスの統一化

## 背景と問題

ZeamiTermのリリースプロセスが不安定で、v0.1.13からv0.1.15までのリリースで以下の問題が繰り返し発生した：

1. **公証（Notarization）エラー**
   - 環境変数の不統一（APPLE_ID_PASSWORD vs APPLE_APP_SPECIFIC_PASSWORD）
   - 事前の証明書確認不足

2. **自動アップデートの失敗**
   - Helper appの欠落（"ditto: Couldn't read pkzip signature"）
   - ZIPファイルのシンボリックリンク未保持（3MB vs 90MB）
   - latest-mac.ymlの不完全な生成

3. **複数の重複したスクリプト**
   - wait-for-notarization.sh
   - quick-release.sh
   - prepare-release.sh
   - build-signed.sh
   - sign-app.sh
   - automated-release.sh
   
   これらが異なる時期に異なる開発者によって作成され、一貫性がなかった。

## 解決策

### 1. 統一リリーススクリプトの作成

`scripts/release.sh` として、すべてのリリース処理を一本化：

- 環境変数の統一チェック
- 証明書の事前確認
- セマンティックバージョニングのサポート
- CHANGELOGからの自動リリースノート生成
- ZIPファイルの自動検証と修正
- GitHubリリースの自動作成
- エラー時の詳細なガイダンス

### 2. 環境設定の明確化

`.env.example` を詳細な説明付きで更新し、以下を明確化：

- App-specific passwordの生成方法
- Team IDの確認方法
- GitHub tokenの必要権限
- 各設定項目の具体的な取得手順

### 3. ドキュメントの一本化

`docs/RELEASE_PROCESS.md` として包括的なリリースガイドを作成：

- 前提条件の明確化
- ステップバイステップの手順
- よくある問題と解決方法
- 緊急時の対応手順

## 学んだこと

1. **プロセスの分散は危険**
   - 複数のスクリプトが存在すると、どれが正しいか分からなくなる
   - 更新が一部にしか反映されず、不整合が生じる

2. **環境変数の命名は統一すべき**
   - 同じ値に複数の名前があると混乱の元
   - 互換性のために両方設定するより、一つに統一すべき

3. **事前検証の重要性**
   - リリース前に環境をチェックすることで、多くの問題を防げる
   - エラーメッセージは具体的な解決方法を含むべき

4. **自動化の落とし穴**
   - electron-builderの自動公証は便利だが、エラー時のデバッグが困難
   - 各ステップを明確に分離し、問題箇所を特定しやすくする

5. **ドキュメントの重要性**
   - リリース手順は属人化しやすい
   - 詳細なドキュメントがあれば、誰でも確実にリリースできる

## 今後の改善点

1. **CI/CDの導入検討**
   - GitHub Actionsでリリースプロセスを完全自動化
   - ただし、公証には秘密情報が必要なため、セキュリティに注意

2. **リリース前チェックリスト**
   - 自動テストの実行
   - CHANGELOGの更新確認
   - バージョン番号の妥当性確認

3. **ロールバック手順の整備**
   - 問題のあるリリースを素早く取り下げる手順
   - 以前のバージョンへの安全な戻し方

## 振り返り

今回の問題は、「動いているものを触らない」という考えで放置された技術的負債が原因だった。複数の開発者が異なる時期に「とりあえず動く」スクリプトを追加し続けた結果、全体像を把握できない状態になっていた。

統一化により、リリースプロセスが予測可能で信頼できるものになった。これは単なる技術的な改善ではなく、開発者の心理的安全性の向上にもつながる。「リリースが怖い」から「リリースは簡単」への転換は、プロダクトの継続的な改善にとって重要だ。

また、Claude Codeとの協働において、問題の根本原因を探ることの重要性を再認識した。表面的な修正を繰り返すのではなく、「なぜ何度もミスが起きるのか」を問うことで、構造的な問題を発見し解決できた。