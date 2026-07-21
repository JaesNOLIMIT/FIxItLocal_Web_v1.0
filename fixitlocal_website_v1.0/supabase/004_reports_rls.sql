-- RLS policies for reports and report_details so the admin portal can
-- read every report and the admin/dispatcher can reassign / update status.

-- Helper: is the caller an admin or dispatcher? Used in policy WITH CHECK
-- to avoid recursing through the users SELECT policy.
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
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
      AND role IN ('Admin', 'Dispatcher')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_dispatcher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_dispatcher() TO authenticated;

-- =============================================================
-- public.reports
-- =============================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select_authenticated ON public.reports;
DROP POLICY IF EXISTS reports_insert_authenticated ON public.reports;
DROP POLICY IF EXISTS reports_update_admin_dispatcher ON public.reports;
DROP POLICY IF EXISTS reports_delete_admin ON public.reports;

CREATE POLICY reports_select_authenticated
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user (reporter app) can create a report attributed
-- to their own public.users row.
CREATE POLICY reports_insert_authenticated
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reported_by IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
    OR public.is_admin_or_dispatcher()
  );

-- Admins and dispatchers can reassign / update any report.
CREATE POLICY reports_update_admin_dispatcher
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

CREATE POLICY reports_delete_admin
  ON public.reports
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================
-- public.report_details
-- =============================================================
ALTER TABLE public.report_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_details_select_authenticated   ON public.report_details;
DROP POLICY IF EXISTS report_details_insert_authenticated   ON public.report_details;
DROP POLICY IF EXISTS report_details_update_admin_dispatcher ON public.report_details;
DROP POLICY IF EXISTS report_details_delete_admin           ON public.report_details;

CREATE POLICY report_details_select_authenticated
  ON public.report_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY report_details_insert_authenticated
  ON public.report_details
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY report_details_update_admin_dispatcher
  ON public.report_details
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

CREATE POLICY report_details_delete_admin
  ON public.report_details
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
