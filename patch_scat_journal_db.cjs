const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(path, 'utf8');

const newTables = `
    \`CREATE TABLE IF NOT EXISTS journal_scat_analyses (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      user_id TEXT,
      analysis_status TEXT DEFAULT 'pending',
      storyline TEXT,
      theoretical_description TEXT,
      is_human_reviewed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );\`,
    \`CREATE TABLE IF NOT EXISTS journal_scat_segments (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      journal_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      step1_focus_words TEXT,
      step2_outside_words TEXT,
      step3_explanatory_words TEXT,
      step4_theme_construct TEXT,
      step5_questions_issues TEXT,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );\`,
`;

if (!code.includes('journal_scat_analyses')) {
  code = code.replace(
    /`CREATE TABLE IF NOT EXISTS scat_projects \(/,
    newTables + '\n    `CREATE TABLE IF NOT EXISTS scat_projects ('
  );
}

const apiRoutes = `
// 毎日誌単位のSCAT結果取得
dataRouter.get("/scat/journals/:journalId", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const journalId = c.req.param("journalId");
    const { results: analyses } = await db.prepare("SELECT * FROM journal_scat_analyses WHERE journal_id = ? ORDER BY created_at DESC LIMIT 1").bind(journalId).all();
    if (!analyses || analyses.length === 0) return c.json({ analysis: null, segments: [] });
    
    const analysis = analyses[0];
    const { results: segments } = await db.prepare("SELECT * FROM journal_scat_segments WHERE analysis_id = ? ORDER BY segment_order ASC").bind(analysis.id).all();
    
    return c.json({ analysis, segments });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// SCATネットワーク分析用データ取得
dataRouter.get("/scat/network", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    // 全ジャーナルのセグメントを取得し、共起ネットワークを構築
    // ※大規模になる場合はDB内で集計すべきだが、小規模前提としてJS上で集計する
    const { results: segments } = await db.prepare(\`
      SELECT jsa.journal_id, jss.step4_theme_construct 
      FROM journal_scat_segments jss
      JOIN journal_scat_analyses jsa ON jss.analysis_id = jsa.id
      WHERE jsa.analysis_status = 'completed' AND jss.step4_theme_construct != '' AND jss.step4_theme_construct IS NOT NULL
    \`).all();

    const nodesMap = new Map<string, number>();
    const edgesMap = new Map<string, number>();
    
    // Journalごとにテーマをグループ化
    const journalThemes: Record<string, Set<string>> = {};
    for (const seg of segments as any[]) {
      const themes = String(seg.step4_theme_construct).split(/[,、・]/).map(t => t.trim()).filter(t => t);
      if (!journalThemes[seg.journal_id]) journalThemes[seg.journal_id] = new Set();
      themes.forEach(t => journalThemes[seg.journal_id].add(t));
      
      themes.forEach(t => {
        nodesMap.set(t, (nodesMap.get(t) || 0) + 1);
      });
    }

    // エッジ生成（同一日誌内で共起するテーマのペア）
    Object.values(journalThemes).forEach(themeSet => {
      const themes = Array.from(themeSet);
      for (let i = 0; i < themes.length; i++) {
        for (let j = i + 1; j < themes.length; j++) {
          const t1 = themes[i];
          const t2 = themes[j];
          const edgeKey = t1 < t2 ? \`\${t1}||\${t2}\` : \`\${t2}||\${t1}\`;
          edgesMap.set(edgeKey, (edgesMap.get(edgeKey) || 0) + 1);
        }
      }
    });

    const nodes = Array.from(nodesMap.entries()).map(([id, val]) => ({ id, val }));
    const edges = Array.from(edgesMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split("||");
      return { source, target, weight };
    });

    return c.json({ nodes, edges });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});
`;

if (!code.includes('/scat/journals/:journalId')) {
  code = code.replace(
    'export default dataRouter;',
    apiRoutes + '\nexport default dataRouter;'
  );
}

fs.writeFileSync(path, code);
console.log('Database schema and routes patched.');
