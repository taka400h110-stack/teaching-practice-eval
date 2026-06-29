/**
 * 統計計算ユーティリティ (Cloudflare Workers 環境で動作する純粋関数)
 *
 * 教育実習日誌の量的分析 (記述統計 / 相関 / t 検定) に必要な最小セット。
 * R の psych::describe / cor.test / t.test と整合する出力を返す。
 *
 * 参考:
 *  - APA 7th edition 報告様式 (mean, SD, n)
 *  - Welch's t-test (等分散を仮定しない / SPSS デフォルト)
 *  - Pearson 相関係数 + Fisher z 変換による 95% CI
 */

/** null/undefined/NaN を除いた数値配列に変換 */
export function cleanNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => typeof v === "number" && !isNaN(v) && isFinite(v));
}

/**
 * 統計計算をスキップ / 退化した理由 (Phase 7-3: edge case 表示改善)
 *
 *  - `insufficient_n`         : 必要な n に満たない (welch: n<2, paired: n<2, pearson: n<3, etc.)
 *  - `insufficient_n_for_ci`  : 計算は可能だが CI 推定には n が足りない (pearson の n<4 など)
 *  - `no_variance`            : SD = 0 / 分母 0 (定数列 / pairedTTest の se_diff=0 / welch の se=0)
 *  - `perfect_correlation`    : |r| = 1 で t/p は計算可能だが CI が不定
 *  - `no_pairs`               : 対応 pair が 1 つも取れない (xs/ys 全 null など)
 *  - `no_complete_pairs`      : pearson で listwise 後の n が 0
 */
export type StatsSkipReason =
  | "insufficient_n"
  | "insufficient_n_for_ci"
  | "no_variance"
  | "perfect_correlation"
  | "no_pairs"
  | "no_complete_pairs";

export interface DescriptiveStats {
  n: number;
  mean: number | null;
  sd: number | null; // 標本標準偏差 (n-1)
  median: number | null;
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
  skewness: number | null; // Fisher-Pearson 標準化モーメント (bias adjusted)
  kurtosis: number | null; // excess kurtosis (正規分布で 0)
  se: number | null; // 標準誤差 (SD / sqrt(n))
  /** Phase 7-3: edge-case 注釈 (n=0 や n=1 で SD/skew/kurt が計算不能のとき) */
  skipped?: boolean;
  skip_reason?: StatsSkipReason;
}

const EMPTY_DESC: DescriptiveStats = {
  n: 0,
  mean: null,
  sd: null,
  median: null,
  min: null,
  max: null,
  q1: null,
  q3: null,
  skewness: null,
  kurtosis: null,
  se: null,
  skipped: true,
  skip_reason: "insufficient_n",
};

