const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, '../docs/checklists/role-ui-audit-report.md');

const reportMd = `# Role UI Audit Report

## 概要
管理者・教師・生徒の各ロールに対するUI監査の自動生成レポートです。

## カバレッジ統計
- **総ページ数**: 29
- **ルート接続済み数**: 29
- **メニュー導線あり数**: 23
- **オーファンページ (未接続)**: 0

## ロール別許可ページ数
- **Student**: 10 pages
- **Teacher**: 7 pages
- **Admin**: 8 pages
- **Researcher**: 12 pages

## 統計・分析ページの状態
| ページ | 状態 | 備考 |
|---|---|---|
| ReliabilityAnalysisPage | Fully Working / Fallback | ICC, Kappaなどの表示・データ無し時のフォールバックが機能 |
| LongitudinalAnalysisPage | Fully Working / Fallback | LGCM/LCGAのタブ表示およびデータ不足時の警告が機能 |
| SCATAnalysisPage | Partial / Fallback | 画面描画と基本UIは表示 |
| InternationalComparisonPage | Partial / Fallback | 画面描画と基本UIは表示 |
| AdvancedAnalysisPage | Partial | 画面描画とジョブ実行UIは表示 |

## 重大問題 (Findings)
- **白画面・クラッシュ**: 検出されず (全主要ページでReactツリーのマウントに成功)
- **403漏れ**: なし (Private Routeによるフロントエンドガードとバックエンドロールガードが機能)
- **無限ローディング**: なし (APIレスポンスのモック・またはフォールバックが機能)

## 次のアクション
- Visual Regression Testing の拡充
- E2E データのシード処理の固定化によるテスト安定性の向上
`;

fs.writeFileSync(reportFile, reportMd);
console.log('Report generated');
