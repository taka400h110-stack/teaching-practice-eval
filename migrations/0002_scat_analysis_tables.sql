
-- SCAT Analysis Results Table
CREATE TABLE IF NOT EXISTS scat_analysis_results (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    step1_focus TEXT,
    step2_paraphrase TEXT,
    step3_concept TEXT,
    step4_theme TEXT,
    storyline TEXT,
    theory_description TEXT,
    analyzed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ISM Analysis Results Table
CREATE TABLE IF NOT EXISTS ism_analysis_results (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    adjacency_matrix TEXT,
    reachability_matrix TEXT,
    hierarchy_levels TEXT,
    structure_diagram TEXT,
    analyzed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SP Table Results
CREATE TABLE IF NOT EXISTS sp_table_results (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sp_data TEXT,
    analyzed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transmission Coefficients Results
CREATE TABLE IF NOT EXISTS transmission_coefficients (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    coefficient REAL,
    classification TEXT,
    analyzed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scat_journal ON scat_analysis_results(journal_id);
CREATE INDEX IF NOT EXISTS idx_scat_student ON scat_analysis_results(student_id);
CREATE INDEX IF NOT EXISTS idx_ism_journal ON ism_analysis_results(journal_id);
CREATE INDEX IF NOT EXISTS idx_sp_journal ON sp_table_results(journal_id);
CREATE INDEX IF NOT EXISTS idx_transmission_journal ON transmission_coefficients(journal_id);
