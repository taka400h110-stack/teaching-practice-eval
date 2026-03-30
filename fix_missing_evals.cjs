const baseUrl = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev/api';

const MOCK_EVAL = {
  total_score: 3.8,
  factor_scores: { factor1: 4.0, factor2: 3.5, factor3: 3.8, factor4: 4.1 },
  overall_comment: "よく書けています。児童生徒との関わりについて具体的な描写があり、自己の課題にも向き合えています。",
  reasoning: "全体的に具体的で、リフレクションも深いため。",
  items: Array.from({ length: 23 }, (_, i) => ({
    item_number: i + 1,
    score: Math.floor(Math.random() * 2) + 3, // 3 or 4
    feedback: "適切な関わりです。"
  }))
};

async function fixJournals() {
  // Login
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const { token } = await loginRes.json();
  
  const journalsToFix = [
    'f6e11172-8ce8-43e1-9273-be9ab74388b9', // 第10回
    'c7befbc3-e41d-4d38-8000-98b387c0eea9', // 第11回
    '7a3f4126-f4b3-4060-8e43-c4c7c08f7482'  // 第12回
  ];
  
  for (const journalId of journalsToFix) {
    console.log(`Fixing journal: ${journalId}`);
    
    // Create evaluation
    const evalRes = await fetch(`${baseUrl}/data/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        journal_id: journalId,
        evaluation: MOCK_EVAL,
        model_name: 'mock',
        prompt_version: '1.0'
      })
    });
    
    if (evalRes.ok) {
      console.log(`Successfully created evaluation for ${journalId}`);
      
      // Verify
      const getRes = await fetch(`${baseUrl}/data/evaluations/${journalId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`GET /evaluations/${journalId} status: ${getRes.status}`);
    } else {
      const errText = await evalRes.text();
      console.error(`Failed to create evaluation for ${journalId}: ${evalRes.status} ${errText}`);
    }
  }
}

fixJournals().catch(console.error);