/** 記述統計を一括計算 */
export function describe(values: Array<number | null | undefined>): DescriptiveStats {
  const xs = cleanNumbers(values);
  const n = xs.length;
  if (n === 0) return { ...EMPTY_DESC };

  const mean = xs.reduce((s, x) => s + x, 0) / n;

  // 分散・SD (n-1 で割る不偏推定)
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const x of xs) {
    const d = x - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  // Phase 7-3: n=1 のときは SD を 0 ではなく null として扱う (計算不能)
  const sd: number | null = n > 1 ? Math.sqrt(m2 / (n - 1)) : null;

  // ソート済み配列で min/max/median/Q1/Q3
  const sorted = [...xs].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  // 歪度 (Fisher-Pearson, n >= 3, SciPy bias=False と一致)
  let skewness: number | null = null;
  if (n >= 3 && sd != null && sd > 0) {
    const g1 = (m3 / n) / Math.pow(m2 / n, 1.5);
    skewness = (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
  }

  // 尖度 (excess kurtosis, n >= 4, SciPy bias=False と一致)
  let kurtosis: number | null = null;
  if (n >= 4 && sd != null && sd > 0) {
    const g2 = (m4 / n) / Math.pow(m2 / n, 2) - 3;
    kurtosis = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
  }

  const se = sd != null ? sd / Math.sqrt(n) : null;

  // Phase 7-3: edge-case 注釈
  //   - n=1               : SD/skew/kurt が計算不能
  //   - n>=2 かつ SD=0    : 完全に定数列 (分散ゼロ)
  let skipped: boolean | undefined;
  let skip_reason: StatsSkipReason | undefined;
  if (n < 2) {
    skipped = true;
    skip_reason = "insufficient_n";
  } else if (sd != null && sd === 0) {
    skipped = true;
    skip_reason = "no_variance";
  }

  return {
    n, mean, sd, median, min, max, q1, q3, skewness, kurtosis, se,
    ...(skipped ? { skipped, skip_reason } : {}),
  };
}

function quantile(sorted: number[], p: number): number | null {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];
  // R type 7 (デフォルト): h = (n - 1) * p
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export interface PearsonResult {
  r: number | null;
  n: number;
  t: number | null;
  df: number | null;
  p: number | null; // 両側 p 値
  ci_lower: number | null; // 95% CI (Fisher z)
  ci_upper: number | null;
  /** Phase 7-3: edge-case 注釈 */
  skipped?: boolean;
  skip_reason?: StatsSkipReason;
}

/**
 * ピアソン積率相関係数 + 有意性検定
 * pair-wise complete observations のみ使用
 *
 * Phase 7-3 edge-case 取り扱い:
 *   - listwise 後の n が 0           → skip_reason='no_complete_pairs'
 *   - n が 1〜2 (n<3)                → skip_reason='insufficient_n'
 *   - dx2*dy2 = 0 (どちらか定数列)   → skip_reason='no_variance'
 *   - |r| = 1 (完全相関)             → r/t/p は算出 + skip_reason='perfect_correlation'
 *                                       (CI が Fisher z 変換で発散するため CI のみ null)
 *   - 計算は可能だが n<=3            → skip_reason='insufficient_n_for_ci'
 *                                       (CI を Fisher z 変換で出すには n>=4 が必要)
 */
export function pearson(
  xs: Array<number | null | undefined>,
  ys: Array<number | null | undefined>,
): PearsonResult {
  if (xs.length !== ys.length) {
    throw new Error("pearson: x and y must have same length");
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (
      typeof x === "number" && !isNaN(x) && isFinite(x) &&
      typeof y === "number" && !isNaN(y) && isFinite(y)
    ) {
      pairs.push([x, y]);
    }
  }
  const n = pairs.length;
  if (n === 0) {
    return {
      r: null, n, t: null, df: null, p: null, ci_lower: null, ci_upper: null,
      skipped: true, skip_reason: "no_complete_pairs",
    };
  }
  if (n < 3) {
    return {
      r: null, n, t: null, df: null, p: null, ci_lower: null, ci_upper: null,
      skipped: true, skip_reason: "insufficient_n",
    };
  }

  let sx = 0, sy = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; }
  const mx = sx / n;
  const my = sy / n;

  let num = 0, dx2 = 0, dy2 = 0;
  for (const [x, y] of pairs) {
    const a = x - mx;
    const b = y - my;
    num += a * b;
    dx2 += a * a;
    dy2 += b * b;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) {
    return {
      r: null, n, t: null, df: null, p: null, ci_lower: null, ci_upper: null,
      skipped: true, skip_reason: "no_variance",
    };
  }
  const r = num / denom;
  const df = n - 2;

  // t 統計量と両側 p 値
  let t: number | null = null;
  let p: number | null = null;
  if (Math.abs(r) < 1) {
    t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r);
    p = 2 * (1 - studentTCDF(Math.abs(t), df));
  } else {
    t = r > 0 ? Infinity : -Infinity;
    p = 0;
  }

  // Fisher z 変換による 95% CI
  let ci_lower: number | null = null;
  let ci_upper: number | null = null;
  if (Math.abs(r) < 1 && n > 3) {
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const se_z = 1 / Math.sqrt(n - 3);
    const zL = z - 1.96 * se_z;
    const zU = z + 1.96 * se_z;
    ci_lower = (Math.exp(2 * zL) - 1) / (Math.exp(2 * zL) + 1);
    ci_upper = (Math.exp(2 * zU) - 1) / (Math.exp(2 * zU) + 1);
  }

  // Phase 7-3: CI 不在の理由を機械可読に
  let skipped: boolean | undefined;
  let skip_reason: StatsSkipReason | undefined;
  if (Math.abs(r) >= 1) {
    skipped = true;
    skip_reason = "perfect_correlation";
  } else if (n <= 3) {
    skipped = true;
    skip_reason = "insufficient_n_for_ci";
  }

  return {
    r, n, t, df, p, ci_lower, ci_upper,
    ...(skipped ? { skipped, skip_reason } : {}),
  };
}

