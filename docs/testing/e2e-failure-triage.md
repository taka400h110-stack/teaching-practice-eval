# E2E Failure Triage Guidelines

E2E UI監査が失敗した場合の原因特定（トリアージ）ガイドです。Playwrightのレポート、Traceビューア、エラーコンテキストのMarkdownファイルを確認しながら、以下のカテゴリに分類して対処します。

## カテゴリと対応

### 1. Seed Mismatch (シード状態の不一致)
- **症状**: 期待するページにリダイレクトされない、データが表示されるべき箇所が空である、またはその逆。
- **原因**: `localStorage`、APIのモック、DBフィクスチャなどが正しく注入・設定されていない。
- **対応**: `tests/e2e/helpers/seedTestUserState.ts` の状態設定ロジックを確認し、アプリケーション側の判定条件（例: `onboardingCompleted`）と合致しているか見直します。

### 2. Locator Drift (ロケーターの乖離)
- **症状**: `Error: expect(locator).toBeVisible() failed - element(s) not found`。
- **原因**: 要素のテキスト変更、CSSクラス変更、またはDOM構造の変更。
- **対応**: 変更に対して堅牢な `data-testid` をコンポーネントに追加し、Playwrightテスト内の `getByText` や `locator('.class')` を `getByTestId` に書き換えます。

### 3. UI Change (意図的なUIの変更)
- **症状**: アサーションの失敗、または Visual Regression (画像差分) の検知。
- **原因**: 仕様変更によりUIが正しく更新されたが、テスト側の期待値が追いついていない。
- **対応**: E2Eテストのステップやアサーションを更新します。画像差分の場合は、スナップショット更新プロセス（`visual-baseline-update-checklist.md` 参照）に従いベースラインを更新します。

### 4. Flaky Async (非同期の不安定さ)
- **症状**: 実行タイミングやマシン負荷によって、ランダムにパスしたり失敗したりする（Flaky）。
- **原因**: ローディングインジケーターの終了を待たずに操作している、アニメーションやネットワーク応答を適切に待機していない。
- **対応**: `toBeVisible({ timeout: ... })` を使う、`page.waitForLoadState('networkidle')` を活用する、またはAPIレスポンスのインターセプト（`page.waitForResponse`）を待つようにします。

### 5. Visual Baseline Drift (レンダリング差分)
- **症状**: テキストや要素は存在するが、ブラウザのバージョンアップ、フォントの差異、OS（CIとローカル）の違いで画像比較が失敗する。
- **原因**: 許容閾値（`maxDiffPixelRatio`）の設定不足、または動的なUI要素（日付、チャート）のマスキング漏れ。
- **対応**: `visualThresholds.ts` のしきい値を調整するか、`test({ mask: [...] })` に動的要素のロケーターを追加して除外します。

## トリアージ手順
1. **CIアーティファクトの確認**: 失敗したジョブから `playwright-report` をダウンロード。
2. **Traceビューアの利用**: `npx playwright show-trace trace.zip` で失敗したステップの直前のDOM状態とネットワークリクエストを確認。
3. **エラーコンテキストの確認**: 出力された `error-context.md` のYAML形式のDOMツリーを読み、期待する要素が本当に存在しないのか、別の場所にあるのかを調査。
