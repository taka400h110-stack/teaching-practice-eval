CREATE TABLE IF NOT EXISTS user_bfi_scores (
  user_id TEXT PRIMARY KEY,
  extraversion REAL,
  neuroticism REAL,
  openness REAL,
  agreeableness REAL,
  conscientiousness REAL,
  is_completed BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS namikawa_bfi_responses (
  user_id TEXT NOT NULL,
  item_id INTEGER CHECK(item_id >= 1 AND item_id <= 29),
  score INTEGER CHECK(score >= 1 AND score <= 5),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id)
);
