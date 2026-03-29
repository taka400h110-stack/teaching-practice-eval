# Branch Protection 最終設定チェックリスト

## 1. まず決めるべき方針
**保護対象ブランチ**
- [ ] `main` を保護対象にする
- [ ] 必要なら `release/*` も別 ruleset で保護する
- [ ] `develop` を使っている場合は main と同じ基準にするか、少し緩めるかを決める

**運用方針**
- [ ] PR で merge を止めるのは Mandatory checks のみ
- [ ] Optional checks は PR では required にしない
- [ ] Optional checks は main push / nightly で品質監視
- [ ] 将来 Mandatory に昇格する optional job は、昇格ポリシーに従って required 化する

## 2. Required checks に入れるべき項目
以下は Required status checks に含める想定です。

**必須にする推奨 job**
- [ ] `build`
- [ ] `role-ui-smoke`
- [ ] `export-filter-audit`
- [ ] `statistics-validity-required`

**必須にしてよい条件**
- [ ] 直近の実行で安定している
- [ ] false positive が低い
- [ ] 実行時間が PR の妨げにならない
- [ ] 失敗時に開発者が原因を追える

> **注意**: required にする job 名は GitHub 上の実際の check name と完全一致している必要があります。また、その check は過去 7 日以内に実行実績があることが推奨されます。

## 3. Required checks に入れてはいけない項目
以下は PR で non-blocking にするため、required に入れません。

**Optional のままにする job**
- `audit-optional-pr`
- `audit-optional-main`
- `audit-optional-stats-malformed`
- `audit-optional-mobile`
- `audit-optional-provider-health`
- nightly 用 workflow の job 一式
- heavy visual regression full
- Lighthouse CI（report-only 運用なら required にしない）
- dark mode visual baseline（optional 運用なら required にしない）

## 4. Rulesets / Branch Protection の推奨設定
GitHub の新しい Rulesets の利用を推奨します。

**Ruleset の推奨設定 (Target: main)**
- [ ] Restrict deletions
- [ ] Restrict force pushes
- [ ] Require a pull request before merging
- [ ] Require approvals: 1 以上
- [ ] Dismiss stale approvals（必要なら有効）
- [ ] Require conversation resolution before merging
- [ ] Require status checks to pass before merging
- [ ] Require branches to be up to date before merging（必要なら有効）
- [ ] Require signed commits（組織ポリシー次第）
- [ ] Block direct pushes to main（推奨）

**追加で検討**
- [ ] CODEOWNERS review required
- [ ] 管理者もルール適用対象にするか決める
- [ ] bypass 権限を誰に与えるか決める

## 5. Recommended Ruleset 構成例
**Ruleset A: main 保護**
- Pull request required
- 1 review required
- Required status checks: `build`, `role-ui-smoke`, `export-filter-audit`, `statistics-validity-required`

## 6. PR / main / nightly の扱い確認チェック
**PR 時**
- [ ] Mandatory jobs が実行される
- [ ] Optional PR jobs も実行される
- [ ] Optional PR jobs が失敗しても merge は止まらない
- [ ] PR 画面上で optional の失敗が見える
- [ ] required checks は Mandatory のみ

**main push 時**
- [ ] audit-optional-main が実行される
- [ ] audit-optional-main は fail したら赤になる
- [ ] main 上の regressions を検知できる
- [ ] 失敗時に artifact が残る

**nightly 時**
- [ ] optional/nightly workflow がスケジュール実行される
- [ ] artifacts / reports / traces が保存される
- [ ] flaky 傾向の観測に使える

## 7. GitHub UI 上での最終確認項目
- [ ] 対象ブランチが main であること
- [ ] 重複する古い branch protection rule が残っていないこと
- [ ] 新 ruleset と旧 protection rule が競合していないこと
- [ ] bypass 可能ユーザー/チームが意図どおりであること
- [ ] Optional checks が required に入っていないこと

## 8. CODEOWNERS 連携チェック
- [ ] `.github/CODEOWNERS` が有効
- [ ] snapshot / visual / testing policy ファイルに reviewer が割り当てられている
- [ ] Branch protection 側で CODEOWNERS review を要求する設定が ON (必要な場合)

## 9. 失敗しやすいポイント (要確認)
- [ ] `audit-optional-pr` を required checks に入れてしまっていないか
- [ ] job 名変更後に branch protection の required checks を更新し忘れていないか
- [ ] `continue-on-error: true` の job を required にしていないか
- [ ] 実行実績がなく required check に出てこない状態になっていないか

## 10. Optional → Mandatory 昇格時の追加チェック
- [ ] 直近 20 実行で成功率 95%以上
- [ ] false positive が 2 回未満
- [ ] 実行時間が PR 体験を大きく悪化させない
- [ ] 失敗時の triage が容易
- [ ] docs の昇格ポリシーに沿っている
- [ ] branch protection の required checks へ追加する job 名が確定している
- [ ] PR template / docs も更新した

## 11. 最終確認フロー
実際に本番運用へ入る前に、次の順で確認すると安全です。
- [ ] **Step 1**: ダミー PR を作り、Mandatory を通す。Optional PR job を 1 つ意図的に落として merge 可能か確認する。
- [ ] **Step 2**: main へ push される経路で `audit-optional-main` が fail すると赤になるか確認する。
- [ ] **Step 3**: nightly workflow を手動実行して artifact が残るか確認する。
- [ ] **Step 4**: Ruleset / branch protection の required check 名が最新の job 名と一致しているか確認する。
