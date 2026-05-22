const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(file, 'utf8');

const newRunEval = `runEvaluation: async (journalId: string): Promise<EvaluationResult> => {
    try {
      const user = JSON.parse(localStorage.getItem("user_info") ?? "{}");
      
      // 1. 日誌の中身を取得する
      const jRes = await apiFetch(\`/api/data/journals/\${journalId}\`);
      if (!jRes.ok) throw new Error("Failed to fetch journal for evaluation");
      const jData = await jRes.json() as any;
      if (!jData.success || !jData.journals || jData.journals.length === 0) throw new Error("Journal not found");
      const journal = jData.journals[0];

      // 2. AI評価APIを呼び出す
      const aiRes = await apiFetch("/api/ai/evaluate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal_content: journal.content || "",
          student_name: user.name || "学生",
          week_number: journal.week_number || 1,
          journal_id: journalId
        })
      });
      
      if (!aiRes.ok) throw new Error("Failed to call AI evaluate");
      const aiData: any = await aiRes.json();

      // 3. 評価結果を保存する
      const saveRes = await apiFetch("/api/data/evaluations", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal_id: journalId,
          evaluation: aiData.evaluation,
          model_name: aiData.model,
          prompt_version: aiData.prompt_version,
          temperature: aiData.temperature,
          token_count: aiData.token_count || 0,
          duration_ms: 0
        })
      });
      
      if (!saveRes.ok) throw new Error("Failed to save evaluation");

      // 最新の評価結果を再取得して返す
      return await apiClient.getEvaluation(journalId);
    } catch (err) {
      console.error("runEvaluation error:", err);
      throw new Error("Evaluation failed");
    }
  },`;

content = content.replace(/runEvaluation: async \(journalId: string\): Promise<EvaluationResult> => \{[\s\S]*?throw new Error\("Evaluation failed"\);\n    \}\n  \},/, newRunEval);

fs.writeFileSync(file, content);
console.log("Fixed runEvaluation in client.ts");
