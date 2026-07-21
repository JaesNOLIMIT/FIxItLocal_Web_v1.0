const AUTH_STORAGE_KEY = 'fixitlocal_admin_portal_auth';
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();
const CREATE_USER_FUNCTION = process.env.REACT_APP_SUPABASE_CREATE_USER_FUNCTION || 'admin-create-user';
const REPORT_IMAGES_BUCKET = process.env.REACT_APP_REPORT_IMAGES_BUCKET || 'report-images';
const PREFER_DIRECT_INVITE_FLOW = (process.env.REACT_APP_SUPABASE_PREFER_DIRECT_INVITE_FLOW || 'true').toLowerCase() !== 'false';

function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase config. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
  }
}

function toErrorMessage(payload, fallback) {
  return payload?.error_description || payload?.msg || payload?.message || fallback;
}

function buildHeaders({ token, prefer } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

function serializeSession(payload) {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    user: payload.user,
  };
}

function parseStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function normalizeStorageObjectKey(input, bucket) {
  if (!input) {
    return '';
  }

  let key = String(input).trim();
  if (!key) {
    return '';
  }

  if (/^https?:\/\//i.test(key)) {
    try {
      const url = new URL(key);
      const markerPublic = `/storage/v1/object/public/${bucket}/`;
      const markerSign = `/storage/v1/object/sign/${bucket}/`;
      const markerObject = `/storage/v1/object/${bucket}/`;
      const markerRender = `/storage/v1/render/image/public/${bucket}/`;
      const path = url.pathname;

      if (path.includes(markerPublic)) {
        return decodeURIComponent(path.split(markerPublic)[1] || '');
      }
      if (path.includes(markerSign)) {
        return decodeURIComponent(path.split(markerSign)[1] || '');
      }
      if (path.includes(markerObject)) {
        return decodeURIComponent(path.split(markerObject)[1] || '');
      }
      if (path.includes(markerRender)) {
        return decodeURIComponent(path.split(markerRender)[1] || '');
      }
    } catch {
      return '';
    }
  }

  key = key.replace(/^\/+/, '');
  key = key.replace(new RegExp(`^storage\\/v1\\/object\\/public\\/${bucket}\\/`, 'i'), '');
  key = key.replace(new RegExp(`^storage\\/v1\\/object\\/sign\\/${bucket}\\/`, 'i'), '');
  key = key.replace(new RegExp(`^storage\\/v1\\/object\\/${bucket}\\/`, 'i'), '');
  key = key.replace(new RegExp(`^public\\/${bucket}\\/`, 'i'), '');
  key = key.replace(new RegExp(`^${bucket}\\/`, 'i'), '');
  return key;
}

async function authRequest(path, { method = 'GET', body, token } = {}) {
  ensureSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: buildHeaders({ token }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(toErrorMessage(payload, 'Authentication request failed.'));
  }

  return payload;
}

