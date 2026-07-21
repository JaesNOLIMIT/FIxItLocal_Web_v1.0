import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSystemData } from '../../context/SystemDataContext';
import { ROLE_KEYS, getDefaultPathForRole } from '../../config/roleConfig';
import Header from '../Header';
import AdminSidebar from '../../pages/admin/components/AdminSidebar';

function RoleLayout({ roleKey }) {
  const { roleKey: currentRoleKey, signOut } = useAuth();
  const { loading, error, data, refreshData } = useSystemData();

  if (currentRoleKey !== roleKey) {
    return <Navigate to={getDefaultPathForRole(currentRoleKey)} replace />;
  }

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <AdminSidebar roleKey={roleKey || ROLE_KEYS.ADMIN} />
      <main className="min-h-screen lg:ml-64">
        <Header onSignOut={signOut} />
        <div className="p-4 sm:p-6 lg:p-8">
          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          ) : null}
          <Outlet context={{ systemData: data, refreshData, loading }} />
        </div>
      </main>
    </div>
  );
}

export default RoleLayout;
