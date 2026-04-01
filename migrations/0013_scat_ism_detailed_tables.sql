-- Drop old tables if we want or just create new segments table
CREATE TABLE IF NOT EXISTS scat_detailed_segments (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    file_id TEXT,
    paragraph_id TEXT,
    segment_id TEXT,
    raw_excerpt TEXT,
    normalized_excerpt TEXT,
    scat_step1_focus TEXT,
    scat_step2_paraphrase TEXT,
    scat_step3_theme TEXT,
    scat_step4_construct TEXT,
    rubric_item_id TEXT,
    rd_level TEXT,
    ism_node_id TEXT,
    confidence REAL,
    review_flag BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scat_detailed_journal ON scat_detailed_segments(journal_id);
