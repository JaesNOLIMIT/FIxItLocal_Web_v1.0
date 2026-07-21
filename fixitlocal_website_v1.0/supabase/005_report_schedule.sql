-- Scheduling + AI repair-time estimate columns on reports
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS ai_estimate_notes TEXT;

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_schedule_window_chk;

ALTER TABLE reports
  ADD CONSTRAINT reports_schedule_window_chk CHECK (
    scheduled_end IS NULL
    OR scheduled_start IS NULL
    OR scheduled_end >= scheduled_start
  );

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_estimated_minutes_chk;

ALTER TABLE reports
  ADD CONSTRAINT reports_estimated_minutes_chk CHECK (
    estimated_minutes IS NULL OR estimated_minutes >= 0
  );

CREATE INDEX IF NOT EXISTS idx_reports_scheduled_start ON reports(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_reports_scheduled_end ON reports(scheduled_end);
