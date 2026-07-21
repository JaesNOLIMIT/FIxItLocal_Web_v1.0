-- Seed role accounts in public.users + public.user_details
-- IMPORTANT:
-- 1) Create the Auth users first in Supabase Auth (Dashboard > Authentication > Users).
-- 2) Use the same emails below (or edit this file first).
-- 3) Then run this script to link auth.users -> public.users.

WITH seed_accounts AS (
  SELECT *
  FROM (
    VALUES
      ('admin@fixitlocal.local', 'Admin', 'System', NULL, 'Administrator', NULL),
      ('dispatcher@fixitlocal.local', 'Dispatcher', 'Default', NULL, 'Dispatcher', NULL),
      ('reportchecker@fixitlocal.local', 'Report Checker', 'Default', NULL, 'Checker', NULL),
      ('worker@fixitlocal.local', 'Worker', 'Default', NULL, 'Worker', NULL)
  ) AS t(email, role, first_name, middle_name, last_name, suffix)
),
matched_auth AS (
  SELECT
    sa.email,
    sa.role,
    sa.first_name,
    sa.middle_name,
    sa.last_name,
    sa.suffix,
    au.id AS auth_user_id
  FROM seed_accounts sa
  JOIN auth.users au ON lower(au.email) = lower(sa.email)
),
upsert_users AS (
  INSERT INTO public.users (auth_user_id, email, role, is_active, access_start, access_end)
  SELECT
    ma.auth_user_id,
    ma.email,
    ma.role::public.user_role,
    TRUE,
    NULL,
    NULL
  FROM matched_auth ma
  ON CONFLICT (email) DO UPDATE
  SET
    auth_user_id = EXCLUDED.auth_user_id,
    role = EXCLUDED.role,
    is_active = TRUE,
    access_start = NULL,
    access_end = NULL,
    updated_at = NOW()
  RETURNING user_id, email
)
INSERT INTO public.user_details (user_id, first_name, middle_name, last_name, suffix)
SELECT
  uu.user_id,
  ma.first_name,
  ma.middle_name,
  ma.last_name,
  ma.suffix
FROM upsert_users uu
JOIN matched_auth ma ON ma.email = uu.email
ON CONFLICT (user_id) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  middle_name = EXCLUDED.middle_name,
  last_name = EXCLUDED.last_name,
  suffix = EXCLUDED.suffix,
  updated_at = NOW();

-- Optional: assign the worker to an existing team after seeding.
-- Replace <TEAM_ID> with a valid team_id.
-- INSERT INTO public.team_members (team_id, user_id, member_role, is_active)
-- SELECT
--   <TEAM_ID>,
--   u.user_id,
--   'member'::public.team_member_role,
--   TRUE
-- FROM public.users u
-- WHERE lower(u.email) = lower('worker@fixitlocal.local')
-- ON CONFLICT (team_id, user_id) DO UPDATE
-- SET is_active = TRUE, updated_at = NOW();

-- Verify result
SELECT
  u.user_id,
  u.email,
  u.role,
  u.is_active,
  ud.first_name,
  ud.last_name
FROM public.users u
LEFT JOIN public.user_details ud ON ud.user_id = u.user_id
WHERE lower(u.email) IN (
  'admin@fixitlocal.local',
  'dispatcher@fixitlocal.local',
  'reportchecker@fixitlocal.local',
  'worker@fixitlocal.local'
)
ORDER BY u.role, u.email;
