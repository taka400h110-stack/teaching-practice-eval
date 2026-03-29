# Staging Readiness Checklist: Cleanup Alert

- [ ] **Wrangler Environments**:
  - [ ] `wrangler.jsonc` に `staging` 用の `triggers.crons` が設定されていること。
  - [ ] `staging` 環境では、本番と干渉しない、またはより頻度の高い検証用の Cron が設定されていること（例: `*/10 * * * *`）。
- [ ] **Secrets in Staging**:
  - [ ] Staging 環境に依存する Secret（例: Staging 用 Slack Webhook, Staging 用 PagerDuty Routing Key）が `wrangler secret put --env staging` で設定されていること。
  - [ ] Admin Dashboard の Operational Readiness API から `Missing Secrets` が0件であることを確認。
- [ ] **Smoke Tests**:
  - [ ] E2E の Smoke テスト (`smoke-scheduled-handler.spec.ts`) が staging 環境で合格すること。
- [ ] **Documentation**:
  - [ ] Staging 検証用の Runbook が存在し、担当者が確認していること。
