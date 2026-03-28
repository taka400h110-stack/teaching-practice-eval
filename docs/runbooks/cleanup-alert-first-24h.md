# Cleanup Alert First 24h Runbook

このRunbookは、Cleanup Alert運用基盤を本番環境（Prod）にデプロイした直後から24時間以内に確認すべき項目をまとめたものです。

## 1. デプロイ直後に見るべき画面
- **Admin Dashboard**:
  - `Operational Readiness Panel` を確認し、`Blocking Issues` がゼロであることを確認します。
  - `Provider Health Panel` にて各連携プロバイダ（PagerDuty, Opsgenie, SendGridなど）が `healthy` または `disabled` となっているか確認します。
  - `Missing Secrets` の警告が出ていないことを確認します。

## 2. Cron Events の確認順
Cloudflareダッシュボードから Workers & Pages > 該当プロジェクト > **Logs / Cron Events** タブを開きます。
- 以下のCronジョブが定期実行されているか確認します。
  1. `cleanup cron` (通常1日1回など)
  2. `escalation cron` (*/15 * * * * など)
  3. `sla cron` (*/15 * * * * など)
- Invocations が `Success` になっていることを確認します。

## 3. Workers Logs の見るポイント
- WorkerのライブログまたはLogpushのログで以下を確認します。
  - `evaluateAndNotifyAlerts` や `runCleanupAlertEscalation` で未処理の例外（Crash）が発生していないか。
  - `export_cleanup_webhook_verification_failed` のログが出ていないか（Webhookのシークレット違いや不正アクセスの監視）。
  - 各種 Provider 呼び出し時の HTTP 500 や Timeout エラーがないか。

## 4. 初回アラートのテスト手法
本番環境で実際にアラートを発生させ、運用フローをテストします。
1. **疑似アラートの注入**:
   手動で失敗するCleanupタスクを実行するか、一時的に閾値を下げてアラートを発火させます。
2. **ルーティングの確認**:
   Slack、メール（SendGrid/Resend）、およびインシデント管理（PagerDuty/Opsgenie）に通知が到達したか。
3. **エスカレーション・SLAの検証**:
   - アラートを放置し、SLA違反（Breach）が記録され、再通知が行われるか確認します（L1 -> L2 -> L3）。
4. **アラートの解決（Resolve）**:
   - Admin画面からアサインし、コメントを残し、「Resolved」に変更します。
   - インシデントプロバイダ側のチケットが自動でクローズされることを確認します。