export interface TTestResult {
  t: number | null;
  df: number | null;
  p: number | null; // 両側 p 値
  n1: number;
  n2: number;
  mean1: number | null;
  mean2: number | null;
  sd1: number | null;
  sd2: number | null;
  mean_diff: number | null;
  se_diff: number | null;
  cohen_d: number | null; // 効果量 (pooled SD)
  test_type: "welch_independent" | "paired" | "insufficient_data";
  /** Phase 7-3: edge-case 注釈 */
  skipped?: boolean;
  skip_reason?: StatsSkipReason;
}

/**
 * Welch の t 検定 (等分散を仮定しない、独立 2 群)
 */
export function welchTTest(
  group1: Array<number | null | undefined>,
  group2: Array<number | null | undefined>,
): TTestResult {
  const xs = cleanNumbers(group1);
  const ys = cleanNumbers(group2);
  const n1 = xs.length;
  const n2 = ys.length;
  if (n1 < 2 || n2 < 2) {
    return {
      t: null, df: null, p: null, n1, n2,
      mean1: n1 > 0 ? xs.reduce((s, x) => s + x, 0) / n1 : null,
      mean2: n2 > 0 ? ys.reduce((s, y) => s + y, 0) / n2 : null,
      sd1: null, sd2: null, mean_diff: null, se_diff: null, cohen_d: null,
      test_type: "insufficient_data",
      skipped: true,
      skip_reason: "insufficient_n",
    };
  }

  const m1 = xs.reduce((s, x) => s + x, 0) / n1;
  const m2 = ys.reduce((s, y) => s + y, 0) / n2;
  const v1 = xs.reduce((s, x) => s + (x - m1) ** 2, 0) / (n1 - 1);
  const v2 = ys.reduce((s, y) => s + (y - m2) ** 2, 0) / (n2 - 1);
  const sd1 = Math.sqrt(v1);
  const sd2 = Math.sqrt(v2);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) {
    // 両群とも分散ゼロ (定数列同士) → t/df/p は計算不能
    return {
      t: null, df: null, p: null, n1, n2, mean1: m1, mean2: m2, sd1, sd2,
      mean_diff: m1 - m2, se_diff: 0, cohen_d: null,
      test_type: "welch_independent",
      skipped: true,
      skip_reason: "no_variance",
    };
  }

  const t = (m1 - m2) / se;
  // Welch-Satterthwaite 自由度
  const dfNum = (v1 / n1 + v2 / n2) ** 2;
  const dfDen =
    (v1 / n1) ** 2 / (n1 - 1) +
    (v2 / n2) ** 2 / (n2 - 1);
  const df = dfNum / dfDen;
  const p = 2 * (1 - studentTCDF(Math.abs(t), df));

  // Cohen's d (pooled SD)
  const pooledSD = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohen_d = pooledSD > 0 ? (m1 - m2) / pooledSD : null;

  return {
    t, df, p, n1, n2, mean1: m1, mean2: m2, sd1, sd2,
    mean_diff: m1 - m2, se_diff: se, cohen_d,
    test_type: "welch_independent",
  };
}

/**
 * 対応のある t 検定 (paired t-test)
 * 例: 同じ日誌に対する AI 評価と人間評価の差
 */
