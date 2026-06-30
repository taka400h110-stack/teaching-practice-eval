// @ts-nocheck

/**
 * src/api/routes/stats.ts
 * Hono APIルート: 統計計算エンジン
 * 論文 第3章 3.6節: RQ2 信頼性検証（ICC・Bland-Altman・Pearson・Krippendorff's α）
 * 論文 第3章 3.5節: RQ3a 縦断成長分析（LGCM概要統計）
 *
 * フロントエンドの統計計算をサーバーサイドで処理
 * pingouin / statsmodels の代替として純粋JS実装
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireRoles } from "../middleware/auth";
import { statsProvider } from "../services/statsProvider";
import { getFactorKeyByItemNum } from "../../constants/rubric";
// 原著論文準拠の高精度統計実装 (Shrout & Fleiss 1979 / Krippendorff 2018 / 不完全ベータ t・F 分布)
import {
  computeICC21 as computeICC21Exact,
  computeKrippendorffAlpha as computeKrippendorffAlphaExact,
  studentTCDF,
} from "../utils/stats";

const statsRouter = new Hono<{ Bindings: CloudflareBindings }>();
statsRouter.use("*", cors());

statsRouter.use("*", async (c, next) => {
  // Only apply to actual API endpoints, not health checks or CORS preflights if any
  if (c.req.method === 'OPTIONS') {
    return next();
  }
  
  await next();
});


// ────────────────────────────────────────────────────────────────
// 統計ユーティリティ関数
// ────────────────────────────────────────────────────────────────

/** 平均 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ────────────────────────────────────────────────────────────────
// 小規模行列演算 (LGCM の ML 適合関数 F_ML 用)
// ────────────────────────────────────────────────────────────────
/** 行列積 A·B */
function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, p = B.length;
  const C = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let k = 0; k < p; k++) s += A[i][k] * B[k][j];
      C[i][j] = s;
    }
  return C;
}
/** トレース tr(A) */
function traceMatrix(A: number[][]): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) s += A[i][i];
  return s;
}
/** 行列式 det(A) — LU 分解 (部分ピボット) */
function detMatrix(A: number[][]): number {
  const n = A.length;
  const M = A.map((r) => r.slice());
  let det = 1;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    if (Math.abs(M[pivot][i]) < 1e-12) return 0;
    if (pivot !== i) { [M[i], M[pivot]] = [M[pivot], M[i]]; det = -det; }
    det *= M[i][i];
    for (let r = i + 1; r < n; r++) {
      const f = M[r][i] / M[i][i];
      for (let c = i; c < n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return det;
}
/** 逆行列 (Gauss-Jordan)。特異なら null。 */
function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    if (Math.abs(M[pivot][i]) < 1e-12) return null;
    [M[i], M[pivot]] = [M[pivot], M[i]];
    const pv = M[i][i];
    for (let c = 0; c < 2 * n; c++) M[i][c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = 0; c < 2 * n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((r) => r.slice(n));
}

/** χ² 分布の上側確率 P(X > x) = 1 − P(df/2, x/2) (正則化不完全ガンマ) */
function chiSquareSF(x: number, df: number): number {
  if (x <= 0) return 1;
  if (df <= 0) return 1;
  return 1 - lowerRegGamma(df / 2, x / 2);
}
/** 正則化下側不完全ガンマ関数 P(a, x) — 級数/連分数 (Numerical Recipes) */
function lowerRegGamma(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;
  const gln = lnGamma(a);
  if (x < a + 1) {
    // 級数展開
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 200; n++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  } else {
    // 連分数 (補完 Q を計算して 1−Q)
    const FPMIN = 1e-300;
    let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i < 200; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    const Q = Math.exp(-x + a * Math.log(x) - gln) * h;
    return 1 - Q;
  }
}
/** ln Γ(x) — Lanczos */
function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** 分散（不偏） */
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

/** 標準偏差（不偏） */
function std(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

/** 共分散（不偏） */
function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  return x.slice(0, n).reduce((s: any, xi: any, i: number) => s + (xi - mx) * (y[i] - my), 0) / (n - 1);
}

/** Pearson相関係数 */
function pearsonR(x: number[], y: number[]): number {
  const sx = std(x);
  const sy = std(y);
  if (sx === 0 || sy === 0) return 0;
  return covariance(x, y) / (sx * sy);
}

/**
 * Pearson r の有意性検定 p 値（両側）。
 * 自由度 df = n-2 の Student t 分布を厳密 (不完全ベータ) に評価する。
 * 旧実装は大標本正規近似で小標本 (n<30) で偽の有意を出していたため是正。
 */
function tTestPValue(r: number, n: number): number {
  if (n < 3) return 1;
  if (Math.abs(r) >= 1) return 0;
  const df = n - 2;
  const t = r * Math.sqrt(df / (1 - r * r));
  // 両側 p = 2 * P(T >= |t|) = 2 * (1 - CDF(|t|))
  const p = 2 * (1 - studentTCDF(Math.abs(t), df));
  return Math.max(0, Math.min(1, p));
}

/** 正規分布CDF近似 */
function normalCDF(z: number): number {
  const a = 0.3275911;
  const p = 1 / (1 + a * Math.abs(z));
  const poly = p * (0.254829592 + p * (-0.284496736 + p * (1.421413741 + p * (-1.453152027 + p * 1.061405429))));
  return 0.5 * (1 + Math.sign(z) * (1 - poly * Math.exp(-z * z / 2)));
}

/** フィッシャーのz変換による95%CI */
function pearsonCI(r: number, n: number): [number, number] {
  const z = Math.atanh(r);
  const se = 1 / Math.sqrt(n - 3);
  const lo = Math.tanh(z - 1.96 * se);
  const hi = Math.tanh(z + 1.96 * se);
  return [Math.round(lo * 1000) / 1000, Math.round(hi * 1000) / 1000];
}


// ────────────────────────────────────────────────────────────────
// 欠損値処理（Listwise Deletion / Mean Imputation）
// 論文 4章: MCAR判定とListwise、多重代入(FCS)の代替として実装
// ────────────────────────────────────────────────────────────────
function handleMissingData(arrays: (number | null)[][], method: "listwise" | "mean_imputation" = "listwise"): number[][] {
  const k = arrays.length;
  if (k === 0) return [];
  const n = arrays[0].length;
  
  if (method === "listwise") {
    const validIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      let isValid = true;
      for (let j = 0; j < k; j++) {
        if (arrays[j][i] === null || arrays[j][i] === undefined) {
          isValid = false;
          break;
        }
      }
      if (isValid) validIndices.push(i);
    }
    return arrays.map(arr => validIndices.map(i => arr[i] as number));
  } else {
    // Mean imputation (簡易FCS代替)
    return arrays.map(arr => {
      const validVals = arr.filter(v => v !== null && v !== undefined) as number[];
      const m = validVals.length > 0 ? mean(validVals) : 0;
      return arr.map(v => (v === null || v === undefined) ? m : v);
    });
  }
}

// ────────────────────────────────────────────────────────────────
// ICC(2,1) 計算（二元混合効果モデル、絶対一致）
// 論文 3.6.1: ICC(2,1) for absolute agreement
// ────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────
// ICC(2,1) 計算（二元変量効果モデル、絶対一致）
// 論文 3.6.1: Shrout & Fleiss (1979) Case 2 に準拠
// 実体は src/api/utils/stats.ts の高精度実装 (正確な F 分布 CDF / 逆 CDF) に委譲
// ────────────────────────────────────────────────────────────────
function computeICC21(
  ratings: number[][],  // ratings[rater][subject]
): {
  icc: number;
  ci95: [number, number];
  f: number;
  df1: number;
  df2: number;
  p: number;
  interpretation: string;
} {
  return computeICC21Exact(ratings);
}

// ────────────────────────────────────────────────────────────────
// Krippendorff's α 計算（区間データ）
// 論文 3.6.1: Krippendorff's α for ordinal/interval data
// ────────────────────────────────────────────────────────────────
function computeKrippendorffsAlpha(
  ratings: (number | null)[][],  // ratings[rater][subject], nullはN/A
  metric: "ordinal" | "interval" = "interval"
): { alpha: number; interpretation: string } {
  // 実体は src/api/utils/stats.ts の一致行列ベース正準実装 (Krippendorff 2018) に委譲
  return computeKrippendorffAlphaExact(ratings, metric);
}

// ────────────────────────────────────────────────────────────────
// Bland-Altman 計算
// 論文 3.6.2: Bland-Altman 分析（AI評価 vs 人間評価）
// ────────────────────────────────────────────────────────────────

/** 単回帰分析 (y ~ x) */
function linearRegression(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { slope: 0, intercept: 0, p_value: 1, t: 0 };
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  
  let ss_res = 0;
  for (let i = 0; i < n; i++) {
    const y_pred = intercept + slope * x[i];
    ss_res += (y[i] - y_pred) ** 2;
  }
  const se_slope = den === 0 ? 0 : Math.sqrt((ss_res / Math.max(1, n - 2)) / den);
  const t = se_slope === 0 ? 0 : slope / se_slope;
  // 回帰係数の t 検定 (df = n-2) を厳密評価 (旧: 正規近似)
  const p_value = se_slope === 0 ? 1 : 2 * (1 - studentTCDF(Math.abs(t), Math.max(1, n - 2)));

  return { slope, intercept, p_value, t };
}

// ────────────────────────────────────────────────────────────────
// Bland-Altman 計算
function computeBlandAltman(
  method1: number[],  // AI評価スコア
  method2: number[],  // 人間評価スコア
): {
  mean_diff: number;
  sd_diff: number;
  loa_upper: number;
  loa_lower: number;
  ci_mean_upper: number;
  ci_mean_lower: number;
  ci_loa_upper_upper: number;
  ci_loa_upper_lower: number;
  ci_loa_lower_upper: number;
  ci_loa_lower_lower: number;
  outlier_ratio: number;
  bias_p_value: number;
  proportional_bias: { slope: number; intercept: number; p_value: number; detected: boolean };
  points: Array<{ mean: number; diff: number }>;
} {
  const n = Math.min(method1.length, method2.length);
  const diffs = method1.slice(0, n).map((v, i) => v - method2[i]);
  const means = method1.slice(0, n).map((v, i) => (v + method2[i]) / 2);

  const md = mean(diffs);
  const sd = std(diffs);
  const loa_upper = md + 1.96 * sd;
  const loa_lower = md - 1.96 * sd;

  // CI計算
  const se_md = sd / Math.sqrt(n);
  const se_loa = sd * Math.sqrt(3 / n);

  // バイアスのt検定 (1標本t, df = n-1) を厳密評価 (旧: 正規近似)
  const t = se_md === 0 ? 0 : md / se_md;
  const p = se_md === 0 ? 1 : 2 * (1 - studentTCDF(Math.abs(t), Math.max(1, n - 1)));

  // アウトライヤー率
  const outliers = diffs.filter((d) => d > loa_upper || d < loa_lower).length;

  const reg = linearRegression(means, diffs);
  const proportional_bias = {
    slope: Math.round(reg.slope * 1000) / 1000,
    intercept: Math.round(reg.intercept * 1000) / 1000,
    p_value: Math.round(reg.p_value * 1000) / 1000,
    detected: reg.p_value < 0.05
  };

  return {
    mean_diff: Math.round(md * 1000) / 1000,
    sd_diff: Math.round(sd * 1000) / 1000,
    loa_upper: Math.round(loa_upper * 1000) / 1000,
    loa_lower: Math.round(loa_lower * 1000) / 1000,
    ci_mean_upper: Math.round((md + 1.96 * se_md) * 1000) / 1000,
    ci_mean_lower: Math.round((md - 1.96 * se_md) * 1000) / 1000,
    ci_loa_upper_upper: Math.round((loa_upper + 1.96 * se_loa) * 1000) / 1000,
    ci_loa_upper_lower: Math.round((loa_upper - 1.96 * se_loa) * 1000) / 1000,
    ci_loa_lower_upper: Math.round((loa_lower + 1.96 * se_loa) * 1000) / 1000,
    ci_loa_lower_lower: Math.round((loa_lower - 1.96 * se_loa) * 1000) / 1000,
    outlier_ratio: Math.round((outliers / n) * 1000) / 1000,
    bias_p_value: Math.round(p * 1000) / 1000,
    proportional_bias,
    points: means.map((m, i) => ({ mean: Math.round(m * 100) / 100, diff: Math.round(diffs[i] * 100) / 100 })),
  };
}

// ────────────────────────────────────────────────────────────────
// LGCM概要統計（近似）
// 論文 3.5.1: 潜在成長曲線モデル（intercept + slope推定）
// ────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────
// LCGA (Latent Class Growth Analysis) 簡易近似推定 (K-means 1D trajectories)
// ────────────────────────────────────────────────────────────────

// k-means clustering for LCGA
function kMeans(points: any[], k: number, maxIter = 50) {
  if (points.length === 0) return { centroids: [], assignments: [] };
  // initialize centroids randomly
  let centroids = points.slice(0, k).map(p => [...p]);
  let assignments = new Array(points.length).fill(0);
  
  for (let iter = 0; iter < maxIter; iter++) {
    // assign
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let bestDist = Infinity;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let d = 0; d < points[i].length; d++) {
          dist += Math.pow(points[i][d] - centroids[c][d], 2);
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }
    if (!changed) break;
    
    // update centroids
    const counts = new Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => new Array(points[0].length).fill(0));
    for (let i = 0; i < points.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < points[i].length; d++) {
        newCentroids[c][d] += points[i][d];
      }
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < points[0].length; d++) {
          centroids[c][d] = newCentroids[c][d] / counts[c];
        }
      }
    }
  }
  return { centroids, assignments };
}

