# xterm.js フォーク戦略

## 現状分析

### 問題点
1. 選択色の透明度が正しく適用されない
2. 内部的な色処理が複雑で、外部からの制御が困難
3. コンパイル済みコードでは問題の根本解決が難しい

### 選択肢

#### Option 1: 現状維持（npmパッケージ使用）
**メリット:**
- 簡単なアップデート
- 標準的な使用方法
- メンテナンスが楽

**デメリット:**
- カスタマイズが困難
- バグ修正は上流に依存
- 選択色問題が解決できない

#### Option 2: ソースコードフォーク（推奨）
**メリット:**
- 完全なカスタマイズが可能
- 選択色問題を根本的に解決できる
- ZeamiTerm固有の機能を追加可能

**デメリット:**
- ビルドプロセスが複雑
- 上流の更新を手動でマージ必要
- メンテナンスコスト増加

## 実装計画

### Phase 1: ローカルフォークの作成
```bash
# 1. xterm.jsのソースをプロジェクトに取り込む
mkdir -p src/vendor
cp -r node_modules/xterm/src src/vendor/xterm

# 2. 必要な修正を適用
# - ThemeService.tsで選択色処理を修正
# - CellColorResolver.tsで透明度を正しく処理
```

### Phase 2: ビルドプロセスの設定
```json
// tsconfig.json を追加
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*"
  ]
}
```

### Phase 3: 選択色問題の修正

#### 修正箇所1: ThemeService.ts
```typescript
// src/vendor/xterm/browser/services/ThemeService.ts
private _setTheme(theme: ITheme = {}): void {
  const colors = this._colors;
  // ...
  
  // 選択色の処理を改善
  const selectionColor = parseColor(theme.selectionBackground, DEFAULT_SELECTION);
  
  // 透明度を保持するように修正
  colors.selectionBackgroundTransparent = selectionColor;
  
  // Opaqueバージョンも透明度を考慮
  if (selectionColor.rgba & 0xFF < 0xFF) {
    // 既に透明な場合はそのまま使用
    colors.selectionBackgroundOpaque = selectionColor;
  } else {
    // 不透明な場合のみブレンド
    colors.selectionBackgroundOpaque = color.blend(colors.background, selectionColor);
  }
}
```

#### 修正箇所2: CellColorResolver.ts
```typescript
// src/vendor/xterm/browser/renderer/shared/CellColorResolver.ts
// 選択色の適用時に透明度を保持
if ($isSelected) {
  const selectionColor = this._coreBrowserService.isFocused 
    ? $colors.selectionBackgroundTransparent  // OpaqueではなくTransparentを使用
    : $colors.selectionInactiveBackgroundTransparent;
  
  $bg = selectionColor.rgba >> 8 & 0xFFFFFF;
  $hasBg = true;
}
```

### Phase 4: package.jsonの更新
```json
{
  "scripts": {
    "build:xterm": "tsc -p src/vendor/xterm/tsconfig.json",
    "prebuild": "npm run build:xterm",
    // ...
  }
}
```

## 移行手順

1. **バックアップ作成**
   ```bash
   git checkout -b feature/xterm-fork
   ```

2. **ソースコード取り込み**
   ```bash
   npm run setup:xterm-source
   ```

3. **修正適用**
   - 選択色処理の修正
   - ZeamiTerm固有の拡張

4. **テスト**
   - 選択色が正しく透明になることを確認
   - 既存機能が動作することを確認

5. **ドキュメント更新**
   - ビルド手順の文書化
   - カスタマイズ内容の記録

## リスク管理

1. **上流更新の追跡**
   - xterm.jsのリリースノートを定期的に確認
   - セキュリティアップデートは優先的に適用

2. **互換性の維持**
   - APIの変更は最小限に
   - アドオンとの互換性を確認

3. **パフォーマンス監視**
   - ビルドサイズの増加を監視
   - 実行時パフォーマンスを測定

## 結論

選択色の透明度問題を根本的に解決し、将来的なカスタマイズの柔軟性を確保するため、xterm.jsのソースコードフォークを推奨します。初期の実装コストは高いものの、長期的なメンテナンス性と機能拡張の観点から有益です。