export function pairedTTest(
  xs: Array<number | null | undefined>,
  ys: Array<number | null | undefined>,
): TTestResult {
  if (xs.length !== ys.length) {
    throw new Error("pairedTTest: x and y must have same length");
  }
  const diffs: number[] = [];
  const xVals: number[] = [];
  const yVals: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (
      typeof x === "number" && !isNaN(x) && isFinite(x) &&
      typeof y === "number" && !isNaN(y) && isFinite(y)
    ) {
      diffs.push(x - y);
      xVals.push(x);
      yVals.push(y);
    }
  }
  const n = diffs.length;
  if (n < 2) {
    return {
      t: null, df: null, p: null, n1: n, n2: n,
      mean1: null, mean2: null, sd1: null, sd2: null,
      mean_diff: null, se_diff: null, cohen_d: null,
      test_type: "insufficient_data",
      skipped: true,
      skip_reason: n === 0 ? "no_pairs" : "insufficient_n",
    };
  }
  const mD = diffs.reduce((s, d) => s + d, 0) / n;
  const vD = diffs.reduce((s, d) => s + (d - mD) ** 2, 0) / (n - 1);
  const sdD = Math.sqrt(vD);
  const se = sdD / Math.sqrt(n);
  const df = n - 1;

  const mX = xVals.reduce((s, x) => s + x, 0) / n;
  const mY = yVals.reduce((s, y) => s + y, 0) / n;
  const sdX = Math.sqrt(xVals.reduce((s, x) => s + (x - mX) ** 2, 0) / (n - 1));
  const sdY = Math.sqrt(yVals.reduce((s, y) => s + (y - mY) ** 2, 0) / (n - 1));

  let t: number | null = null;
  let p: number | null = null;
  let cohen_d: number | null = null;
  if (se > 0) {
    t = mD / se;
    p = 2 * (1 - studentTCDF(Math.abs(t), df));
    cohen_d = sdD > 0 ? mD / sdD : null; // Cohen's dz (paired)
  }

  // Phase 7-3: 差分の SD=0 (= 全 pair で AI と人間が完全一致) は機械可読化
  const skipped = se === 0;
  const skip_reason: StatsSkipReason | undefined = skipped ? "no_variance" : undefined;

  return {
    t, df, p, n1: n, n2: n, mean1: mX, mean2: mY, sd1: sdX, sd2: sdY,
    mean_diff: mD, se_diff: se, cohen_d,
    test_type: "paired",
    ...(skipped ? { skipped, skip_reason } : {}),
  };
}

// ────────────────────────────────────────────────────────────────
// Student t 分布の累積分布関数 (CDF)
// 不完全ベータ関数を用いた精度の高い実装 (Numerical Recipes ベース)
// ────────────────────────────────────────────────────────────────

/** Student t 分布の累積分布関数 P(T <= t) */
export function studentTCDF(t: number, df: number): number {
  if (df <= 0) return NaN;
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const ib = incompleteBeta(x, a, b);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

// ────────────────────────────────────────────────────────────────
// F 分布 (Snedecor) の CDF / 生存関数 / 分位点
// 不完全ベータ関数 I_x(a,b) を用いた高精度実装。
// ICC(2,1) の F 検定 p 値および Shrout & Fleiss (1979) 信頼区間に使用。
// ────────────────────────────────────────────────────────────────

/** F 分布の累積分布関数 P(F <= f) , df1, df2 は自由度 */
export function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 0;
  const x = (df1 * f) / (df1 * f + df2);
  return incompleteBeta(x, df1 / 2, df2 / 2);
}

/** F 分布の生存関数 P(F > f) = 上側確率 (F 検定 p 値) */
export function fSF(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  return 1 - fCDF(f, df1, df2);
}

/**
 * F 分布の分位点 (逆 CDF): P(F <= q) = p となる q を返す。
 * 二分法 (bisection) で fCDF を逆解きする。Shrout & Fleiss CI で
 * F(1-α/2; df1, df2) を求めるために使用。
 */
export function fInv(p: number, df1: number, df2: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  if (df1 <= 0 || df2 <= 0) return NaN;
  let lo = 0;
  let hi = 1;
  // 上限を p を超えるまで指数的に拡張
  while (fCDF(hi, df1, df2) < p && hi < 1e8) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const c = fCDF(mid, df1, df2);
    if (Math.abs(c - p) < 1e-10) return mid;
    if (c < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 正規化不完全ベータ関数 I_x(a, b) */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) return NaN;
  if (x === 0 || x === 1) return x;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  } else {
    return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
  }
}

/** ベータ関数の連分数展開 (Lentz 法) */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const MAX_ITER = 200;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** log Γ(x) - Lanczos 近似 */
function logGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// ────────────────────────────────────────────────────────────────
// 表示フォーマット (APA 7th edition 準拠)
// ────────────────────────────────────────────────────────────────

/** 小数点 d 桁にフォーマット、null は "—" */
export function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || isNaN(n) || !isFinite(n)) return "—";
  return n.toFixed(digits);
}

/** APA 形式の p 値 (p < .001 の慣例) */
export function fmtP(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return "—";
  if (p < 0.001) return "< .001";
  // APA: 小数点ゼロを省く ".XXX"
  return p.toFixed(3).replace(/^0/, "");
}