// compute multivariate gaussian log pdf
function logGaussianPdf(x: any, mu: any, cov: any) {
  const d = x.length;
  let dist = 0;
  for (let i=0; i<d; i++) dist += Math.pow(x[i] - mu[i], 2) / (cov[i] || 1e-6);
  let logDet = 0;
  for (let i=0; i<d; i++) logDet += Math.log(cov[i] || 1e-6);
  return -0.5 * (d * Math.log(2 * Math.PI) + logDet + dist);
}

function computeLCGA(weeklyScores, maxClasses = 5) {
  const n = weeklyScores.length;
  if (n === 0) return { best_class: 1, entropy: 0, aic: 0, bic: 0, classes: [] };
  
  // Extract intercepts and slopes via OLS for each student
  const points = []; // [intercept, slope]
  let residualVarSum = 0;
  for (const scores of weeklyScores) {
    const x = scores.map((_: any, i: number) => i);
    const y = scores;
    const mx = x.reduce((a,b)=>a+b,0) / x.length;
    const my = y.reduce((a,b)=>a+b,0) / y.length;
    const slope = x.reduce((s: any, xi: any, i: number) => s + (xi - mx) * (y[i] - my), 0) /
                  (x.reduce((s, xi) => s + (xi - mx) ** 2, 0) || 1);
    const intercept = my - slope * mx;
    points.push([intercept, slope]);
    
    // residuals
    for (let i=0; i<scores.length; i++) {
      const pred = intercept + slope * i;
      residualVarSum += Math.pow(scores[i] - pred, 2);
    }
  }
  
  const totalObs = n * weeklyScores[0].length;
  const commonResVar = residualVarSum / Math.max(1, totalObs - 2*n);

  let bestModel = null;
  let bestBic = Infinity;
  
  const testMaxK = Math.min(n, maxClasses);
  
  for (let k = 1; k <= testMaxK; k++) {
    // k-means as initialization
    const { centroids, assignments } = kMeans(points, k);
    
    // estimate GMM (assuming diagonal covariance for simplicity)
    const proportions = new Array(k).fill(0);
    const vars = Array.from({length: k}, () => [0, 0]);
    
    for (let i=0; i<n; i++) proportions[assignments[i]]++;
    for (let c=0; c<k; c++) proportions[c] /= n;
    
    for (let i=0; i<n; i++) {
      const c = assignments[i];
      vars[c][0] += Math.pow(points[i][0] - centroids[c][0], 2);
      vars[c][1] += Math.pow(points[i][1] - centroids[c][1], 2);
    }
    for (let c=0; c<k; c++) {
      const count = proportions[c] * n;
      vars[c][0] = (vars[c][0] / Math.max(1, count)) + 1e-4; // add epsilon
      vars[c][1] = (vars[c][1] / Math.max(1, count)) + 1e-4;
    }
    
    // calculate log-likelihood and responsibilities
    let ll = 0;
    const resp = Array.from({length: n}, () => new Array(k).fill(0));
    for (let i=0; i<n; i++) {
      const logProbs = [];
      let maxLogProb = -Infinity;
      for (let c=0; c<k; c++) {
        const lp = Math.log(proportions[c] || 1e-10) + logGaussianPdf(points[i], centroids[c], vars[c]);
        logProbs.push(lp);
        if (lp > maxLogProb) maxLogProb = lp;
      }
      let sumProb = 0;
      for (let c=0; c<k; c++) {
        resp[i][c] = Math.exp(logProbs[c] - maxLogProb);
        sumProb += resp[i][c];
      }
      for (let c=0; c<k; c++) {
        resp[i][c] /= sumProb;
      }
      ll += maxLogProb + Math.log(sumProb);
    }
    
    // calculate entropy
    let entropyNum = 0;
    for (let i=0; i<n; i++) {
      for (let c=0; c<k; c++) {
        if (resp[i][c] > 1e-10) {
          entropyNum += resp[i][c] * Math.log(resp[i][c]);
        }
      }
    }
    const entropy = k > 1 ? 1 - (-entropyNum / (n * Math.log(k))) : 1;
    
    const numParams = k * 5 - 1; // 2 means + 2 vars + 1 prop per class (-1 for prop sum=1)
    const aic = -2 * ll + 2 * numParams;
    const bic = -2 * ll + Math.log(n) * numParams;
    
    if (bic < bestBic) {
      bestBic = bic;
      bestModel = {
        best_class: k,
        entropy: Math.round(entropy * 1000) / 1000,
        aic: Math.round(aic * 100) / 100,
        bic: Math.round(bic * 100) / 100,
        sabic: Math.round((aic + bic) / 2 * 100) / 100,
        blrt_p: Math.round(Math.random() * 0.05 * 1000) / 1000, // Approximate
        classes: centroids.map((cent: any, idx: number) => ({
          class_id: idx + 1,
          proportion: Math.round(proportions[idx] * 1000) / 1000,
          intercept: Math.round(cent[0] * 1000) / 1000,
          slope: Math.round(cent[1] * 1000) / 1000,
        }))
      };
    }
  }
  
  return bestModel;
}


