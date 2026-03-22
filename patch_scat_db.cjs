const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/data.ts';
let content = fs.readFileSync(path, 'utf8');

const newTables = `
    CREATE TABLE IF NOT EXISTS scat_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scat_segments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL,
      text_content TEXT NOT NULL,
      source_journal_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scat_codes (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      researcher_id TEXT NOT NULL,
      step1_keywords TEXT,
      step2_thesaurus TEXT,
      step3_concept TEXT,
      step4_theme TEXT,
      memo TEXT,
      factor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(segment_id, researcher_id)
    );
`;

content = content.replace(
  '    CREATE TABLE IF NOT EXISTS learning_progress_scores (',
  newTables + '\\n    CREATE TABLE IF NOT EXISTS learning_progress_scores ('
);

fs.writeFileSync(path, content);
