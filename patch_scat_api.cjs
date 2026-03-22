const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/data.ts';
let content = fs.readFileSync(path, 'utf8');

const scatApi = `
// ────────────────────────────────────────────────────────────────
// SCAT API
// ────────────────────────────────────────────────────────────────

// プロジェクト一覧取得
dataRouter.get('/scat/projects', async (c) => {
  const { env } = c;
  try {
    const { results } = await env.DB.prepare('SELECT * FROM scat_projects ORDER BY created_at DESC').all();
    return c.json({ projects: results });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// プロジェクト作成
dataRouter.post('/scat/projects', async (c) => {
  const { env } = c;
  try {
    const body = await c.req.json();
    const id = "scat-proj-" + Date.now();
    await env.DB.prepare('INSERT INTO scat_projects (id, title, description, created_by) VALUES (?, ?, ?, ?)')
      .bind(id, body.title, body.description || "", body.created_by || "unknown")
      .run();
    return c.json({ id, title: body.title });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// セグメント一覧取得
dataRouter.get('/scat/projects/:projectId/segments', async (c) => {
  const { env } = c;
  const projectId = c.req.param('projectId');
  try {
    const { results } = await env.DB.prepare('SELECT * FROM scat_segments WHERE project_id = ? ORDER BY segment_order ASC')
      .bind(projectId)
      .all();
    return c.json({ segments: results });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// セグメント作成（一括）
dataRouter.post('/scat/segments', async (c) => {
  const { env } = c;
  try {
    const body = await c.req.json();
    const { project_id, segments } = body;
    
    for (const seg of segments) {
      const segId = seg.id || "scat-seg-" + Date.now() + "-" + Math.floor(Math.random()*1000);
      await env.DB.prepare('INSERT INTO scat_segments (id, project_id, segment_order, text_content, source_journal_id) VALUES (?, ?, ?, ?, ?)')
        .bind(segId, project_id, seg.segment_order, seg.text_content, seg.source_journal_id || null)
        .run();
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// コード一覧取得（プロジェクト全体）
dataRouter.get('/scat/projects/:projectId/codes', async (c) => {
  const { env } = c;
  const projectId = c.req.param('projectId');
  try {
    // JOIN scat_segments
    const query = \`
      SELECT c.* 
      FROM scat_codes c
      JOIN scat_segments s ON c.segment_id = s.id
      WHERE s.project_id = ?
    \`;
    const { results } = await env.DB.prepare(query).bind(projectId).all();
    return c.json({ codes: results });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// コード保存（UPSERT）
dataRouter.post('/scat/codes', async (c) => {
  const { env } = c;
  try {
    const body = await c.req.json();
    const id = body.id || "scat-code-" + Date.now() + "-" + Math.floor(Math.random()*1000);
    
    // Auth context (mocked for now, as user_info is in localStorage, UI should send it, but we can trust token if we had one)
    // Actually, user passes researcher_id from frontend (from user_info).
    const researcherId = body.researcher_id;
    if (!researcherId) return c.json({ error: "researcher_id is required" }, 400);

    const check = await env.DB.prepare('SELECT id FROM scat_codes WHERE segment_id = ? AND researcher_id = ?')
      .bind(body.segment_id, researcherId)
      .first();

    if (check) {
      await env.DB.prepare(\`
        UPDATE scat_codes 
        SET step1_keywords = ?, step2_thesaurus = ?, step3_concept = ?, step4_theme = ?, memo = ?, factor = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      \`)
      .bind(body.step1_keywords || "", body.step2_thesaurus || "", body.step3_concept || "", body.step4_theme || "", body.memo || "", body.factor || "", check.id)
      .run();
      return c.json({ success: true, id: check.id });
    } else {
      await env.DB.prepare(\`
        INSERT INTO scat_codes (id, segment_id, researcher_id, step1_keywords, step2_thesaurus, step3_concept, step4_theme, memo, factor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`)
      .bind(id, body.segment_id, researcherId, body.step1_keywords || "", body.step2_thesaurus || "", body.step3_concept || "", body.step4_theme || "", body.memo || "", body.factor || "")
      .run();
      return c.json({ success: true, id });
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

`;

content = content.replace(
  '// ────────────────────────────────────────────────────────────────\\n// Namikawa BFI (Big Five Inventory) Routes',
  scatApi + '\\n// ────────────────────────────────────────────────────────────────\\n// Namikawa BFI (Big Five Inventory) Routes'
);

fs.writeFileSync(path, content);
