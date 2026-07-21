import {
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ROLE_LABELS, ROLE_NAVIGATION } from '../../config/roleConfig';

const ICONS = {
  dashboard: LayoutDashboard,
  'manage-users': Users,
  'manage-teams': UsersRound,
  'manage-reports': ClipboardList,
  analytics: BarChart3,
  settings: Settings,
  'manage-schedule': CalendarCheck2,
  'scheduled-work': CalendarCheck2,
  'view-reports': ClipboardList,
};

function RoleSidebar({ roleKey }) {
  const items = ROLE_NAVIGATION[roleKey] || [];

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2 text-white">
            <Wrench size={18} />
          </div>
          <div>
            <p className="text-lg font-bold text-primary">FixItLocal</p>
            <p className="text-xs text-on-primary-container">Operations Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = ICONS[item.key] || LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          <ShieldCheck size={16} />
          <span>{ROLE_LABELS[roleKey] || 'Unauthorized'}</span>
        </div>
      </div>
    </aside>
  );
}

export default RoleSidebar;
