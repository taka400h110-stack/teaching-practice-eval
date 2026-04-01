const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /getEvaluation: async \(journalId: string\): Promise<EvaluationResult> => \{[\s\S]*?return \{[\s\S]*?id: data\.id,[\s\S]*?journal_id: data\.journal_id,[\s\S]*?status: "completed",[\s\S]*?factor_scores: \{[\s\S]*?factor1: data\.factor1_score,[\s\S]*?factor2: data\.factor2_score,[\s\S]*?factor3: data\.factor3_score,[\s\S]*?factor4: data\.factor4_score[\s\S]*?\},[\s\S]*?evaluation_items: JSON\.parse\(\(data as any\)\.items_json \|\| "\[\]"\)\.map\(\(i: any\) => \(\{[\s\S]*?item_number: i\.item_number \|\| i\.item,[\s\S]*?score: i\.score,[\s\S]*?evidence: i\.evidence,[\s\S]*?feedback: i\.feedback[\s\S]*?\}\)\),[\s\S]*?overall_comment: data\.overall_comment \|\| "",[\s\S]*?total_score: data\.total_score \|\| 0,[\s\S]*?evaluated_item_count: data\.evaluated_item_count \|\| 0,[\s\S]*?tokens_used: data\.tokens_used \|\| 0,[\s\S]*?halo_check: data\.halo_check \|\| false[\s\S]*?\};[\s\S]*?\} catch/,
  `getEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const res = await apiFetch(\`/api/data/evaluations/\${journalId}\`, { headers: {  } });
      if (!res.ok) throw new Error("Failed to fetch evaluation");
      const resp = await res.json() as any;
      if (!resp.success || !resp.evaluation) throw new Error("Evaluation not found");
      const data = resp.evaluation;
      const items = resp.items || [];
      return {
        id: data.id,
        journal_id: data.journal_id,
        status: "completed",
        factor_scores: {
          factor1: data.factor1_score || 0,
          factor2: data.factor2_score || 0,
          factor3: data.factor3_score || 0,
          factor4: data.factor4_score || 0
        },
        evaluation_items: items.map((i: any) => ({
          item_number: i.item_number,
          score: i.score,
          evidence: i.evidence,
          feedback: i.feedback || i.comment
        })),
        overall_comment: data.overall_comment || "",
        total_score: data.total_score || 0,
        evaluated_item_count: items.length || 0,
        tokens_used: data.token_count || 0,
        halo_check: data.halo_effect_detected === 1
      };
    } catch`
);

content = content.replace(
  /getAllEvaluations: async \(\): Promise<EvaluationResult\[\]> => \{[\s\S]*?return data\.evaluations\.map\(\(e: any\) => \(\{[\s\S]*?id: e\.id,[\s\S]*?journal_id: e\.journal_id,[\s\S]*?status: "completed",[\s\S]*?factor_scores: \{[\s\S]*?factor1: e\.factor1_score,[\s\S]*?factor2: e\.factor2_score,[\s\S]*?factor3: e\.factor3_score,[\s\S]*?factor4: e\.factor4_score[\s\S]*?\},[\s\S]*?evaluation_items: JSON\.parse\(e\.items_json \|\| "\[\]"\)\.map\(\(i: any\) => \(\{[\s\S]*?item_number: i\.item_number \|\| i\.item,[\s\S]*?score: i\.score,[\s\S]*?evidence: i\.evidence,[\s\S]*?feedback: i\.feedback[\s\S]*?\}\)\),[\s\S]*?overall_comment: e\.overall_comment \|\| "",[\s\S]*?total_score: e\.total_score \|\| 0,[\s\S]*?evaluated_item_count: e\.evaluated_item_count \|\| 0,[\s\S]*?tokens_used: e\.tokens_used \|\| 0,[\s\S]*?halo_check: e\.halo_check \|\| false[\s\S]*?\}\)\);/,
  `getAllEvaluations: async (): Promise<EvaluationResult[]> => {
    try {
      const res = await apiFetch("/api/data/evaluations", { headers: {  } });
      if (!res.ok) throw new Error("Failed to fetch all evaluations");
      const data = await res.json() as any;
      return (data.evaluations || []).map((e: any) => ({
        id: e.id,
        journal_id: e.journal_id,
        status: "completed",
        factor_scores: {
          factor1: e.factor1_score || 0,
          factor2: e.factor2_score || 0,
          factor3: e.factor3_score || 0,
          factor4: e.factor4_score || 0
        },
        evaluation_items: [],
        overall_comment: e.overall_comment || "",
        total_score: e.total_score || 0,
        evaluated_item_count: 23,
        tokens_used: e.token_count || 0,
        halo_check: e.halo_effect_detected === 1
      }));`
);

fs.writeFileSync(file, content);
console.log("Fixed getEvaluation in client.ts");