/** APA 形式の相関係数 / 効果量 (絶対値が 1 未満の指標) - 先頭の 0 を省く */
export function fmtCoef(r: number | null | undefined, digits = 2): string {
  if (r == null || isNaN(r)) return "—";
  const s = r.toFixed(digits);
  // ".XX" / "-.XX"
  return s.replace(/^(-?)0\./, "$1.");
}

/** p 値から有意水準のアスタリスクを返す ("***" / "**" / "*" / "") */
export function pStars(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  return "";
}

// ────────────────────────────────────────────────────────────────
// Phase 7-3: edge case 表示ヘルパ
// ────────────────────────────────────────────────────────────────

/** skip_reason を日本語の短いラベルに変換 (テーブル末尾列や注記に使用) */
export function formatSkipReason(reason: StatsSkipReason | undefined): string {
  switch (reason) {
    case "insufficient_n":        return "n < 必要数";
    case "insufficient_n_for_ci": return "n < 4 (CI 算出不能)";
    case "no_variance":           return "SD = 0";
    case "perfect_correlation":   return "|r| = 1";
    case "no_pairs":              return "対応 pair 0";
    case "no_complete_pairs":     return "両側 valid pair 0";
    default:                      return "";
  }
}

/**
 * 統計結果のセル表示: 値が null なら skip_reason ラベル付きで "—" を返す。
 * 値が有限値なら通常の fmt(value, digits) と同じ動作。
 *
 *   fmtCell(t.t, t)          → "2.34" / "— (n < 必要数)"
 *   fmtCell(t.df, t, { digits: 1 })
 */
export function fmtCell(
  value: number | null | undefined,
  result: { skipped?: boolean; skip_reason?: StatsSkipReason } | null | undefined,
  opts: { digits?: number; emptyOnly?: boolean } = {},
): string {
  const digits = opts.digits ?? 2;
  if (value != null && Number.isFinite(value)) return value.toFixed(digits);
  if (result?.skipped && !opts.emptyOnly) {
    const label = formatSkipReason(result.skip_reason);
    return label ? `— (${label})` : "—";
  }
  return "—";
}

/** p 値専用: APA 形式で値があれば ".XXX"、なければ "— (理由)" */
export function fmtPCell(
  p: number | null | undefined,
  result: { skipped?: boolean; skip_reason?: StatsSkipReason } | null | undefined,
): string {
  if (p != null && Number.isFinite(p)) return fmtP(p);
  if (result?.skipped) {
    const label = formatSkipReason(result.skip_reason);
    return label ? `— (${label})` : "—";
  }
  return "—";
}

// ────────────────────────────────────────────────────────────────
// Phase 7-4: 多重比較補正 (Multiple comparison correction)
// ────────────────────────────────────────────────────────────────

/**
 * 多重比較補正の方式
 *
 *  - `none`        : 補正なし (= 元の p をそのまま返す。デフォルト)
 *  - `bonferroni`  : Bonferroni 補正 (single-step, family-wise error rate)
 *                    p_adj = min(p × m, 1)
 *  - `holm`        : Holm 補正 (step-down sequential, family-wise error rate)
 *                    昇順にソートし `p_adj[i] = max(p_adj[i-1], min(p[i] × (m - i), 1))`
 *  - `fdr_bh`      : Benjamini-Hochberg 補正 (false discovery rate)
 *                    昇順にソートし `p_adj[i] = min_{k≥i}(p[k] × m / (k+1))`、最大値 1 で clamp、
 *                    元順序復元時に単調性を保証。
 *
 * 一般に Bonferroni ≥ Holm ≥ BH-FDR(同 p 値に対して)で、BH-FDR が最も検出力が高い。
 *
 * 設計ポイント:
 *  - 入力配列 (pValues) の `null` は test family から除外 (m に数えない)。
 *    戻り値の対応位置にも `null` を入れて返す → 呼び出し側は表示順を維持できる。
 *  - これにより Phase 7-3 の skip_reason で p=null になった test を自動的に除外できる。
 */
export type MultipleComparisonMethod = "none" | "bonferroni" | "holm" | "fdr_bh";

const VALID_METHODS: ReadonlySet<MultipleComparisonMethod> = new Set([
  "none", "bonferroni", "holm", "fdr_bh",
]);

