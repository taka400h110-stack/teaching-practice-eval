# Performance Budget Policy

## 概要
Lighthouse CIを使用してフロントエンドのパフォーマンス低下を防止するためのバジェット（指標と閾値）を定義します。

## 指標と閾値

- **Performance Score**: 80点以上
- **Accessibility Score**: 90点以上（必須）
- **Best Practices Score**: 90点以上
- **SEO Score**: 90点以上
- **First Contentful Paint (FCP)**: 2.0秒以内
- **Time to Interactive (TTI)**: 3.0秒以内

## CI 運用
- プルリクエスト作成時に自動で `lhci autorun` が実行されます。
- アクセシビリティ（a11y）に関するスコア低下は**Error（CI失敗）**として扱います。
- パフォーマンスや他の指標の低下は**Warn（警告）**として出力され、必要に応じてチューニングを実施します。
