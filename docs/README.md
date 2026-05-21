# docs/ — 開発・運用ドキュメント

## ディレクトリ構成

| パス | 内容 |
|---|---|
| `evaluation_model.md` | **🌟 評価モデル正式仕様 (4因子23項目 / ICC は4因子レベル)** |
| `analysis/` | ISM・SP表・伝達係数など分析手法の仕様 |
| `audit/` | 役割ごとの監査レポート |
| `issues/` | 未解決の設計問題・既知のバグ等の課題管理 |
| `checklists/` | 運用・リリース時のチェックリスト |
| `runbooks/` | 障害対応・運用手順書 |
| `testing/` | テスト戦略・テストデータ仕様 |

## 重要なドキュメント

### 評価モデル
- **`evaluation_model.md`** — 4因子23項目ルーブリックの正式仕様 (single source of truth)
  - AI: 23項目を個別評価 → 因子平均で 4因子化
  - 人: 4因子を直接評価 (複数人なら平均)
  - ICC: 4因子レベルで AI vs 人を比較

### 分析手法仕様 (RQ3 構造分析系統)
- **`analysis/scat_to_ism_pipeline.md`** — 🌟 SCAT → ISM/SP/T 連動仕様 (重要)
- `analysis/ism_spec.md` — ISM (Interpretive Structural Modeling)
- `analysis/sp_table_spec.md` — S-P 表 (Student-Problem)
- `analysis/transmission_spec.md` — 伝達係数

これらは **SCAT のネットワーク構造を上流とする派生分析** であり、
SCAT が更新されるたびに自動再計算される設計 (ユーザ指示 2026-05-21)。

### 監査レポート
- `audit/role_researcher.md` — researcher 監査
- `audit/role_collaborator_board_observer.md` — collaborator + board_observer 監査

### 解決済 Issue
- `issues/evaluator_4_vs_21_design_conflict.md` — 4-vs-23 設計衝突 (RESOLVED 2026-05-21)
