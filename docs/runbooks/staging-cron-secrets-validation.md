# Staging Cron & Secrets Validation Runbook

本番投入前に、Staging 環境でCronとシークレットが正しく動作するかを確認する手順です。

## 1. Deploy 前の確認
- `wrangler.jsonc` を開き、以下の Required Secrets が宣言されていること、および `env.staging.triggers.crons` に期待されるCron（例: `*/10 * * * *`）が設定されていることを確認します。
- `npx wrangler secret list --env staging` を実行し、必要な Secret が登録されているか確認します。

## 2. Deploy と Dashboard 確認
- Staging へデプロイ (`npm run deploy --env staging` など) 後、Staging 用の Admin Dashboard にアクセスします。
- **Operational Readiness Panel** を確認します。
  - `Issues Detected` がなく、`System Ready` と表示されていること。
  - Secrets が全て揃っていること。
  - プロバイダが適切に設定されていること（Stagingでは一部 Disabled でも問題ありませんが、その旨が反映されていること）。

## 3. Cloudflare Dashboard での Cron Events の確認
1. Cloudflare ダッシュボードにログイン。
2. 該当プロジェクト（Staging 環境）の **Logs / Cron Events** を開く。
3. `wrangler.jsonc` で設定した周期（例: 10分おき）で Cron Event がトリガーされていることを確認します。
4. **Workers Logs**:
   - 実行時のライブログを確認し、`evaluateAndNotifyAlerts` 等からエラーが出ずに処理が完了していることを見届けます。

## 4. 障害切り分け
- **Missing Secrets**: Dashboard に Missing Secrets と表示されたら、`wrangler secret put` コマンドで対象を追加してください。
- **Wrong Cron**: Cron Events に表示されるスケジュールが意図したものと異なる場合、`wrangler.jsonc` の `env.staging.triggers.crons` が正しくデプロイに反映されたか再確認します。
- **Disabled Provider**: Staging であえて無効化しているプロバイダがある場合、`xxx_ENABLED=false` が適用されているか確認します。