async function restRequest(
  table,
  {
    method = 'GET',
    token,
    query = {},
    body,
    prefer = method === 'POST' || method === 'PATCH' ? 'return=representation' : undefined,
  } = {}
) {
  ensureSupabaseConfig();

  const params = new URLSearchParams(query);
  const url = `${SUPABASE_URL}/rest/v1/${table}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: buildHeaders({ token, prefer }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(toErrorMessage(payload, `Request failed for table "${table}".`));
  }

  return payload;
}

async function authAdminRequest(path, { method = 'POST', body } = {}) {
  ensureSupabaseConfig();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing REACT_APP_SUPABASE_SERVICE_ROLE_KEY for admin auth fallback. Restart the dev server after editing .env.'
    );
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(toErrorMessage(payload, 'Auth admin request failed.'));
  }

  return payload;
}

async function authInviteRequest(body) {
  ensureSupabaseConfig();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing REACT_APP_SUPABASE_SERVICE_ROLE_KEY for invite flow. Restart the dev server after editing .env.'
    );
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(toErrorMessage(payload, 'Auth invite request failed.'));
  }

  return payload;
}

async function edgeFunctionRequest(
  functionName,
  {
    method = 'POST',
    token,
    body,
  } = {}
) {
  ensureSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method,
    headers: buildHeaders({ token }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(toErrorMessage(payload, `Edge function request failed for "${functionName}".`));
  }

  return payload;
}

export async function loginWithPassword(email, password) {
  const payload = await authRequest('token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  const session = serializeSession(payload);
  storeSession(session);
  return session;
}

export async function refreshSession(refreshToken) {
  const payload = await authRequest('token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  const session = serializeSession(payload);
  storeSession(session);
  return session;
}

export async function getValidAccessToken() {
  const session = parseStoredSession();
  if (!session?.accessToken) {
    return null;
  }

  const isExpiringSoon = !session.expiresAt || session.expiresAt - Date.now() <= 30 * 1000;
  if (!isExpiringSoon) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    clearSession();
    return null;
  }

  try {
    const refreshed = await refreshSession(session.refreshToken);
    return refreshed.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

export async function getCurrentAuthUser() {
  const token = await getValidAccessToken();
  if (!token) {
    return null;
  }
  return authRequest('user', { token });
}

export async function signOut() {
  const token = await getValidAccessToken();
  if (token) {
    try {
      await authRequest('logout', { method: 'POST', token });
    } catch {
      // Intentionally ignored to guarantee local logout.
    }
  }
  clearSession();
}

function normalizeName(details) {
  if (!details) {
    return '';
  }

  const parts = [details.first_name, details.middle_name, details.last_name, details.suffix]
    .filter(Boolean)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

async function linkProfileToAuthUser(userId, authUserId, token) {
  await restRequest('users', {
    method: 'PATCH',
    token,
    query: {
      user_id: `eq.${userId}`,
    },
    body: { auth_user_id: authUserId },
  });
}

export async function fetchCurrentUserProfile(authUserId, token, email = null) {
  const users = await restRequest('users', {
    token,
    query: {
      select: 'user_id,email,role,is_active,access_start,access_end,auth_user_id',
      auth_user_id: `eq.${authUserId}`,
      limit: '1',
    },
  });

  let user = users?.[0] || null;

  if (!user && email) {
    const usersByEmail = await restRequest('users', {
      token,
      query: {
        select: 'user_id,email,role,is_active,access_start,access_end,auth_user_id',
        email: `ilike.${email}`,
        limit: '1',
      },
    });

    const byEmail = usersByEmail?.[0] || null;
    if (byEmail) {
      await linkProfileToAuthUser(byEmail.user_id, authUserId, token);
      user = { ...byEmail, auth_user_id: authUserId };
    }
  }

  if (!user) {
    return null;
  }

  const details = await restRequest('user_details', {
    token,
    query: {
      select: 'user_id,photo_path,first_name,middle_name,last_name,suffix',
      user_id: `eq.${user.user_id}`,
      limit: '1',
    },
  });

  const userDetails = details?.[0] || null;
  return {
    ...user,
    user_details: userDetails,
    display_name: normalizeName(userDetails) || user.email,
  };
}

export async function fetchUserDetailsByUserId(userId, token) {
  if (!userId) {
    return null;
  }

  const details = await restRequest('user_details', {
    token,
    query: {
      select: 'user_id,photo_path,first_name,middle_name,last_name,suffix',
      user_id: `eq.${userId}`,
      limit: '1',
    },
  });

  return details?.[0] || null;
}

function scopeSystemDataForRole(snapshot, { roleKey, currentUserId } = {}) {
  if (roleKey !== 'worker' || !currentUserId) {
    return snapshot;
  }

  const currentUserIdNumber = Number(currentUserId);
  const workerMembershipRows = snapshot.teamMembers
    .filter((member) => Number(member.user_id) === currentUserIdNumber && member.is_active)
    .sort((left, right) => {
      const leftTime = left.joined_at ? new Date(left.joined_at).getTime() : 0;
      const rightTime = right.joined_at ? new Date(right.joined_at).getTime() : 0;
      return rightTime - leftTime;
    });
  const primaryMembership = workerMembershipRows[0] || null;
  const visibleTeamIds = new Set(
    primaryMembership ? [Number(primaryMembership.team_id)] : []
  );
  const visibleTeams = snapshot.teams.filter((team) => visibleTeamIds.has(Number(team.team_id)));

  const responseLinkedReportIds = new Set(
    snapshot.reportResponseTeams
      .filter((row) => visibleTeamIds.has(Number(row.team_id)))
      .map((row) => Number(row.report_id))
  );
  const visibleReports = snapshot.reports.filter(
    (report) =>
      visibleTeamIds.has(Number(report.assigned_team_id)) ||
      responseLinkedReportIds.has(Number(report.report_id))
  );
  const visibleReportIds = new Set(visibleReports.map((report) => Number(report.report_id)));
  const visibleReportDetails = snapshot.reportDetails.filter((detail) =>
    visibleReportIds.has(Number(detail.report_id))
  );
  const visibleResponseTeams = snapshot.reportResponseTeams.filter((row) =>
    visibleReportIds.has(Number(row.report_id)) && visibleTeamIds.has(Number(row.team_id))
  );

  const visibleDepartmentIds = new Set(
    [
      ...visibleTeams.map((team) => Number(team.department_id)),
      ...visibleReports.map((report) => Number(report.assigned_department_id)),
    ].filter((value) => Number.isFinite(value) && value > 0)
  );
  const visibleDepartments = snapshot.departments.filter((department) =>
    visibleDepartmentIds.has(Number(department.department_id))
  );

  const visibleTeamMemberRows = snapshot.teamMembers.filter(
    (member) => visibleTeamIds.has(Number(member.team_id)) && member.is_active
  );
  const visibleUserIds = new Set([
    currentUserIdNumber,
    ...visibleReports.map((report) => Number(report.reported_by)),
    ...visibleTeamMemberRows.map((member) => Number(member.user_id)),
    ...visibleTeams
      .flatMap((team) => [team.leader_id, team.sub_leader_id])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0),
  ]);
  const visibleUsers = snapshot.users.filter((user) => visibleUserIds.has(Number(user.user_id)));
  const visibleUserDetails = snapshot.userDetails.filter((details) =>
    visibleUserIds.has(Number(details.user_id))
  );

  return {
    users: visibleUsers,
    userDetails: visibleUserDetails,
    departments: visibleDepartments,
    teams: visibleTeams,
    teamMembers: visibleTeamMemberRows,
    reports: visibleReports,
    reportDetails: visibleReportDetails,
    reportResponseTeams: visibleResponseTeams,
  };
}

export async function fetchSystemData(token, options = {}) {
  const [
    users,
    userDetails,
    departments,
    teams,
    teamMembers,
    reports,
    reportDetails,
    reportResponseTeams,
  ] = await Promise.all([
    restRequest('users', {
      token,
      query: { select: 'user_id,auth_user_id,email,role,is_active,access_start,access_end,created_at' },
    }),
    restRequest('user_details', {
      token,
      query: { select: 'user_id,first_name,middle_name,last_name,suffix,created_at,updated_at' },
    }),
    restRequest('departments', {
      token,
      query: { select: 'department_id,name,description,created_at,updated_at' },
    }),
    restRequest('teams', {
      token,
      query: { select: 'team_id,department_id,name,leader_id,sub_leader_id,created_at' },
    }),
    restRequest('team_members', {
      token,
      query: { select: 'team_members_id,team_id,user_id,member_role,is_active,joined_at' },
    }),
    restRequest('reports', {
      token,
      query: {
        select:
          'report_id,reported_by,assigned_department_id,assigned_team_id,resolved_at,scheduled_start,scheduled_end,estimated_minutes,ai_estimate_notes,created_at,updated_at',
      },
    }),
    restRequest('report_details', {
      token,
      query: {
        select:
          'report_details_id,report_id,title,description,country,region,province,city,barangay,street,category,severity,status,image_path,latitude,longitude,created_at,updated_at',
      },
    }),
    restRequest('report_response_teams', {
      token,
      query: {
        select:
          'response_team_id,report_id,team_id,assigned_at,scheduled_start,scheduled_end,estimated_minutes,ai_estimate_notes,created_at,updated_at',
      },
    }).catch(() => []),
  ]);

  const snapshot = {
    users: users || [],
    userDetails: userDetails || [],
    departments: departments || [],
    teams: teams || [],
    teamMembers: teamMembers || [],
    reports: reports || [],
    reportDetails: reportDetails || [],
    reportResponseTeams: reportResponseTeams || [],
  };

  return scopeSystemDataForRole(snapshot, options);
}

export async function fetchDepartments(token) {
  const departments = await restRequest('departments', {
    token,
    query: { select: 'department_id,name,description,created_at,updated_at' },
  });
  return departments || [];
}

function toNullableText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function generateTemporaryPassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_+=';
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function shouldFallbackManagedCreate(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('edge function request failed') ||
    message.includes('load failed') ||
    message.includes('requested function was not found') ||
    message.includes('function was not found') ||
    message.includes('missing supabase_url') ||
    message.includes('supabase_service_role_key')
  );
}

async function createManagedUserAccountFallback(payload, token) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Invite flow requires REACT_APP_SUPABASE_SERVICE_ROLE_KEY when edge function is unavailable. Restart the dev server after editing .env and rebuild/redeploy if using a production build.'
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const metadata = {
    role: payload.role,
    first_name: toNullableText(payload.first_name),
    middle_name: toNullableText(payload.middle_name),
    last_name: toNullableText(payload.last_name),
    suffix: toNullableText(payload.suffix),
    temporary_password: temporaryPassword,
    login_url: payload.login_url || null,
  };
  const invited = await authInviteRequest({
    email: payload.email,
    data: metadata,
    ...(payload.login_url ? { redirect_to: payload.login_url } : {}),
  });

  const authUserId = invited?.id || invited?.user?.id || null;

  if (!authUserId) {
    throw new Error('Unable to create auth user.');
  }

  await authAdminRequest(`users/${authUserId}`, {
    method: 'PUT',
    body: {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: metadata,
    },
  });

  const insertedUsers = await restRequest('users', {
    method: 'POST',
    token,
    body: [
      {
        auth_user_id: authUserId,
        email: payload.email,
        role: payload.role,
        access_start: payload.access_start || null,
        access_end: payload.access_end || null,
        is_active: true,
      },
    ],
  });

  const createdUser = insertedUsers?.[0] || null;
  if (!createdUser) {
    throw new Error('User account was not created.');
  }

  await restRequest('user_details', {
    method: 'POST',
    token,
    body: [
      {
        user_id: createdUser.user_id,
        photo_path: toNullableText(payload.photo_path),
        first_name: toNullableText(payload.first_name),
        middle_name: toNullableText(payload.middle_name),
        last_name: toNullableText(payload.last_name),
        suffix: toNullableText(payload.suffix),
        birthdate: toNullableText(payload.birthdate),
        gender: toNullableText(payload.gender),
        country: toNullableText(payload.country),
        region: toNullableText(payload.region),
        province: toNullableText(payload.province),
        city: toNullableText(payload.city),
        barangay: toNullableText(payload.barangay),
        street: toNullableText(payload.street),
      },
    ],
  });

  return {
    auth_user_id: authUserId,
    user: createdUser,
    temporary_password: temporaryPassword,
    invite_email_sent: true,
    fallback: true,
  };
}

export async function createManagedUserAccount(payload, token) {
  const requestBody = {
    email: payload.email,
    role: payload.role,
    access_start: payload.access_start || null,
    access_end: payload.access_end || null,
    first_name: toNullableText(payload.first_name),
    middle_name: toNullableText(payload.middle_name),
    last_name: toNullableText(payload.last_name),
    suffix: toNullableText(payload.suffix),
    birthdate: toNullableText(payload.birthdate),
    gender: toNullableText(payload.gender),
    country: toNullableText(payload.country),
    region: toNullableText(payload.region),
    province: toNullableText(payload.province),
    city: toNullableText(payload.city),
    barangay: toNullableText(payload.barangay),
    street: toNullableText(payload.street),
    photo_path: toNullableText(payload.photo_path),
    login_url: payload.login_url || null,
    auth_user_id: toNullableText(payload.auth_user_id),
  };

  if (PREFER_DIRECT_INVITE_FLOW && SUPABASE_SERVICE_ROLE_KEY) {
    return createManagedUserAccountFallback(requestBody, token);
  }

  let result;
  try {
    result = await edgeFunctionRequest(CREATE_USER_FUNCTION, {
      token,
      body: requestBody,
    });
  } catch (error) {
    if (!shouldFallbackManagedCreate(error)) {
      throw error;
    }
    try {
      result = await createManagedUserAccountFallback(requestBody, token);
    } catch (fallbackError) {
      const originalMessage = error?.message || 'Managed account creation failed.';
      const fallbackMessage = fallbackError?.message || 'Fallback account creation failed.';
      throw new Error(`${originalMessage} ${fallbackMessage}`);
    }
  }

  if (!result?.user) {
    throw new Error('User account was not created.');
  }

  return result;
}

export async function createTeam(payload, token) {
  await restRequest('teams', {
    method: 'POST',
    token,
    body: [
      {
        department_id: Number(payload.department_id),
        name: payload.name,
        leader_id: payload.leader_id ? Number(payload.leader_id) : null,
        sub_leader_id: payload.sub_leader_id ? Number(payload.sub_leader_id) : null,
      },
    ],
  });
}

export async function createDepartment(payload, token) {
  await restRequest('departments', {
    method: 'POST',
    token,
    body: [
      {
        name: payload.name,
        description: payload.description || null,
      },
    ],
  });
}

export async function updateDepartment(departmentId, payload, token) {
  await restRequest('departments', {
    method: 'PATCH',
    token,
    query: {
      department_id: `eq.${departmentId}`,
    },
    body: {
      name: payload.name,
      description: payload.description || null,
    },
  });
}

export async function deleteDepartment(departmentId, token) {
  await restRequest('departments', {
    method: 'DELETE',
    token,
    query: {
      department_id: `eq.${departmentId}`,
    },
  });
}

export async function updateTeamLeadership(teamId, payload, token) {
  await restRequest('teams', {
    method: 'PATCH',
    token,
    query: {
      team_id: `eq.${teamId}`,
    },
    body: {
      leader_id: payload.leader_id ? Number(payload.leader_id) : null,
      sub_leader_id: payload.sub_leader_id ? Number(payload.sub_leader_id) : null,
    },
  });
}

export async function addTeamMember(payload, token) {
  await restRequest('team_members', {
    method: 'POST',
    token,
    body: [
      {
        team_id: Number(payload.team_id),
        user_id: Number(payload.user_id),
        member_role: payload.member_role || 'member',
        is_active: true,
      },
    ],
  });
}

export async function addReportResponseTeam(reportId, teamId, token, schedule = {}) {
  const payload = {
    report_id: Number(reportId),
    team_id: Number(teamId),
  };

  if (Object.prototype.hasOwnProperty.call(schedule, 'scheduled_start')) {
    payload.scheduled_start = schedule.scheduled_start || null;
  }
  if (Object.prototype.hasOwnProperty.call(schedule, 'scheduled_end')) {
    payload.scheduled_end = schedule.scheduled_end || null;
  }
  if (Object.prototype.hasOwnProperty.call(schedule, 'estimated_minutes')) {
    const value = schedule.estimated_minutes;
    payload.estimated_minutes =
      value === '' || value === null || value === undefined ? null : Number(value);
  }
  if (Object.prototype.hasOwnProperty.call(schedule, 'ai_estimate_notes')) {
    payload.ai_estimate_notes = schedule.ai_estimate_notes || null;
  }

  const rows = await restRequest('report_response_teams', {
    method: 'POST',
    token,
    body: [payload],
  });
  return rows?.[0] || null;
}

export async function removeReportResponseTeam(responseTeamId, token) {
  await restRequest('report_response_teams', {
    method: 'DELETE',
    token,
    query: {
      response_team_id: `eq.${responseTeamId}`,
    },
  });
}

export async function upsertReportResponseTeamSchedule(reportId, teamId, payload, token) {
  const body = {
    report_id: Number(reportId),
    team_id: Number(teamId),
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'scheduled_start')) {
    body.scheduled_start = payload.scheduled_start || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'scheduled_end')) {
    body.scheduled_end = payload.scheduled_end || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'estimated_minutes')) {
    const value = payload.estimated_minutes;
    body.estimated_minutes = value === '' || value === null || value === undefined ? null : Number(value);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'ai_estimate_notes')) {
    body.ai_estimate_notes = payload.ai_estimate_notes || null;
  }

  try {
    const rows = await restRequest('report_response_teams', {
      method: 'POST',
      token,
      query: {
        on_conflict: 'report_id,team_id',
      },
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [body],
    });

    return rows?.[0] || null;
  } catch (upsertError) {
    try {
      const updatedRows = await restRequest('report_response_teams', {
        method: 'PATCH',
        token,
        query: {
          report_id: `eq.${Number(reportId)}`,
          team_id: `eq.${Number(teamId)}`,
        },
        body,
      });
      if (updatedRows?.length) {
        return updatedRows[0];
      }
    } catch {
      // Continue to insert fallback
    }

    try {
      const insertedRows = await restRequest('report_response_teams', {
        method: 'POST',
        token,
        body: [body],
      });
      return insertedRows?.[0] || null;
    } catch (insertError) {
      const duplicate = /duplicate|uniq|unique|23505/i.test(insertError?.message || '');
      if (duplicate) {
        await restRequest('report_response_teams', {
          method: 'DELETE',
          token,
          query: {
            report_id: `eq.${Number(reportId)}`,
            team_id: `eq.${Number(teamId)}`,
          },
        });
        const replacedRows = await restRequest('report_response_teams', {
          method: 'POST',
          token,
          body: [body],
        });
        return replacedRows?.[0] || null;
      }
      throw insertError;
    }
  }
}

export async function updateReportAssignment(reportId, payload, token) {
  const body = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'assigned_department_id')) {
    body.assigned_department_id = payload.assigned_department_id
      ? Number(payload.assigned_department_id)
      : null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'assigned_team_id')) {
    body.assigned_team_id = payload.assigned_team_id ? Number(payload.assigned_team_id) : null;
  }

  if (!Object.keys(body).length) {
    return;
  }

  await restRequest('reports', {
    method: 'PATCH',
    token,
    query: {
      report_id: `eq.${reportId}`,
    },
    body,
  });
}

export async function updateReportSchedule(reportId, payload, token) {
  const body = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'scheduled_start')) {
    body.scheduled_start = payload.scheduled_start || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'scheduled_end')) {
    body.scheduled_end = payload.scheduled_end || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'estimated_minutes')) {
    const value = payload.estimated_minutes;
    body.estimated_minutes =
      value === '' || value === null || value === undefined ? null : Number(value);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'ai_estimate_notes')) {
    body.ai_estimate_notes = payload.ai_estimate_notes || null;
  }

  if (!Object.keys(body).length) {
    return;
  }

  await restRequest('reports', {
    method: 'PATCH',
    token,
    query: {
      report_id: `eq.${reportId}`,
    },
    body,
  });
}

export async function updateReportStatus(reportId, status, token) {
  await restRequest('report_details', {
    method: 'PATCH',
    token,
    query: {
      report_id: `eq.${reportId}`,
    },
    body: { status },
  });
}

export async function upsertUserDetails(userId, details, token) {
  const rows = await restRequest('user_details', {
    token,
    query: {
      select: 'user_details_id,user_id',
      user_id: `eq.${userId}`,
      limit: '1',
    },
  });

  if (rows?.length) {
    await restRequest('user_details', {
      method: 'PATCH',
      token,
      query: { user_id: `eq.${userId}` },
      body: details,
    });
    return;
  }

  await restRequest('user_details', {
    method: 'POST',
    token,
    body: [{ user_id: userId, ...details }],
  });
}

export async function resolveReportImageUrl(imagePath, token) {
  const raw = (imagePath || '').trim();
  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw) && !raw.includes('/storage/v1/object/sign/')) {
    return raw;
  }

  const key = normalizeStorageObjectKey(raw, REPORT_IMAGES_BUCKET);
  if (!key) {
    return '';
  }

  const encodedKey = key
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');

  if (!encodedKey) {
    return '';
  }

  const signUrl = `${SUPABASE_URL}/storage/v1/object/sign/${REPORT_IMAGES_BUCKET}/${encodedKey}`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${REPORT_IMAGES_BUCKET}/${encodedKey}`;
  const response = await fetch(signUrl, {
    method: 'POST',
    headers: buildHeaders({ token }),
    body: JSON.stringify({ expiresIn: 3600 }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return publicUrl;
  }

  const signed = payload?.signedURL || payload?.signedUrl || payload?.url || '';
  if (!signed) {
    return publicUrl;
  }

  if (/^https?:\/\//i.test(signed)) {
    return signed;
  }

  if (signed.startsWith('/storage/v1/')) {
    return `${SUPABASE_URL}${signed}`;
  }

  if (signed.startsWith('/object/')) {
    return `${SUPABASE_URL}/storage/v1${signed}`;
  }

  if (signed.startsWith('storage/v1/')) {
    return `${SUPABASE_URL}/${signed}`;
  }

  if (signed.startsWith('object/')) {
    return `${SUPABASE_URL}/storage/v1/${signed}`;
  }

  return publicUrl;
}
