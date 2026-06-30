/**
 * ISM (Interpretive Structural Modeling) ユーティリティ
 *
 * 仕様: docs/analysis/ism_spec.md
 *
 * 純粋関数群。Cloudflare Workers / Node.js / ブラウザどこでも動く。
 */

export type Matrix = number[][];

/**
 * 隣接行列 A を {0,1} 化したものに恒等行列を加える: M = A ∪ I
 */
export function withIdentity(A: Matrix): Matrix {
  const n = A.length;
  const M: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : (A[i][j] ? 1 : 0))),
  );
  return M;
}

/**
 * Warshall アルゴリズムで推移閉包 (可到達行列 R) を計算
 * 入力 A は対角を含まない隣接行列 (含んでいても OK)
 * 出力は対角が必ず 1 となる可到達行列
 *
 * 時間計算量: O(n^3)
 */
export function reachability(A: Matrix): Matrix {
  const n = A.length;
  const R: Matrix = withIdentity(A);
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      if (!R[i][k]) continue;
      for (let j = 0; j < n; j++) {
        if (R[k][j]) R[i][j] = 1;
      }
    }
  }
  return R;
}

/**
 * Warfield レベル分割
 * R(i) = 可到達集合, A(i) = 先行集合 とし、
 * R(i) ∩ A(i) == R(i) となる i を Level として抽出 → 除外 → 反復
 *
 * 入力: 可到達行列 R (n x n, 対角 = 1)
 * 入力: ids 要素 ID 配列 (長さ n)
 * 出力: 各レベルの ID 配列 (Level 1 が最上位 = グラフの top)
 */
export function levelPartition(R: Matrix, ids: string[]): string[][] {
  const n = R.length;
  const remaining = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const levels: string[][] = [];

  // 無限ループ防止 (本来 n 回以内で収束する)
  for (let iter = 0; iter < n + 1; iter++) {
    if (remaining.size === 0) break;
    const currentLevel: number[] = [];

    for (const i of remaining) {
      // R(i) = remaining 内で R[i][j] = 1 となる j の集合
      // A(i) = remaining 内で R[j][i] = 1 となる j の集合
      const Ri = new Set<number>();
      const Ai = new Set<number>();
      for (const j of remaining) {
        if (R[i][j]) Ri.add(j);
        if (R[j][i]) Ai.add(j);
      }
      // R(i) ∩ A(i) == R(i) ?
      let isTop = true;
      for (const j of Ri) {
        if (!Ai.has(j)) {
          isTop = false;
          break;
        }
      }
      if (isTop) currentLevel.push(i);
    }

    if (currentLevel.length === 0) {
      // デッドロック (循環) — 残りを 1 レベルにまとめて終了
      levels.push(Array.from(remaining).map((i) => ids[i]));
      break;
    }

    levels.push(currentLevel.map((i) => ids[i]));
    currentLevel.forEach((i) => remaining.delete(i));
  }

  return levels;
}

/**
 * 伝達係数 (Transmission Index)
 * T = (Σ R[i][j] - n) / (n*(n-1))
 *
 * R は対角 = 1 の可到達行列
 */
export function transmissionIndex(R: Matrix): number {
  const n = R.length;
  if (n < 2) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (R[i][j]) sum++;
    }
  }
  const numerator = sum - n; // 対角の n を除外
  const denom = n * (n - 1);
  return Math.max(0, Math.min(1, numerator / denom));
}

