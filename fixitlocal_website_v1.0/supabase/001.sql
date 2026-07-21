-- Full schema for FixItLocal (Supabase/Postgres)

-- Safe enum creation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('Admin', 'Dispatcher', 'Worker', 'Report Checker', 'Reporter');
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Reporter';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
    CREATE TYPE team_member_role AS ENUM ('leader', 'sub leader', 'member');
  END IF;
END
$$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  access_start TIMESTAMPTZ,
  access_end TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_access_window_chk CHECK (
    access_end IS NULL OR access_start IS NULL OR access_end >= access_start
  )
);

-- User details (1:1 with users)
CREATE TABLE IF NOT EXISTS user_details (
  user_details_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  photo_path TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,
  birthdate DATE,
  gender TEXT,
  country TEXT,
  region TEXT,
  province TEXT,
  city TEXT,
  barangay TEXT,
  street TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  department_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  team_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  leader_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  sub_leader_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teams_department_name_uniq UNIQUE (department_id, name)
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  team_members_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  member_role team_member_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_members_team_user_uniq UNIQUE (team_id, user_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reported_by BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  assigned_department_id BIGINT REFERENCES departments(department_id) ON DELETE SET NULL,
  assigned_team_id BIGINT REFERENCES teams(team_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report details (1:1 with reports)
CREATE TABLE IF NOT EXISTS report_details (
  report_details_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id BIGINT NOT NULL UNIQUE REFERENCES reports(report_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  country TEXT,
  region TEXT,
  province TEXT,
  city TEXT,
  barangay TEXT,
  street TEXT,
  longitude NUMERIC(10,7),
  latitude NUMERIC(10,7),
  category TEXT,
  severity TEXT,
  status TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_details_longitude_chk CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT report_details_latitude_chk CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90))
);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_details_updated_at ON user_details;
CREATE TRIGGER trg_user_details_updated_at
BEFORE UPDATE ON user_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON teams;
CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_team_members_updated_at ON team_members;
CREATE TRIGGER trg_team_members_updated_at
BEFORE UPDATE ON team_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_report_details_updated_at ON report_details;
CREATE TRIGGER trg_report_details_updated_at
BEFORE UPDATE ON report_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_user_details_user_id ON user_details(user_id);

CREATE INDEX IF NOT EXISTS idx_teams_department_id ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_sub_leader_id ON teams(sub_leader_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);

CREATE INDEX IF NOT EXISTS idx_reports_reported_by ON reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_department_id ON reports(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_team_id ON reports(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_at ON reports(resolved_at);

CREATE INDEX IF NOT EXISTS idx_report_details_report_id ON report_details(report_id);
CREATE INDEX IF NOT EXISTS idx_report_details_category ON report_details(category);
CREATE INDEX IF NOT EXISTS idx_report_details_severity ON report_details(severity);
CREATE INDEX IF NOT EXISTS idx_report_details_status ON report_details(status);
