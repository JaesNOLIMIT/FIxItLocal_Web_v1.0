-- Backfill existing primary assignments into report_response_teams.
-- Safe to run multiple times due ON CONFLICT DO NOTHING.

INSERT INTO public.report_response_teams (report_id, team_id)
SELECT r.report_id, r.assigned_team_id
FROM public.reports r
WHERE r.assigned_team_id IS NOT NULL
ON CONFLICT (report_id, team_id) DO NOTHING;
