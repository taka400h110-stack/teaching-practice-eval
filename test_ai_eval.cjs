const id = '7a3f4126-f4b3-4060-8e43-c4c7c08f7482';
const baseUrl = 'http://localhost:3000/api';

async function test() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const { token } = await loginRes.json();

  console.log("Fetching journal...");
  const getRes = await fetch(`${baseUrl}/data/journals/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getData = await getRes.json();
  const journal = getData.journal || getData;

  console.log("Calling AI Evaluation...");
  const aiRes = await fetch(`${baseUrl}/ai/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      journal_content: journal.content,
      student_name: "test",
      week_number: 12,
      journal_id: id
    })
  });
  const aiData = await aiRes.json();
  console.log("AI Response status:", aiRes.status);
  
  if (aiRes.status !== 200) {
    console.log(aiData);
    return;
  }

  console.log("Saving evaluation...");
  const saveRes = await fetch(`${baseUrl}/data/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      journal_id: id,
      evaluation: aiData.evaluation,
      model_name: aiData.model,
      prompt_version: aiData.prompt_version,
      temperature: aiData.temperature,
      token_count: aiData.token_count || 0,
      duration_ms: 0
    })
  });
  
  console.log("Save Response:", saveRes.status);
  const saveData = await saveRes.json();
  console.log(saveData);
}

test().catch(console.error);
