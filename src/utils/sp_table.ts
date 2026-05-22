/**
 * S-P 表 (Student-Problem Score Table) ユーティリティ
 *
 * 仕様: docs/analysis/sp_table_spec.md
 *
 * 純粋関数群。
 */

export type Matrix = number[][];

export interface SpStats {
  studentScores: number[]; // S_i = (Σ_j cell[i][j]) / m  各学生の通過率
  problemScores: number[]; // P_j = (Σ_i cell[i][j]) / n  各問題の正答率
  studentCaution: number[]; // C*_i  学生ごとの注意係数
  problemCaution: number[]; // C*_j  問題ごとの注意係数
}

/**
 * S-P 表の派生統計を一括算出
 */
export function computeSPStats(matrix: Matrix): SpStats {
  const n = matrix.length;
  const m = n > 0 ? matrix[0].length : 0;
  if (n === 0 || m === 0) {
    return { studentScores: [], problemScores: [], studentCaution: [], problemCaution: [] };
  }

  const studentScores: number[] = new Array(n).fill(0);
  const problemScores: number[] = new Array(m).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (matrix[i][j]) {
        studentScores[i] += 1;
        problemScores[j] += 1;
      }
    }
  }
  for (let i = 0; i < n; i++) studentScores[i] /= m;
  for (let j = 0; j < m; j++) problemScores[j] /= n;

  // 注意係数 (簡易版)
  // 学生 i の C*_i:
  //   - 問題を P_j の降順にソート
  //   - 上位 r = round(S_i * m) 個までを「定着すべき問題」と見なす
  //   - 上位群内の 0 セル + 下位群内の 1 セル のミスマッチを正規化
  const sortedProblemIdx = [...Array(m).keys()].sort((a, b) => problemScores[b] - problemScores[a]);
  const sortedStudentIdx = [...Array(n).keys()].sort((a, b) => studentScores[b] - studentScores[a]);

  const studentCaution: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const r = Math.round(studentScores[i] * m);
    if (r === 0 || r === m) {
      studentCaution[i] = 0;
      continue;
    }
    // 上位 r 個 (定着想定) の中の 0 セルの重みの合計
    let mismatchUpper = 0;
    let totalUpper = 0;
    for (let k = 0; k < r; k++) {
      const j = sortedProblemIdx[k];
      totalUpper += problemScores[j];
      if (!matrix[i][j]) mismatchUpper += problemScores[j];
    }
    // 下位 m-r 個 (定着していない想定) の中の 1 セルの重みの合計
    let mismatchLower = 0;
    let totalLower = 0;
    for (let k = r; k < m; k++) {
      const j = sortedProblemIdx[k];
      totalLower += 1 - problemScores[j];
      if (matrix[i][j]) mismatchLower += 1 - problemScores[j];
    }
    const numerator = mismatchUpper + mismatchLower;
    const denom = totalUpper + totalLower;
    studentCaution[i] = denom > 0 ? Math.min(1, numerator / denom) : 0;
  }

  const problemCaution: number[] = new Array(m).fill(0);
  for (let j = 0; j < m; j++) {
    const r = Math.round(problemScores[j] * n);
    if (r === 0 || r === n) {
      problemCaution[j] = 0;
      continue;
    }
    let mismatchUpper = 0;
    let totalUpper = 0;
    for (let k = 0; k < r; k++) {
      const i = sortedStudentIdx[k];
      totalUpper += studentScores[i];
      if (!matrix[i][j]) mismatchUpper += studentScores[i];
    }
    let mismatchLower = 0;
    let totalLower = 0;
    for (let k = r; k < n; k++) {
      const i = sortedStudentIdx[k];
      totalLower += 1 - studentScores[i];
      if (matrix[i][j]) mismatchLower += 1 - studentScores[i];
    }
    const numerator = mismatchUpper + mismatchLower;
    const denom = totalUpper + totalLower;
    problemCaution[j] = denom > 0 ? Math.min(1, numerator / denom) : 0;
  }

  return { studentScores, problemScores, studentCaution, problemCaution };
}

/**
 * 文字列にテーマが「含まれる」か判定するヘルパ
 *  - 大小文字無視
 *  - 完全部分文字列マッチ
 */
export function textContainsTheme(text: string, theme: string): boolean {
  if (!text || !theme) return false;
  return text.toLowerCase().includes(theme.toLowerCase());
}

/**
 * 学生×問題 0/1 行列を構築
 *
 * @param students 学生情報 [{id, name}]
 * @param problems 問題情報 [{id, label}] (ISM ノード)
 * @param journalsByStudent 学生 ID → その学生の日誌本文配列 (連結された全文)
 */
export function buildSpMatrix(
  students: Array<{ id: string; name?: string }>,
  problems: Array<{ id: string; label?: string }>,
  journalsByStudent: Record<string, string>,
): Matrix {
  const n = students.length;
  const m = problems.length;
  const matrix: Matrix = Array.from({ length: n }, () => Array.from({ length: m }, () => 0));

  for (let i = 0; i < n; i++) {
    const studentText = journalsByStudent[students[i].id] || "";
    for (let j = 0; j < m; j++) {
      const themeLabel = problems[j].label || problems[j].id;
      matrix[i][j] = textContainsTheme(studentText, themeLabel) ? 1 : 0;
    }
  }

  return matrix;
}
