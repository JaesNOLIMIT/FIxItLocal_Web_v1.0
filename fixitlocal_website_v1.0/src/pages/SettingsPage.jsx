import { useState } from 'react';
import { Bell, Globe, Lock, Mail, Moon, Volume2 } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotif: true,
    pushNotif: true,
    smsAlert: false,
    darkMode: false,
    twoFactor: true,
    publicProfile: false,
    soundEnabled: true,
    language: 'English',
  });

  const [activeTab, setActiveTab] = useState('Account');

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative min-h-screen bg-background text-on-background">
      <Sidebar />
      <main className="flex min-h-screen flex-col lg:ml-64">
        <Header />

        <div className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="mb-2 font-display text-3xl font-bold text-primary">Settings</h1>
            <p className="text-on-surface-variant">Manage your account preferences and system settings</p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
              {['Account', 'Notifications', 'Security', 'Preferences', 'Danger'].map((tab) => (
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

            {activeTab === 'Account' && (
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                <h2 className="mb-4 text-lg font-bold text-primary">Profile Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface">Full Name</label>
                    <input
                      type="text"
                      defaultValue="Jose Adrian Suriaga"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-on-surface outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface">Email Address</label>
                    <input
                      type="email"
                      defaultValue="AdrianSuriaga@fixitlocal.gov"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-on-surface outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface">Department</label>
                    <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-on-surface outline-none focus:ring-2 focus:ring-secondary/20">
                      <option>Road Maintenance</option>
                      <option>Electrical</option>
                      <option>Water Services</option>
                      <option>Parks & Recreation</option>
                    </select>
                  </div>
                  <button className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:opacity-90">
                    Save Changes
                  </button>
                </div>
              </section>
            )}

            {activeTab === 'Notifications' && (
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
                  <Bell size={20} />
                  Notification Settings
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-on-primary-container" />
                      <span className="text-sm font-medium text-on-surface">Email Notifications</span>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotif')}
                      className={`relative h-6 w-11 rounded-full transition ${settings.emailNotif ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.emailNotif ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-on-primary-container" />
                      <span className="text-sm font-medium text-on-surface">Push Notifications</span>
                    </div>
                    <button
                      onClick={() => handleToggle('pushNotif')}
                      className={`relative h-6 w-11 rounded-full transition ${settings.pushNotif ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.pushNotif ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <Volume2 size={18} className="text-on-primary-container" />
                      <span className="text-sm font-medium text-on-surface">Sound Alerts</span>
                    </div>
                    <button
                      onClick={() => handleToggle('soundEnabled')}
                      className={`relative h-6 w-11 rounded-full transition ${settings.soundEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'Security' && (
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
                  <Lock size={20} />
                  Privacy & Security
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <Lock size={18} className="text-on-primary-container" />
                      <span className="text-sm font-medium text-on-surface">Two-Factor Authentication</span>
                    </div>
                    <button
                      onClick={() => handleToggle('twoFactor')}
                      className={`relative h-6 w-11 rounded-full transition ${settings.twoFactor ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.twoFactor ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50/50 p-3">
                    <div className="flex items-center gap-3">
                      <Globe size={18} className="text-on-primary-container" />
                      <span className="text-sm font-medium text-on-surface">Public Profile</span>
                    </div>
                    <button
                      onClick={() => handleToggle('publicProfile')}
                      className={`relative h-6 w-11 rounded-full transition ${settings.publicProfile ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.publicProfile ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'Preferences' && (
              <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 shadow-soft">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
                  <Moon size={20} />
                  Preferences
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface">Language</label>
                    <select
                      value={settings.language}
                      onChange={(event) => setSettings((prev) => ({ ...prev, language: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-on-surface outline-none focus:ring-2 focus:ring-secondary/20"
                    >
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50/50 p-3">
                    <span className="text-sm font-medium text-on-surface">Dark Mode</span>
                    <button
                      onClick={() => handleToggle('darkMode')}
                      className={`relative h-6 w-11 rounded-full transition ${settings.darkMode ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.darkMode ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'Danger' && (
              <section className="rounded-xl border border-red-200/50 bg-red-50/30 p-6">
                <h2 className="mb-4 font-bold text-red-700">Danger Zone</h2>
                <button className="rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700">
                  Delete Account
                </button>
                <p className="mt-2 text-xs text-red-600">This action cannot be undone.</p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
