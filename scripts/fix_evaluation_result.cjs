const fs = require('fs');
const path = require('path');

const clientTsPath = path.join(__dirname, '../src/api/client.ts');
let content = fs.readFileSync(clientTsPath, 'utf8');

content = content.replace(/positive_feedback: data\.positive_feedback \|\| "",\n\s*constructive_feedback: data\.constructive_feedback \|\| "",\n\s*created_at: data\.created_at/g, 'overall_comment: data.overall_comment || "",\n        total_score: data.total_score || 0,\n        evaluated_item_count: data.evaluated_item_count || 0,\n        tokens_used: data.tokens_used || 0,\n        halo_check: data.halo_check || false');

content = content.replace(/positive_feedback: e\.positive_feedback \|\| "",\n\s*constructive_feedback: e\.constructive_feedback \|\| "",\n\s*created_at: e\.created_at/g, 'overall_comment: e.overall_comment || "",\n        total_score: e.total_score || 0,\n        evaluated_item_count: e.evaluated_item_count || 0,\n        tokens_used: e.tokens_used || 0,\n        halo_check: e.halo_check || false');

fs.writeFileSync(clientTsPath, content);
console.log('Fixed EvaluationResult in client.ts');
