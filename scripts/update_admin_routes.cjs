const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '../src/api/routes/adminAlerts.ts');
let content = fs.readFileSync(routePath, 'utf8');

if (!content.includes('/cleanup-failure/comments')) {
  const imports = `import { getComments, addComment, updateAssignee } from '../services/cleanupAlertCommentsService';\n`;
  content = imports + content;

  const routesToAdd = `
app.get('/cleanup-failure/comments', async (c) => {
  const fingerprint = c.req.query('fingerprint');
  if (!fingerprint) return c.json({ error: 'Missing fingerprint' }, 400);
  const comments = await getComments(c.env, fingerprint);
  return c.json({ comments });
});

app.post('/cleanup-failure/comments', async (c) => {
  const user = c.get('user') as any;
  const { fingerprint, comment } = await c.req.json();
  if (!fingerprint || !comment) return c.json({ error: 'Missing fields' }, 400);
  
  try {
    const newComment = await addComment(c.env, fingerprint, user.id, comment);
    return c.json({ ok: true, comment: newComment });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/cleanup-failure/assign', async (c) => {
  const user = c.get('user') as any;
  const { fingerprint, assigneeUserId } = await c.req.json();
  if (!fingerprint) return c.json({ error: 'Missing fingerprint' }, 400);
  
  await updateAssignee(c.env, fingerprint, user.id, assigneeUserId);
  return c.json({ ok: true });
});
`;

  // Insert before the export default app
  content = content.replace('export default app;', `${routesToAdd}\nexport default app;`);
  fs.writeFileSync(routePath, content);
  console.log('Added comments/assign routes to adminAlerts.ts');
}
