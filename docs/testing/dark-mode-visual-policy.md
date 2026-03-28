# Dark Mode Visual Testing Policy

## 概要
システムのダークテーマ（Dark Mode）サポートの品質を維持するため、PlaywrightのVisual Regression Test（VRT）を使用してダークモードでの画面表示が崩れないことを確認します。

## ポリシー
- ダークモードはMUIの `ThemeProvider` によりグローバルに切り替わります。
- テストスイート（`tests/e2e/visual-dark-mode.spec.ts`）において、エミュレーション（`colorScheme: 'dark'`）を有効にしてスクリーンショットを撮影・比較します。
- **対象画面**:
  - メインダッシュボード（各ロール）
  - 統計・分析画面（グラフの色使いが反転・視認できること）
- **運用**: 
  - メインのVisual Regressionスイート（ライトモード）と同様に、差分検出時のレビューフローを適用します。
  - 現在はBacklog（任意レイヤー）として配置し、デザインシステムが安定次第必須レイヤーへ昇格します。
