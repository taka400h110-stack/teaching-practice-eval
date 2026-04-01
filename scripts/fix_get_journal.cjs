const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldGetJournal = `  getJournal: async (id: string): Promise<JournalEntry> => {
    const res = await apiFetch(\`/api/data/journals/\${id}\`, { headers: {  } });
    if (!res.ok) throw new Error(\`Journal \${id} not found\`);
    return await res.json();
  },`;

const newGetJournal = `  getJournal: async (id: string): Promise<JournalEntry> => {
    const res = await apiFetch(\`/api/data/journals/\${id}\`, { headers: {  } });
    if (!res.ok) throw new Error(\`Journal \${id} not found\`);
    const data = await res.json() as any;
    return data.journal || data;
  },`;

if (content.includes(oldGetJournal)) {
  content = content.replace(oldGetJournal, newGetJournal);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed getJournal response parsing');
} else {
  console.log('Could not find old getJournal');
}
