# FixItLocal Admin and Worker Portal

Role-based React portal connected to Supabase (`users`, `user_details`, `departments`, `teams`, `team_members`, `reports`, `report_details`).

## Roles and Pages

- `Admin`: Dashboard, Manage Users, Manage Teams, Manage Reports, Analytics, Settings
- `Dispatcher`: Dashboard, Manage Reports, Manage Schedule, Analytics, Settings
- `Report Checker`: Dashboard, Manage Reports, Analytics, Settings
- `Field Worker`: Dashboard, Scheduled Work, View Reports, Analytics, Settings

Signup is disabled. Login is required and route access is strict by role.

## Environment Variables

Create `.env` in project root:

```env
REACT_APP_SUPABASE_URL=https://<your-project-ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
REACT_APP_SUPABASE_CREATE_USER_FUNCTION=admin-create-user
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
REACT_APP_SUPABASE_PREFER_DIRECT_INVITE_FLOW=true
```

## Required Supabase Setup

1. Ensure `supabase/001.sql` is already applied (as you confirmed).
2. Deploy the admin-create-user function:

```bash
supabase functions deploy admin-create-user
```

3. Set function secrets:

```bash
supabase secrets set SUPABASE_URL=https://<your-project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Function file: `supabase/functions/admin-create-user/index.ts`

4. Apply the latest schema migration for team-level scheduling:

```sql
-- run file
supabase/010_team_schedule_on_response_teams.sql
```

5. In Supabase Dashboard -> Authentication -> Emails -> Invite user, paste:

`supabase/invite_user_email_template.html`

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run build
```
