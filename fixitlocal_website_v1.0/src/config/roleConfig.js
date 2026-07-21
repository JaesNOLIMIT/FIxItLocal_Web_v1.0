export const ROLE_KEYS = {
  ADMIN: 'admin',
  DISPATCHER: 'dispatcher',
  REPORT_CHECKER: 'report-checker',
  WORKER: 'worker',
};

const ROLE_MAP = {
  admin: ROLE_KEYS.ADMIN,
  dispatcher: ROLE_KEYS.DISPATCHER,
  reportchecker: ROLE_KEYS.REPORT_CHECKER,
  worker: ROLE_KEYS.WORKER,
  fieldworker: ROLE_KEYS.WORKER,
};

export const ROLE_LABELS = {
  [ROLE_KEYS.ADMIN]: 'Admin',
  [ROLE_KEYS.DISPATCHER]: 'Dispatcher',
  [ROLE_KEYS.REPORT_CHECKER]: 'Report Checker',
  [ROLE_KEYS.WORKER]: 'Field Worker',
};

export const ROLE_DEFAULT_PATHS = {
  [ROLE_KEYS.ADMIN]: '/admin/dashboard',
  [ROLE_KEYS.DISPATCHER]: '/dispatcher/dashboard',
  [ROLE_KEYS.REPORT_CHECKER]: '/report-checker/dashboard',
  [ROLE_KEYS.WORKER]: '/field-worker/dashboard',
};

export const ROLE_NAVIGATION = {
  [ROLE_KEYS.ADMIN]: [
    { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { key: 'manage-users', label: 'Manage Users', path: '/admin/manage-users' },
    { key: 'manage-teams', label: 'Manage Teams', path: '/admin/manage-teams' },
    { key: 'manage-reports', label: 'Manage Reports', path: '/admin/manage-reports' },
    { key: 'analytics', label: 'Analytics', path: '/admin/analytics' },
    { key: 'settings', label: 'Settings', path: '/admin/settings' },
  ],
  [ROLE_KEYS.DISPATCHER]: [
    { key: 'dashboard', label: 'Dashboard', path: '/dispatcher/dashboard' },
    { key: 'manage-reports', label: 'Manage Reports', path: '/dispatcher/manage-reports' },
    { key: 'manage-schedule', label: 'Manage Schedule', path: '/dispatcher/manage-schedule' },
    { key: 'analytics', label: 'Analytics', path: '/dispatcher/analytics' },
    { key: 'settings', label: 'Settings', path: '/dispatcher/settings' },
  ],
  [ROLE_KEYS.REPORT_CHECKER]: [
    { key: 'dashboard', label: 'Dashboard', path: '/report-checker/dashboard' },
    { key: 'manage-reports', label: 'Manage Reports', path: '/report-checker/manage-reports' },
    { key: 'analytics', label: 'Analytics', path: '/report-checker/analytics' },
    { key: 'settings', label: 'Settings', path: '/report-checker/settings' },
  ],
  [ROLE_KEYS.WORKER]: [
    { key: 'dashboard', label: 'Dashboard', path: '/field-worker/dashboard' },
    { key: 'scheduled-work', label: 'Scheduled Work', path: '/field-worker/scheduled-work' },
    { key: 'view-reports', label: 'View Reports', path: '/field-worker/view-reports' },
    { key: 'analytics', label: 'Analytics', path: '/field-worker/analytics' },
    { key: 'settings', label: 'Settings', path: '/field-worker/settings' },
  ],
};

function normalizeDatabaseRole(role) {
  if (!role) {
    return '';
  }

  return String(role).toLowerCase().replace(/[\s_-]/g, '');
}

export function getRoleKeyFromDatabaseRole(role) {
  return ROLE_MAP[normalizeDatabaseRole(role)] || null;
}

export function getDefaultPathForRole(roleKey) {
  return ROLE_DEFAULT_PATHS[roleKey] || '/unauthorized';
}
