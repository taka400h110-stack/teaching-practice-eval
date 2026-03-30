const fs = require('fs');
let code = fs.readFileSync('src/api/client.ts', 'utf8');

const newCode = `  getEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const res = await apiFetch(\`/api/data/evaluations/\${journalId}\`, { headers: {  } });
      if (!res.ok) throw new Error("Failed to fetch evaluation");
      const data = await res.json() as any;
      const evalData = data.evaluation || data;
      const items = data.items || (evalData.items_json ? JSON.parse(evalData.items_json) : []);
      return {
        id: evalData.id,
        journal_id: evalData.journal_id,
        status: "completed",
        factor_scores: {
          factor1: evalData.factor1_score || 0,
          factor2: evalData.factor2_score || 0,
          factor3: evalData.factor3_score || 0,
          factor4: evalData.factor4_score || 0
        },
        evaluation_items: items.map((i: any) => ({
          item_number: i.item_number || i.item,
          score: i.score || 0,
          evidence: i.evidence || "",
          feedback: i.feedback || ""
        })),
        overall_comment: evalData.overall_comment || "",
        total_score: evalData.total_score || 0,
        evaluated_item_count: evalData.evaluated_item_count || items.length || 0,
        tokens_used: evalData.tokens_used || 0,
        halo_check: evalData.halo_check || false
      };
    } catch { throw new Error("Evaluation not found"); }
  },`;

code = code.replace(/getEvaluation:\s*async\s*\([^\}]+\}\s*catch\s*\{[^\}]+\}\s*\},/, newCode);
fs.writeFileSync('src/api/client.ts', code);
