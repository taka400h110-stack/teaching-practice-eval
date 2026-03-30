const baseUrl = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev/api';
const targetIds = [
  'f6e11172-8ce8-43e1-9273-be9ab74388b9',
  'c7befbc3-e41d-4d38-8000-98b387c0eea9',
  '7a3f4126-f4b3-4060-8e43-c4c7c08f7482'
];

async function main() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const { token, user } = await loginRes.json();
  
  if (!token) {
    console.error("Login failed");
    return;
  }
  console.log("Logged in successfully as", user.name);

  for (const id of targetIds) {
    console.log(`\nProcessing journal: ${id}`);
    
    const getRes = await fetch(`${baseUrl}/data/journals/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (getRes.status !== 200) {
      console.log(`Failed to fetch journal ${id}:`, getRes.status);
      continue;
    }
    
    const getData = await getRes.json();
    const journal = getData.journal || getData;
    console.log(`Journal title: ${journal.title}, week: ${journal.week_number}`);

    console.log(`Starting AI evaluation...`);
    const aiRes = await fetch(`${baseUrl}/ai/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        journal_content: journal.content,
        student_name: user.name || "学生",
        week_number: journal.week_number || 1,
        journal_id: id
      })
    });
    
    if (aiRes.status !== 200) {
      const errText = await aiRes.text();
      console.error(`AI Evaluation failed for ${id}:`, aiRes.status, errText);
      continue;
    }
    
    const aiData = await aiRes.json();
    console.log(`AI Evaluation successful. Total Score:`, aiData.evaluation?.total_score);

    console.log(`Saving evaluation...`);
    const saveData = await fetch(`${baseUrl}/data/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        journal_id: id,
        evaluation: aiData.evaluation,
        model_name: aiData.model || 'gpt-4o',
        prompt_version: aiData.prompt_version || '1.0',
        temperature: aiData.temperature || 0.2,
        total_score: aiData.evaluation?.total_score,
        factor_scores: aiData.evaluation?.factor_scores,
        overall_comment: aiData.evaluation?.overall_comment
      })
    });
    
    if (saveData.status !== 200) {
      const errText = await saveData.text();
      console.error(`Failed to save evaluation for ${id}:`, saveData.status, errText);
      continue;
    }
    
    const result = await saveData.json();
    console.log(`Successfully saved evaluation for ${id}:`, result.id);
  }
}

main().catch(console.error);
