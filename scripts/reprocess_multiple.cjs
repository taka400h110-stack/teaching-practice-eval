const { execSync } = require('child_process');
const fs = require('fs');

const journals = [
  'f6e11172-8ce8-43e1-9273-be9ab74388b9',
  'e94692f1-8bad-4b2a-a7b6-3c6d0f60d4ce',
  'c7befbc3-e41d-4d38-8000-98b387c0eea9'
];

const apiKey = process.env.OPENAI_API_KEY;
const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function buildPrompt(text) {
  return `あなたは教育実習評価の専門家AIです。以下の実習日誌を4因子23項目のルーブリックで評価してください。

## 評価対象
第1週 実習日誌:
---
${text}
---

## 全因子共通：Hatton & Smith（1995）省察深度（RD）水準
全23項目の5段階行動指標はすべてこのRD水準と対応します。

| スコア | RD水準 | 省察の特徴 |
|:---:|:---:|:---|
| 5 | RD4 批判的省察 | 教育的信念・社会的文脈・倫理的観点と実践を結びつけ、信念の根拠そのものを問い直す |
| 4 | RD3 対話的省察 | 実践の原因・背景を多角的に分析し、代替案・改善策を具体的に検討する |
| 3 | RD2 記述的省察 | 感情・気づき・印象を言語化するが、原因分析や代替案は限定的 |
| 2 | RD1 記述的書き込み | 出来事・事実の列挙にとどまり、省察的要素がない |
| 1 | RD0 省察なし | 当該側面への記述・省察が日誌に見られない |

## 評価ルーブリック (4因子23項目)
以下に定義する23項目について、1〜5の整数でスコアを付け、その根拠となる日誌内の記述（evidence）とフィードバック（feedback）を簡潔に示してください。評価できない項目がある場合は対象外とせず、「1」を付けて「該当する記述なし」とフィードバックしてください。

【因子1：省察的授業設計・実践】
項目1：教材研究（教材の構造や意味の理解に基づく目標・評価の計画）
項目2：学習者理解（児童・生徒の既有知識や経験の把握と活用）
項目3：環境構成・活動設定（学習空間の意図的構成やICT等の活用）
項目4：時間・板書計画（学習展開に即した時間配分や板書の機能的活用）
項目5：学習過程の構成（児童・生徒の思考に沿った展開の工夫）
項目6：評価とフィードバック（形成的評価と指導への反映）
項目7：授業改善（自他の実践分析に基づく課題抽出と改善策）

【因子2：児童・生徒への指導・支援】
項目8：対人関係・学級経営（信頼関係の構築や集団活動への支援）
項目9：学習意欲の喚起・動機づけ（学ぶ意味の共有や興味関心の喚起）
項目10：思考を促す発問・応答（多様な考えを引き出す問いかけ）
項目11：協働的な学びの促進（児童・生徒同士の相互作用の組織化）
項目12：個別最適な学びの支援（多様な学習特性への個別の支援）
項目13：自己調整学習の支援（自己評価や学習計画の調整への支援）

【因子3：教育的信念・倫理・文脈的理解】
項目14：教育的信念・価値観の自覚（自身の教育観の省察や問い直し）
項目15：倫理的・専門的責任（教師としての社会的責任や倫理観）
項目16：多様性・包摂性の尊重（背景の多様性への理解と配慮）
項目17：社会的・文化的文脈の理解（学校・地域の特性や社会課題との関連付け）

【因子4：省察の深さ・自己変容】
項目18：経験の多角的な分析（出来事を複数の視点から捉え直す）
項目19：理論と実践の往還（大学での学びなど理論的知見との結びつけ）
項目20：葛藤・困難との向き合い（困難を学びの契機として捉える態度）
項目21：自己変容の自覚（実習を通じた自身の成長や認識の更新の言語化）
項目22：今後の目標設定（具体的な課題に基づく明確な目標設定）
項目23：同僚性・協働への態度（指導教員や他の実習生からの学び）

## 出力フォーマット
必ず以下のJSON形式（JSON Schema）に厳密に従って出力してください。Markdownのコードブロック (\`\`\`json ... \`\`\`) は付けず、JSONのみを出力してください。
{
  "items": [
    {
      "item": 1,
      "score": 3,
      "evidence": "〜という記述",
      "feedback": "〜のように考えていてよい"
    }
  ],
  "overall_comment": "全体の総評（200字程度）",
  "halo_check": false
}
`;
}