/** クエリ文字列等から MultipleComparisonMethod を安全にパース (不明値は "none") */
export function parseCorrectionMethod(raw: string | null | undefined): MultipleComparisonMethod {
  if (!raw) return "none";
  const v = raw.toLowerCase();
  return (VALID_METHODS as Set<string>).has(v) ? (v as MultipleComparisonMethod) : "none";
}

/** 表示用ラベル (Markdown 注記や API レスポンスのメタデータに使用) */
export function formatCorrectionMethod(method: MultipleComparisonMethod): string {
  switch (method) {
    case "bonferroni": return "Bonferroni 補正";
    case "holm":       return "Holm 補正 (step-down)";
    case "fdr_bh":     return "Benjamini-Hochberg FDR 補正";
    case "none":       return "補正なし";
    default:           return "補正なし";
  }
}

/**
 * 多重比較補正された p 値配列を返す。
 *
 * @param pValues 元の p 値配列 (null / NaN / 非有限値は test family から除外)
 * @param method  補正方式 ("none" の場合は元の p を浅いコピーで返す)
 * @returns       同じ長さの配列。null だった位置には null、補正できた位置には [0, 1] の数値。
 *
 * 例:
 *   correctPValues([0.01, 0.04, null, 0.20], "bonferroni")
 *     → [0.03, 0.12, null, 0.60]   (m = 3, null は除外)
 *
 *   correctPValues([0.01, 0.04, 0.03], "holm")
 *     → ソート: [0.01(i=0), 0.03(i=1), 0.04(i=2)]
 *        p_adj_sorted = [min(0.01*3,1)=0.03, max(0.03, min(0.03*2,1))=0.06, max(0.06, min(0.04*1,1))=0.06]
 *        元順序復元: [0.03, 0.06, 0.06]
 *
 *   correctPValues([0.01, 0.04, 0.03, 0.20], "fdr_bh")
 *     → m=4, ソート: [0.01, 0.03, 0.04, 0.20]
 *        raw = [0.01*4/1=0.04, 0.03*4/2=0.06, 0.04*4/3=0.0533, 0.20*4/4=0.20]
 *        後ろから単調化 (右から最小値を取る): [0.04, 0.0533, 0.0533, 0.20]
 *        clamp ≤ 1
 *        元順序復元: [0.04, 0.0533, 0.0533, 0.20]
 */
