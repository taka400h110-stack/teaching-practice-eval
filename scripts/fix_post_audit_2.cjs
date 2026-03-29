const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const hePostTarget = `    for (const item of body.items) {
      await db.prepare(\`
        INSERT INTO human_eval_items (id, human_eval_id, item_number, score, is_na, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      \`).bind(genId(), id, item.item_number, item.score ?? null, item.is_na ? 1 : 0, item.comment ?? null).run();
    }

    return c.json({ success: true, human_eval_id: id });`;

const hePostReplacement = `    for (const item of body.items) {
      await db.prepare(\`
        INSERT INTO human_eval_items (id, human_eval_id, item_number, score, is_na, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      \`).bind(genId(), id, item.item_number, item.score ?? null, item.is_na ? 1 : 0, item.comment ?? null).run();
    }

    setAuditWriteContext(c, {
      resourceType: 'human_evaluation',
      resourceId: id,
      action: 'create',
      scopeBasis: 'assigned',
      changedFields: ['created'],
      changeSummary: { operation: 'create' }
    });
    return c.json({ success: true, human_eval_id: id });`;

if (content.includes(hePostTarget)) {
  content = content.replace(hePostTarget, hePostReplacement);
  console.log("Updated human-evals successfully.");
  fs.writeFileSync(filePath, content);
} else {
  console.log("Could not find human-evals target.");
}
