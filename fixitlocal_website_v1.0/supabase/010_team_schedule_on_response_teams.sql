-- Team-level schedule fields and validation for report_response_teams.
-- This supports per-team scheduling windows (08:00-17:00 Asia/Manila)
-- and blocks conflicting bookings on the same team/date.

ALTER TABLE public.report_response_teams
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS ai_estimate_notes TEXT;

ALTER TABLE public.report_response_teams
  DROP CONSTRAINT IF EXISTS report_response_teams_schedule_window_chk;
ALTER TABLE public.report_response_teams
  ADD CONSTRAINT report_response_teams_schedule_window_chk CHECK (
    scheduled_end IS NULL
    OR scheduled_start IS NULL
    OR scheduled_end >= scheduled_start
  );

ALTER TABLE public.report_response_teams
  DROP CONSTRAINT IF EXISTS report_response_teams_estimated_minutes_chk;
ALTER TABLE public.report_response_teams
  ADD CONSTRAINT report_response_teams_estimated_minutes_chk CHECK (
    estimated_minutes IS NULL OR estimated_minutes >= 0
  );

ALTER TABLE public.report_response_teams
  DROP CONSTRAINT IF EXISTS report_response_teams_schedule_pair_chk;
ALTER TABLE public.report_response_teams
  ADD CONSTRAINT report_response_teams_schedule_pair_chk CHECK (
    (scheduled_start IS NULL AND scheduled_end IS NULL)
    OR (scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_report_response_teams_scheduled_start
  ON public.report_response_teams(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_report_response_teams_scheduled_end
  ON public.report_response_teams(scheduled_end);

CREATE OR REPLACE FUNCTION public.validate_report_team_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_local TIMESTAMP;
  end_local TIMESTAMP;
  schedule_local_date DATE;
  has_same_day_conflict BOOLEAN;
  has_overlap_conflict BOOLEAN;
BEGIN
  IF NEW.scheduled_start IS NULL AND NEW.scheduled_end IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_start IS NULL OR NEW.scheduled_end IS NULL THEN
    RAISE EXCEPTION 'scheduled_start and scheduled_end must both be set or both be null.';
  END IF;

  start_local := NEW.scheduled_start AT TIME ZONE 'Asia/Manila';
  end_local := NEW.scheduled_end AT TIME ZONE 'Asia/Manila';
  schedule_local_date := start_local::date;

  IF end_local::date <> schedule_local_date THEN
    RAISE EXCEPTION 'Schedule must start and end on the same date (Asia/Manila).';
  END IF;

  IF start_local::time < TIME '08:00' OR end_local::time > TIME '17:00' THEN
    RAISE EXCEPTION 'Schedule must be within 08:00 to 17:00 (Asia/Manila).';
  END IF;

  IF NEW.scheduled_end <= NEW.scheduled_start THEN
    RAISE EXCEPTION 'scheduled_end must be after scheduled_start.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.report_response_teams rrt
    WHERE rrt.team_id = NEW.team_id
      AND rrt.response_team_id <> COALESCE(NEW.response_team_id, -1)
      AND rrt.scheduled_start IS NOT NULL
      AND rrt.scheduled_end IS NOT NULL
      AND (rrt.scheduled_start AT TIME ZONE 'Asia/Manila')::date = schedule_local_date
  )
  INTO has_same_day_conflict;

  IF has_same_day_conflict THEN
    RAISE EXCEPTION 'Team already has a scheduled report on this date.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.report_response_teams rrt
    WHERE rrt.team_id = NEW.team_id
      AND rrt.response_team_id <> COALESCE(NEW.response_team_id, -1)
      AND rrt.scheduled_start IS NOT NULL
      AND rrt.scheduled_end IS NOT NULL
      AND tstzrange(rrt.scheduled_start, rrt.scheduled_end, '[)')
          && tstzrange(NEW.scheduled_start, NEW.scheduled_end, '[)')
  )
  INTO has_overlap_conflict;

  IF has_overlap_conflict THEN
    RAISE EXCEPTION 'Team already has a scheduled report in this time range.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_team_schedule ON public.report_response_teams;
CREATE TRIGGER trg_validate_report_team_schedule
BEFORE INSERT OR UPDATE OF team_id, scheduled_start, scheduled_end
ON public.report_response_teams
FOR EACH ROW
EXECUTE FUNCTION public.validate_report_team_schedule();

-- Keep primary team schedule synchronized when report assignment is created/changed.
CREATE OR REPLACE FUNCTION public.sync_primary_report_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_team_id IS NOT NULL THEN
    INSERT INTO public.report_response_teams (
      report_id,
      team_id,
      scheduled_start,
      scheduled_end,
      estimated_minutes,
      ai_estimate_notes
    )
    VALUES (
      NEW.report_id,
      NEW.assigned_team_id,
      NEW.scheduled_start,
      NEW.scheduled_end,
      NEW.estimated_minutes,
      NEW.ai_estimate_notes
    )
    ON CONFLICT (report_id, team_id) DO UPDATE SET
      scheduled_start = EXCLUDED.scheduled_start,
      scheduled_end = EXCLUDED.scheduled_end,
      estimated_minutes = EXCLUDED.estimated_minutes,
      ai_estimate_notes = EXCLUDED.ai_estimate_notes;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_report_team ON public.reports;
CREATE TRIGGER trg_sync_primary_report_team
AFTER INSERT OR UPDATE OF assigned_team_id, scheduled_start, scheduled_end, estimated_minutes, ai_estimate_notes
ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_primary_report_team();

-- Backfill schedule columns from existing report-level schedule
-- for primary assigned team rows.
UPDATE public.report_response_teams rrt
SET
  scheduled_start = COALESCE(rrt.scheduled_start, r.scheduled_start),
  scheduled_end = COALESCE(rrt.scheduled_end, r.scheduled_end),
  estimated_minutes = COALESCE(rrt.estimated_minutes, r.estimated_minutes),
  ai_estimate_notes = COALESCE(rrt.ai_estimate_notes, r.ai_estimate_notes)
FROM public.reports r
WHERE rrt.report_id = r.report_id
  AND rrt.team_id = r.assigned_team_id
  AND (
    rrt.scheduled_start IS NULL
    OR rrt.scheduled_end IS NULL
    OR rrt.estimated_minutes IS NULL
    OR rrt.ai_estimate_notes IS NULL
  );

-- Allow schedule updates for dispatcher/admin in report_response_teams.
DROP POLICY IF EXISTS report_response_teams_update ON public.report_response_teams;
CREATE POLICY report_response_teams_update
  ON public.report_response_teams
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());
