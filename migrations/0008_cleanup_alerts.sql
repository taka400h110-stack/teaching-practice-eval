CREATE TABLE IF NOT EXISTS cleanup_alert_notifications (
  id TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  severity TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cleanup_alert_notifications_lookup
ON cleanup_alert_notifications(alert_type, channel, sent_at DESC);

CREATE TABLE IF NOT EXISTS admin_alert_dismissals (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  dismissed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(admin_user_id, alert_type, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_dismissals_lookup
ON admin_alert_dismissals(admin_user_id, alert_type, dismissed_at DESC);