export function correctPValues(
  pValues: Array<number | null | undefined>,
  method: MultipleComparisonMethod,
): Array<number | null> {
  // 1) 有効 p 値のインデックスを抽出 (null/NaN/非有限値はスキップ)
  const validIdx: number[] = [];
  const validP: number[] = [];
  for (let i = 0; i < pValues.length; i++) {
    const p = pValues[i];
    if (typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1) {
      validIdx.push(i);
      validP.push(p);
    }
  }
  const m = validP.length;

  // 出力は null で初期化 (元配列で除外された位置はそのまま null)
  const out: Array<number | null> = new Array(pValues.length).fill(null);

  if (m === 0) return out;

  // method = "none" は浅いコピー (除外位置は null のまま)
  if (method === "none") {
    for (let k = 0; k < validIdx.length; k++) out[validIdx[k]] = validP[k];
    return out;
  }

  // 補正後 p (validP と同じ並び)
  const adj: number[] = new Array(m);

  if (method === "bonferroni") {
    for (let k = 0; k < m; k++) {
      adj[k] = Math.min(validP[k] * m, 1);
    }
  } else if (method === "holm") {
    // 昇順ソート (元のインデックス k を保持)
    const order = validP
      .map((p, k) => ({ p, k }))
      .sort((a, b) => a.p - b.p);
    // step-down: p_adj_sorted[i] = max(prev, min(p × (m - i), 1))
    let prev = 0;
    const adjSorted: number[] = new Array(m);
    for (let i = 0; i < m; i++) {
      const raw = Math.min(order[i].p * (m - i), 1);
      const cur = Math.max(prev, raw);
      adjSorted[i] = cur;
      prev = cur;
    }
    // 元順序 (validP の k) に戻す
    for (let i = 0; i < m; i++) {
      adj[order[i].k] = adjSorted[i];
    }
  } else if (method === "fdr_bh") {
    // 昇順ソート (元のインデックス k を保持)
    const order = validP
      .map((p, k) => ({ p, k }))
      .sort((a, b) => a.p - b.p);
    // raw[i] = p × m / (i + 1)
    const raw: number[] = new Array(m);
    for (let i = 0; i < m; i++) {
      raw[i] = Math.min(order[i].p * m / (i + 1), 1);
    }
    // 後ろから単調化 (右から最小値を取る) で単調非減少を保証
    const adjSorted: number[] = new Array(m);
    let minSoFar = Infinity;
    for (let i = m - 1; i >= 0; i--) {
      minSoFar = Math.min(minSoFar, raw[i]);
      adjSorted[i] = minSoFar;
    }
    // 元順序 (validP の k) に戻す
    for (let i = 0; i < m; i++) {
      adj[order[i].k] = adjSorted[i];
    }
  }

  // validIdx 経由で元配列の位置にマップ
  for (let k = 0; k < validIdx.length; k++) {
    out[validIdx[k]] = adj[k];
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
// 信頼性分析 (原著論文準拠)
//   - ICC(2,1): Shrout & Fleiss (1979) 二元変量効果モデル, 絶対一致
//   - Krippendorff's α: Krippendorff (2018) 4th ed. 一致行列ベース
// ════════════════════════════════════════════════════════════════

export interface Icc21Result {
  icc: number;
  ci95: [number, number];
  f: number;
  df1: number;
  df2: number;
  p: number;
  interpretation: string;
}

/**
 * ICC(2,1) — 二元変量効果モデル, 単一測定, 絶対一致
 * Shrout & Fleiss (1979) Case 2, Eq.(7) (point) / Table 上の CI 公式に準拠。
 *
 * ratings[rater][subject] (k 評価者 × n 対象)
 *
 * 点推定:   ICC = (MS_S - MS_E) / (MS_S + (k-1)MS_E + (k/n)(MS_R - MS_E))
 * F 検定:   F0 = MS_S / MS_E,  df1 = n-1, df2 = (n-1)(k-1),  p = P(F > F0)
 * 95%CI:    Shrout & Fleiss (1979) の F 分布分位点を用いた式 (下記)
 */
export function computeICC21(ratings: number[][], alpha = 0.05): Icc21Result {
  const k = ratings.length;
  const n = ratings[0]?.length ?? 0;
  if (k < 2 || n < 2) {
    return { icc: 0, ci95: [0, 0], f: 0, df1: 0, df2: 0, p: 1, interpretation: "データ不足" };
  }

  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const matrix: number[][] = Array.from({ length: n }, (_, i) => ratings.map((r) => r[i]));
  const grandMean = mean(matrix.flatMap((row) => row));

  const raterMeans = ratings.map((r) => mean(r));
  const SS_R = n * raterMeans.reduce((s, rm) => s + (rm - grandMean) ** 2, 0);
  const subjectMeans = matrix.map((row) => mean(row));
  const SS_S = k * subjectMeans.reduce((s, sm) => s + (sm - grandMean) ** 2, 0);
  const SS_T = matrix.flatMap((row) => row).reduce((s, v) => s + (v - grandMean) ** 2, 0);
  const SS_E = SS_T - SS_R - SS_S;

  const df_R = k - 1;
  const df_S = n - 1;
  const df_E = (k - 1) * (n - 1);

  const MS_R = SS_R / df_R;
  const MS_S = SS_S / df_S;
  const MS_E = SS_E / Math.max(df_E, 1);

  const icc = (MS_S - MS_E) / (MS_S + (k - 1) * MS_E + (k / n) * (MS_R - MS_E));
  const iccClamped = Math.max(0, Math.min(1, icc));

  // F 検定: F0 = MS_S / MS_E, 上側確率 (正確な F 分布)
  const F0 = MS_E > 0 ? MS_S / MS_E : 0;
  const df1 = df_S;          // n - 1
  const df2 = df_E;          // (n-1)(k-1)
  const p = F0 > 0 ? fSF(F0, df1, df2) : 1;

  // 95%CI — Shrout & Fleiss (1979), ICC(2,1) 絶対一致の標準形
  //   FL = F0 / F(1-α/2; n-1, (n-1)(k-1))
  //   FU = F0 * F(1-α/2; (n-1)(k-1), n-1)
  //   L  = (FL - 1) / (FL + k - 1)
  //   U  = (FU - 1) / (FU + k - 1)
  let L = 0;
  let U = 0;
  if (F0 > 0) {
    const Fq1 = fInv(1 - alpha / 2, df1, df2);
    const Fq2 = fInv(1 - alpha / 2, df2, df1);
    const FL = F0 / Fq1;
    const FU = F0 * Fq2;
    L = (FL - 1) / (FL + k - 1);
    U = (FU - 1) / (FU + k - 1);
  }
  const ci95: [number, number] = [
    Math.max(0, Math.round(L * 1000) / 1000),
    Math.min(1, Math.round(U * 1000) / 1000),
  ];

  const interpretation =
    iccClamped >= 0.9 ? "非常に良好な信頼性" :
    iccClamped >= 0.75 ? "良好な信頼性（研究使用可）" :
    iccClamped >= 0.5 ? "中程度の信頼性（要注意）" :
    "低い信頼性（要改善）";

  return {
    icc: Math.round(iccClamped * 1000) / 1000,
    ci95,
    f: Math.round(F0 * 100) / 100,
    df1,
    df2,
    p: p < 0.001 ? Math.round(p * 1e6) / 1e6 : Math.round(p * 1000) / 1000,
    interpretation,
  };
}

export interface KrippendorffResult {
  alpha: number;
  interpretation: string;
}

/**
 * Krippendorff's α — 一致行列 (coincidence matrix) ベースの正準定義。
 * Krippendorff (2018) Content Analysis 4th ed. に準拠。
 *
 * α = 1 - D_o / D_e
 *   D_o = Σ_c Σ_{c'} o_{cc'} δ²(c,c') / (n_total)          (観測不一致)
 *   D_e = Σ_c Σ_{c'} n_c n_{c'} δ²(c,c') / (n_total(n_total-1)) (期待不一致)
 * ここで o は一致行列 (各単位 u 内で順序対 (i,j), i≠j を 1/(m_u-1) 重みで集計),
 * n_c は値 c の周辺度数, n_total は総ペア可能値数。
 *
 * ratings[rater][subject], null は欠測 (N/A)。
 * metric: "interval" → δ² = (c-c')², "ordinal"/"nominal" は別途近似。
 */
export function computeKrippendorffAlpha(
  ratings: (number | null)[][],
  metric: "interval" | "ordinal" | "nominal" = "interval",
): KrippendorffResult {
  const k = ratings.length;
  const n = ratings[0]?.length ?? 0;

  // 距離関数 δ²(a,b)
  const delta2 = (a: number, b: number): number => {
    if (metric === "nominal") return a === b ? 0 : 1;
    // interval も ordinal も区間距離の二乗を用いる (ordinal は近似)
    return (a - b) ** 2;
  };

  // 各単位 (subject) 内で有効な評価を集め, 一致行列の寄与を積算する
  // 観測不一致 D_o = Σ_units Σ_{i≠j} δ²(v_i, v_j) / (m_u - 1)
  // 期待不一致 D_e = Σ_{全ペア p≠q over all valid values} δ²(v_p, v_q) / (n_total - 1)
  const allValues: number[] = [];
  let D_o = 0;

  for (let s = 0; s < n; s++) {
    const vals = ratings.map((r) => r[s]).filter((v): v is number => v !== null && v !== undefined);
    const m = vals.length;
    if (m < 2) continue; // ペアを作れない単位は寄与しない
    let unitSum = 0;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i === j) continue;
        unitSum += delta2(vals[i], vals[j]);
      }
    }
    D_o += unitSum / (m - 1);
    vals.forEach((v) => allValues.push(v));
  }

  const nTotal = allValues.length;
  if (nTotal < 2) return { alpha: 1, interpretation: "データ不足" };

  // 期待不一致: 全有効値の順序対 (p≠q) の δ² 平均
  let D_e = 0;
  for (let p = 0; p < nTotal; p++) {
    for (let q = 0; q < nTotal; q++) {
      if (p === q) continue;
      D_e += delta2(allValues[p], allValues[q]);
    }
  }
  D_e = D_e / (nTotal - 1);

  if (D_e === 0) return { alpha: 1, interpretation: "完全一致" };

  const alpha = 1 - D_o / D_e;
  const alphaClamped = Math.max(-1, Math.min(1, alpha));

  const interpretation =
    alphaClamped >= 0.8 ? "良好な信頼性" :
    alphaClamped >= 0.667 ? "暫定的に許容可能" :
    "信頼性が低い（要改善）";

  return { alpha: Math.round(alphaClamped * 1000) / 1000, interpretation };
}
