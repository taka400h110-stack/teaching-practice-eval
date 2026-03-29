# CI UI Audit Policy

## 必須・任意チェックの階層化

当プロジェクトでは、安定したCI運用と開発速度のバランスを取るため、テストを以下の3つの階層に分けて運用します。

### 1. Mandatory (Must-Pass)
PRマージの必須条件となるテスト群。これらが失敗した場合はコードの修正が必要です。
- **Build**: Vite/Wranglerによるビルドが通ること
- **Role UI Smoke**: `npm run test:e2e:smoke`（RBACマトリクスと主要ページ遷移）
- **Export & Filter**: `npm run test:e2e:export`（CSVダウンロード、フィルタ挙動）
- **Statistics (Normal/Empty)**: `npm run test:e2e:stats:normal` / `:empty`（統計ページの正常系とデータなし系）

### 2. Semi-Mandatory (`test:ui:audit:optional`)
重要な品質指標ですが、PR上ではノンブロッキング（`continue-on-error: true`）として運用し、`main`へのPush時や定期実行時（Nightly）にはブロッキング（必須）となるテスト群。
- **Statistics (Malformed)**: `npm run test:e2e:stats:malformed`（異常データ入力時のフォールバックUI確認）
- **Mobile Interaction**: `npm run test:e2e:mobile`（モバイル画面でのNavigationDrawer等固有UIの操作）
※これらがPRで落ちた場合でもマージ自体は可能ですが、原因が明確な場合は修正を推奨します。メインブランチの健全性を保つため、`main` で落ちている場合は直ちにTriageが必要です。

### 3. Optional / Scheduled
PRごとの実行では重すぎる、または変化が大きいため、定期実行やメインブランチでのみ必須とするテスト群。
- **Full Visual Regression**: コンポーネントや全画面の画像差分テスト。手動実行または `main` マージ時。
- **Nightly Visual Regression**: 夜間バッチで実行。

## Artifact Retention Policy
To ensure investigations can be conducted properly when UI/Visual tests fail in CI, we enforce the following artifact retention policies:
- **Pull Requests**: Retained for 7 days.
- **Main Branch (push/merge)**: Retained for 14-30 days.
- **Nightly Visual Regression**: Retained for 14-30 days.

### Artifact Types
- `playwright-report/`: HTML report containing test results and trace files.
- `test-results/`: Raw output including screenshot diffs for visual regression failures.
- `docs/checklists/role-ui-audit-report.md`: The generated audit report summary.

## CI Environment Stability Rules
For visual regression testing, consistency is paramount:
1. **Timezone**: Set to `UTC`.
2. **Locale**: Set to `ja-JP`.
3. **Fonts**: Necessary CJK fonts must be installed in the CI container (`fonts-noto-cjk` or similar).
4. **Browser**: Fixed Playwright browser binaries version installed via `npx playwright install --with-deps chromium`.
5. **Workers**: Limited to `1` for visual regression jobs to prevent resource starvation and rendering flakiness.

## Optional audit execution policy

Optional audits run on pull requests in non-blocking mode for observability.
They also run on pushes to `main` in blocking mode to surface regressions after merge.
Nightly runs provide trend monitoring for flaky or heavy scenarios.

### Required checks
- build
- role-ui-smoke
- export-filter-audit
- statistics-validity-required

### Non-required observational checks on PR
- audit-optional-pr-observe (matrix jobs)

### Blocking checks on main
- audit-optional-main-enforce (matrix jobs)
