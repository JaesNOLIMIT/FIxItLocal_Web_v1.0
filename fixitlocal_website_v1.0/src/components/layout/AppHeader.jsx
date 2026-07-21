import { LogOut, RefreshCw, UserCircle2 } from 'lucide-react';
import { ROLE_LABELS } from '../../config/roleConfig';
import { formatPersonName } from '../../lib/dataUtils';

function AppHeader({ profile, roleKey, onSignOut, onRefresh, refreshing }) {
  const fullName = formatPersonName(profile?.user_details, profile?.email || 'User');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">{fullName}</p>
          <p className="text-xs text-on-primary-container">
            {profile?.email} · {ROLE_LABELS[roleKey]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <div className="hidden items-center justify-center rounded-full bg-slate-100 p-1.5 sm:flex">
            <UserCircle2 size={22} className="text-slate-500" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;

