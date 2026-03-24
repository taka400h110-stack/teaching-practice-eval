const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(apiPath, 'utf8');

// fix overall_score
content = content.replace('overall_score: 0', '// overall_score: 0');
content = content.replace('// // overall_score: 0', '// overall_score: 0');
content = content.replace(/overall_score: 0 } as any; \/\//g, '// overall_score: 0');

content = content.replace('return { id: "new", journal_id: journalId, phase: "phase1", messages: [] };', 'return { id: "new", journal_id: journalId, phase: "phase1", messages: [], created_at: new Date().toISOString() };');
content = content.replace('return { session: { id: "new", journal_id: journalId, phase: "phase1", messages: [] }, reply: { id: "r", role: "assistant", content: "dummy", timestamp: new Date().toISOString() } };', 'return { session: { id: "new", journal_id: journalId, phase: "phase1", messages: [], created_at: new Date().toISOString() }, reply: { id: "r", role: "assistant", content: "dummy", timestamp: new Date().toISOString() } };');

fs.writeFileSync(apiPath, content, 'utf8');

