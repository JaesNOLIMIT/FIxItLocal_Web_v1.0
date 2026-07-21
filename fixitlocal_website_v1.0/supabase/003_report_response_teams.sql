-- Junction table: multiple responding teams per report.
-- Coexists with reports.assigned_team_id (the primary responder).
-- Use this to track every additional team that responds to a report.

CREATE TABLE IF NOT EXISTS public.report_response_teams (
  response_team_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id BIGINT NOT NULL REFERENCES public.reports(report_id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_response_teams_report_team_uniq UNIQUE (report_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_report_response_teams_report_id
  ON public.report_response_teams(report_id);
CREATE INDEX IF NOT EXISTS idx_report_response_teams_team_id
  ON public.report_response_teams(team_id);

DROP TRIGGER IF EXISTS trg_report_response_teams_updated_at
  ON public.report_response_teams;
CREATE TRIGGER trg_report_response_teams_updated_at
BEFORE UPDATE ON public.report_response_teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: any authenticated user can read; admins (and authenticated callers
-- with appropriate role for now) can insert/delete. Matches the existing
-- reports reassignment model where dispatchers and admins both manage.
ALTER TABLE public.report_response_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_response_teams_select         ON public.report_response_teams;
DROP POLICY IF EXISTS report_response_teams_insert         ON public.report_response_teams;
DROP POLICY IF EXISTS report_response_teams_delete         ON public.report_response_teams;

CREATE POLICY report_response_teams_select
  ON public.report_response_teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY report_response_teams_insert
  ON public.report_response_teams
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY report_response_teams_delete
  ON public.report_response_teams
  FOR DELETE
  TO authenticated
  USING (true);
