# Matrix WebGL Command Guide

## 概要
ZeamiTermに統合されたMatrix WebGLコマンドは、ターミナル上でWebGLを使用した高度なビジュアルエフェクトと負荷テストを実行できます。

## 使用方法

### 基本コマンド
```bash
matrix start              # エフェクトを開始
matrix stop               # エフェクトを停止
matrix stress [1-4]       # ストレステスト実行
matrix effect <name> <value>  # エフェクトパラメータ調整
matrix help               # ヘルプ表示
```

### 起動オプション
```bash
matrix start --blur=5     # ブラー効果付きで開始
matrix start --glow=3     # グロー強度を上げて開始
matrix start --3d         # 3D透視効果付き
matrix start --rainbow    # レインボーカラーモード
matrix start --stress=3   # ストレステストレベル3で開始
```

## エフェクトパラメータ

### dropSpeed (0.0-1.0)
文字が落下する速度を制御
```bash
matrix effect dropSpeed 0.1
```

### dropDensity (0.0-2.0)
画面上の文字の密度
```bash
matrix effect dropDensity 0.5
```

### glowIntensity (0.0-5.0)
文字の発光強度
```bash
matrix effect glowIntensity 2.0
```

### blurAmount (0.0-10.0)
ブラーエフェクトの強度
```bash
matrix effect blurAmount 3.0
```

### perspective (0.0-1.0)
3D透視効果の深度
```bash
matrix effect perspective 0.5
```

### rainbowMode (true/false)
レインボーカラーモードの切り替え
```bash
matrix effect rainbowMode true
```

## ストレステストレベル

### レベル1: Light（軽負荷）
- 低速の文字落下
- 低密度
- エフェクトなし

### レベル2: Medium（中負荷）
- 中速の文字落下
- 中密度
- 軽いブラーエフェクト
- グロー効果

### レベル3: Heavy（高負荷）
- 高速の文字落下
- 高密度
- 強いブラーエフェクト
- 強いグロー効果
- 3D透視効果
- レインボーモード

### レベル4: Extreme（極限負荷）
- 超高速の文字落下
- 超高密度
- 最大ブラーエフェクト
- 最大グロー効果
- フル3D効果
- レインボーモード
- パーティクルエフェクト（予定）

## パフォーマンスモニタリング

画面上部にリアルタイムでパフォーマンス指標が表示されます：
- **FPS**: フレームレート
- **Draw Calls**: 描画呼び出し回数

## 技術仕様

- **レンダリング**: WebGL 2.0
- **シェーダー**: GLSL ES 3.0
- **最適化**: 
  - 単一のフルスクリーンクワッドで全エフェクトを描画
  - フラグメントシェーダーで全ての処理を実行
  - 動的なユニフォーム更新

## トラブルシューティング

### エフェクトが表示されない
- WebGL2がサポートされているか確認
- GPUドライバーが最新か確認

### パフォーマンスが低い
- ストレステストレベルを下げる
- ブラーエフェクトを無効化: `matrix effect blurAmount 0`

### コマンドが認識されない
- ZeamiTermを再起動
- 最新バージョンか確認