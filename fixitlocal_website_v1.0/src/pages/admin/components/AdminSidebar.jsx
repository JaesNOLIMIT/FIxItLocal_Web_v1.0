import { NavLink } from 'react-router-dom';
import { ROLE_KEYS, ROLE_LABELS, ROLE_NAVIGATION } from '../../../config/roleConfig';

const ICON_BY_NAV_KEY = {
  dashboard: 'dashboard',
  'manage-users': 'group',
  'manage-teams': 'assignment',
  'manage-reports': 'assessment',
  analytics: 'analytics',
  settings: 'settings',
  'manage-schedule': 'calendar_month',
  'scheduled-work': 'event',
  'view-reports': 'description',
};

function AdminSidebar({ roleKey = ROLE_KEYS.ADMIN }) {
  const navItems = ROLE_NAVIGATION[roleKey] || ROLE_NAVIGATION[ROLE_KEYS.ADMIN] || [];
  const roleLabel = ROLE_LABELS[roleKey] || ROLE_LABELS[ROLE_KEYS.ADMIN] || 'Admin';

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col overflow-y-auto border-r border-slate-200/50 bg-slate-50 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] lg:flex">
      <div className="p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight text-slate-900">FixItLocal</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-primary-container">
              Civic Authority Portal
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`
              }
            >
              <span className="material-symbols-outlined">{ICON_BY_NAV_KEY[item.key] || 'dashboard'}</span>
              <span className="font-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200/50 p-6">
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-slate-600">
          <span className="material-symbols-outlined">badge</span>
          <span className="font-medium">{roleLabel}</span>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