async function run() {
  for (const journalId of journals) {
    console.log(`\n============================`);
    console.log(`Processing Journal: ${journalId}`);
    
    const getJournalCmd = `npx wrangler d1 execute teaching-practice-eval-db --remote --command="SELECT id, content FROM journal_entries WHERE id = '${journalId}'" --json`;
    let journalData;
    try {
      const output = execSync(getJournalCmd, { cwd: '/home/user/webapp', encoding: 'utf8' });
      const jsonMatch = output.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const res = JSON.parse(jsonMatch[0]);
        journalData = res[0].results[0];
      }
    } catch (e) {
      console.error("Failed to execute D1 query:", e.message);
      continue;
    }
    
    if (!journalData) {
      console.error("Journal not found!");
      continue;
    }
    
    let fullText = "";
    try {
      const p = JSON.parse(journalData.content);
      if (p.version === 2 && Array.isArray(p.records)) {
        p.records.forEach((r) => {
          fullText += `【${r.time_label || '授業記録'}】\n${r.body}\n\n`;
        });
        if (p.reflection) {
          fullText += `【省察・振り返り】\n${p.reflection}\n`;
        }
        fullText = fullText.trim();
      } else {
        fullText = journalData.content;
      }
    } catch (e) {
      fullText = journalData.content;
    }
    
    console.log(`Extracted text length: ${fullText.length}`);
    
    const prompt = buildPrompt(fullText);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      continue;
    }
    
    const data = await response.json();
    let content = data.choices[0].message.content;
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);
    
    const allScores = result.items.map((i) => i.score).filter((s) => s > 0);
    const avg = (arr) => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    
    const scores = { f1: [], f2: [], f3: [], f4: [] };
    result.items.forEach(i => {
      if (i.item <= 7) scores.f1.push(i.score);
      else if (i.item <= 13) scores.f2.push(i.score);
      else if (i.item <= 17) scores.f3.push(i.score);
      else scores.f4.push(i.score);
    });
    
    const totalScore = avg(allScores);
    const f1 = avg(scores.f1);
    const f2 = avg(scores.f2);
    const f3 = avg(scores.f3);
    const f4 = avg(scores.f4);
    
    console.log(`Evaluated ${allScores.length} items. Total Score: ${totalScore.toFixed(2)}`);
    console.log(`Comment: ${result.overall_comment.substring(0, 30)}...`);
    
    const evalId = "eval_" + Date.now() + "_" + Math.random().toString(36).substring(7);
    
    execSync(`npx wrangler d1 execute teaching-practice-eval-db --remote --command="DELETE FROM evaluation_items WHERE evaluation_id IN (SELECT id FROM evaluations WHERE journal_id = '${journalId}')"`, { cwd: '/home/user/webapp' });
    execSync(`npx wrangler d1 execute teaching-practice-eval-db --remote --command="DELETE FROM evaluations WHERE journal_id = '${journalId}'"`, { cwd: '/home/user/webapp' });
    
    const insertEvalCmd = `npx wrangler d1 execute teaching-practice-eval-db --remote --command="INSERT INTO evaluations (id, journal_id, eval_type, model_name, prompt_version, temperature, total_score, factor1_score, factor2_score, factor3_score, factor4_score, overall_comment, token_count, created_at) VALUES ('${evalId}', '${journalId}', 'ai', 'gpt-5', 'CoT-A-v1.0', 0.2, ${totalScore}, ${f1}, ${f2}, ${f3}, ${f4}, '${result.overall_comment.replace(/'/g, "''")}', ${data.usage.total_tokens}, datetime('now'))"`;
    execSync(insertEvalCmd, { cwd: '/home/user/webapp' });
    
    const values = result.items.map(item => `('item_${Date.now()}_${Math.random()}_${item.item}', '${evalId}', ${item.item}, ${item.score}, '${(item.evidence||'').replace(/'/g, "''")}', '${(item.feedback||'').replace(/'/g, "''")}')`).join(',');
    const batchInsertCmd = `npx wrangler d1 execute teaching-practice-eval-db --remote --command="INSERT INTO evaluation_items (id, evaluation_id, item_number, score, evidence, feedback) VALUES ${values}"`;
    execSync(batchInsertCmd, { cwd: '/home/user/webapp' });
    
    execSync(`npx wrangler d1 execute teaching-practice-eval-db --remote --command="UPDATE journal_entries SET status = 'evaluated' WHERE id = '${journalId}'"`, { cwd: '/home/user/webapp' });
    
    console.log(`Finished ${journalId}`);
  }
}

run().catch(console.error);
