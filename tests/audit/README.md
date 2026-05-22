# Role Audit Tests

役割ごとの全ページ監査スクリプト。元は `/tmp/*.js` にあったものを永続化したもの。

## ファイル一覧

| ファイル | 対象ロール | 種別 | 概要 |
| --- | --- | --- | --- |
| `student.spec.js` | student | API/Playwright | 実習生の主要ページとAPI確認 |
| `researcher.spec.js` | researcher | Playwright | researcher の主要ページ表示確認 |
| `researcher_journals.spec.js` | researcher | Playwright | /journals 修正後の動作確認 |
| `collaborator_board_observer.spec.js` | collaborator, board_observer | Playwright | 共同研究者・委員会オブザーバの読み取り中心UI確認 |
| `collaborator_board_observer_api.spec.js` | collaborator, board_observer | API | 同上、API のみ |
| `admin.spec.js` | admin | Playwright | 管理者の各画面動作確認 |
| `admin_scat.spec.js` | admin | Playwright | 管理者から見た SCAT 画面 |

## 実行

```bash
node tests/audit/<file>.spec.js
# 環境変数 BASE_URL で本番/ローカルを切り替え
BASE_URL=http://localhost:3000 node tests/audit/student.spec.js
```

## 注意事項

- これらは元の `/tmp/` 環境で書かれたものをそのまま移行したため、ファイル名は `.spec.js` ながら Playwright のテストランナー (`npx playwright test`) ではなく `node` で直接実行する形式
- 将来的に `@playwright/test` 規約に書き直す予定 (Issue: tests-modernization)
