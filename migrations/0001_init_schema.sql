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
-- Scope Additions



CREATE TABLE IF NOT EXISTS teacher_assignments (
  id TEXT PRIMARY KEY,
  teacher_user_id TEXT NOT NULL,
  assignment_level TEXT NOT NULL CHECK (assignment_level IN ('course', 'cohort', 'student')),
  course_id TEXT,
  cohort_id TEXT,
  student_id TEXT,
  can_read_students INTEGER NOT NULL DEFAULT 1,
  can_read_journals INTEGER NOT NULL DEFAULT 1,
  can_read_self_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_ai_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_human_evaluations INTEGER NOT NULL DEFAULT 1,
  can_write_human_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_goals INTEGER NOT NULL DEFAULT 1,
  can_read_growth INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (teacher_user_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_course ON teacher_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_cohort ON teacher_assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_level ON teacher_assignments(assignment_level, is_active);



CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  actor_user_id TEXT,
  actor_role TEXT,

  action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'export_request', 'export_approve', 'export_reject', 'export_generate', 'download')),
  resource_type TEXT NOT NULL,
  resource_id TEXT,

  target_student_id TEXT,
  target_student_ids_json TEXT,
  target_cohort_id TEXT,
  target_course_id TEXT,
  entity_owner_user_id TEXT,

  http_method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  route_pattern TEXT,
  query_params_json TEXT,

  status_code INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'forbidden', 'unauthorized', 'not_found', 'error')),

  visible_record_count INTEGER,
  scope_basis TEXT,
  reason TEXT,
  
  change_summary_json TEXT,
  changed_fields_json TEXT,
  before_state_json TEXT,
  after_state_json TEXT,

  ip_hash TEXT,
  user_agent TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time ON audit_logs(actor_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_student_time ON audit_logs(target_student_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint_time ON audit_logs(endpoint, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome_time ON audit_logs(outcome, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_time ON audit_logs(resource_type, occurred_at);


CREATE TABLE IF NOT EXISTS research_scope_assignments (
  id TEXT PRIMARY KEY,
  researcher_user_id TEXT NOT NULL,

  assignment_level TEXT NOT NULL CHECK (
    assignment_level IN ('course', 'cohort', 'student', 'dataset')
  ),

  course_id TEXT,
  cohort_id TEXT,
  student_id TEXT,
  dataset_type TEXT,

  anonymization_level TEXT NOT NULL DEFAULT 'pseudonymized' CHECK (
    anonymization_level IN ('raw', 'pseudonymized', 'aggregated')
  ),

  can_read_journals INTEGER NOT NULL DEFAULT 1,
  can_read_self_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_ai_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_human_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_growth INTEGER NOT NULL DEFAULT 1,
  can_read_goals INTEGER NOT NULL DEFAULT 1,
  can_read_chat INTEGER NOT NULL DEFAULT 0,
  can_read_exports INTEGER NOT NULL DEFAULT 0,
  can_run_statistics INTEGER NOT NULL DEFAULT 1,
  can_view_longitudinal INTEGER NOT NULL DEFAULT 1,
  can_view_reliability INTEGER NOT NULL DEFAULT 1,

  is_active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (researcher_user_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_research_scope_user_active ON research_scope_assignments(researcher_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_research_scope_course ON research_scope_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_research_scope_cohort ON research_scope_assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_research_scope_student ON research_scope_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_research_scope_dataset ON research_scope_assignments(dataset_type);
CREATE INDEX IF NOT EXISTS idx_research_scope_level ON research_scope_assignments(assignment_level, is_active);


CREATE TABLE IF NOT EXISTS dataset_export_requests (
  id TEXT PRIMARY KEY,
  requester_user_id TEXT NOT NULL,
  requester_role TEXT NOT NULL,

  request_type TEXT NOT NULL CHECK (
    request_type IN ('export', 'download', 'raw_access')
  ),

  dataset_type TEXT NOT NULL,
  scope_level TEXT NOT NULL CHECK (
    scope_level IN ('student', 'cohort', 'course', 'dataset')
  ),

  course_id TEXT,
  cohort_id TEXT,
  student_id TEXT,

  requested_anonymization_level TEXT NOT NULL CHECK (
    requested_anonymization_level IN ('raw', 'pseudonymized', 'aggregated')
  ),

  approved_anonymization_level TEXT CHECK (
    approved_anonymization_level IN ('raw', 'pseudonymized', 'aggregated')
  ),

  status TEXT NOT NULL CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired', 'completed', 'revoked')
  ) DEFAULT 'pending',

  purpose TEXT,
  justification TEXT,
  requested_fields_json TEXT,
  filter_params_json TEXT,

  approval_required INTEGER NOT NULL DEFAULT 1,
  approved_by_user_id TEXT,
  approved_at TEXT,
  rejection_reason TEXT,

  expires_at TEXT,
  max_download_count INTEGER NOT NULL DEFAULT 1,
  current_download_count INTEGER NOT NULL DEFAULT 0,

  export_file_path TEXT,
  export_file_hash TEXT,

  export_object_key TEXT,
  export_content_type TEXT,
  export_file_size_bytes INTEGER,
  export_sha256 TEXT,
  export_generated_at TEXT,
  export_storage_backend TEXT,
  signed_url_expires_at TEXT,
  last_downloaded_at TEXT,

  export_row_count INTEGER,
  export_summary_json TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (requester_user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dataset_download_tokens (
  id TEXT PRIMARY KEY,
  export_request_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  issued_to_user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (export_request_id) REFERENCES dataset_export_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_export_requests_requester_status ON dataset_export_requests(requester_user_id, status);
CREATE INDEX IF NOT EXISTS idx_export_requests_dataset_type ON dataset_export_requests(dataset_type);
CREATE INDEX IF NOT EXISTS idx_export_requests_status_created ON dataset_export_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_export_requests_approved_by ON dataset_export_requests(approved_by_user_id, approved_at);
CREATE INDEX IF NOT EXISTS idx_download_tokens_export ON dataset_download_tokens(export_request_id, expires_at);


CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cohort_memberships (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_memberships(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_student ON cohort_memberships(student_id);
