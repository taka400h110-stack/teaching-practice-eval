CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      student_number TEXT,
      grade INTEGER,
      password_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE IF NOT EXISTS evaluator_profiles (
      evaluator_id TEXT PRIMARY KEY,
      years_of_experience INTEGER,
      training_background TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      ocr_source TEXT,
      ocr_confidence REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, entry_date)
    );
CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      eval_type TEXT NOT NULL DEFAULT 'ai',
      model_name TEXT DEFAULT 'gpt-4o',
      prompt_version TEXT DEFAULT 'CoT-A-v1.0',
      temperature REAL DEFAULT 0.2,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      overall_comment TEXT,
      reasoning TEXT,
      halo_effect_detected INTEGER DEFAULT 0,
      token_count INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );
CREATE TABLE IF NOT EXISTS evaluation_items (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      rd_level TEXT,
      is_na INTEGER DEFAULT 0,
      evidence TEXT,
      feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    );
CREATE TABLE IF NOT EXISTS human_evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      evaluator_id TEXT NOT NULL,
      evaluator_name TEXT,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );
CREATE TABLE IF NOT EXISTS human_eval_items (
      id TEXT PRIMARY KEY,
      human_eval_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      rd_level TEXT,
      is_na INTEGER DEFAULT 0,
      comment TEXT,
      FOREIGN KEY (human_eval_id) REFERENCES human_evaluations(id)
    );
CREATE TABLE IF NOT EXISTS rubric_item_behaviors (
      id TEXT PRIMARY KEY,
      item_number INTEGER NOT NULL,
      factor TEXT NOT NULL,
      item_label TEXT NOT NULL,
      item_text TEXT NOT NULL,
      lambda REAL,
      score INTEGER NOT NULL,
      rd_level TEXT NOT NULL,
      indicator TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_number, score)
    );
CREATE TABLE IF NOT EXISTS self_evaluations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      journal_id TEXT,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );
CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      journal_id TEXT,
      current_state TEXT DEFAULT 'phase0',
      phase_reached TEXT DEFAULT 'phase0',
      total_turns INTEGER DEFAULT 0,
      question_count INTEGER DEFAULT 0,
      max_rd_chat_level INTEGER DEFAULT 0,
      goal_set INTEGER DEFAULT 0,
      goal_is_smart INTEGER DEFAULT 0,
      session_duration_sec INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_order INTEGER NOT NULL,
      phase TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reflection_depth INTEGER,
      question_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    );
CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      session_id TEXT,
      week_number INTEGER NOT NULL,
      goal_text TEXT NOT NULL,
      target_item_id INTEGER,
      target_factor TEXT,
      is_smart INTEGER DEFAULT 1,
      smart_specific INTEGER DEFAULT 1,
      smart_measurable INTEGER DEFAULT 1,
      smart_achievable INTEGER DEFAULT 1,
      smart_relevant INTEGER DEFAULT 1,
      smart_time_bound INTEGER DEFAULT 1,
      achieved INTEGER DEFAULT 0,
      evidence TEXT,
      difficulty_level TEXT,
      adjustment_reason TEXT,
      bfi_context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE IF NOT EXISTS icc_results (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      scope TEXT NOT NULL,
      factor TEXT,
      icc_value REAL NOT NULL,
      ci_lower REAL,
      ci_upper REAL,
      f_value REAL,
      df1 INTEGER,
      df2 INTEGER,
      p_value REAL,
      interpretation TEXT,
      rater_count INTEGER,
      subject_count INTEGER,
      krippendorff_alpha REAL,
      pearson_r REAL,
      pearson_p REAL,
      calculated_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE IF NOT EXISTS bland_altman_results (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      factor TEXT,
      mean_diff REAL,
      sd_diff REAL,
      loa_upper REAL,
      loa_lower REAL,
      ci_mean_upper REAL,
      ci_mean_lower REAL,
      outlier_ratio REAL,
      bias_p_value REAL,
      subject_count INTEGER,
      calculated_at TEXT DEFAULT (datetime('now'))
    );
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
CREATE TABLE IF NOT EXISTS learning_progress_scores (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      ga_self INTEGER DEFAULT 0,
      ga_evidence INTEGER DEFAULT 0,
      growth_pattern TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );
CREATE TABLE IF NOT EXISTS rq3b_outcomes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      goal_id TEXT,
      stage TEXT NOT NULL,
      reflection_depth INTEGER,
      goal_set INTEGER,
      smart_score INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE IF NOT EXISTS bfi_responses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      openness REAL,
      conscientiousness REAL,
      extraversion REAL,
      agreeableness REAL,
      neuroticism REAL,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    );
CREATE INDEX IF NOT EXISTS idx_journals_student ON journal_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_journal ON evaluations(journal_id);
CREATE INDEX IF NOT EXISTS idx_human_evals_journal ON human_evaluations(journal_id);
CREATE INDEX IF NOT EXISTS idx_self_evals_student ON self_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_student ON chat_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_goals_student ON goals(student_id);
CREATE INDEX IF NOT EXISTS idx_lps_student ON learning_progress_scores(student_id);