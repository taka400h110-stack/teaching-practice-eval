const baseUrl = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev/api';
const targetIds = [
  'f69ba75e-36a8-4c58-ab04-2eb9e62257b6',
  'e94692f1-8bad-4b2a-a7b6-3c6d0f60d4ce',
  'f6e11172-8ce8-43e1-9273-be9ab74388b9',
  'c7befbc3-e41d-4d38-8000-98b387c0eea9',
  '7a3f4126-f4b3-4060-8e43-c4c7c08f7482'
];

const mockEval = {
  model: "gpt-4o-mock",
  prompt_version: "1.0",
  temperature: 0.2,
  token_count: 1500,
  evaluation: {
    total_score: 3.2,
    factor_scores: {
      factor1: 3.0,
      factor2: 3.5,
      factor3: 3.1,
      factor4: 3.2
    },
    overall_comment: "実習生としての基本的な姿勢は非常に良くできています。児童とのコミュニケーションも積極的に取れており、信頼関係を築けている様子がうかがえます。今後は、個別の児童の特性に合わせたより具体的な声掛けや、授業中の時間配分など、さらに一歩踏み込んだ指導技術の習得を目指してください。",
    reasoning: "全体的に良好な実践記録と省察がなされています。自己の課題にも気づけています。",
    items: [
      { item_number: 1, score: 3, rd_level: "Phase 1", is_na: false, evidence: "挨拶運動を頑張った", feedback: "良い姿勢です。" },
      { item_number: 2, score: 3, rd_level: "Phase 2", is_na: false, evidence: "手押し相撲で怪我しないよう配慮", feedback: "安全への意識が高いです。" },
      { item_number: 3, score: 4, rd_level: "Phase 3", is_na: false, evidence: "ブルーガンの危険性を指導", feedback: "適切な指導ができています。" },
      { item_number: 4, score: 3, rd_level: "Phase 2", is_na: false, evidence: "補助教材の効果に気づいた", feedback: "教材研究への意欲が見られます。" }
    ]
  }
};

async function main() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const { token } = await loginRes.json();
  
  if (!token) {
    console.error("Login failed");
    return;
  }
  console.log("Logged in successfully");

  for (const id of targetIds) {
    console.log(`\nProcessing journal: ${id}`);
    
    // Check if it already has evaluation? Actually we can just POST.
    const getRes = await fetch(`${baseUrl}/data/journals/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getRes.status !== 200) {
      console.log(`Failed to fetch journal ${id}:`, getRes.status);
      continue;
    }
    
    const saveData = await fetch(`${baseUrl}/data/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        journal_id: id,
        evaluation: mockEval.evaluation,
        model_name: mockEval.model,
        prompt_version: mockEval.prompt_version,
        temperature: mockEval.temperature,
        total_score: mockEval.evaluation.total_score,
        factor_scores: mockEval.evaluation.factor_scores,
        overall_comment: mockEval.evaluation.overall_comment
      })
    });
    
    const result = await saveData.json();
    console.log(`Evaluation post result for ${id}:`, saveData.status, result);
  }
}

main().catch(console.error);
