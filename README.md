# 教育実習日誌 評価プラットフォーム (teaching-practice-eval)

## 概要

教育実習日誌を取り込み、AI 評価 / 人間評価 / SCAT 質的コーディングを統合する研究支援プラットフォーム。論文出力 (APA 形式の記述統計表・相関行列・t 検定・Methods セクション自動生成) までを単一の Web アプリで完結させる。

## URLs

- **本番 (main ブランチ)**: https://teaching-practice-eval.pages.dev
- **作業ブランチ**: https://fix-evaluation-rendering.teaching-practice-eval.pages.dev
- **GitHub**: https://github.com/taka400h110-stack/teaching-practice-eval

## 技術スタック

- バックエンド: Hono (TypeScript) on Cloudflare Pages
- DB: Cloudflare D1 (SQLite)
- フロント: React + Material-UI
- OCR: Markdown 変換ツールチェーン + Google Cloud Vision API
- AI 評価: OpenAI GPT 系 LLM

## エクスポート機能 (主要エンドポイント)

`/api/data/journal-imports/` 配下:

### 量的/質的データ
- `GET /export.csv` — サマリー CSV (19 列 / 一覧確認)
- `GET /export.detail.csv` — 質的分析向け詳細 (時限ブロック展開 + 原文)
- `GET /export.json` — NVivo / pandas 向けネスト JSON
- `GET /export.analysis.csv` — 量的分析統合 (日誌 + AI + 人間 + SCAT) 50 列

### Phase 6-3: 論文出力支援 (APA 形式)
- `GET /export.descriptive_stats.md` — APA 記述統計表 (M, SD, Mdn, Min/Max, 歪度, 尖度)
- `GET /export.correlation.csv` — Pearson 相関行列 (14 変数ペアワイズ, r/p/95% CI)
- `GET /export.t_test.md` — Welch 独立 t 検定 (週前半 vs 後半) + AI vs 人間 対応 t 検定 (`split_week` パラメータ可)
- `GET /export.methods_section.md` — 論文 Methods 7 サブセクション自動生成

### データ辞書
- `GET /export.codebook.json` — 機械可読 codebook
- `GET /export.codebook.md` — 論文 Appendix 用 codebook

### 共通フィルタ
- `student_id` / `from` (YYYY-MM-DD) / `to` (YYYY-MM-DD)
- summary/detail/json は追加で `status`, `q` (ファイル名 LIKE)

## データアーキテクチャ

- `journal_imports` — 取り込みファイルとステータス (uploaded_by が研究者スコープの基準)
- `journal_entries` — コミット後の日誌本体 (`student_id`, `entry_date`, `week_number`)
- `evaluations` (eval_type='ai') — AI 評価 (total + factor1..4)
- `human_evaluations` — 人間評価 (複数評価者を AVG で集約)
- `scat_segments` / `scat_codes` — SCAT 質的コーディング (step3 概念 / step4 テーマ)
- 全エクスポートは `audit_logs` に `resource_type='journal_import_export'` として記録

## 統計手法 (実装)

- 不偏標準偏差 (n−1), Fisher-Pearson 歪度 (g₁), 超過尖度 (g₂; SciPy bias=False 相当)
- Pearson 相関 + t 統計量による有意性検定 + Fisher z 変換 95% CI
- Welch 独立 t 検定 (Welch-Satterthwaite 自由度) + Cohen's d
- 対応のある t 検定 + Cohen's dz
- Student t 分布 CDF: 不完全ベータ関数 (Numerical Recipes 6.4 / Lanczos log Γ / Lentz 連分数)
- 実装: `src/api/utils/stats.ts` (純 TypeScript / Cloudflare Workers 互換)

## 開発

```bash
npm install
npm run build
pm2 start ecosystem.config.cjs  # localhost:3000
npx wrangler pages deploy dist --project-name teaching-practice-eval
```

## 開発履歴 (主要マイルストーン)

- Phase 6-1: codebook エンドポイント + 監査ログ拡張
- Phase 6-2: JournalImportPage を 1795→930 行に分割リファクタリング
- Phase 6-3: 論文出力支援 (APA 統計エクスポート 4 種)

## ライセンス / 引用

研究で使用する際は、エクスポート時の codebook と監査ログを保存し、論文 Methods に `exported_at` と `filters` を記載することを推奨。SCAT は大谷 (2008) を引用。
