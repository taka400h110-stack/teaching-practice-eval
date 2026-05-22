const fs = require('fs');

let cjs = fs.readFileSync('/home/user/webapp/scripts/reprocess_journal.cjs', 'utf8');
cjs = cjs.replace(/for \(const item of result.items\) \{[\s\S]*?\}\n/g, `
  // Batch insert
  const values = result.items.map(item => \`('item_\${Date.now()}_\${Math.random()}_\${item.item}', '\${evalId}', \${item.item}, \${item.score}, '\${(item.evidence||'').replace(/'/g, "''")}', '\${(item.feedback||'').replace(/'/g, "''")}')\`).join(',');
  const batchInsertCmd = \`npx wrangler d1 execute teaching-practice-eval-db --remote --command="INSERT INTO evaluation_items (id, evaluation_id, item_number, score, evidence, feedback) VALUES \${values}"\`;
  execSync(batchInsertCmd, { cwd: '/home/user/webapp' });
`);
fs.writeFileSync('/home/user/webapp/scripts/reprocess_journal.cjs', cjs);
