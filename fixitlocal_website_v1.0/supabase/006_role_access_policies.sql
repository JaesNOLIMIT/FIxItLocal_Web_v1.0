-- Role-aware access policies for Admin / Dispatcher / Report Checker / Worker.
-- This migration tightens worker report visibility to team-assigned reports
-- and allows report-checker status updates on report_details.

-- ============================================================
-- 1) Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_report_checker()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND is_active = TRUE
      AND role = 'Report Checker'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND is_active = TRUE
      AND role = 'Worker'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_dispatcher_or_checker()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND is_active = TRUE
      AND role IN ('Admin', 'Dispatcher', 'Report Checker')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_team(target_team_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.users u ON u.user_id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND tm.is_active = TRUE
      AND tm.team_id = target_team_id
  )
$$;

DROP FUNCTION IF EXISTS public.can_access_report(BIGINT, BIGINT);
CREATE OR REPLACE FUNCTION public.can_access_report(
  p_report_id BIGINT,
  p_report_team_id BIGINT,
  p_report_reported_by BIGINT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_dispatcher_or_checker()
    OR (
      public.is_worker()
      AND (
        (
          p_report_team_id IS NOT NULL
          AND public.is_member_of_team(p_report_team_id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.report_response_teams rrt
          WHERE rrt.report_id = p_report_id
            AND public.is_member_of_team(rrt.team_id)
        )
      )
    )
    OR p_report_reported_by = public.current_user_profile_id()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_profile_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_report_checker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_dispatcher_or_checker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_member_of_team(BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_report(BIGINT, BIGINT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_report_checker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_worker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_dispatcher_or_checker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_team(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_report(BIGINT, BIGINT, BIGINT) TO authenticated;

-- ============================================================
-- 2) users + user_details (read access for operations roles)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self_or_admin ON public.users;
DROP POLICY IF EXISTS users_select_self_or_operations ON public.users;
CREATE POLICY users_select_self_or_operations
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_admin_dispatcher_or_checker()
  );

DROP POLICY IF EXISTS user_details_select_self_or_admin ON public.user_details;
DROP POLICY IF EXISTS user_details_select_self_or_operations ON public.user_details;
CREATE POLICY user_details_select_self_or_operations
  ON public.user_details
  FOR SELECT
  TO authenticated
  USING (
    user_id = public.current_user_profile_id()
    OR public.is_admin_dispatcher_or_checker()
  );

-- ============================================================
-- 3) reports + report_details (team-scoped worker visibility)
-- ============================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select_authenticated ON public.reports;
DROP POLICY IF EXISTS reports_select_by_role_scope ON public.reports;
CREATE POLICY reports_select_by_role_scope
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.can_access_report(report_id, assigned_team_id, reported_by));

DROP POLICY IF EXISTS report_details_select_authenticated ON public.report_details;
DROP POLICY IF EXISTS report_details_select_by_visible_reports ON public.report_details;
CREATE POLICY report_details_select_by_visible_reports
  ON public.report_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports r
      WHERE r.report_id = report_details.report_id
        AND public.can_access_report(r.report_id, r.assigned_team_id, r.reported_by)
    )
  );

DROP POLICY IF EXISTS report_details_update_admin_dispatcher ON public.report_details;
DROP POLICY IF EXISTS report_details_update_admin_dispatcher_checker ON public.report_details;
CREATE POLICY report_details_update_admin_dispatcher_checker
  ON public.report_details
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_dispatcher_or_checker())
  WITH CHECK (public.is_admin_dispatcher_or_checker());

-- ============================================================
-- 4) report_response_teams (scope reads, restrict writes)
-- ============================================================
ALTER TABLE public.report_response_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_response_teams_select ON public.report_response_teams;
DROP POLICY IF EXISTS report_response_teams_insert ON public.report_response_teams;
DROP POLICY IF EXISTS report_response_teams_delete ON public.report_response_teams;

CREATE POLICY report_response_teams_select
  ON public.report_response_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports r
      WHERE r.report_id = report_response_teams.report_id
        AND public.can_access_report(r.report_id, r.assigned_team_id, r.reported_by)
    )
  );

CREATE POLICY report_response_teams_insert
  ON public.report_response_teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_dispatcher());

CREATE POLICY report_response_teams_delete
  ON public.report_response_teams
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_dispatcher());

-- ============================================================
-- 5) departments + teams + team_members (admin-managed writes)
-- ============================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_select_authenticated ON public.departments;
DROP POLICY IF EXISTS departments_insert_admin ON public.departments;
DROP POLICY IF EXISTS departments_update_admin ON public.departments;
DROP POLICY IF EXISTS departments_delete_admin ON public.departments;

CREATE POLICY departments_select_authenticated
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY departments_insert_admin
  ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY departments_update_admin
  ON public.departments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY departments_delete_admin
  ON public.departments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS teams_select_authenticated ON public.teams;
DROP POLICY IF EXISTS teams_insert_admin ON public.teams;
DROP POLICY IF EXISTS teams_update_admin ON public.teams;
DROP POLICY IF EXISTS teams_delete_admin ON public.teams;

CREATE POLICY teams_select_authenticated
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY teams_insert_admin
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY teams_update_admin
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY teams_delete_admin
  ON public.teams
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS team_members_select_role_scope ON public.team_members;
DROP POLICY IF EXISTS team_members_insert_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_update_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_delete_admin ON public.team_members;

CREATE POLICY team_members_select_role_scope
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_dispatcher_or_checker()
    OR user_id = public.current_user_profile_id()
    OR public.is_member_of_team(team_id)
  );

CREATE POLICY team_members_insert_admin
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY team_members_update_admin
  ON public.team_members
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY team_members_delete_admin
  ON public.team_members
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
