---
type: journal
category: development
date: 2025-06-26
author: Claude + hirano
tags:
  - electron
  - auto-update
  - github-releases
  - private-repository
---

# 自動アップデート機能の実装ジャーナル

## 実装の経緯

ZeamiTermにElectronの自動アップデート機能を実装しました。当初の計画では、プライベートリポジトリでありながらリリースをパブリックにすることで、認証なしで自動アップデートを実現しようとしました。

## 技術的な挑戦

### プライベートリポジトリの問題

プライベートリポジトリで公開リリースを行う場合、以下の問題に直面しました：

1. **GitHub API アクセスの制限**
   - プライベートリポジトリのリリースアセットは、認証なしではアクセスできない
   - `https://github.com/owner/repo/releases/download/` URLが404を返す

2. **electron-updaterの設定**
   - `provider: 'github'`と`private: false`の組み合わせが期待通りに動作しない
   - genericプロバイダーも同様の問題に直面

### 試した解決策

1. **Generic Provider**
   ```javascript
   autoUpdater.setFeedURL({
     provider: 'generic',
     url: 'https://github.com/hiranotomo/zeami-term/releases/latest/download'
   });
   ```
   結果：404エラー

2. **GitHub Provider with private: false**
   ```javascript
   autoUpdater.setFeedURL({
     provider: 'github',
     owner: 'hiranotomo',
     repo: 'zeami-term',
     private: false
   });
   ```
   結果：同様に404エラー

3. **カスタムプロバイダーの検討**
   - GitHub APIを直接使用するカスタムプロバイダーの実装を検討
   - 実装の複雑さと時間的制約から一旦保留

## 最終的な決定

時間的制約と技術的複雑さを考慮し、以下の決定を行いました：

1. **v0.1.2では自動アップデート機能を一時的に無効化**
   - ユーザーには手動でリリースページからダウンロードしてもらう
   - 「アップデート機能は一時的に無効になっています」というメッセージを表示

2. **今後の方針**
   - リポジトリをパブリックにすることを検討
   - または、認証トークンを使用した自動アップデートの実装
   - カスタムアップデートサーバーの構築も選択肢として検討

## 学んだこと

1. **GitHubのセキュリティモデル**
   - プライベートリポジトリのアセットは、たとえリリースがパブリックでも、認証が必要
   - これはセキュリティの観点から理にかなっている

2. **electron-updaterの制限**
   - プライベートリポジトリでの使用には制限がある
   - 完全なサポートには認証トークンが必要

3. **実現可能性の事前検証の重要性**
   - 技術的な実現可能性を十分に検証してから実装に着手すべきだった
   - ドキュメントの記載と実際の動作には差がある場合がある

## 振り返り

この経験は、技術的な制約を正しく理解し、実現可能な範囲で価値を提供することの重要性を再認識させてくれました。完璧を求めるよりも、段階的に改善していくアプローチが有効であることを学びました。

次のステップとしては、ユーザーのフィードバックを収集し、最適な自動アップデート戦略を決定することが重要です。