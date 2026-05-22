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
  const variance = n > 1 ? m2 / (n - 1) : 0;
  const sd = Math.sqrt(variance);

  // ソート済み配列で min/max/median/Q1/Q3
  const sorted = [...xs].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  // 歪度 (Fisher-Pearson, n >= 3, SciPy bias=False と一致)
  let skewness: number | null = null;
  if (n >= 3 && sd > 0) {
    const g1 = (m3 / n) / Math.pow(m2 / n, 1.5);
    skewness = (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
  }

  // 尖度 (excess kurtosis, n >= 4, SciPy bias=False と一致)
  let kurtosis: number | null = null;
  if (n >= 4 && sd > 0) {
    const g2 = (m4 / n) / Math.pow(m2 / n, 2) - 3;
    kurtosis = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
  }

  const se = n > 0 ? sd / Math.sqrt(n) : null;

  return { n, mean, sd, median, min, max, q1, q3, skewness, kurtosis, se };
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
}

/**
 * ピアソン積率相関係数 + 有意性検定
 * pair-wise complete observations のみ使用
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
  if (n < 3) {
    return { r: null, n, t: null, df: null, p: null, ci_lower: null, ci_upper: null };
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
    return { r: null, n, t: null, df: null, p: null, ci_lower: null, ci_upper: null };
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

  return { r, n, t, df, p, ci_lower, ci_upper };
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
    return {
      t: null, df: null, p: null, n1, n2, mean1: m1, mean2: m2, sd1, sd2,
      mean_diff: m1 - m2, se_diff: 0, cohen_d: null, test_type: "welch_independent",
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

  return {
    t, df, p, n1: n, n2: n, mean1: mX, mean2: mY, sd1: sdX, sd2: sdY,
    mean_diff: mD, se_diff: se, cohen_d,
    test_type: "paired",
  };
}

// ────────────────────────────────────────────────────────────────
// Student t 分布の累積分布関数 (CDF)
// 不完全ベータ関数を用いた精度の高い実装 (Numerical Recipes ベース)
// ────────────────────────────────────────────────────────────────

/** Student t 分布の累積分布関数 P(T <= t) */
function studentTCDF(t: number, df: number): number {
  if (df <= 0) return NaN;
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const ib = incompleteBeta(x, a, b);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
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
