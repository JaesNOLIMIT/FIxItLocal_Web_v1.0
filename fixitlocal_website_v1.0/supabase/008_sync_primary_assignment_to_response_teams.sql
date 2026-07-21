-- Keep report_response_teams in sync with the primary assigned team on reports.
-- This guarantees that when reports.assigned_team_id is set, a matching
-- (report_id, team_id) row exists in report_response_teams.

CREATE OR REPLACE FUNCTION public.sync_primary_report_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_team_id IS NOT NULL THEN
    INSERT INTO public.report_response_teams (report_id, team_id)
    VALUES (NEW.report_id, NEW.assigned_team_id)
    ON CONFLICT (report_id, team_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_report_team ON public.reports;
CREATE TRIGGER trg_sync_primary_report_team
AFTER INSERT OR UPDATE OF assigned_team_id
ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_primary_report_team();
