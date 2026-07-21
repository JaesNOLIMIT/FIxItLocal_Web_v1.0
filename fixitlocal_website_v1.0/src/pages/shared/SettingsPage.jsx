import { useState } from 'react';
import PageHeader from './PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getValidAccessToken, upsertUserDetails } from '../../lib/supabaseRest';
import { useRoleData } from '../../hooks/useRoleData';

function SettingsPage({ title = 'Settings' }) {
  const { profile, reloadAuth } = useAuth();
  const { refreshData } = useRoleData();
  const [form, setForm] = useState({
    first_name: profile?.user_details?.first_name || '',
    middle_name: profile?.user_details?.middle_name || '',
    last_name: profile?.user_details?.last_name || '',
    suffix: profile?.user_details?.suffix || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await upsertUserDetails(profile.user_id, form, token);
      await Promise.all([refreshData(), reloadAuth()]);
      setMessage('Profile details updated.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <PageHeader title={title} description="Update your profile information." />

      {message ? <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div> : null}

      <form onSubmit={handleSubmit} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-on-surface">
            First Name
            <input
              value={form.first_name}
              onChange={(event) => setForm((previous) => ({ ...previous, first_name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-on-surface">
            Middle Name
            <input
              value={form.middle_name}
              onChange={(event) => setForm((previous) => ({ ...previous, middle_name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-on-surface">
            Last Name
            <input
              value={form.last_name}
              onChange={(event) => setForm((previous) => ({ ...previous, last_name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-on-surface">
            Suffix
            <input
              value={form.suffix}
              onChange={(event) => setForm((previous) => ({ ...previous, suffix: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {submitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default SettingsPage;
