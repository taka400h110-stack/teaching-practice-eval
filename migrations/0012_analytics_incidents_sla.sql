-- Incidents table
CREATE TABLE IF NOT EXISTS cleanup_alert_incidents (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_incident_id TEXT,
  provider_dedup_key TEXT,
  status TEXT DEFAULT 'triggered',
  severity TEXT,
  payload_json TEXT,
  last_sent_at DATETIME,
  last_response_code INTEGER,
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_cleanup_alert_incidents_fp_provider ON cleanup_alert_incidents(fingerprint, provider);
CREATE INDEX IF NOT EXISTS idx_cleanup_alert_incidents_dedup ON cleanup_alert_incidents(provider, provider_dedup_key);

-- SLA events table
CREATE TABLE IF NOT EXISTS cleanup_alert_sla_events (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  severity TEXT,
  sla_type TEXT NOT NULL,
  deadline_at DATETIME,
  breached_at DATETIME,
  status TEXT DEFAULT 'pending',
  notification_count INTEGER DEFAULT 0,
  last_notified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cleanup_alert_sla_fp_type_status ON cleanup_alert_sla_events(fingerprint, sla_type, status);
CREATE INDEX IF NOT EXISTS idx_cleanup_alert_sla_deadline ON cleanup_alert_sla_events(deadline_at);
