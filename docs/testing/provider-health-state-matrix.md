# Provider Health State Matrix

## 概要
AdminダッシュボードのProvider Health Panel（サードパーティ連携ステータス）において、各連携先（API, DB, 外部サービスなど）の異常系（Degraded / Partial Failure）状態を定義し、UIが適切にフォールバック・警告を表示するかをテストするためのマトリクスです。

## 状態定義（States）

| Provider | State | UI Expectation |
|----------|-------|----------------|
| LLM API  | `healthy` | 「正常」バッジ。レイテンシなどのメトリクス表示。 |
| LLM API  | `degraded` | 「遅延」警告バッジ。再試行ボタンの表示。 |
| LLM API  | `down` | 「停止」エラーバッジ。管理者へのアラート表示。 |
| Database | `healthy` | 「正常」バッジ。コネクション数などの表示。 |
| Database | `down` | システム全体のエラー画面へ遷移、または読み取り専用モード表示。 |
| Storage  | `healthy` | 「正常」バッジ。 |
| Storage  | `timeout` | タイムアウトの警告メッセージ。 |

## テスト要件
- APIモック（MSW等やPlaywright `page.route`）を使用して、各状態のJSONレスポンスを再現する。
- 状態に応じたUI要素（警告アイコン、エラーメッセージ、特定のアクションボタン）が正しく表示されることを確認する。
- 複数のProviderが同時にダウンした際（複合障害）のUI崩れがないかを確認する。
