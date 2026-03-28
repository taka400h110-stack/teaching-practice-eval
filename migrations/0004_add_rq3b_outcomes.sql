DROP TABLE IF EXISTS rq3b_outcomes;
CREATE TABLE IF NOT EXISTS rq3b_outcomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  goal_id TEXT,
  
  -- RD-Chat
  rd_chat_raw_level INTEGER CHECK(rd_chat_raw_level BETWEEN 1 AND 4),
  rd_chat_category TEXT CHECK(rd_chat_category IN ('shallow', 'somewhat_deep', 'deep')),
  
  -- SI-Focus
  focus_item_id INTEGER,
  previous_score REAL,
  current_score REAL,
  delta_score REAL,
  
  -- GA-Self
  ga_self_rating INTEGER CHECK(ga_self_rating BETWEEN 1 AND 5),
  ga_self_binary INTEGER CHECK(ga_self_binary IN (0, 1)),
  
  -- GA-Evidence
  ga_evidence_binary INTEGER CHECK(ga_evidence_binary IN (0, 1)),
  ga_evidence_reason TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_rq3b_user_week ON rq3b_outcomes(user_id, week_number);