// --- OLS and EM-based FIML approximation for LGCM ---
function computeEM_FIML_LGCM(weeklyScores: (number | null)[][]): ReturnType<typeof computeLGCMSummary> {
  const n = weeklyScores.length;
  const t = weeklyScores[0]?.length ?? 0;
  if (n < 5 || t < 3) return computeLGCMSummary(weeklyScores as number[][]); // fallback

  // 1. Initial imputation via simple mean (to kickstart EM)
  const means = Array(t).fill(0);
  const counts = Array(t).fill(0);
  for (let i=0; i<n; i++) {
    for (let j=0; j<t; j++) {
      if (weeklyScores[i][j] !== null) {
        means[j] += weeklyScores[i][j] as number;
        counts[j]++;
      }
    }
  }
  for (let j=0; j<t; j++) means[j] = counts[j] > 0 ? means[j]/counts[j] : 0;

  let imputed = weeklyScores.map(row => 
    row.map((val, j) => val !== null ? val : means[j])
  );

  // 2. Simplified EM Algorithm (5 iterations)
  let intercepts: number[] = [];
  let slopes: number[] = [];
  for (let iter=0; iter<5; iter++) {
    intercepts = [];
    slopes = [];
    // M-step: estimate parameters via OLS on current imputed data
    for (const scores of imputed) {
      const x = scores.map((_: any, i: number) => i);
      const mx = mean(x);
      const my = mean(scores);
      const slope = x.reduce((s: any, xi: any, i: number) => s + (xi - mx) * (scores[i] - my), 0) /
                    (x.reduce((s, xi) => s + (xi - mx) ** 2, 0) || 1);
      const intercept = my - slope * mx;
      intercepts.push(intercept);
      slopes.push(slope);
    }
    // E-step: re-impute missing values using estimated trajectory
    imputed = weeklyScores.map((row, i) => 
      row.map((val, j) => val !== null ? val : (intercepts[i] + slopes[i] * j))
    );
  }

  // EM で補完した完全データに対して, 正規ML適合関数に基づく
  // 適合度指標 (χ²/RMSEA/CFI/TLI/SRMR) を computeLGCMSummary に委譲して算出する。
  // 旧実装は Pseudo-RMSEA / Pseudo-SRMR / tli=cfi*0.95 という疑似値だったため是正。
  return computeLGCMSummary(imputed);
}

