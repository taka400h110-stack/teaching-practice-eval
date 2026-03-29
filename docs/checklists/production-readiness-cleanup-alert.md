# Production Readiness Checklist: Cleanup Alert

- [ ] **Secrets Configuration**:
  - [ ] PAGERDUTY_ROUTING_KEY
  - [ ] OPSGENIE_API_KEY
  - [ ] RESEND_WEBHOOK_SECRET
  - [ ] SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY
  - [ ] SLACK_CLEANUP_ALERT_WEBHOOK_URL
- [ ] **Cron Triggers Configured**:
  - `wrangler.jsonc` の triggers.crons に適切な間隔（例: `*/15 * * * *`）が設定されている。
- [ ] **Dashboard Verification**:
  - Operational Readiness API が `ok: true` を返している。
  - Provider Health パネルが全て healthy または意図した disabled を示している。
- [ ] **Documentation**:
  - First 24h Runbook をオンコール担当者が確認済み。
  - Incident Provider Runbook を運用チームが確認済み。
