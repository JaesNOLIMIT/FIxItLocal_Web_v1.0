-- Allow multiple schedules per team/day as long as time ranges do not overlap.
-- Keeps Asia/Manila 08:00-17:00 workday enforcement.

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
