# 2025-01-20: ZeamiTerm起動時の無限ループ問題の修正

## 問題の症状
ZeamiTermを起動すると「Initializing ZeamiTerm...」で永久ループに陥る。

## 原因
1. **シェル統合チェックによる再帰ループ**
   - ターミナル作成後にシェル統合がチェックされる
   - シェル統合のセットアップがターミナルの再起動を引き起こす
   - これが無限ループを生成

2. **ターミナル作成の重複実行**
   - createTerminalメソッドに重複防止機構がなかった

3. **ResizeObserverの潜在的な問題**
   - リサイズイベントが連続して発生する可能性

## 解決方法
1. **シェル統合チェックの一時無効化**
   ```javascript
   if (false && result.shell) {  // Temporarily disabled to fix infinite loop
   ```

2. **重複作成防止フラグの追加**
   ```javascript
   this.terminalsBeingCreated = new Set();
   // createTerminal内でチェックとtry-finally処理
   ```

3. **ResizeObserverのデバウンス強化**
   ```javascript
   let resizeInProgress = false;
   // 処理中フラグで重複実行を防止
   ```

4. **初期化フラグの追加**
   ```javascript
   this.isInitializing = false;
   // init()メソッドで重複初期化を防止
   ```

## 結果
無限ループが解消され、ZeamiTermが正常に起動するようになった。

## 今後の課題
- シェル統合機能の根本的な修正
- より堅牢な初期化シーケンスの実装