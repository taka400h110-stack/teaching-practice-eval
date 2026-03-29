CREATE TABLE IF NOT EXISTS cleanup_alert_acknowledgments (
  id TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('acknowledged', 'investigating', 'resolved')
  ),
  acknowledged_by_user_id TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(alert_type, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_cleanup_alert_ack_lookup
ON cleanup_alert_acknowledgments(alert_type, fingerprint);

CREATE INDEX IF NOT EXISTS idx_cleanup_alert_ack_status
ON cleanup_alert_acknowledgments(status, updated_at DESC);
