import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchSystemData, getValidAccessToken } from '../lib/supabaseRest';

const SystemDataContext = createContext(null);

export function SystemDataProvider({ children }) {
  const { authUser, roleKey, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    users: [],
    userDetails: [],
    departments: [],
    teams: [],
    teamMembers: [],
    reports: [],
    reportDetails: [],
    reportResponseTeams: [],
  });

  const refreshData = useCallback(async () => {
    if (!authUser?.id) {
      setData({
        users: [],
        userDetails: [],
        departments: [],
        teams: [],
        teamMembers: [],
        reports: [],
        reportDetails: [],
        reportResponseTeams: [],
      });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('No active access token found.');
      }
      const snapshot = await fetchSystemData(token, {
        roleKey,
        currentUserId: profile?.user_id || null,
      });
      setData(snapshot);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load system data.');
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, profile?.user_id, roleKey]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const value = useMemo(
    () => ({
      loading,
      error,
      data,
      refreshData,
    }),
    [data, error, loading, refreshData]
  );

  return <SystemDataContext.Provider value={value}>{children}</SystemDataContext.Provider>;
}

export function useSystemData() {
  const context = useContext(SystemDataContext);
  if (!context) {
    throw new Error('useSystemData must be used inside SystemDataProvider.');
  }
  return context;
}
