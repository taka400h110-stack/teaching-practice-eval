const id = '7a3f4126-f4b3-4060-8e43-c4c7c08f7482';
const baseUrl = 'https://3e1d7a07.teaching-practice-eval.pages.dev/api';

async function test() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const getRes = await fetch(`${baseUrl}/data/journals/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getData = await getRes.json();
  console.log("GET:", getRes.status);
  
  const putRes = await fetch(`${baseUrl}/data/journals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: "Updated Title",
      content: getData.journal ? getData.journal.content : getData.content,
      reflection_text: "Reflect test",
      week_number: 12,
      entry_date: "2023-12-14",
      status: "submitted"
    })
  });
  console.log("PUT:", putRes.status);
  const putData = await putRes.json();
  console.log(putData);
}

test().catch(console.error);
