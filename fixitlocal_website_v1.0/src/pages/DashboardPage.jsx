import { useState } from 'react';
import { LayoutList, Map, Plus, User } from 'lucide-react';
import CityMapPanel from '../components/CityMapPanel';
import ReportsFeedTabs from '../components/ReportsFeedTabs';

function DashboardPage() {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9f9] text-[#1a1c1c]">
      <header className="sticky top-0 z-40 border-b border-[#cfc4c5] bg-[#f9f9f9]">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-black p-2 text-white">
              <Map size={17} />
            </div>
            <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-black">FixItLocal</h1>
          </div>

          <nav className="hidden items-center gap-10 md:flex">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1 border-b-2 pb-1 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'map' ? 'border-black text-black' : 'border-transparent text-[#5d5f5f] hover:text-black'
              }`}
            >
              <Map size={16} />
              Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1 border-b-2 pb-1 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'reports'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#5d5f5f] hover:text-black'
              }`}
            >
              <LayoutList size={16} />
              Reports
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1 border-b-2 pb-1 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'profile'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#5d5f5f] hover:text-black'
              }`}
            >
              <User size={16} />
              Profile
            </button>
          </nav>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden bg-[#eeeeee]">
        {activeTab === 'map' && (
          <div className="h-[calc(100vh-145px)] min-h-[520px] w-full">
            <CityMapPanel embedded />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="h-[calc(100vh-145px)] min-h-[520px] overflow-hidden bg-[#f3f3f3]">
            <ReportsFeedTabs />
          </div>
        )}

        {activeTab === 'profile' && (
          <section className="mx-auto flex h-[calc(100vh-145px)] w-full max-w-4xl items-center justify-center p-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,25,40,0.08)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Reporter Profile</h2>
                  <p className="text-sm text-slate-500">Reporter-only account dashboard access</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-black">Role:</span> Reporter
                </p>
                <p>
                  <span className="font-semibold text-black">Access:</span> Mobile + Reporter Web Feed
                </p>
                <p>
                  <span className="font-semibold text-black">Tip:</span> Use Reports tab to track your submitted
                  issues and live progress.
                </p>
              </div>
            </div>
          </section>
        )}

        <button
          type="button"
          className="absolute bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center bg-black text-white shadow-lg transition hover:scale-105 md:bottom-8 md:right-8"
          aria-label="Add report"
        >
          <Plus size={28} />
        </button>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t-2 border-black bg-white md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase ${
            activeTab === 'map' ? 'bg-black text-white' : 'text-[#5d5f5f]'
          }`}
        >
          <Map size={18} />
          Map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 border-l border-[#cfc4c5] text-[11px] font-bold uppercase ${
            activeTab === 'reports' ? 'bg-black text-white' : 'text-[#5d5f5f]'
          }`}
        >
          <LayoutList size={18} />
          Reports
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-1 flex-col items-center justify-center gap-1 border-l border-[#cfc4c5] text-[11px] font-bold uppercase ${
            activeTab === 'profile' ? 'bg-black text-white' : 'text-[#5d5f5f]'
          }`}
        >
          <User size={18} />
          Profile
        </button>
      </nav>
    </div>
  );
}

export default DashboardPage;
