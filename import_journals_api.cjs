const fs = require('fs');

async function importJournals() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  if (!loginRes.token) {
    console.error("Login failed", loginRes);
    return;
  }
  
  const token = loginRes.token;
  console.log("Logged in as student.");

  const data = JSON.parse(fs.readFileSync("import_data.json", "utf-8"));
  
  for (const entry of data) {
    const contentObj = {
      version: 2,
      records: [
        {
          id: "rec-1",
          order: 0,
          time_label: "実習記録",
          time_start: "08:30",
          time_end: "17:00",
          body: entry.content
        }
      ],
      reflection: entry.reflection_text
    };
    
    const contentStr = JSON.stringify(contentObj);

    // Create journal
    const createRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        entry_date: entry.entry_date,
        week_number: entry.week_number,
        content: contentStr
      })
    });
    
    if (!createRes.ok) {
      console.error(`Failed to create ${entry.title}`, await createRes.text());
      continue;
    }
    
    const createData = await createRes.json();
    const journalId = createData.id;
    console.log(`Created ${entry.title} with ID: ${journalId}`);
    
    // Update journal to add title and status
    const updateRes = await fetch(`https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals/${journalId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        title: entry.title,
        status: "submitted",
        content: contentStr,
        entry_date: entry.entry_date,
        week_number: entry.week_number
      })
    });
    
    if (!updateRes.ok) {
      console.error(`Failed to update ${entry.title}`, await updateRes.text());
    } else {
      console.log(`Updated ${entry.title} to submitted.`);
    }
  }
}

importJournals();
