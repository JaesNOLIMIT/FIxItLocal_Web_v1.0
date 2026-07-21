import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getDefaultPathForRole, getRoleKeyFromDatabaseRole } from '../config/roleConfig';
import {
  fetchCurrentUserProfile,
  getCurrentAuthUser,
  getValidAccessToken,
  loginWithPassword,
  signOut as signOutRequest,
} from '../lib/supabaseRest';

const AuthContext = createContext(null);

function isAccessWindowValid(profile) {
  if (!profile?.is_active) {
    return false;
  }

  const now = new Date();
  if (profile.access_start && now < new Date(profile.access_start)) {
    return false;
  }
  if (profile.access_end && now > new Date(profile.access_end)) {
    return false;
  }
  return true;
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const hydrateFromStorage = async () => {
    setLoading(true);
    setError('');

    try {
      const user = await getCurrentAuthUser();
      if (!user?.id) {
        setAuthUser(null);
        setProfile(null);
        return;
      }

      const token = await getValidAccessToken();
      if (!token) {
        setAuthUser(null);
        setProfile(null);
        return;
      }

      const userProfile = await fetchCurrentUserProfile(user.id, token, user.email || null);
      if (!userProfile) {
        await signOutRequest();
        setAuthUser(null);
        setProfile(null);
        setError('No application profile found for this account. Contact your administrator.');
        return;
      }

      const resolvedRoleKey = getRoleKeyFromDatabaseRole(userProfile.role);
      if (!resolvedRoleKey) {
        await signOutRequest();
        setAuthUser(null);
        setProfile(null);
        setError(userProfile.role ? `Unsupported account role "${userProfile.role}".` : 'No role assigned to account.');
        return;
      }

      setAuthUser(user);
      setProfile(userProfile);
    } catch (requestError) {
      setAuthUser(null);
      setProfile(null);
      setError(requestError.message || 'Unable to initialize authentication.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  const handleSignIn = async (email, password) => {
    setError('');
    const session = await loginWithPassword(email, password);
    const token = session.accessToken || (await getValidAccessToken());
    if (!token || !session.user?.id) {
      throw new Error('Login succeeded but no active session was returned.');
    }

    const userProfile = await fetchCurrentUserProfile(session.user.id, token, session.user.email || null);
    if (!userProfile) {
      throw new Error('No application profile found for this account.');
    }

    if (!isAccessWindowValid(userProfile)) {
      throw new Error('This account has no active access window.');
    }

    const resolvedRoleKey = getRoleKeyFromDatabaseRole(userProfile.role);
    if (!resolvedRoleKey) {
      throw new Error(`Unsupported account role "${userProfile.role}". Contact your administrator.`);
    }

    setAuthUser(session.user);
    setProfile(userProfile);
    return {
      roleKey: resolvedRoleKey,
      path: getDefaultPathForRole(resolvedRoleKey),
    };
  };

  const handleSignOut = async () => {
    await signOutRequest();
    setAuthUser(null);
    setProfile(null);
    setError('');
  };

  const value = useMemo(() => {
    const roleKey = getRoleKeyFromDatabaseRole(profile?.role);
    return {
      loading,
      error,
      authUser,
      profile,
      roleKey,
      hasActiveAccess: isAccessWindowValid(profile),
      signIn: handleSignIn,
      signOut: handleSignOut,
      reloadAuth: hydrateFromStorage,
    };
  }, [authUser, error, loading, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
