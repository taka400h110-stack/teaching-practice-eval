/**
 * SCAT 派生分析サービス
 *
 * SCAT のネットワーク構造 (テーマ共起グラフ) を上流とし、
 * ISM / SP表 / 伝達係数 を生成・キャッシュ・無効化する。
 *
 * 仕様: docs/analysis/scat_to_ism_pipeline.md
 */
import type { D1Database } from "@cloudflare/workers-types";
import {
  buildIsmInputFromNetwork,
  computeIsm,
  type NetworkInput,
  type IsmResult,
} from "../../utils/ism";
import { buildSpMatrix, computeSPStats } from "../../utils/sp_table";
import { networkHash } from "../../utils/network_hash";

const GLOBAL_SCOPE = "global";

// ────────────────────────────────────────────────
// SCAT ネットワーク取得 (data.ts の /scat/network と同一ロジック)
// ────────────────────────────────────────────────
export async function fetchScatNetwork(db: D1Database): Promise<NetworkInput> {
  // SCAT の 2 系統を統合
  let journalSegs: any[] = [];
  let projectSegs: any[] = [];

  try {
    const r1 = await db.prepare(`
      SELECT jsa.journal_id AS group_id, jss.step4_theme_construct AS themes
      FROM journal_scat_segments jss
      JOIN journal_scat_analyses jsa ON jss.analysis_id = jsa.id
      WHERE jsa.analysis_status = 'completed'
        AND jss.step4_theme_construct != ''
        AND jss.step4_theme_construct IS NOT NULL
    `).all();
    journalSegs = (r1.results as any[]) || [];
  } catch {
    // テーブル未作成等は無視
  }
  try {
    const r2 = await db.prepare(`
      SELECT sc.segment_id AS group_id, sc.step4_theme AS themes
      FROM scat_codes sc
      WHERE sc.step4_theme IS NOT NULL AND sc.step4_theme != ''
    `).all();
    projectSegs = (r2.results as any[]) || [];
  } catch {
    // 同上
  }

  const segments = [...journalSegs, ...projectSegs];

  const nodesMap = new Map<string, number>();
  const edgesMap = new Map<string, number>();
  const groupThemes: Record<string, Set<string>> = {};

  for (const seg of segments) {
    const themeStr = String(seg.themes || "");
    const themes = themeStr
      .split(/[,、・\/／]/)
      .map((t: string) => t.trim())
      .filter((t: string) => t);
    const gid = String(seg.group_id);
    if (!groupThemes[gid]) groupThemes[gid] = new Set();
    themes.forEach((t: string) => groupThemes[gid].add(t));
    themes.forEach((t: string) => nodesMap.set(t, (nodesMap.get(t) || 0) + 1));
  }

  Object.values(groupThemes).forEach((themeSet) => {
    const themes = Array.from(themeSet);
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        const t1 = themes[i];
        const t2 = themes[j];
        const edgeKey = t1 < t2 ? `${t1}||${t2}` : `${t2}||${t1}`;
        edgesMap.set(edgeKey, (edgesMap.get(edgeKey) || 0) + 1);
      }
    }
  });

  const nodes = Array.from(nodesMap.entries()).map(([id, val]) => ({ id, name: id, val }));
  const edges = Array.from(edgesMap.entries()).map(([key, weight]) => {
    const [source, target] = key.split("||");
    return { source, target, weight };
  });

  return { nodes, edges };
}

