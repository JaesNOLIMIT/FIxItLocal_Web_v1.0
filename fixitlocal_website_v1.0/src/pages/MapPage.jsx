import { MapPin } from 'lucide-react';
import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import CityMapPanel from '../components/CityMapPanel';

function MapPage() {
  const [infoTab, setInfoTab] = useState('Nearby');

  return (
    <div className="relative min-h-screen bg-background text-on-background">
      <Sidebar />
      <main className="flex min-h-screen flex-col lg:ml-64">
        <Header />

        <div className="flex-1 overflow-hidden bg-surface px-4 pb-4 pt-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
          <div className="mb-3">
            <h1 className="mb-1 font-display text-3xl font-bold text-primary">Interactive Map</h1>
            <p className="text-on-surface-variant">View location-based reports and data visualization</p>
          </div>

          <div className="relative flex h-[calc(100vh-150px)] max-h-[820px] gap-4 overflow-hidden">
            {/* Main Map Area */}
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-900 shadow-soft ring-1 ring-slate-200/70">
              <div className="absolute inset-0">
                <CityMapPanel embedded />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="flex h-full w-80 flex-col gap-4 overflow-hidden">
              <div className="flex-shrink-0 rounded-xl border border-slate-200/50 bg-surface-container-lowest p-5 shadow-soft">
                <h3 className="mb-4 font-bold text-primary">Map Controls</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-on-primary-container">Radius</label>
                    <input type="range" min="0" max="100" defaultValue="50" className="w-full" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-on-primary-container">Zoom Level</label>
                    <input type="range" min="1" max="20" defaultValue="12" className="w-full" />
                  </div>
                  <button className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                    Export Map
                  </button>
                </div>
              </div>

              <div className="h-[220px] overflow-hidden rounded-xl border border-slate-200/50 bg-surface-container-lowest p-5 shadow-soft">
                <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  {['Nearby', 'Zones', 'Dispatch'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setInfoTab(tab)}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${
                        infoTab === tab ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {infoTab === 'Nearby' && (
                  <>
                    <h3 className="mb-3 font-bold text-primary">Nearby Reports</h3>
                    <div className="h-[130px] space-y-2 overflow-y-auto custom-scrollbar">
                      <div className="cursor-pointer rounded-lg border border-slate-100 bg-white p-3 transition hover:border-secondary/30 hover:shadow-sm flex-shrink-0">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="mt-0.5 flex-shrink-0 text-secondary" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-primary">DRT Highway Surface Damage</p>
                            <p className="text-[10px] text-on-surface-variant">Brgy. Pagala, Baliuag</p>
                          </div>
                        </div>
                      </div>
                      <div className="cursor-pointer rounded-lg border border-slate-100 bg-white p-3 transition hover:border-secondary/30 hover:shadow-sm flex-shrink-0">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="mt-0.5 flex-shrink-0 text-secondary" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-primary">Street Light Failure</p>
                            <p className="text-[10px] text-on-surface-variant">B.S. Aquino Ave, Baliuag</p>
                          </div>
                        </div>
                      </div>
                      <div className="cursor-pointer rounded-lg border border-slate-100 bg-white p-3 transition hover:border-secondary/30 hover:shadow-sm flex-shrink-0">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="mt-0.5 flex-shrink-0 text-secondary" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-primary">Water Main Seepage</p>
                            <p className="text-[10px] text-on-surface-variant">Brgy. Santo Cristo, Baliuag</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {infoTab === 'Zones' && (
                  <>
                    <h3 className="mb-3 font-bold text-primary">Zone Summary</h3>
                    <div className="h-[130px] space-y-2 overflow-y-auto custom-scrollbar">
                      {[
                        { name: 'Central Cluster', risk: 'High', reports: 5 },
                        { name: 'East Cluster', risk: 'Medium', reports: 4 },
                        { name: 'North Cluster', risk: 'Medium', reports: 3 },
                        { name: 'South Cluster', risk: 'Low', reports: 3 },
                        { name: 'West Cluster', risk: 'Medium', reports: 3 },
                      ].map((zone) => (
                        <article key={zone.name} className="rounded-lg border border-slate-100 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-primary">{zone.name}</p>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                zone.risk === 'High'
                                  ? 'bg-red-100 text-red-700'
                                  : zone.risk === 'Medium'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {zone.risk}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-on-surface-variant">{zone.reports} reports in this zone</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}

                {infoTab === 'Dispatch' && (
                  <>
                    <h3 className="mb-3 font-bold text-primary">Dispatch Notes</h3>
                    <div className="space-y-2 text-[11px] text-on-surface-variant">
                      <p className="rounded-lg border border-slate-100 bg-white p-2.5">
                        Road Maintenance Alpha routed to Pagala and Santo Cristo.
                      </p>
                      <p className="rounded-lg border border-slate-100 bg-white p-2.5">
                        Drainage Response Team handling Sabang overflow points.
                      </p>
                      <p className="rounded-lg border border-slate-100 bg-white p-2.5">
                        Electrical Unit 2 assigned to Tangos night repair schedule.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MapPage;
