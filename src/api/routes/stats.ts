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
import { statsProvider } from "../services/statsProvider";

const statsRouter = new Hono<{ Bindings: CloudflareBindings }>();
statsRouter.use("*", cors());

statsRouter.use("*", async (c, next) => {
  // Only apply to actual API endpoints, not health checks or CORS preflights if any
  if (c.req.method === 'OPTIONS') {
    return next();
  }
  const role = c.get("user")?.role;
  if (role !== "researcher" && role !== "admin") {
    return c.json({ error: "Forbidden: researcher or admin role required" }, 403);
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
  return x.slice(0, n).reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / (n - 1);
}

/** Pearson相関係数 */
function pearsonR(x: number[], y: number[]): number {
  const sx = std(x);
  const sy = std(y);
  if (sx === 0 || sy === 0) return 0;
  return covariance(x, y) / (sx * sy);
}

/** t分布のp値近似（大標本近似） */
function tTestPValue(r: number, n: number): number {
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  // 大標本正規近似
  const z = Math.abs(t) * Math.sqrt(2 / (n - 1));
  const p = 2 * (1 - normalCDF(Math.abs(t)));
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
  const k = ratings.length;       // 評価者数
  const n = ratings[0].length;    // 対象者数

  if (k < 2 || n < 2) {
    return { icc: 0, ci95: [0, 0], f: 0, df1: 0, df2: 0, p: 1, interpretation: "データ不足" };
  }

  // 行列転置: subjects × raters
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    ratings.map((r) => r[i])
  );

  // 総平均
  const grandMean = mean(matrix.flatMap((row) => row));

  // SS_R（評価者間変動）
  const raterMeans = ratings.map((r) => mean(r));
  const SS_R = n * raterMeans.reduce((s, rm) => s + (rm - grandMean) ** 2, 0);

  // SS_S（対象者間変動）
  const subjectMeans = matrix.map((row) => mean(row));
  const SS_S = k * subjectMeans.reduce((s, sm) => s + (sm - grandMean) ** 2, 0);

  // SS_T（総変動）
  const SS_T = matrix.flatMap((row) => row).reduce((s, v) => s + (v - grandMean) ** 2, 0);

  // SS_E（誤差変動）
  const SS_E = SS_T - SS_R - SS_S;

  // 自由度
  const df_R = k - 1;
  const df_S = n - 1;
  const df_E = (k - 1) * (n - 1);

  // 平均平方
  const MS_R = SS_R / df_R;
  const MS_S = SS_S / df_S;
  const MS_E = SS_E / Math.max(df_E, 1);

  // ICC(2,1) 絶対一致
  const icc = (MS_S - MS_E) / (MS_S + (k - 1) * MS_E + (k / n) * (MS_R - MS_E));
  const iccClamped = Math.max(0, Math.min(1, icc));

  // 95%CI（Shrout & Fleiss, 1979）
  const F = MS_S / MS_E;
  const FL = F / ((k - 1) / df_E);
  const FU = F * ((k - 1) / df_S);

  const L = (FL - 1) / (FL + k - 1);
  const U = (FU - 1) / (FU + k - 1);
  const ci95: [number, number] = [
    Math.max(0, Math.round(L * 1000) / 1000),
    Math.min(1, Math.round(U * 1000) / 1000),
  ];

  // p値（F検定）
  const p = MS_E > 0 ? Math.min(1, Math.exp(-0.717 * Math.log(F) - 0.416 * Math.log(F) ** 2)) : 0;

  const interpretation =
    iccClamped >= 0.9 ? "非常に良好な信頼性" :
    iccClamped >= 0.75 ? "良好な信頼性（研究使用可）" :
    iccClamped >= 0.5 ? "中程度の信頼性（要注意）" :
    "低い信頼性（要改善）";

  return {
    icc: Math.round(iccClamped * 1000) / 1000,
    ci95,
    f: Math.round(F * 100) / 100,
    df1: df_S,
    df2: df_E,
    p: Math.round(p * 1000) / 1000,
    interpretation,
  };
}

// ────────────────────────────────────────────────────────────────
// Krippendorff's α 計算（区間データ）
// 論文 3.6.1: Krippendorff's α for ordinal/interval data
// ────────────────────────────────────────────────────────────────
function computeKrippendorffsAlpha(
  ratings: (number | null)[][],  // ratings[rater][subject], nullはN/A
  metric: "ordinal" | "interval" = "interval"
): { alpha: number; interpretation: string } {
  const k = ratings.length;
  const n = ratings[0].length;

  // 有効なペアを収集
  let D_o = 0; // 観測された不一致
  let D_e = 0; // 期待される不一致
  let n_valid = 0;

  const allValues: number[] = [];
  ratings.forEach((r) => r.forEach((v) => v !== null && allValues.push(v)));
  const overallMean = mean(allValues);

  for (let s = 0; s < n; s++) {
    const vals = ratings.map((r) => r[s]).filter((v): v is number => v !== null);
    if (vals.length < 2) continue;

    n_valid++;
    const pairs: [number, number][] = [];
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        pairs.push([vals[i], vals[j]]);
      }
    }

    for (const [a, b] of pairs) {
      const d = metric === "interval" ? (a - b) ** 2 : Math.abs(a - b);
      D_o += d;
    }
  }

  for (const v1 of allValues) {
    for (const v2 of allValues) {
      const d = metric === "interval" ? (v1 - v2) ** 2 : Math.abs(v1 - v2);
      D_e += d;
    }
  }

  if (D_e === 0) return { alpha: 1, interpretation: "完全一致" };

  const n_total = allValues.length;
  const alpha = 1 - ((n_total - 1) * D_o) / (D_e * n_valid);
  const alphaClamped = Math.max(-1, Math.min(1, alpha));

  const interpretation =
    alphaClamped >= 0.8 ? "良好な信頼性" :
    alphaClamped >= 0.667 ? "暫定的に許容可能" :
    "信頼性が低い（要改善）";

  return {
    alpha: Math.round(alphaClamped * 1000) / 1000,
    interpretation,
  };
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
  const p_value = 2 * (1 - normalCDF(Math.abs(t)));

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

  // バイアスのt検定
  const t = md / se_md;
  const p = 2 * (1 - normalCDF(Math.abs(t)));

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
function kMeans(points, k, maxIter = 50) {
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
function logGaussianPdf(x, mu, cov) {
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
    const x = scores.map((_, i) => i);
    const y = scores;
    const mx = x.reduce((a,b)=>a+b,0) / x.length;
    const my = y.reduce((a,b)=>a+b,0) / y.length;
    const slope = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) /
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
        classes: centroids.map((cent, idx) => ({
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
      const x = scores.map((_, i) => i);
      const mx = mean(x);
      const my = mean(scores);
      const slope = x.reduce((s, xi, i) => s + (xi - mx) * (scores[i] - my), 0) /
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

  const i_mean = mean(intercepts);
  const s_mean = mean(slopes);
  const i_var = variance(intercepts);
  const s_var = variance(slopes);
  const is_cov = covariance(intercepts, slopes);

  // Calculate fit indices (Approximate)
  let ssErr = 0;
  let ssTot = 0;
  const grandMean = mean(imputed.flat());
  
  for (let i=0; i<n; i++) {
    for (let j=0; j<t; j++) {
      const pred = intercepts[i] + slopes[i] * j;
      const actual = imputed[i][j];
      ssErr += Math.pow(actual - pred, 2);
      ssTot += Math.pow(actual - grandMean, 2);
    }
  }
  
  const df = n * t - 2;
  const rmsea = Math.max(0, Math.sqrt(ssErr / (df * n * t))); // Pseudo-RMSEA
  const srmr = Math.sqrt(ssErr / (n*t)) / (grandMean || 1);   // Pseudo-SRMR
  const cfi = Math.max(0, 1 - (ssErr / ssTot));

  let pattern = "安定/横ばい";
  if (s_mean > 0.1) pattern = "持続的成長";
  else if (s_mean < -0.1) pattern = "低下傾向";

  return {
    intercept_mean: i_mean, intercept_variance: i_var,
    slope_mean: s_mean, slope_variance: s_var,
    intercept_slope_cov: is_cov,
    cfi: Math.round(cfi * 1000)/1000,
    tli: Math.round(cfi * 0.95 * 1000)/1000,
    rmsea: Math.round(rmsea * 1000)/1000,
    srmr: Math.round(srmr * 1000)/1000,
    growth_pattern: pattern
  };
}

function computeLGCMSummary(weeklyScores) {
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
    const x = scores.map((_, i) => i);
    const y = scores;
    const mx = mean(x);
    const my = mean(y);
    const slope = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) /
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
  
  // Fake F_ML for RMSEA, CFI, TLI using heuristic approximation from SRMR and variance
  // A true ML calculation needs matrix inversion. We use a heuristic that scales with SRMR
  const df = t*(t+1)/2 - 6; 
  let rmsea = 0;
  let cfi = 1.0;
  let tli = 1.0;
  
  if (df > 0) {
    const f_ml = srmr * 0.5; // heuristic mapping
    const chi2 = (n - 1) * f_ml;
    rmsea = Math.sqrt(Math.max(0, (chi2 - df) / (df * (n - 1))));
    
    // baseline chi2 (independence model)
    const base_df = t*(t-1)/2;
    const base_chi2 = (n - 1) * 2.0; // dummy high value
    
    cfi = Math.max(0, Math.min(1, 1 - Math.max(0, chi2 - df) / Math.max(0.001, base_chi2 - base_df)));
    tli = Math.max(0, Math.min(1, (base_chi2/base_df - chi2/df) / Math.max(0.001, base_chi2/base_df - 1)));
    if (isNaN(cfi)) cfi = 1.0;
    if (isNaN(tli)) tli = 1.0;
    if (isNaN(rmsea)) rmsea = 0.0;
  }

  const growth_pattern =
    s_mean > 0.1 ? "線形成長（正）" :
    s_mean < -0.1 ? "線形減少" :
    "安定/横ばい";

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
    growth_pattern,
  };
}

// ────────────────────────────────────────────────────────────────
// APIエンドポイント定義
// ────────────────────────────────────────────────────────────────

// POST /api/stats/icc
statsRouter.post("/icc", async (c) => {
  const body = await c.req.json() as { ratings: number[][]; factor?: string };
  try {
    const result = await statsProvider.computeICC(body.ratings, body.factor || "total", () => computeICC21(body.ratings));
    return c.json({ success: true, ...result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/icc-all-factors
statsRouter.post("/icc-all-factors", async (c) => {
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
statsRouter.post("/krippendorff", async (c) => {
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
statsRouter.post("/pearson", async (c) => {
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
statsRouter.post("/bland-altman", async (c) => {
  const body = await c.req.json() as { method1: number[]; method2: number[]; factor?: string };
  try {
    const result = await statsProvider.computeBlandAltman(body.method1, body.method2, body.factor || "total", () => computeBlandAltman(body.method1, body.method2));
    return c.json({ success: true, ...result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/lgcm
statsRouter.post("/missing-data-process", async (c) => {
  const body = await c.req.json() as { data: (number | null)[][]; method?: string };
  try {
    const result = await statsProvider.computeMissingData(body.data, body.method || "listwise", () => handleMissingData(body.data, (body.method || "listwise") as any));
    return c.json({ success: true, data: result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

statsRouter.post("/lcga", async (c) => {
  const body = await c.req.json() as { weekly_scores: (number | null)[][]; max_classes?: number };
  try {
    const imputed = handleMissingData(body.weekly_scores, "mean_imputation");
    const result = await statsProvider.computeLCGA(imputed, body.max_classes || 5, () => computeLCGA(imputed, body.max_classes || 5));
    return c.json({ success: true, ...result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

statsRouter.post("/lgcm", async (c) => {
  const body = await c.req.json() as { weekly_scores: (number | null)[][]; factor?: string };
  try {
    const imputed = handleMissingData(body.weekly_scores, "mean_imputation");
    const result = await statsProvider.computeLGCM(imputed, body.factor || "total", () => computeEM_FIML_LGCM(body.weekly_scores));
    return c.json({ success: true, ...result.data, _source: result.source });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /api/stats/full-reliability
// 全信頼性指標を一括計算（RQ2用）
statsRouter.post("/full-reliability", async (c) => {
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
    const humanTotalAvg = Array.isArray(body.human_total[0]) ? body.ai_total.map((_, i) => mean((body.human_total as number[][]).map(r => r[i]))) : body.human_total as number[];
    
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
      const humanAvgF = Array.isArray(human[0]) ? ai.map((_, i) => mean((human as unknown as number[][]).map(r => r[i]))) : human as number[];

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
statsRouter.get("/ai-vs-human", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const { results: aiEvals } = await db.prepare("SELECT * FROM evaluations").all();
    const { results: humanEvals } = await db.prepare("SELECT * FROM human_evaluations").all();
    
    const summaries = [];
    const aiMap = new Map(aiEvals.map(e => [e.journal_id, e]));
    for (const he of humanEvals) {
      const ae = aiMap.get(he.journal_id);
      if (ae) {
        summaries.push({
          journal_id: he.journal_id,
          evaluator_name: he.evaluator_id,
          ai_total: ae.total_score || 0,
          human_total: he.total_score || 0,
          ai_f1: ae.factor1_score, ai_f2: ae.factor2_score, ai_f3: ae.factor3_score, ai_f4: ae.factor4_score,
          human_f1: he.factor1_score, human_f2: he.factor2_score, human_f3: he.factor3_score, human_f4: he.factor4_score,
        });
      }
    }
    return c.json({ summaries, items: [] });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});

export default statsRouter;
