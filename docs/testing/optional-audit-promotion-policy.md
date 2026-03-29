# Optional Audit Promotion Policy

## 目的
UI監査テスト（モバイル監査、異常系（Malformed）データテスト、Provider Health低下状態監査など）の安定性が確認された後、これらをMandatory（必須）レイヤーへ昇格させるための基準と手順を定義します。

## 昇格基準（Promotion Criteria）
以下のすべての条件を満たす場合、対象のテストスイートはOptionalからMandatoryへ昇格可能です。

1. **実行安定性（Stability）**
   - 直近20回のCI実行において、**成功率が95%以上**であること。
   - False Positive（テストコード自体の問題による誤検知）が**2回未満**であること。
2. **Flaky（不安定）テストの解決**
   - 不安定な挙動が確認された場合、その根本原因が特定され修正されていること。
   - 例: `waitFor` の適切な使用、タイムアウトの見直し、ネットワークモックの安定化など。
3. **実行時間（Duration）**
   - テストの実行時間が許容範囲内（目安として1〜2分以内）であること。長すぎる場合は分割を検討する。
4. **保守性（Maintainability）**
   - DOMのテキスト依存ではなく、`data-testid` を用いた堅牢なロケーターが使用されていること。
   - 状態（State）やデータが適切にシード・モックされていること。

## 昇格プロセス
1. **モニタリング期間**
   - 新規追加されたテストは、まず `test:e2e:optional:*` として実装し、CI上では `continue-on-error: true` で実行します。
2. **定期レビュー**
   - 開発チームは定期的にCIの実行履歴（Test Reports）を確認し、昇格基準を満たしているかを評価します。
3. **昇格の実施**
   - `package.json` のスクリプトを更新し、対象テストを必須（Mandatory）の監査グループ（例: `test:ui:audit`）に組み込みます。
   - `.github/workflows/ci-ui-audit.yml` を編集し、ジョブの `continue-on-error: true` を外すか、必須ジョブとして定義し直します。
   - 本ドキュメントの「昇格履歴」セクションに記録を残します。
