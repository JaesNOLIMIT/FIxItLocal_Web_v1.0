import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const metrics = [
  {
    label: 'Total Reports',
    value: '1,284',
    change: '+12%',
    trend: 'up',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Resolved Today',
    value: '89',
    change: '+5%',
    trend: 'up',
    color: 'bg-green-50 text-green-600',
  },
  {
    label: 'Avg Response Time',
    value: '2.4h',
    change: '-8%',
    trend: 'down',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    label: 'Customer Satisfaction',
    value: '94%',
    change: '+2%',
    trend: 'up',
    color: 'bg-yellow-50 text-yellow-600',
  },
];

const chartData = [
  { date: 'Mon', reports: 34, resolved: 28 },
  { date: 'Tue', reports: 42, resolved: 35 },
  { date: 'Wed', reports: 38, resolved: 33 },
  { date: 'Thu', reports: 45, resolved: 40 },
  { date: 'Fri', reports: 52, resolved: 45 },
  { date: 'Sat', reports: 28, resolved: 26 },
  { date: 'Sun', reports: 22, resolved: 20 },
];

const severityData = [
  { label: 'High', count: 142, percent: 35, color: 'bg-red-500' },
  { label: 'Medium', count: 189, percent: 48, color: 'bg-yellow-500' },
  { label: 'Low', count: 69, percent: 17, color: 'bg-green-500' },
];

function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="relative min-h-screen bg-background text-on-background">
      <Sidebar />
      <main className="flex min-h-screen flex-col lg:ml-64">
        <Header />

        <div className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="mb-2 font-display text-3xl font-bold text-primary">Analytics</h1>
            <p className="text-on-surface-variant">View system metrics and performance data</p>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
            {['Overview', 'Departments', 'Trends'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  activeTab === tab ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <article key={metric.label} className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-sm text-on-primary-container">{metric.label}</p>
                        <p className="font-display text-2xl font-bold text-primary">{metric.value}</p>
                      </div>
                      <div className={`rounded-lg p-2 ${metric.color}`}>
                        {metric.trend === 'up' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                    </div>
                    <p className={`mt-3 text-xs font-semibold ${metric.trend === 'up' ? 'text-green-600' : 'text-blue-600'}`}>
                      {metric.change} from last week
                    </p>
                  </article>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="col-span-1 overflow-hidden rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft lg:col-span-2">
                  <h3 className="mb-4 font-bold text-primary">Weekly Activity</h3>
                  <div className="space-y-4">
                    {chartData.map((item) => {
                      const maxReports = Math.max(...chartData.map((d) => d.reports));
                      const reportsPercent = (item.reports / maxReports) * 100;
                      const resolvedPercent = (item.resolved / maxReports) * 100;

                      return (
                        <div key={item.date}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-on-surface">{item.date}</span>
                            <span className="text-on-primary-container">
                              {item.reports} reports {'->'} {item.resolved} resolved
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="flex h-full gap-1">
                              <div className="bg-secondary transition-all" style={{ width: `${resolvedPercent}%` }} />
                              <div className="bg-slate-300 transition-all" style={{ width: `${reportsPercent - resolvedPercent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                  <h3 className="mb-6 font-bold text-primary">Report Severity</h3>
                  <div className="space-y-4">
                    {severityData.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-on-surface">{item.label}</span>
                          <span className="text-sm font-bold text-primary">{item.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full transition-all ${item.color}`} style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {activeTab === 'Departments' && (
            <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
              <h3 className="mb-4 font-bold text-primary">Department Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Department</th>
                      <th className="px-4 py-3 text-center font-semibold text-on-primary-container">Assigned</th>
                      <th className="px-4 py-3 text-center font-semibold text-on-primary-container">Completed</th>
                      <th className="px-4 py-3 text-center font-semibold text-on-primary-container">Pending</th>
                      <th className="px-4 py-3 text-center font-semibold text-on-primary-container">Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dept: 'Road Maintenance', assigned: 156, completed: 134, pending: 22 },
                      { dept: 'Electrical', assigned: 89, completed: 72, pending: 17 },
                      { dept: 'Water Services', assigned: 105, completed: 98, pending: 7 },
                      { dept: 'Parks & Rec', assigned: 67, completed: 61, pending: 6 },
                    ].map((row) => {
                      const percent = Math.round((row.completed / row.assigned) * 100);
                      return (
                        <tr key={row.dept} className="border-b border-slate-50">
                          <td className="px-4 py-3 font-semibold text-on-surface">{row.dept}</td>
                          <td className="px-4 py-3 text-center text-on-surface-variant">{row.assigned}</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{row.completed}</td>
                          <td className="px-4 py-3 text-center text-yellow-600">{row.pending}</td>
                          <td className="px-4 py-3">
                            <div className="mx-auto flex w-20 items-center gap-2">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="whitespace-nowrap text-xs font-bold text-on-primary-container">{percent}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'Trends' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                <h3 className="mb-4 font-bold text-primary">7-Day Report Trend</h3>
                <div className="space-y-3">
                  {chartData.map((item) => (
                    <div key={`trend-${item.date}`} className="rounded-lg border border-slate-100 bg-white p-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-primary">{item.date}</span>
                        <span className="text-on-surface-variant">{item.reports} reports</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-gradient-to-r from-secondary to-primary" style={{ width: `${(item.reports / 52) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                <h3 className="mb-4 font-bold text-primary">Insights</h3>
                <div className="space-y-3 text-sm text-on-surface-variant">
                  <p className="rounded-lg border border-slate-100 bg-white p-3">Highest activity remains in Central and East clusters during weekdays.</p>
                  <p className="rounded-lg border border-slate-100 bg-white p-3">Average resolution improved by 8% after route-based assignment.</p>
                  <p className="rounded-lg border border-slate-100 bg-white p-3">High-severity reports contribute over one-third of total workload.</p>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AnalyticsPage;
