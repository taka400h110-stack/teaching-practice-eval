# CI 配線パッチ: a11y / keyboard 監査ジョブの追加

## 概要

このディレクトリの `ci-a11y-keyboard.patch` は、`.github/workflows/ci-ui-audit.yml`
の **audit-optional 行列（PR 用 / main 用）に `a11y` と `keyboard` の 2 ターゲットを追加**
する差分です。アクセシビリティ監査 (D-3) で整備した以下の npm スクリプトを CI で実行できるようにします。

- `npm run test:e2e:optional:a11y`     → `tests/e2e/accessibility-audit.spec.ts`（axe, WCAG 2.1 AA、9 ページ）
- `npm run test:e2e:optional:keyboard` → `tests/e2e/keyboard-navigation-audit.spec.ts`（キーボード操作、4 テスト）

いずれも `audit-optional`（`continue-on-error: true`）ジョブに入るため、
**品質ゲートをブロックしません**（失敗しても必須チェックは赤になりません）。

## なぜ自動で push できなかったか

このリポジトリで使用している GitHub App トークンには `workflows` 権限が無いため、
`.github/workflows/*.yml` への変更を含む push は GitHub 側で拒否されます
（ブランチ push / main への直接 push のどちらも不可。main にはブランチ保護もあり）。
そのため、**ワークフローファイルの変更だけは手動適用が必要**です。

> 注: npm スクリプト自体（`test:e2e:optional:a11y` / `:keyboard`）は PR #33 で
> すでに main にマージ済みです。ローカルでは今すぐ実行できます。このパッチは
> あくまで「CI で自動実行する配線」だけを足すものです。

## 適用方法（いずれか 1 つ）

### 方法 A: ローカルで `git apply`（推奨・最も確実）

`workflows` 権限を持つ通常アカウント（Personal Access Token に `workflow` スコープ付き、
または手元の認証済み git）で実行してください。

```bash
# リポジトリのルートで:
git checkout main
git pull origin main

# パッチ適用（リポジトリ内に同梱）:
git apply docs/ci/ci-a11y-keyboard.patch

# 適用結果を確認:
git diff .github/workflows/ci-ui-audit.yml

# コミット & push:
git add .github/workflows/ci-ui-audit.yml
git commit -m "ci(ui-audit): wire a11y + keyboard into audit-optional matrix"
git push origin main
```

> もし `git apply` が「does not apply」と出る場合（main が進んでいて文脈がずれた等）は、
> 3-way マージを試してください: `git apply --3way docs/ci/ci-a11y-keyboard.patch`

### 方法 B: GitHub Web UI で直接編集

1. GitHub で `.github/workflows/ci-ui-audit.yml` を開き、鉛筆アイコンで編集モードに。
2. 下記「変更内容」の 4 箇所を手で追記。
3. "Commit changes" で main に直接コミット（Web UI は workflows 権限を満たします）。

## 変更内容（パッチの中身）

`audit-optional-pr` と `audit-optional-main` の **両方**に対して、以下を追加します。

### 1) matrix の `target:` リストに 2 行追加（2 箇所）

```yaml
        target:
          - stats-malformed
          - mobile
          - provider-health
          - a11y        # ← 追加
          - keyboard    # ← 追加
```

### 2) ターゲット分岐の if/elif に 2 分岐追加（2 箇所）

```yaml
          elif [ "${{ matrix.target }}" = "provider-health" ]; then
            npm run test:e2e:optional:provider-health
          elif [ "${{ matrix.target }}" = "a11y" ]; then        # ← 追加
            npm run test:e2e:optional:a11y                      # ← 追加
          elif [ "${{ matrix.target }}" = "keyboard" ]; then    # ← 追加
            npm run test:e2e:optional:keyboard                  # ← 追加
          else
            echo "Unknown matrix target: ${{ matrix.target }}"
            exit 1
```

## 適用後の確認

- YAML 構文は適用前の状態で検証済み（`yaml.safe_load` OK）。
- 追加されるジョブ: `audit-optional-pr (a11y)`, `audit-optional-pr (keyboard)`,
  および main push 時の `audit-optional-main (a11y/keyboard)`。
- `continue-on-error: true` のため、これらが失敗しても PR の必須チェックは緑のままです。
