# Incident Provider Operations Runbook

Cleanup Alert 基盤における外部インシデントプロバイダ（PagerDuty, Opsgenie, Generic Webhook）およびメールプロバイダの運用ガイドです。

## 1. 設定とシークレットの確認
各プロバイダを利用するためには、環境変数またはCloudflare Secretsに正しく値が設定されている必要があります。

- **PagerDuty**:
  - `PAGERDUTY_ENABLED=true`
  - `PAGERDUTY_ROUTING_KEY` (Secret): PagerDutyのEvents API v2インテグレーションキー。
- **Opsgenie**:
  - `OPSGENIE_ENABLED=true`
  - `OPSGENIE_API_KEY` (Secret): OpsgenieのAPIインテグレーションキー。
  - *Note*: Opsgenieでは `alias` が重複排除（Dedup）および後続のClose/Log/Attachのキーになります。本システムではAlertの `fingerprint` を用いています。
- **Generic Webhook**:
  - `GENERIC_WEBHOOK_ENABLED=true`
  - `GENERIC_WEBHOOK_URL`
  - `GENERIC_WEBHOOK_AUTH_VALUE` (Secret・任意)

## 2. 疎通確認とフォールバック
- **疎通確認**: Admin Dashboardのインシデント一覧または `Trigger` APIを用いて手動でテストイベントを送信し、外部システムにインシデントが起票されるか確認します。
- **フォールバック**:
  - いずれかのプロバイダがダウンした場合でも、Worker全体がクラッシュしない設計になっています。
  - 各プロバイダへの呼び出しは try-catch で保護され、失敗時は `cleanup_alert_incidents` にエラー内容とステータスが記録されます。
  - SLAジョブによる定期再通知や、Dashboard上での手動リトライ（再Trigger）によってリカバリを行ってください。

## 3. メールプロバイダ Webhook 運用
- **Resend / SendGrid**:
  - メールの到達状況を追跡するため、各プロバイダからWebhookを受信します。
  - `RESEND_WEBHOOK_SECRET` / `SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY` の設定が必須です。
  - Signature検証に失敗した場合、Dashboardの Verification Failure ログに表示されます。
