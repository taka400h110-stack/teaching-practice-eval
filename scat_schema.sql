-- SCAT Schema

CREATE TABLE IF NOT EXISTS scat_learning_element_master (
  element_code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  detection_rule_summary TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scat_runs (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  run_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS scat_segments (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  journal_id TEXT NOT NULL,
  segment_text TEXT NOT NULL,
  segment_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scat_concepts (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL,
  code1 TEXT,
  code2 TEXT,
  code3 TEXT,
  code4 TEXT
);

CREATE TABLE IF NOT EXISTS scat_journal_elements (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL,
  element_code TEXT NOT NULL,
  present INTEGER DEFAULT 0,
  UNIQUE(journal_id, element_code)
);

CREATE TABLE IF NOT EXISTS scat_student_mastery (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  element_code TEXT NOT NULL,
  mastered INTEGER DEFAULT 0,
  first_journal_id TEXT,
  first_week_number INTEGER,
  UNIQUE(student_id, element_code)
);

CREATE TABLE IF NOT EXISTS scat_reference_edges (
  id TEXT PRIMARY KEY,
  source_element TEXT NOT NULL,
  target_element TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  UNIQUE(source_element, target_element)
);
