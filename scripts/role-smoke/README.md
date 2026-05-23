# Role Smoke Scripts

教育実習評価システムの6ロール (student / univ_teacher / school_mentor / researcher / collaborator / board_observer) の動作検証用 Playwright スクリプト群。

CI に組み込まれている Playwright spec (`tests/e2e/role-ui-six-roles-smoke.spec.ts`) と同等の検証を、ローカルや本番に対してアドホックに実行できる。

## 前提
- PM2 で `webapp-preview` がポート 3000 で起動していること
  ```bash
  cd /home/user/webapp
  pm2 start ecosystem.config.cjs
  ```
- もしくは本番 URL (https://teaching-practice-eval.pages.dev) を見る場合はスクリプト内の `BASE` 定数を編集

## スクリプト一覧

| ファイル | 目的 |
|---|---|
| `role-ui-check.cjs` | 6ロール × 33 パスを巡回して console.error / pageerror を検出 |
| `role-ui-check-strict.cjs` | 上記に加えて、API 4xx/5xx、unauthorized リダイレクト、空レンダも検出 |
| `role-ui-render-check.cjs` | 主要画面のレンダ深度(本文長・見出し・エラーバナー)を確認 |
| `first-login-check.cjs` | 6ロールの **初回ログイン** (localStorage クリア状態) の挙動検証 |
| `onboarding-flow-check.cjs` | 学生のオンボーディング Step0 → Step5 → /dashboard 通し検証 |
| `second-login-check.cjs` | オンボーディング完了済み学生の 2回目ログインが /dashboard 直行することを検証 |
| `prod-admin-check.cjs` | 本番(Cloudflare Pages)で /admin がロール別に正しく表示されることを確認 |

## 実行例
```bash
cd /home/user/webapp
node scripts/role-smoke/role-ui-check-strict.cjs
node scripts/role-smoke/first-login-check.cjs
```

## 推奨される CI 経由の検証
CI で常時走らせる正規スモークは `tests/e2e/role-ui-six-roles-smoke.spec.ts` (Playwright spec) 側を使う。
本ディレクトリのスクリプトは開発中の素早いデバッグ・本番確認用。