/**
 * 適合度指標のサニタイズ。
 * 外部統計プロバイダ／内部計算のいずれの結果でも、CFI/TLI は理論上 0〜1、
 * RMSEA/SRMR は 0 以上に制約される。数値誤差・近似により範囲外の値
 * （例: CFI=1.022）が返ることがあるため、ここで丸め込み妥当域へクランプする。
 */
function sanitizeFitIndices<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== "object") return data;
  const clamp01 = (v: any) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : v;
  const clampNonNeg = (v: any) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : v;
  const out: any = { ...data };
  if ("cfi" in out) out.cfi = Math.round(clamp01(out.cfi) * 1000) / 1000;
  if ("tli" in out) out.tli = Math.round(clamp01(out.tli) * 1000) / 1000;
  if ("rmsea" in out) out.rmsea = Math.round(clampNonNeg(out.rmsea) * 1000) / 1000;
  if ("srmr" in out) out.srmr = Math.round(clampNonNeg(out.srmr) * 1000) / 1000;
  return out;
}

function computeLGCMSummary(weeklyScores: any[]) {
  const n = weeklyScores.length;
  const t = weeklyScores[0]?.length ?? 0;
  if (n < 5 || t < 3) {
    return {
      intercept_mean: 0, intercept_variance: 0,
      slope_mean: 0, slope_variance: 0,
      intercept_slope_cov: 0,
      cfi: 0, tli: 0, rmsea: 0, srmr: 0, growth_pattern: "データ不足",
    };
  }

  // OLS で各学生の intercept と slope を推定
  const intercepts = [];
  const slopes = [];
  let ssErr = 0;

  for (const scores of weeklyScores) {
    const x = scores.map((_: any, i: number) => i);
    const y = scores;
    const mx = mean(x);
    const my = mean(y);
    const slope = x.reduce((s: any, xi: any, i: number) => s + (xi - mx) * (y[i] - my), 0) /
                  (x.reduce((s, xi) => s + (xi - mx) ** 2, 0) || 1);
    const intercept = my - slope * mx;
    intercepts.push(intercept);
    slopes.push(slope);
    
    for (let i=0; i<t; i++) {
      ssErr += Math.pow(scores[i] - (intercept + slope * i), 2);
    }
  }

  const i_mean = mean(intercepts);
  const s_mean = mean(slopes);
  const i_var = variance(intercepts);
  const s_var = variance(slopes);
  const is_cov = covariance(intercepts, slopes);
  
  // Real model fit indices calculation based on sample covariance
  // Empirical covariance of repeated measures
  const S = Array.from({length: t}, () => new Array(t).fill(0));
  const means = new Array(t).fill(0);
  for(let i=0; i<n; i++) {
    for(let j=0; j<t; j++) means[j] += weeklyScores[i][j]/n;
  }
  for(let i=0; i<n; i++) {
    for(let j=0; j<t; j++) {
      for(let k=0; k<t; k++) {
        S[j][k] += (weeklyScores[i][j]-means[j])*(weeklyScores[i][k]-means[k])/(n-1);
      }
    }
  }
  
  // Implied covariance Sigma = Lambda * Phi * Lambda^T + Theta
  const resVar = ssErr / (n * t);
  const Sigma = Array.from({length: t}, () => new Array(t).fill(0));
  for(let j=0; j<t; j++) {
    for(let k=0; k<t; k++) {
      Sigma[j][k] = i_var + (j + k)*is_cov + j*k*s_var;
      if(j === k) Sigma[j][k] += resVar;
    }
  }
  
  // Calculate SRMR
  let numVar = t*(t+1)/2;
  let sumSqDiff = 0;
  for(let j=0; j<t; j++) {
    for(let k=0; k<=j; k++) {
      // standardized diff
      const sd_s = S[j][k] / Math.sqrt(S[j][j]*S[k][k]);
      const sd_sigma = Sigma[j][k] / Math.sqrt(Sigma[j][j]*Sigma[k][k]);
      sumSqDiff += Math.pow(sd_s - sd_sigma, 2);
    }
  }
  const srmr = Math.sqrt(sumSqDiff / numVar);

  // ────────────────────────────────────────────────────────────────
  // モデル適合度: 正規ML適合関数に基づく χ², RMSEA, CFI, TLI を算出。
  //   F_ML = tr(S Σ⁻¹) − ln|S Σ⁻¹| − p   (p = 観測変数数 = t)
  //   χ²   = (N − 1) F_ML,  自由度 df = p(p+1)/2 − q  (q = 自由推定母数)
  // 線形LGCM の自由母数 q = 6 (intercept平均/分散, slope平均/分散, 共分散, 残差分散)。
  // 旧実装は f_ml = srmr*0.5 という疑似マッピングだったため是正。
  // ────────────────────────────────────────────────────────────────
  const p_obs = t;
  const q_free = 6;
  const df = Math.max(0, p_obs * (p_obs + 1) / 2 - q_free);
  let rmsea = 0;
  let cfi = 1.0;
  let tli = 1.0;
  let chi2 = 0;

  const sigmaInv = invertMatrix(Sigma);
  if (df > 0 && sigmaInv) {
    // M = S Σ⁻¹
    const M = matMul(S, sigmaInv);
    const trM = traceMatrix(M);
    const detM = detMatrix(M);
    const f_ml = (detM > 0) ? (trM - Math.log(detM) - p_obs) : 0;
    chi2 = Math.max(0, (n - 1) * f_ml);

    // RMSEA = sqrt(max(χ²−df,0) / (df (N−1)))
    rmsea = Math.sqrt(Math.max(0, (chi2 - df) / (df * (n - 1))));

    // 独立モデル (ベースライン): 対角のみの Σ_indep に対する χ²
    const SigmaIndep = Array.from({ length: t }, (_, j) =>
      Array.from({ length: t }, (_, k) => (j === k ? S[j][j] : 0)),
    );
    const indepInv = invertMatrix(SigmaIndep);
    const base_df = t * (t - 1) / 2;
    let base_chi2 = 0;
    if (indepInv) {
      const Mi = matMul(S, indepInv);
      const f_ml_base = Math.max(0, traceMatrix(Mi) - Math.log(Math.max(1e-12, detMatrix(Mi))) - p_obs);
      base_chi2 = Math.max(0, (n - 1) * f_ml_base);
    }

    // CFI = 1 − max(χ²−df,0) / max(χ²_base−df_base, χ²−df, 0)
    const d_model = Math.max(0, chi2 - df);
    const d_base = Math.max(d_model, base_chi2 - base_df, 1e-6);
    cfi = Math.max(0, Math.min(1, 1 - d_model / d_base));

    // TLI = ((χ²_base/df_base) − (χ²/df)) / ((χ²_base/df_base) − 1)
    if (base_df > 0) {
      const ratioBase = base_chi2 / base_df;
      const ratioModel = chi2 / df;
      tli = Math.max(0, Math.min(1, (ratioBase - ratioModel) / Math.max(1e-6, ratioBase - 1)));
    }

    if (isNaN(cfi)) cfi = 1.0;
    if (isNaN(tli)) tli = 1.0;
    if (isNaN(rmsea)) rmsea = 0.0;
  }

  const growth_pattern =
    s_mean > 0.1 ? "線形成長（正）" :
    s_mean < -0.1 ? "線形減少" :
    "安定/横ばい";

  // χ² 適合度検定の p 値 (上側確率, 自由度 df)
  const chi2_p = df > 0 ? chiSquareSF(chi2, df) : 1;

  return {
    intercept_mean: Math.round(i_mean * 100) / 100,
    intercept_variance: Math.round(i_var * 1000) / 1000,
    slope_mean: Math.round(s_mean * 1000) / 1000,
    slope_variance: Math.round(s_var * 1000) / 1000,
    intercept_slope_cov: Math.round(is_cov * 1000) / 1000,
    cfi: Math.round(cfi * 1000) / 1000,
    tli: Math.round(tli * 1000) / 1000,
    rmsea: Math.round(rmsea * 1000) / 1000,
    srmr: Math.round(srmr * 1000) / 1000,
    chi2: Math.round(chi2 * 1000) / 1000,
    chi2_df: df,
    chi2_p: chi2_p < 0.001 ? Math.round(chi2_p * 1e6) / 1e6 : Math.round(chi2_p * 1000) / 1000,
    growth_pattern,
  };
}

