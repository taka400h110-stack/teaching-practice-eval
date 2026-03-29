-- Add tracking columns to notifications
ALTER TABLE cleanup_alert_notifications ADD COLUMN provider TEXT;
ALTER TABLE cleanup_alert_notifications ADD COLUMN provider_message_id TEXT;
ALTER TABLE cleanup_alert_notifications ADD COLUMN delivery_status TEXT DEFAULT 'pending';
ALTER TABLE cleanup_alert_notifications ADD COLUMN last_event_type TEXT;
ALTER TABLE cleanup_alert_notifications ADD COLUMN last_event_at DATETIME;

-- Table for email delivery events
CREATE TABLE IF NOT EXISTS email_delivery_events (
  id TEXT PRIMARY KEY,
  notification_id TEXT,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  event_type TEXT NOT NULL,
  event_data_json TEXT,
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(notification_id) REFERENCES cleanup_alert_notifications(id)
);
CREATE INDEX IF NOT EXISTS idx_email_delivery_events_notification ON email_delivery_events(notification_id);

-- Alter acknowledgments table
ALTER TABLE cleanup_alert_acknowledgments ADD COLUMN assignee_user_id TEXT;
ALTER TABLE cleanup_alert_acknowledgments ADD COLUMN resolved_at DATETIME;
ALTER TABLE cleanup_alert_acknowledgments ADD COLUMN last_commented_at DATETIME;

-- Table for acknowledgment comments
CREATE TABLE IF NOT EXISTS cleanup_alert_comments (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cleanup_alert_comments_fingerprint ON cleanup_alert_comments(fingerprint);

-- Table for escalations
CREATE TABLE IF NOT EXISTS cleanup_alert_escalations (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  level INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_cleanup_alert_escalations_fingerprint ON cleanup_alert_escalations(fingerprint);
