const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(apiPath, 'utf8');

// replace unknown data
content = content.replace(/const data = await response\.json\(\);/g, 'const data = (await response.json()) as any;');
content = content.replace(/const resData = await res\.json\(\);/g, 'const resData = (await res.json()) as any;');

// Fix overall_score and items by casting to any
content = content.replace(/return \{ \.\.\.data,/g, 'return { ...(data as any),');

// Add specific return types or cast as any
content = content.replace(/items: JSON\.parse\(data\.items_json \|\| \"\[\]\"\)/g, 'items: JSON.parse((data as any).items_json || "[]")');

content = content.replace(/return \{  weekly_scores: \[\] as any\[\] \};/g, 'return { student_id: "", weekly_scores: [] };');

content = content.replace(/return \{ id: "new", journal_id: journalId, student_id: "user-001", phase: "phase1", messages: \[\] \};/g, 'return { id: "new", journal_id: journalId, phase: "phase1", messages: [] };');
content = content.replace(/return \{ session: \{ id: "new", journal_id: journalId, student_id: "user-001", phase: "phase1", messages: \[\] \}, reply: \{ id: "r", role: "assistant", content: "dummy", timestamp: new Date\(\)\.toISOString\(\) \} \};/g, 'return { session: { id: "new", journal_id: journalId, phase: "phase1", messages: [] }, reply: { id: "r", role: "assistant", content: "dummy", timestamp: new Date().toISOString() } };');

fs.writeFileSync(apiPath, content, 'utf8');

