const { execSync } = require('child_process');

try {
  const result = execSync('npx wrangler d1 execute teaching-practice-eval-db --remote --command="SELECT j.id, j.status, j.content, (SELECT COUNT(*) FROM evaluation_items ei JOIN evaluations e ON ei.evaluation_id = e.id WHERE e.journal_id = j.id) as item_count FROM journal_entries j WHERE j.id LIKE \'test%\' OR j.id LIKE \'f6e%\';"', { encoding: 'utf8' });
  console.log(result);
} catch (e) {
  console.error("DB query failed", e.stdout ? e.stdout.toString() : e);
}
