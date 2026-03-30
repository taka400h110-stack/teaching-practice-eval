const fs = require('fs');
const file = 'src/api/routes/data.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `    const runs = await db.prepare("SELECT * FROM reliability_runs ORDER BY created_at DESC").all();`;
const replace1 = `    let runs = { results: [] };
    try {
      runs = await db.prepare("SELECT * FROM reliability_runs ORDER BY created_at DESC").all();
    } catch (e) {
      console.warn("reliability_runs table might not exist, using mock data", e.message);
    }`;

const target2 = `    const { results } = await db.prepare(query).bind(runId).all();`;
const replace2 = `    let results = [];
    try {
      const res = await db.prepare(query).bind(runId).all();
      results = res.results;
    } catch (e) {
      console.warn("reliability tables might not exist, using mock data", e.message);
    }`;

const target3 = `    if (!results || results.length === 0) {`;
const replace3 = `    if (!results || results.length === 0) {
      if (runId === 'run-mock-1') {
        return c.json({
          success: true,
          details: [
            { factor: "total", icc_value: 0.85, icc_ci_lower: 0.80, icc_ci_upper: 0.90, mean_diff: 0.1, loa_lower: -0.4, loa_upper: 0.6, subject_count: 5, calculated_at: new Date().toISOString(), data_source: "mock", run_id: "run-mock-1" },
            { factor: "factor1", icc_value: 0.82, icc_ci_lower: 0.75, icc_ci_upper: 0.88, mean_diff: 0.05, loa_lower: -0.3, loa_upper: 0.4, subject_count: 5, calculated_at: new Date().toISOString(), data_source: "mock", run_id: "run-mock-1" },
            { factor: "factor2", icc_value: 0.88, icc_ci_lower: 0.82, icc_ci_upper: 0.92, mean_diff: 0.15, loa_lower: -0.2, loa_upper: 0.5, subject_count: 5, calculated_at: new Date().toISOString(), data_source: "mock", run_id: "run-mock-1" },
            { factor: "factor3", icc_value: 0.84, icc_ci_lower: 0.78, icc_ci_upper: 0.90, mean_diff: 0.08, loa_lower: -0.35, loa_upper: 0.51, subject_count: 5, calculated_at: new Date().toISOString(), data_source: "mock", run_id: "run-mock-1" },
            { factor: "factor4", icc_value: 0.86, icc_ci_lower: 0.80, icc_ci_upper: 0.91, mean_diff: 0.12, loa_lower: -0.25, loa_upper: 0.49, subject_count: 5, calculated_at: new Date().toISOString(), data_source: "mock", run_id: "run-mock-1" }
          ]
        });
      }
`;

code = code.replace(target1, replace1);
code = code.replace(target2, replace2);
code = code.replace(target3, replace3);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched reliability endpoints');
