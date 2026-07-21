import { useMemo, useState } from 'react';
import { useRoleData } from '../../hooks/useRoleData';
import PageHeader from '../shared/PageHeader';
import { buildUsersIndex, formatDate, formatPersonName } from '../../lib/dataUtils';
import { createManagedUserAccount, getValidAccessToken } from '../../lib/supabaseRest';
import { fromManilaDateTimeLocal } from '../../lib/manilaTime';

const assignableRoles = [
  { label: 'Dispatcher', value: 'Dispatcher' },
  { label: 'Field Worker', value: 'Worker' },
  { label: 'Report Checker', value: 'Report Checker' },
];

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-on-surface placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

const infoCardClass = 'rounded-xl border border-slate-200 bg-white p-5 shadow-soft';

function normalizeRole(role) {
  if (!role) {
    return '';
  }
  return String(role).toLowerCase().replace(/[\s_-]/g, '');
}

function toRoleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'worker' || normalized === 'fieldworker') {
    return 'Field Worker';
  }
  if (normalized === 'reportchecker') {
    return 'Report Checker';
  }
  if (normalized === 'dispatcher') {
    return 'Dispatcher';
  }
  if (normalized === 'admin') {
    return 'Admin';
  }
  return role;
}

function roleBadgeClass(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'dispatcher') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (normalized === 'worker' || normalized === 'fieldworker') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalized === 'reportchecker') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (normalized === 'admin') {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function toIsoDateTime(value) {
  return fromManilaDateTimeLocal(value);
}

function ManageUsersPage() {
  const { systemData, refreshData } = useRoleData();
  const { users, userDetails } = systemData;
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    role: 'Dispatcher',
    access_start: '',
    access_end: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
  });

  const list = useMemo(() => {
    const index = buildUsersIndex(users, userDetails);
    return [...index.values()].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  }, [userDetails, users]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await createManagedUserAccount(
        {
          email: form.email.trim(),
          role: form.role,
          access_start: toIsoDateTime(form.access_start),
          access_end: toIsoDateTime(form.access_end),
          first_name: form.first_name.trim(),
          middle_name: form.middle_name.trim(),
          last_name: form.last_name.trim(),
          suffix: form.suffix.trim(),
          login_url: `${window.location.origin}/login`,
        },
        token
      );

      setForm({
        email: '',
        role: 'Dispatcher',
        access_start: '',
        access_end: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
      });

      setMessage('Account created successfully. Invite User email was sent and profile data was inserted.');
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <PageHeader
        title="Manage Users"
        description="Create Dispatcher, Field Worker, and Report Checker accounts with role-based access provisioning."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className={`${infoCardClass} lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-primary">Account Provisioning</h2>
          <p className="mt-1 text-sm text-on-primary-container">
            New accounts are created with immediate access and synchronized profile records for operations management.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
              Auto Profile Sync
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
              Active By Default
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
              Role-Based Access
            </span>
          </div>
        </article>
        <article className={infoCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-primary-container">Managed Roles</p>
          <ul className="mt-2 space-y-2 text-sm text-on-surface">
            {assignableRoles.map((role) => (
              <li key={role.value} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{role.label}</span>
                <span className="text-xs font-semibold text-on-primary-container">{role.value}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className={infoCardClass}>
        <h2 className="mb-4 text-lg font-semibold text-primary">Add Account Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm font-semibold text-on-surface">
              Official Email
              <input
                value={form.email}
                onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                type="email"
                required
                placeholder="name@agency.gov"
                className={inputClass}
              />
            </label>

          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-on-primary-container">Access Settings</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-on-surface">
                Role
                <select
                  value={form.role}
                  onChange={(event) => setForm((previous) => ({ ...previous, role: event.target.value }))}
                  className={inputClass}
                >
                  {assignableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-on-surface">
                Access Start (Optional)
                <input
                  value={form.access_start}
                  onChange={(event) => setForm((previous) => ({ ...previous, access_start: event.target.value }))}
                  type="datetime-local"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-semibold text-on-surface">
                Access End (Optional)
                <input
                  value={form.access_end}
                  onChange={(event) => setForm((previous) => ({ ...previous, access_end: event.target.value }))}
                  type="datetime-local"
                  className={inputClass}
                />
              </label>

            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-on-primary-container">Identity Details</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-on-surface">
                First Name
                <input
                  value={form.first_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, first_name: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-on-surface">
                Middle Name
                <input
                  value={form.middle_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, middle_name: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-on-surface">
                Last Name
                <input
                  value={form.last_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, last_name: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-on-surface">
                Suffix
                <input
                  value={form.suffix}
                  onChange={(event) => setForm((previous) => ({ ...previous, suffix: event.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-on-primary-container">Accounts are automatically created as active.</p>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container disabled:opacity-70"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Access Window</th>
              <th className="px-4 py-3 text-left font-semibold text-on-primary-container">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((user) => (
              <tr key={user.user_id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 text-on-surface">{formatPersonName(user.details, 'No details')}</td>
                <td className="px-4 py-3 text-on-surface">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(user.role)}`}>
                    {toRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      user.is_active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-on-surface">
                  {user.access_start || user.access_end
                    ? `${formatDate(user.access_start)} to ${formatDate(user.access_end)}`
                    : 'Always allowed'}
                </td>
                <td className="px-4 py-3 text-on-surface">{formatDate(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ManageUsersPage;
