import {
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  Map,
  MapPinned,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Reports', icon: ClipboardList, path: '/reports' },
  { label: 'Assignments', icon: MapPinned, path: '/assignments' },
  { label: 'Map', icon: Map, path: '/map' },
  { label: 'Analytics', icon: ChartColumn, path: '/analytics' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col overflow-y-auto border-r border-slate-200/50 bg-slate-50 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)] lg:flex">
      <div className="p-6">
        <BrandLogo muted />

        <nav className="mt-8 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200/50 p-6">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-200/50 hover:text-slate-900"
        >
          <ShieldCheck size={18} />
          <span className="font-medium">Admin</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
