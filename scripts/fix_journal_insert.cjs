const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(path, 'utf8');

// The init_schema.sql journal_entries doesn't have a tags column in this version.
// Let's modify the INSERT to not use tags, or modify schema. 
// We'll modify the INSERT in data.ts.

code = code.replace(
  'INSERT INTO journal_entries (id, student_id, entry_date, week_number, content, tags)',
  'INSERT INTO journal_entries (id, student_id, entry_date, week_number, content)'
);

code = code.replace(
  'VALUES (?, ?, ?, ?, ?, ?)',
  'VALUES (?, ?, ?, ?, ?)'
);

code = code.replace(
  'bind(id, studentId, body.entry_date || new Date().toISOString(), body.week_number || 1, body.content || "", JSON.stringify(body.tags || [])).run();',
  'bind(id, studentId, body.entry_date || new Date().toISOString(), body.week_number || 1, body.content || "").run();'
);

fs.writeFileSync(path, code);
