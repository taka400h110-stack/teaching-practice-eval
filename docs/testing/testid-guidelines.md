# Test ID Guidelines

このプロジェクトでは、E2E UI監査およびインテグレーションテストにおけるロケーター（要素指定）の安定性を保つため、`data-testid` 属性を積極的に使用します。

## なぜ `data-testid` を使うのか？
- **壊れにくい**: テキストの変更、CSSクラス名の変更、DOM構造の変更によるテストのフレイキーさ（不安定さ）を防ぎます。
- **意図が明確**: どの要素がテスト対象であるかがコード上で明示されます。

## 命名規則
`{page}-{element}-{purpose}` の形式で命名します。

### ルート要素
各ページ・コンポーネントの最上位の `Box` やラッパー要素には、必ずルート用の `data-testid` を付与します。
- `student-dashboard-root`
- `teacher-dashboard-root`
- `admin-dashboard-root`
- `statistics-page-root`
- `journal-list-root`

### アクション要素
クリック、入力などの操作対象となる要素には、その目的を記載します。
- `journal-editor-submit`
- `statistics-export-csv`
- `cohort-filter-select`

### 状態表示・フォールバック要素
特定のエラーやエッジケースでのみ表示されるUI要素に付与します。
- `fallback-no-data-alert`
- `error-boundary-root`

## 使用例
```tsx
// React component
<Box data-testid="student-dashboard-root">
  <Button data-testid="journal-editor-submit" onClick={save}>保存</Button>
  {error && <Alert data-testid="fallback-no-data-alert">エラー</Alert>}
</Box>

// Playwright test
await expect(page.getByTestId('student-dashboard-root')).toBeVisible();
await page.getByTestId('journal-editor-submit').click();
```

## 注意事項
- `data-testid` はユニークである必要はありませんが、意図しない複数マッチを防ぐため、リスト内のアイテム等の場合は `{page}-{element}-{id}` のように一意なキーを含めるか、親の `data-testid` で絞り込んでから要素を取得してください。