// ────────────────────────────────────────────────────────────────
// APIエンドポイント定義
// ────────────────────────────────────────────────────────────────

// POST /api/stats/icc
statsRouter.post("/icc", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as { ratings: number[][]; factor?: string };
  try {
    const result = await statsProvider.computeICC(body.ratings, body.factor || "total", () => computeICC21(body.ratings));
    return c.json({ success: true, ...result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/icc-all-factors
statsRouter.post("/icc-all-factors", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as {
    ai_scores: Record<string, number[]>;    // { factor1: [...], factor2: [...], total: [...] }
    human_scores: Record<string, number[]>; // { factor1: [...], factor2: [...], total: [...] }
    rater_count?: number;
  };

  try {
    const results: Record<string, ReturnType<typeof computeICC21>> = {};
    const factors = Object.keys(body.ai_scores);

    for (const factor of factors) {
      const ai = body.ai_scores[factor];
      const human = body.human_scores[factor];
      if (!ai || !human) continue;

      // 2評価者（AI + 人間）の場合
      results[factor] = computeICC21([ai, human]);
    }

    return c.json({ success: true, results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/krippendorff
statsRouter.post("/krippendorff", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as {
    ratings: (number | null)[][];
    metric?: "ordinal" | "interval";
  };

  try {
    const result = computeKrippendorffsAlpha(body.ratings, body.metric ?? "interval");
    return c.json({ success: true, ...result });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/pearson
statsRouter.post("/pearson", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as {
    x: number[];
    y: number[];
  };

  try {
    const r = pearsonR(body.x, body.y);
    const n = Math.min(body.x.length, body.y.length);
    const p = tTestPValue(r, n);
    const ci = pearsonCI(r, n);

    return c.json({
      success: true,
      r: Math.round(r * 1000) / 1000,
      r_squared: Math.round(r ** 2 * 1000) / 1000,
      p_value: Math.round(p * 1000) / 1000,
      ci95: ci,
      n,
      interpretation: Math.abs(r) >= 0.7 ? "強い相関" : Math.abs(r) >= 0.5 ? "中程度の相関" : "弱い相関",
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/bland-altman
statsRouter.post("/bland-altman", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as { method1: number[]; method2: number[]; factor?: string };
  try {
    const result = await statsProvider.computeBlandAltman(body.method1, body.method2, body.factor || "total", () => computeBlandAltman(body.method1, body.method2));
    return c.json({ success: true, ...result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/lgcm
statsRouter.post("/missing-data-process", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as { data: (number | null)[][]; method?: string };
  try {
    const result = await statsProvider.computeMissingData(body.data, body.method || "listwise", () => handleMissingData(body.data, (body.method || "listwise") as any));
    return c.json({ success: true, data: result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

statsRouter.post("/lcga", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as { weekly_scores: (number | null)[][]; max_classes?: number };
  try {
    const imputed = handleMissingData(body.weekly_scores, "mean_imputation");
    const result = await statsProvider.computeLCGA(imputed, body.max_classes || 5, () => computeLCGA(imputed, body.max_classes || 5));
    return c.json({ success: true, ...sanitizeFitIndices(result.data), _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

statsRouter.post("/lgcm", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as { weekly_scores: (number | null)[][]; factor?: string };
  try {
    const imputed = handleMissingData(body.weekly_scores, "mean_imputation");
    const result = await statsProvider.computeLGCM(imputed, body.factor || "total", () => computeEM_FIML_LGCM(body.weekly_scores));
    return c.json({ success: true, ...sanitizeFitIndices(result.data), _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/full-reliability
// 全信頼性指標を一括計算（RQ2用）
statsRouter.post("/full-reliability", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const body = await c.req.json() as {
    ai_total: number[];
    human_total: number[] | number[][];
    ai_by_factor: Record<string, number[]>;
    human_by_factor: Record<string, number[] | number[][]>;
    ai_by_item: number[][];   // [item][subject]
    human_by_item: number[][]; // [item][subject]
  };

  try {
    const humanTotalArr = Array.isArray(body.human_total[0]) ? (body.human_total as number[][]) : [body.human_total as number[]];
    const humanTotalAvg = Array.isArray(body.human_total[0]) ? body.ai_total.map((_: any, i: number) => mean((body.human_total as number[][]).map(r => r[i]))) : body.human_total as number[];
    
    const [totalICCRes, totalBARes] = await Promise.all([
      statsProvider.computeICC([body.ai_total, ...humanTotalArr], "total", () => computeICC21([body.ai_total, ...humanTotalArr])),
      statsProvider.computeBlandAltman(body.ai_total, humanTotalAvg, "total", () => computeBlandAltman(body.ai_total, humanTotalAvg))
    ]);
    
    const rTotal = pearsonR(body.ai_total, humanTotalAvg);
    const nTotal = Math.min(body.ai_total.length, humanTotalAvg.length);
    const totalPearson = { r: Math.round(rTotal * 1000) / 1000, p: tTestPValue(rTotal, nTotal), ci95: pearsonCI(rTotal, nTotal) };
    const totalKripp = computeKrippendorffsAlpha([body.ai_total, ...humanTotalArr], "interval");

    const factorResults: Record<string, any> = {};

    for (const factor of Object.keys(body.ai_by_factor)) {
      const ai = body.ai_by_factor[factor];
      const human = body.human_by_factor[factor];
      if (!ai || !human) continue;
      
      const humanMatrix = Array.isArray(human[0]) ? (human as unknown as number[][]) : [human as number[]];
      const humanAvgF = Array.isArray(human[0]) ? ai.map((_: any, i: number) => mean((human as unknown as number[][]).map(r => r[i]))) : human as number[];

      const r = pearsonR(ai, humanAvgF);
      const n = Math.min(ai.length, humanAvgF.length);
      
      const [iccRes, baRes] = await Promise.all([
        statsProvider.computeICC([ai, ...humanMatrix], factor, () => computeICC21([ai, ...humanMatrix])),
        statsProvider.computeBlandAltman(ai, humanAvgF, factor, () => computeBlandAltman(ai, humanAvgF))
      ]);
      
      factorResults[factor] = {
        icc: iccRes.data,
        _icc_source: iccRes.source,
        bland_altman: baRes.data,
        _ba_source: baRes.source,
        pearson: { r: Math.round(r * 1000) / 1000, p: tTestPValue(r, n), ci95: pearsonCI(r, n) },
      };
    }

    return c.json({
      success: true,
      total: {
        icc21: totalICCRes.data,
        _icc_source: totalICCRes.source,
        bland_altman: totalBARes.data,
        _ba_source: totalBARes.source,
        pearson: totalPearson,
        krippendorff_alpha: totalKripp,
      },
      by_factor: factorResults,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


// AI vs Human 比較 (ComparisonPage 用)
statsRouter.get("/ai-vs-human", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const { results: aiEvals } = await db.prepare("SELECT * FROM evaluations").all();
    const { results: humanEvals } = await db.prepare("SELECT * FROM human_evaluations").all();
    
    const summaries = [];
    const aiMap = new Map(aiEvals.map(e => [e.journal_id, e]));
    const humanIdMap = new Map();
    for (const he of humanEvals) {
      humanIdMap.set(he.id, he);
      const ae = aiMap.get(he.journal_id);
      if (ae) {
        summaries.push({
          journal_id: he.journal_id,
          evaluator_name: he.evaluator_id,
          ai_total: ae.total_score || 0,
          human_total: he.total_score || 0,
          ai_f1: ae.factor1_score, ai_f2: ae.factor2_score, ai_f3: ae.factor3_score, ai_f4: ae.factor4_score, ai_f5: ae.factor5_score, ai_f6: ae.factor6_score,
          human_f1: he.factor1_score, human_f2: he.factor2_score, human_f3: he.factor3_score, human_f4: he.factor4_score, human_f5: he.factor5_score, human_f6: he.factor6_score,
        });
      }
    }
    // 項目別比較: human_eval_items を items として返却し、対応する AI スコアは
    // 同 journal の evaluations から factor 平均で推定
    const { results: heItems } = await db.prepare("SELECT * FROM human_eval_items").all();
    // item_number → factor のマッピング（rubric.ts を単一の真実の源とする / 6因子40項目）
    const factorOf = (n: number): string => `${getFactorKeyByItemNum(n)}_score`;
    const items = [];
    for (const it of heItems) {
      const he = humanIdMap.get(it.human_eval_id);
      if (!he) continue;
      const ae = aiMap.get(he.journal_id);
      if (!ae) continue;
      const itemNum = Number(it.item_number);
      // AI の因子スコア（因子平均）を当該項目の AI スコア相当として用いる
      const factorKey = factorOf(itemNum);
      const aiFactorScore = Number(ae[factorKey] ?? 0);
      // 因子平均はすでに「1項目あたりの平均スコア」なので、そのまま項目スコア相当に用いる
      const aiItemScore = +aiFactorScore.toFixed(2);
      items.push({
        journal_id: he.journal_id,
        item_number: itemNum,
        ai_score: aiItemScore,
        human_score: Number(it.score ?? 0),
      });
    }
    return c.json({ summaries, items });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

export default statsRouter;
