import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLE_KEYS, getDefaultPathForRole } from './config/roleConfig';
import { SystemDataProvider } from './context/SystemDataContext';
import RoleLayout from './components/layout/RoleLayout';
import LoginPage from './pages/common/LoginPage';
import UnauthorizedPage from './pages/common/UnauthorizedPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminManageUsersPage from './pages/admin/ManageUsersPage';
import AdminManageTeamsPage from './pages/admin/ManageTeamsPage';
import AdminManageReportsPage from './pages/admin/ManageReportsPage';
import AdminAnalyticsPage from './pages/admin/AnalyticsPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import DispatcherDashboardPage from './pages/dispatcher/DashboardPage';
import DispatcherManageReportsPage from './pages/dispatcher/ManageReportsPage';
import DispatcherManageSchedulePage from './pages/dispatcher/ManageSchedulePage';
import DispatcherAnalyticsPage from './pages/dispatcher/AnalyticsPage';
import DispatcherSettingsPage from './pages/dispatcher/SettingsPage';
import ReportCheckerDashboardPage from './pages/reportChecker/DashboardPage';
import ReportCheckerManageReportsPage from './pages/reportChecker/ManageReportsPage';
import ReportCheckerAnalyticsPage from './pages/reportChecker/AnalyticsPage';
import ReportCheckerSettingsPage from './pages/reportChecker/SettingsPage';
import FieldWorkerDashboardPage from './pages/fieldWorker/DashboardPage';
import FieldWorkerScheduledWorkPage from './pages/fieldWorker/ScheduledWorkPage';
import FieldWorkerViewReportsPage from './pages/fieldWorker/ViewReportsPage';
import FieldWorkerAnalyticsPage from './pages/fieldWorker/AnalyticsPage';
import FieldWorkerSettingsPage from './pages/fieldWorker/SettingsPage';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm font-semibold text-on-primary-container">Loading portal...</p>
    </div>
  );
}

function RequireAuthenticated({ children }) {
  const { loading, roleKey, hasActiveAccess } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }

  if (!roleKey) {
    return <Navigate to="/login" replace />;
  }

  if (!hasActiveAccess) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: 'Your account is not currently active. Contact your administrator.' }}
      />
    );
  }

  return children;
}

function RoleGate({ expectedRole, children }) {
  const { roleKey } = useAuth();
  if (roleKey !== expectedRole) {
    return <Navigate to={getDefaultPathForRole(roleKey)} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { roleKey } = useAuth();
  return <Navigate to={getDefaultPathForRole(roleKey)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="/"
        element={
          <RequireAuthenticated>
            <HomeRedirect />
          </RequireAuthenticated>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuthenticated>
            <RoleGate expectedRole={ROLE_KEYS.ADMIN}>
              <SystemDataProvider>
                <RoleLayout roleKey={ROLE_KEYS.ADMIN} />
              </SystemDataProvider>
            </RoleGate>
          </RequireAuthenticated>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="manage-users" element={<AdminManageUsersPage />} />
        <Route path="manage-teams" element={<AdminManageTeamsPage />} />
        <Route path="manage-reports" element={<AdminManageReportsPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route
        path="/dispatcher"
        element={
          <RequireAuthenticated>
            <RoleGate expectedRole={ROLE_KEYS.DISPATCHER}>
              <SystemDataProvider>
                <RoleLayout roleKey={ROLE_KEYS.DISPATCHER} />
              </SystemDataProvider>
            </RoleGate>
          </RequireAuthenticated>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DispatcherDashboardPage />} />
        <Route path="manage-reports" element={<DispatcherManageReportsPage />} />
        <Route path="manage-schedule" element={<DispatcherManageSchedulePage />} />
        <Route path="analytics" element={<DispatcherAnalyticsPage />} />
        <Route path="settings" element={<DispatcherSettingsPage />} />
      </Route>

      <Route
        path="/report-checker"
        element={
          <RequireAuthenticated>
            <RoleGate expectedRole={ROLE_KEYS.REPORT_CHECKER}>
              <SystemDataProvider>
                <RoleLayout roleKey={ROLE_KEYS.REPORT_CHECKER} />
              </SystemDataProvider>
            </RoleGate>
          </RequireAuthenticated>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ReportCheckerDashboardPage />} />
        <Route path="manage-reports" element={<ReportCheckerManageReportsPage />} />
        <Route path="analytics" element={<ReportCheckerAnalyticsPage />} />
        <Route path="settings" element={<ReportCheckerSettingsPage />} />
      </Route>

      <Route
        path="/field-worker"
        element={
          <RequireAuthenticated>
            <RoleGate expectedRole={ROLE_KEYS.WORKER}>
              <SystemDataProvider>
                <RoleLayout roleKey={ROLE_KEYS.WORKER} />
              </SystemDataProvider>
            </RoleGate>
          </RequireAuthenticated>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FieldWorkerDashboardPage />} />
        <Route path="scheduled-work" element={<FieldWorkerScheduledWorkPage />} />
        <Route path="view-reports" element={<FieldWorkerViewReportsPage />} />
        <Route path="analytics" element={<FieldWorkerAnalyticsPage />} />
        <Route path="settings" element={<FieldWorkerSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