// ────────────────────────────────────────────────
// analysis_state 操作
// ────────────────────────────────────────────────
export async function getAnalysisState(db: D1Database, scope = GLOBAL_SCOPE) {
  const row: any = await db
    .prepare("SELECT * FROM analysis_state WHERE scope = ?")
    .bind(scope)
    .first();
  if (!row) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO analysis_state (scope, ism_dirty, sp_dirty, transmission_dirty)
         VALUES (?, 1, 1, 1)`,
      )
      .bind(scope)
      .run();
    return {
      scope,
      scat_network_hash: null,
      ism_dirty: 1,
      sp_dirty: 1,
      transmission_dirty: 1,
      ism_computed_at: null,
      sp_computed_at: null,
      transmission_computed_at: null,
    };
  }
  return row;
}

/**
 * SCAT が更新されたときに呼ぶ。ハッシュ差分を見て dirty フラグを立てる。
 * @returns 実際に dirty 化したかどうか
 */
export async function markScatDependentsDirty(
  db: D1Database,
  scope = GLOBAL_SCOPE,
): Promise<boolean> {
  const net = await fetchScatNetwork(db);
  const newHash = networkHash(net);

  const state = await getAnalysisState(db, scope);
  if (state.scat_network_hash === newHash) {
    return false;
  }

  await db
    .prepare(
      `INSERT INTO analysis_state (scope, scat_network_hash, ism_dirty, sp_dirty, transmission_dirty, updated_at)
       VALUES (?, ?, 1, 1, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(scope) DO UPDATE SET
         scat_network_hash = excluded.scat_network_hash,
         ism_dirty = 1,
         sp_dirty = 1,
         transmission_dirty = 1,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(scope, newHash)
    .run();

  // 古いキャッシュも掃除しておく (stats_cache テーブルがあれば)
  try {
    await db
      .prepare(
        `DELETE FROM stats_cache
         WHERE cache_key LIKE 'stats:scat:%'
            OR cache_key LIKE 'stats:ism:%'
            OR cache_key LIKE 'stats:sp:%'
            OR cache_key LIKE 'stats:transmission:%'`,
      )
      .run();
  } catch {
    // stats_cache テーブルが無い環境では無視
  }

  return true;
}

// ────────────────────────────────────────────────
// ISM 計算 + 永続化
// ────────────────────────────────────────────────
export async function recomputeIsmIfDirty(
  db: D1Database,
  scope = GLOBAL_SCOPE,
  computedBy?: string,
): Promise<IsmResult & { sourceHash: string }> {
  const state = await getAnalysisState(db, scope);
  const net = await fetchScatNetwork(db);
  const hash = networkHash(net);

  // dirty でない & hash 一致 & キャッシュあり → 既存キャッシュを返す
  if (!state.ism_dirty && state.scat_network_hash === hash) {
    const row: any = await db
      .prepare(
        `SELECT * FROM ism_analyses WHERE scope = ? AND source_hash = ?
         ORDER BY computed_at DESC LIMIT 1`,
      )
      .bind(scope, hash)
      .first();
    if (row) {
      const cachedAdj: number[][] = JSON.parse(row.adjacency_json);
      // 隣接行列が非対称なら方向付け済み (新スキーム), 対称なら無向 (旧キャッシュ)
      const isDirected = cachedAdj.some((rowArr, i) =>
        rowArr.some((v, j) => i !== j && v !== (cachedAdj[j]?.[i] ?? 0)),
      );
      return {
        ids: JSON.parse(row.elements_json).map((e: any) => e.id),
        labels: JSON.parse(row.elements_json).map((e: any) => e.label || e.id),
        adjacency: cachedAdj,
        reachability: JSON.parse(row.reachability_json),
        levels: JSON.parse(row.levels_json),
        transmissionScore: row.transmission_score ?? 0,
        nodeCount: row.node_count ?? 0,
        edgeCount: row.edge_count ?? 0,
        directed: isDirected,
        sourceHash: row.source_hash,
      };
    }
  }

  // 再計算
  const input = buildIsmInputFromNetwork(net);
  const result = computeIsm(input);

  const id = "ism_" + Date.now();
  const elements = input.ids.map((id, i) => ({ id, label: input.labels[i] }));
  await db
    .prepare(
      `INSERT INTO ism_analyses
       (id, scope, source_hash, elements_json, adjacency_json, reachability_json, levels_json,
        transmission_score, node_count, edge_count, computed_at, computed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    )
    .bind(
      id,
      scope,
      hash,
      JSON.stringify(elements),
      JSON.stringify(result.adjacency),
      JSON.stringify(result.reachability),
      JSON.stringify(result.levels),
      result.transmissionScore,
      result.nodeCount,
      result.edgeCount,
      computedBy ?? null,
    )
    .run();

  await db
    .prepare(
      `INSERT INTO analysis_state (scope, scat_network_hash, ism_dirty, transmission_dirty, ism_computed_at, transmission_computed_at, updated_at)
       VALUES (?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(scope) DO UPDATE SET
         scat_network_hash = excluded.scat_network_hash,
         ism_dirty = 0,
         transmission_dirty = 0,
         ism_computed_at = CURRENT_TIMESTAMP,
         transmission_computed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(scope, hash)
    .run();

  return { ...result, sourceHash: hash };
}

// ────────────────────────────────────────────────
// SP表 計算 + 永続化
// ────────────────────────────────────────────────
export interface SpTableResult {
  students: Array<{ id: string; name: string }>;
  problems: Array<{ id: string; label: string }>;
  matrix: number[][];
  studentScores: number[];
  problemScores: number[];
  studentCaution: number[];
  problemCaution: number[];
  sourceHash: string;
}

export async function recomputeSpTableIfDirty(
  db: D1Database,
  scope = GLOBAL_SCOPE,
  computedBy?: string,
): Promise<SpTableResult> {
  // 先に ISM を最新化する (SP の列 = ISM ノード)
  const ism = await recomputeIsmIfDirty(db, scope, computedBy);

  const state = await getAnalysisState(db, scope);
  if (!state.sp_dirty && state.scat_network_hash === ism.sourceHash) {
    const row: any = await db
      .prepare(
        `SELECT * FROM sp_tables WHERE scope = ? AND source_hash = ?
         ORDER BY computed_at DESC LIMIT 1`,
      )
      .bind(scope, ism.sourceHash)
      .first();
    if (row) {
      // studentScores / problemScores は matrix の決定論的関数 (computeSPStats) であり
      // テーブルには永続化していないため, キャッシュヒット時も matrix から再計算して
      // フレッシュ計算パスと完全に一致させる (旧実装は行平均/空配列を返す不整合バグ)。
      const cachedMatrix: number[][] = JSON.parse(row.matrix_json);
      const cachedStats = computeSPStats(cachedMatrix);
      return {
        students: JSON.parse(row.students_json),
        problems: JSON.parse(row.problems_json),
        matrix: cachedMatrix,
        studentScores: cachedStats.studentScores,
        problemScores: cachedStats.problemScores,
        studentCaution: JSON.parse(row.student_caution_json || "[]"),
        problemCaution: JSON.parse(row.problem_caution_json || "[]"),
        sourceHash: row.source_hash,
      };
    }
  }

  // 学生一覧取得
  const studentsRes = await db
    .prepare(`SELECT id, name FROM users WHERE role = 'student' ORDER BY id`)
    .all();
  const students = ((studentsRes.results as any[]) || []).map((u) => ({
    id: String(u.id),
    name: String(u.name || u.id),
  }));

  // 各学生の日誌本文をまとめて取得
  const journalsByStudent: Record<string, string> = {};
  if (students.length > 0) {
    const journalsRes = await db
      .prepare(`SELECT student_id, content FROM journal_entries WHERE content IS NOT NULL`)
      .all();
    for (const row of (journalsRes.results as any[]) || []) {
      const sid = String(row.student_id);
      if (!journalsByStudent[sid]) journalsByStudent[sid] = "";
      journalsByStudent[sid] += "\n" + String(row.content || "");
    }
  }

  // 問題 = ISM ノード
  const problems = ism.ids.map((id, i) => ({ id, label: ism.labels[i] }));

  // 行列構築
  const matrix = buildSpMatrix(students, problems, journalsByStudent);
  const stats = computeSPStats(matrix);

  // 永続化
  const id = "sp_" + Date.now();
  await db
    .prepare(
      `INSERT INTO sp_tables
       (id, scope, source_hash, students_json, problems_json, matrix_json,
        student_caution_json, problem_caution_json, student_count, problem_count, computed_at, computed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    )
    .bind(
      id,
      scope,
      ism.sourceHash,
      JSON.stringify(students),
      JSON.stringify(problems),
      JSON.stringify(matrix),
      JSON.stringify(stats.studentCaution),
      JSON.stringify(stats.problemCaution),
      students.length,
      problems.length,
      computedBy ?? null,
    )
    .run();

  await db
    .prepare(
      `INSERT INTO analysis_state (scope, sp_dirty, sp_computed_at, updated_at)
       VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(scope) DO UPDATE SET
         sp_dirty = 0,
         sp_computed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(scope)
    .run();

  return {
    students,
    problems,
    matrix,
    studentScores: stats.studentScores,
    problemScores: stats.problemScores,
    studentCaution: stats.studentCaution,
    problemCaution: stats.problemCaution,
    sourceHash: ism.sourceHash,
  };
}

// ────────────────────────────────────────────────
// 伝達係数のみ取得 (ISM 計算の副産物)
// ────────────────────────────────────────────────
export async function getTransmissionScore(
  db: D1Database,
  scope = GLOBAL_SCOPE,
  computedBy?: string,
) {
  const ism = await recomputeIsmIfDirty(db, scope, computedBy);
  return {
    score: ism.transmissionScore,
    nodeCount: ism.nodeCount,
    edgeCount: ism.edgeCount,
    levels: ism.levels,
    sourceHash: ism.sourceHash,
  };
}
