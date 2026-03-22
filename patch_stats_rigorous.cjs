const fs = require('fs');
const file = 'src/api/routes/stats.ts';
let code = fs.readFileSync(file, 'utf8');

const emAlgorithm = `
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
`;

code = code.replace('function computeLGCMSummary', emAlgorithm + '\nfunction computeLGCMSummary');

code = code.replace(
  'statsRouter.post("/lgcm", async (c) => {',
  `statsRouter.post("/lgcm", async (c) => {
  const body = await c.req.json() as {
    weekly_scores: (number | null)[][];
    factor?: string;
    mode?: "legacy" | "rigorous";
  };
  try {
    let result;
    let missing_data_strategy = "listwise deletion (fallback)";
    let estimator = "OLS (legacy)";
    
    if (body.mode === "rigorous") {
      result = computeEM_FIML_LGCM(body.weekly_scores);
      missing_data_strategy = "EM Algorithm (FIML approximation)";
      estimator = "Two-stage EM-OLS";
    } else {
      // Filter nulls for legacy
      const cleanData = body.weekly_scores.map(row => row.map(v => v || 0));
      result = computeLGCMSummary(cleanData);
      missing_data_strategy = "mean imputation / listwise";
      estimator = "Two-stage OLS";
    }
    
    return c.json({ 
      success: true, 
      ...result, 
      factor: body.factor ?? "total",
      method: body.mode === "rigorous" ? "rigorous" : "legacy",
      estimator,
      missing_data_strategy
    });
`
);

// We need to remove the existing try body up to return to replace it correctly.
code = code.replace(/statsRouter\.post\("\/lgcm", async \(c\) => \{[\s\S]*?return c\.json\(\{ success: true, \.\.\.result, factor: body\.factor \?\? "total" \}\);\n  \} catch \(err\) \{/m, 
`statsRouter.post("/lgcm", async (c) => {
  const body = await c.req.json() as {
    weekly_scores: (number | null)[][];
    factor?: string;
    mode?: "legacy" | "rigorous";
  };
  try {
    let result;
    let missing_data_strategy = "listwise deletion (fallback)";
    let estimator = "OLS (legacy)";
    
    if (body.mode === "rigorous") {
      result = computeEM_FIML_LGCM(body.weekly_scores);
      missing_data_strategy = "EM Algorithm (FIML approximation)";
      estimator = "Two-stage EM-OLS";
    } else {
      const cleanData = body.weekly_scores.filter(row => !row.includes(null)) as number[][];
      const validData = cleanData.length > 0 ? cleanData : body.weekly_scores.map(row => row.map(v => v || 0));
      result = computeLGCMSummary(validData);
      missing_data_strategy = cleanData.length > 0 ? "listwise deletion" : "zero imputation";
      estimator = "Two-stage OLS";
    }
    
    return c.json({ 
      success: true, 
      ...result, 
      factor: body.factor ?? "total",
      method: body.mode === "rigorous" ? "rigorous" : "legacy",
      estimator,
      missing_data_strategy
    });
  } catch (err) {`);

fs.writeFileSync(file, code);