/**
 * SCAT ネットワーク {nodes, edges} から ISM 入力 (要素 ID 配列 + 隣接行列) を生成
 *
 * 入力例:
 *   nodes: [{ id: "テーマA", name: "テーマA", val: 3 }, ...]
 *   edges: [{ source: "テーマA", target: "テーマB", weight: 2 }, ...]
 *
 * ## 方向付け (ism_spec.md §3.1 準拠)
 * 仕様 §3.1 は A[i][j]=1 を「e_i から e_j へ方向性のある共起」と定義する。
 * SCAT の共起そのものは対称だが, ISM 本来の目的 (省察が「どの概念から始まり,
 * どこに到達したか」の階層化, §1) を満たすには方向付けが必須である。
 * これがないと連結成分が 1 レベルに潰れ階層が出現しない。
 *
 * 本実装は **出現頻度に基づく方向付け規則** を採用する:
 *   - より高頻度 (= より基盤的・一般的) なテーマを下位 (起点),
 *     より低頻度 (= より特殊・派生的) なテーマを上位 (到達点) とみなし,
 *     エッジを「高頻度テーマ → 低頻度テーマ」に向ける。
 *   - 頻度が同点の場合は id の辞書順で決定論的に向きを決める。
 * これにより到達可能行列が上三角的になり, Warfield レベル分割で階層が出現する。
 *
 * 頻度情報が無い (val 未指定) 場合は, 後方互換のため無向 (双方向) にフォールバックする。
 * directed=false を明示すると常に無向化する。
 */
export interface NetworkInput {
  nodes: Array<{ id: string; name?: string; val?: number }>;
  edges: Array<{ source: string; target: string; weight?: number }>;
}

export interface IsmInput {
  ids: string[];
  labels: string[];
  adjacency: Matrix;
  /** 方向付けが行われたか (false=無向フォールバック) */
  directed: boolean;
}

export function buildIsmInputFromNetwork(net: NetworkInput, directed = true): IsmInput {
  const ids = net.nodes.map((n) => n.id);
  const labels = net.nodes.map((n) => n.name || n.id);
  const indexOf = new Map<string, number>();
  ids.forEach((id, i) => indexOf.set(id, i));

  // ノード頻度 (val)。1 つでも val が定義されていれば方向付けに使う。
  const freq = new Map<string, number>();
  let hasFreq = false;
  for (const node of net.nodes) {
    if (typeof node.val === "number") hasFreq = true;
    freq.set(node.id, typeof node.val === "number" ? node.val : 0);
  }

  const useDirected = directed && hasFreq;

  const n = ids.length;
  const A: Matrix = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));

  for (const e of net.edges) {
    const i = indexOf.get(e.source);
    const j = indexOf.get(e.target);
    if (i === undefined || j === undefined) continue;
    if (i === j) continue;

    if (!useDirected) {
      // 無向 → 双方向 (後方互換フォールバック)
      A[i][j] = 1;
      A[j][i] = 1;
      continue;
    }

    // 方向付け: 高頻度テーマ (起点) → 低頻度テーマ (到達点)
    const fi = freq.get(e.source) ?? 0;
    const fj = freq.get(e.target) ?? 0;
    let from = i;
    let to = j;
    if (fi < fj) {
      from = j;
      to = i;
    } else if (fi === fj) {
      // 同点は id 辞書順で決定論化 (小さい id を起点)
      if (e.source > e.target) {
        from = j;
        to = i;
      }
    }
    A[from][to] = 1;
  }

  return { ids, labels, adjacency: A, directed: useDirected };
}

/**
 * ISM 全工程をワンステップで実行するヘルパ
 */
export interface IsmResult {
  ids: string[];
  labels: string[];
  adjacency: Matrix;
  reachability: Matrix;
  levels: string[][];
  transmissionScore: number;
  nodeCount: number;
  edgeCount: number;
  /** 隣接行列が方向付けされているか */
  directed: boolean;
}

export function computeIsm(input: IsmInput): IsmResult {
  const { ids, labels, adjacency } = input;
  const directed = input.directed ?? false;
  const R = reachability(adjacency);
  const levels = levelPartition(R, ids);
  const T = transmissionIndex(R);

  let rawEdges = 0;
  for (let i = 0; i < adjacency.length; i++) {
    for (let j = 0; j < adjacency.length; j++) {
      if (i !== j && adjacency[i][j]) rawEdges++;
    }
  }
  // 有向: そのまま, 無向: 双方向で 2 倍カウントされるため半分にする
  const edgeCount = directed ? rawEdges : Math.floor(rawEdges / 2);

  return {
    ids,
    labels,
    adjacency,
    reachability: R,
    levels,
    transmissionScore: T,
    nodeCount: ids.length,
    edgeCount,
    directed,
  };
}
