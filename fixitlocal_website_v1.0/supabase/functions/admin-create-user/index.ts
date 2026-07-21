import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedRoles = new Set(['Dispatcher', 'Worker', 'Report Checker']);
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_+=';

type AdminAccessRow = {
  user_id: number;
  email: string | null;
  role: string;
  is_active: boolean;
  access_start: string | null;
  access_end: string | null;
};

type InvitePayload = {
  email?: string;
  role?: string;
  access_start?: string | null;
  access_end?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  street?: string | null;
  photo_path?: string | null;
  login_url?: string | null;
  auth_user_id?: string | null;
};

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

function isAccessWindowValid(userRow: { access_start: string | null; access_end: string | null; is_active: boolean }) {
  if (!userRow.is_active) {
    return false;
  }

  const now = new Date();
  if (userRow.access_start && now < new Date(userRow.access_start)) {
    return false;
  }
  if (userRow.access_end && now > new Date(userRow.access_end)) {
    return false;
  }

  return true;
}

function generateTemporaryPassword(length = 14) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return password;
}

function buildDisplayName(payload: InvitePayload, fallback: string) {
  const parts = [payload.first_name, payload.middle_name, payload.last_name, payload.suffix]
    .map((value) => normalizeText(value))
    .filter(Boolean) as string[];

  return parts.length ? parts.join(' ') : fallback;
}

function buildSafeLoginUrl(supabaseUrl: string, payloadLoginUrl: unknown) {
  const explicit = normalizeText(payloadLoginUrl);
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit;
  }
  const envLogin = normalizeText(Deno.env.get('FIXITLOCAL_LOGIN_URL'));
  if (envLogin && /^https?:\/\//i.test(envLogin)) {
    return envLogin;
  }
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/verify`;
}

async function ensureAdminAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  authUserId: string
): Promise<AdminAccessRow> {
  const adminRowResult = await supabaseAdmin
    .from('users')
    .select('user_id,email,role,is_active,access_start,access_end')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle<AdminAccessRow>();

  if (adminRowResult.error || !adminRowResult.data) {
    throw new Error('Admin profile not found in users table.');
  }

  const adminRow = adminRowResult.data;
  if (adminRow.role !== 'Admin' || !isAccessWindowValid(adminRow)) {
    throw new Error('Only active Admin users can create accounts.');
  }

  return adminRow;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!jwt) {
      return new Response(JSON.stringify({ message: 'Missing bearer token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authUserResult = await supabaseAdmin.auth.getUser(jwt);
    const authUser = authUserResult.data.user;
    if (!authUser?.id) {
      return new Response(JSON.stringify({ message: 'Invalid user session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminRow = await ensureAdminAccess(supabaseAdmin, authUser.id);

    const payload = (await req.json()) as InvitePayload;
    const email = normalizeText(payload.email)?.toLowerCase();
    const role = normalizeText(payload.role);

    if (!email || !role) {
      return new Response(JSON.stringify({ message: 'email and role are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.auth_user_id) {
      return new Response(
        JSON.stringify({
          message: 'Existing Auth User UUID is not supported for this invite flow. Create a fresh account invite instead.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allowedRoles.has(role)) {
      return new Response(JSON.stringify({ message: 'Role is not allowed for managed account creation.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const loginUrl = buildSafeLoginUrl(supabaseUrl, payload.login_url);
    const displayName = buildDisplayName(payload, email);

    const metadata = {
      organization: 'FixItLocal Civic Authority Portal',
      account_type: 'Managed Operations Account',
      first_name: normalizeText(payload.first_name),
      middle_name: normalizeText(payload.middle_name),
      last_name: normalizeText(payload.last_name),
      suffix: normalizeText(payload.suffix),
      full_name: displayName,
      role,
      temporary_password: temporaryPassword,
      login_url: loginUrl,
      access_start: normalizeText(payload.access_start),
      access_end: normalizeText(payload.access_end),
      created_by: adminRow.email || authUser.email || 'FixItLocal Administrator',
      issued_at_utc: new Date().toISOString(),
    };

    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: loginUrl,
      data: metadata,
    });

    if (inviteResult.error || !inviteResult.data.user?.id) {
      return new Response(
        JSON.stringify({ message: inviteResult.error?.message || 'Unable to send account invite.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUserId = inviteResult.data.user.id;

    const updateAuthResult = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (updateAuthResult.error) {
      return new Response(
        JSON.stringify({ message: updateAuthResult.error.message || 'Unable to finalize Auth user.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createUserResult = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUserId,
        email,
        role,
        access_start: payload?.access_start || null,
        access_end: payload?.access_end || null,
        is_active: true,
      })
      .select('user_id,auth_user_id,email,role,is_active,access_start,access_end,created_at')
      .single();

    if (createUserResult.error || !createUserResult.data) {
      return new Response(
        JSON.stringify({ message: createUserResult.error?.message || 'Unable to create users row.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRow = createUserResult.data;

    const detailPayload = {
      user_id: userRow.user_id,
      photo_path: normalizeText(payload.photo_path),
      first_name: normalizeText(payload.first_name),
      middle_name: normalizeText(payload.middle_name),
      last_name: normalizeText(payload.last_name),
      suffix: normalizeText(payload.suffix),
      birthdate: normalizeText(payload.birthdate),
      gender: normalizeText(payload.gender),
      country: normalizeText(payload.country),
      region: normalizeText(payload.region),
      province: normalizeText(payload.province),
      city: normalizeText(payload.city),
      barangay: normalizeText(payload.barangay),
      street: normalizeText(payload.street),
    };

    const detailsInsert = await supabaseAdmin.from('user_details').insert(detailPayload);
    if (detailsInsert.error) {
      return new Response(
        JSON.stringify({ message: detailsInsert.error.message || 'Unable to create user_details row.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        auth_user_id: authUserId,
        user: userRow,
        temporary_password: temporaryPassword,
        invite_email_sent: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : 'Unexpected error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
