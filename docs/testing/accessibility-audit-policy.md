# Accessibility (A11y) Audit Policy

## 目的
本システムのUIがWCAG (Web Content Accessibility Guidelines) 2.1 AA レベルに準拠し、すべてのユーザーが操作可能であることを担保するため、Playwright Axeによる自動テストおよびLighthouse CIによる監査を導入します。

## ポリシー
- **自動監査**: `@axe-core/playwright` を使用して、主要なページ・コンポーネントにおける重大なアクセシビリティ違反を検出します。
- **カバレッジ対象**:
  - ログイン・オンボーディング画面
  - 各ロール（Student, Teacher, Admin）のダッシュボード
  - 重要な操作フロー（ジャーナル提出、集計エクスポートなど）
- **CIブロッキング**: Axeの `critical` または `serious` に分類される違反が検出された場合、テストはフェイルしPRのマージをブロックします。

## 対象外・制限事項
- カラーコントラストの軽微な違反など、一時的な除外（`disableRules`）が必要な場合は、Issueを発行して修正予定を管理します。
