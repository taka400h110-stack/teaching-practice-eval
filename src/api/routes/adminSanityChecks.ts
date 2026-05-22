/**
 * src/api/routes/adminSanityChecks.ts
 * Phase 7-2: 管理者向けデータサニティチェック API
 *
 * エンドポイント (全て /api/admin/sanity-checks 配下):
 *   GET /                    全サニティチェック結果の一括取得
 *   GET /week-number          week_number 異常値の調査
 *
 * 目的:
 *   - Phase 7-2 で発生したような異常データを管理者ダッシュボードから検知
 *   - 将来同種の問題が起きた際に早期発見できる仕組みを残す
 *
 * 権限:
 *   - admin / researcher / collaborator / board_observer のみ
 */
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { Env } from "../../types/env";
import { WEEK_NUMBER_MIN, WEEK_NUMBER_MAX } from "../utils/validation";

const adminSanityChecksRouter = new Hono<{ Bindings: Env; Variables: any }>();

adminSanityChecksRouter.use("*", requireAuth);
adminSanityChecksRouter.use(
  "*",
  requireRoles(["admin", "researcher", "collaborator", "board_observer"] as any),
);

// week_number を持つテーブル一覧。
// 列挙形式は SELECT を構築するときの安全のため文字列直書きを避け、許可リスト化。
const WEEK_TABLES = [
  { name: "journal_entries",           idCol: "id", userCol: "student_id" },
  { name: "self_evaluations",          idCol: "id", userCol: "student_id" },
  { name: "goals",                     idCol: "id", userCol: "student_id" },
  { name: "learning_progress_scores",  idCol: "id", userCol: "student_id" },
  { name: "rq3b_outcomes",             idCol: "id", userCol: "user_id"    },
  { name: "journal_imports",           idCol: "id", userCol: "uploaded_by" },
] as const;

type WeekAnomalySummary = {
  table: string;
  total_abnormal: number;
  by_week: Array<{ week_number: number | null; count: number }>;
  samples: Array<{
    id: string;
    user_id: string;
    week_number: number | null;
  }>;
};

/**
 * 個別テーブルの異常 week_number を集計
 *  - total_abnormal: 異常レコード総数
 *  - by_week:        異常値ごとの内訳
 *  - samples:        先頭 5 件 (詳細調査用)
 */
async function inspectWeekNumber(
  db: D1Database,
  table: (typeof WEEK_TABLES)[number],
): Promise<WeekAnomalySummary | null> {
  const { name, idCol, userCol } = table;
  // journal_imports.week_number は NULL 可だが「未指定」は異常ではないので除外
  const allowNull = name === "journal_imports";
  const nullCheck = allowNull ? "" : `${"week_number"} IS NULL OR `;
  const where = `${nullCheck}week_number < ${WEEK_NUMBER_MIN} OR week_number > ${WEEK_NUMBER_MAX}`;

  try {
    const totalRow: any = await db
      .prepare(`SELECT COUNT(*) AS n FROM ${name} WHERE ${where}`)
      .first();
    const total = Number(totalRow?.n ?? 0);
    if (total === 0) {
      return { table: name, total_abnormal: 0, by_week: [], samples: [] };
    }

    const byWeek = await db
      .prepare(
        `SELECT week_number, COUNT(*) AS n FROM ${name} WHERE ${where} GROUP BY week_number ORDER BY week_number`,
      )
      .all();

    const samples = await db
      .prepare(
        `SELECT ${idCol} AS id, ${userCol} AS user_id, week_number FROM ${name} WHERE ${where} ORDER BY ${idCol} LIMIT 5`,
      )
      .all();

    return {
      table: name,
      total_abnormal: total,
      by_week: (byWeek.results ?? []).map((r: any) => ({
        week_number: r.week_number,
        count: Number(r.n),
      })),
      samples: (samples.results ?? []).map((r: any) => ({
        id: String(r.id),
        user_id: String(r.user_id),
        week_number: r.week_number,
      })),
    };
  } catch (err) {
    // テーブルが存在しない環境 (開発初期 DB など) は null を返してスキップ
    console.warn(`[sanity-checks/week-number] skip ${name}:`, String(err));
    return null;
  }
}

// GET /week-number — week_number 異常値レポート
adminSanityChecksRouter.get("/week-number", async (c) => {
  const db = c.env.DB as D1Database;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const results: WeekAnomalySummary[] = [];
  for (const tbl of WEEK_TABLES) {
    const r = await inspectWeekNumber(db, tbl);
    if (r) results.push(r);
  }

  const totalAcrossTables = results.reduce((s, r) => s + r.total_abnormal, 0);

  return c.json({
    ok: true,
    check: "week_number_range",
    valid_range: { min: WEEK_NUMBER_MIN, max: WEEK_NUMBER_MAX },
    total_abnormal: totalAcrossTables,
    tables: results,
    generated_at: new Date().toISOString(),
  });
});

// GET / — 全サニティチェックを一括実行 (将来別チェックも増やしたら追記)
adminSanityChecksRouter.get("/", async (c) => {
  const db = c.env.DB as D1Database;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const weekChecks: WeekAnomalySummary[] = [];
  for (const tbl of WEEK_TABLES) {
    const r = await inspectWeekNumber(db, tbl);
    if (r) weekChecks.push(r);
  }
  const weekTotal = weekChecks.reduce((s, r) => s + r.total_abnormal, 0);

  return c.json({
    ok: true,
    summary: {
      week_number: {
        total_abnormal: weekTotal,
        valid_range: { min: WEEK_NUMBER_MIN, max: WEEK_NUMBER_MAX },
      },
    },
    details: {
      week_number: weekChecks,
    },
    generated_at: new Date().toISOString(),
  });
});

export default adminSanityChecksRouter;
