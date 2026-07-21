-- RLS policies that allow an authenticated Admin (row in public.users with role='Admin')
-- to manage public.users and public.user_details from the admin portal.

-- ============================================================
-- 1. Helper: SECURITY DEFINER function that checks admin status
-- without triggering the users SELECT policy (avoids recursion).
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND role = 'Admin'
      AND is_active = TRUE
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 2. public.users policies
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_insert_admin          ON public.users;
DROP POLICY IF EXISTS users_select_self_or_admin  ON public.users;
DROP POLICY IF EXISTS users_update_self_or_admin  ON public.users;
DROP POLICY IF EXISTS users_delete_admin          ON public.users;

CREATE POLICY users_insert_admin
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY users_select_self_or_admin
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY users_update_self_or_admin
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY users_delete_admin
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 3. public.user_details policies
--    (admin creation flow inserts into this table right after users)
-- ============================================================
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_details_select_self_or_admin ON public.user_details;
DROP POLICY IF EXISTS user_details_insert_admin         ON public.user_details;
DROP POLICY IF EXISTS user_details_update_self_or_admin ON public.user_details;
DROP POLICY IF EXISTS user_details_delete_admin         ON public.user_details;

CREATE POLICY user_details_select_self_or_admin
  ON public.user_details
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY user_details_insert_admin
  ON public.user_details
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY user_details_update_self_or_admin
  ON public.user_details
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY user_details_delete_admin
  ON public.user_details
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
