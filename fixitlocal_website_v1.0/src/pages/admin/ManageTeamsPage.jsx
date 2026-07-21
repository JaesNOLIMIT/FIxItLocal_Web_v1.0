import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoleData } from '../../hooks/useRoleData';
import PageHeader from '../shared/PageHeader';
import Modal from '../../components/Modal';
import { buildReportsViewModel, buildUsersIndex, formatDate, formatPersonName } from '../../lib/dataUtils';
import { formatMinutes } from '../../lib/gemini';
import { getWorkflowStatusLabel, isCompletedWorkflowStatus } from '../../lib/reportStatus';
import { formatDateTimeInManila, fromManilaDateTimeLocal } from '../../lib/manilaTime';
import {
  addTeamMember,
  createDepartment,
  createManagedUserAccount,
  createTeam,
  deleteDepartment,
  fetchDepartments,
  getValidAccessToken,
  updateDepartment,
  updateTeamLeadership,
} from '../../lib/supabaseRest';

const accountRoleOptions = [
  { label: 'Field Worker', value: 'Worker' },
  { label: 'Dispatcher', value: 'Dispatcher' },
  { label: 'Report Checker', value: 'Report Checker' },
];

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

const emptyAccountForm = {
  email: '',
  role: 'Worker',
  access_start: '',
  access_end: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  birthdate: '',
  gender: '',
  country: '',
  region: '',
  province: '',
  city: '',
  barangay: '',
  street: '',
  photo_path: '',
};

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-on-surface placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-on-primary-container';

const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-50 disabled:opacity-60';

function toIsoDateTime(value) {
  return fromManilaDateTimeLocal(value);
}

function normalizeRole(role) {
  if (!role) {
    return '';
  }
  return String(role).toLowerCase().replace(/[\s_-]/g, '');
}

function isFieldWorkerRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'worker' || normalized === 'fieldworker';
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs text-on-primary-container">
      <span className="material-symbols-outlined text-[16px] text-secondary">{icon}</span>
      <span className="font-medium text-on-surface">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function ManageTeamsPage() {
  const { systemData, refreshData } = useRoleData();
  const { users, userDetails, departments, teams, teamMembers, reports, reportDetails } = systemData;
  const [activeTab, setActiveTab] = useState('teams');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [savingDepartmentId, setSavingDepartmentId] = useState(null);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState(null);
  const [loadingDepartmentChoices, setLoadingDepartmentChoices] = useState(false);
  const [departmentChoices, setDepartmentChoices] = useState([]);
  const [teamDraft, setTeamDraft] = useState({
    name: '',
    department_id: '',
    leader_id: '',
    sub_leader_id: '',
  });
  const [departmentDraft, setDepartmentDraft] = useState({
    name: '',
    description: '',
  });
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingDepartmentDraft, setEditingDepartmentDraft] = useState({ name: '', description: '' });
  const [leadershipDrafts, setLeadershipDrafts] = useState({});
  const [memberDrafts, setMemberDrafts] = useState({});
  const [busyTeamId, setBusyTeamId] = useState(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [managingTeamId, setManagingTeamId] = useState(null);

  const usersIndex = useMemo(() => buildUsersIndex(users, userDetails), [userDetails, users]);
  const fieldWorkerUsers = useMemo(
    () => users.filter((user) => user.is_active && isFieldWorkerRole(user.role)),
    [users]
  );
  const reportsView = useMemo(
    () =>
      buildReportsViewModel({
        users,
        userDetails,
        departments,
        teams,
        reports,
        reportDetails,
      }),
    [departments, reportDetails, reports, teams, userDetails, users]
  );
  const sortedDepartments = useMemo(
    () => [...departments].sort((left, right) => left.name.localeCompare(right.name)),
    [departments]
  );
  const sortedDepartmentChoices = useMemo(
    () =>
      [...(departmentChoices.length ? departmentChoices : departments)].sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
    [departmentChoices, departments]
  );

  const membersByTeam = useMemo(() => {
    const map = new Map();
    for (const member of teamMembers) {
      if (!map.has(member.team_id)) {
        map.set(member.team_id, []);
      }
      map.get(member.team_id).push(member);
    }
    return map;
  }, [teamMembers]);

  const pendingByTeam = useMemo(() => {
    const map = new Map();
    for (const report of reportsView) {
      if (
        !report.assigned_team_id ||
        isCompletedWorkflowStatus(report.detail?.status, report.assigned_team_id)
      ) {
        continue;
      }
      if (!map.has(report.assigned_team_id)) {
        map.set(report.assigned_team_id, []);
      }
      map.get(report.assigned_team_id).push(report);
    }
    for (const tasks of map.values()) {
      tasks.sort((left, right) => {
        const leftTime = left.scheduled_start ? new Date(left.scheduled_start).getTime() : Infinity;
        const rightTime = right.scheduled_start ? new Date(right.scheduled_start).getTime() : Infinity;
        return leftTime - rightTime;
      });
    }
    return map;
  }, [reportsView]);

  const formatScheduleLabel = (value) => {
    if (!value) return null;
    return formatDateTimeInManila(value, null);
  };

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) {
      return teams;
    }
    return teams.filter((team) => {
      const department = departments.find((entry) => entry.department_id === team.department_id);
      return (
        team.name.toLowerCase().includes(q) ||
        (department?.name || '').toLowerCase().includes(q)
      );
    });
  }, [departments, teamSearch, teams]);

  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.trim().toLowerCase();
    if (!q) {
      return sortedDepartments;
    }
    return sortedDepartments.filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        (department.description || '').toLowerCase().includes(q)
    );
  }, [departmentSearch, sortedDepartments]);

  const loadDepartmentChoices = useCallback(async () => {
    setLoadingDepartmentChoices(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        return;
      }
      const latestDepartments = await fetchDepartments(token);
      setDepartmentChoices(latestDepartments);
    } finally {
      setLoadingDepartmentChoices(false);
    }
  }, []);

  useEffect(() => {
    loadDepartmentChoices();
  }, [loadDepartmentChoices]);

  const closeTeamModal = () => {
    setShowTeamModal(false);
    setTeamDraft({ name: '', department_id: '', leader_id: '', sub_leader_id: '' });
  };

  const closeDepartmentModal = () => {
    setShowDepartmentModal(false);
    setDepartmentDraft({ name: '', description: '' });
  };

  const closeAccountModal = () => {
    setShowAccountModal(false);
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreatingTeam(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await createTeam(teamDraft, token);
      setMessage('Team created.');
      closeTeamModal();
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to create team.');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateDepartment = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreatingDepartment(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await createDepartment(
        {
          name: departmentDraft.name.trim(),
          description: departmentDraft.description.trim(),
        },
        token
      );
      setMessage('Department created.');
      closeDepartmentModal();
      await refreshData();
      await loadDepartmentChoices();
    } catch (requestError) {
      setError(requestError.message || 'Unable to create department.');
    } finally {
      setCreatingDepartment(false);
    }
  };

  const openEditDepartment = (department) => {
    setEditingDepartment(department);
    setEditingDepartmentDraft({
      name: department.name || '',
      description: department.description || '',
    });
  };

  const handleSaveDepartment = async () => {
    if (!editingDepartment) {
      return;
    }
    const departmentId = editingDepartment.department_id;
    setSavingDepartmentId(departmentId);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await updateDepartment(
        departmentId,
        {
          name: editingDepartmentDraft.name.trim(),
          description: editingDepartmentDraft.description.trim(),
        },
        token
      );
      setMessage('Department updated.');
      setEditingDepartment(null);
      await refreshData();
      await loadDepartmentChoices();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update department.');
    } finally {
      setSavingDepartmentId(null);
    }
  };

  const handleDeleteDepartment = async (departmentId, departmentName) => {
    const confirmed = window.confirm(
      `Delete department "${departmentName}"? This will fail if teams are still assigned to it.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingDepartmentId(departmentId);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await deleteDepartment(departmentId, token);
      setMessage('Department deleted.');
      await refreshData();
      await loadDepartmentChoices();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete department.');
    } finally {
      setDeletingDepartmentId(null);
    }
  };

  const handleSaveLeadership = async (teamId) => {
    setBusyTeamId(teamId);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      await updateTeamLeadership(teamId, leadershipDrafts[teamId] || {}, token);
      setMessage('Team leadership updated.');
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update team leadership.');
    } finally {
      setBusyTeamId(null);
    }
  };

  const handleAccountFieldChange = (field) => (event) => {
    const { value, checked, type } = event.target;
    setAccountForm((previous) => ({
      ...previous,
      [field]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!accountForm.email.trim()) {
      setError('Email is required.');
      return;
    }

    setCreatingAccount(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await createManagedUserAccount(
        {
          email: accountForm.email.trim(),
          role: accountForm.role,
          access_start: toIsoDateTime(accountForm.access_start),
          access_end: toIsoDateTime(accountForm.access_end),
          first_name: accountForm.first_name,
          middle_name: accountForm.middle_name,
          last_name: accountForm.last_name,
          suffix: accountForm.suffix,
          birthdate: accountForm.birthdate || null,
          gender: accountForm.gender,
          country: accountForm.country,
          region: accountForm.region,
          province: accountForm.province,
          city: accountForm.city,
          barangay: accountForm.barangay,
          street: accountForm.street,
          photo_path: accountForm.photo_path,
          login_url: `${window.location.origin}/login`,
        },
        token
      );

      setAccountForm(emptyAccountForm);
      setMessage('Account created successfully.');
      closeAccountModal();
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to create account.');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleAddMember = async (teamId) => {
    const draft = memberDrafts[teamId];
    if (!draft?.user_id) {
      return;
    }
    setBusyTeamId(teamId);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      await addTeamMember(
        { team_id: teamId, user_id: draft.user_id, member_role: draft.member_role || 'member' },
        token
      );
      setMessage('Team member added.');
      setMemberDrafts((previous) => ({
        ...previous,
        [teamId]: { user_id: '', member_role: 'member' },
      }));
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to add team member.');
    } finally {
      setBusyTeamId(null);
    }
  };

  const managingTeam = managingTeamId ? teams.find((team) => team.team_id === managingTeamId) : null;
  const managingTeamMembers = managingTeam ? membersByTeam.get(managingTeam.team_id) || [] : [];
  const managingTeamTasks = managingTeam ? pendingByTeam.get(managingTeam.team_id) || [] : [];
  const managingTeamDepartment = managingTeam
    ? departments.find((entry) => entry.department_id === managingTeam.department_id)
    : null;
  const managingLeadDraft = managingTeam
    ? leadershipDrafts[managingTeam.team_id] || {
        leader_id: managingTeam.leader_id || '',
        sub_leader_id: managingTeam.sub_leader_id || '',
      }
    : { leader_id: '', sub_leader_id: '' };
  const managingMemberDraft = managingTeam
    ? memberDrafts[managingTeam.team_id] || { user_id: '', member_role: 'member' }
    : { user_id: '', member_role: 'member' };

  const tabs = [
    { id: 'teams', label: 'Teams', count: teams.length },
    { id: 'departments', label: 'Departments', count: departments.length },
    { id: 'accounts', label: 'Accounts' },
  ];

  const renderToolbar = () => {
    if (activeTab === 'teams') {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-primary-container">
              search
            </span>
            <input
              type="search"
              value={teamSearch}
              onChange={(event) => setTeamSearch(event.target.value)}
              placeholder="Search teams or departments..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <button type="button" onClick={() => setShowTeamModal(true)} className={primaryButtonClass}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Team
          </button>
        </div>
      );
    }
    if (activeTab === 'departments') {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-primary-container">
              search
            </span>
            <input
              type="search"
              value={departmentSearch}
              onChange={(event) => setDepartmentSearch(event.target.value)}
              placeholder="Search departments..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <button type="button" onClick={() => setShowDepartmentModal(true)} className={primaryButtonClass}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Department
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-primary-container">
          Create a managed user account. Adds to <span className="font-medium text-on-surface">auth.users</span>,{' '}
          <span className="font-medium text-on-surface">public.users</span>, and{' '}
          <span className="font-medium text-on-surface">public.user_details</span> in one step.
        </p>
        <button type="button" onClick={() => setShowAccountModal(true)} className={primaryButtonClass}>
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          New Account
        </button>
      </div>
    );
  };

  return (
    <section>
      <PageHeader
        title="Manage Teams"
        description="Organize teams, departments, and managed user accounts."
      />

      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-primary-container hover:bg-slate-50 hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span
                  className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-on-primary-container'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {message ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      ) : null}

      <div className="mb-5">{renderToolbar()}</div>

      {activeTab === 'teams' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeams.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-on-primary-container">groups</span>
              <p className="mt-2 text-sm font-semibold text-on-surface">No teams yet</p>
              <p className="text-xs text-on-primary-container">Create a new team to get started.</p>
            </div>
          ) : (
            filteredTeams.map((team) => {
              const department = departments.find((entry) => entry.department_id === team.department_id);
              const members = membersByTeam.get(team.team_id) || [];
              const queuedTasks = pendingByTeam.get(team.team_id) || [];
              const leader = usersIndex.get(team.leader_id);

              return (
                <article
                  key={team.team_id}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-soft transition hover:shadow-panel"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-primary">{team.name}</h3>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-secondary">
                        <span className="material-symbols-outlined text-[12px]">apartment</span>
                        {department?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-secondary">
                      <span className="material-symbols-outlined text-[20px]">group</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-on-primary-container">Leader</span>
                      <span className="ml-auto truncate font-medium text-on-surface">
                        {leader ? formatPersonName(leader.details, leader.email) : 'Unassigned'}
                      </span>
                    </div>
                    <Stat icon="badge" label="members" value={members.length} />
                    <Stat icon="event_note" label="pending tasks" value={queuedTasks.length} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setManagingTeamId(team.team_id)}
                    className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-slate-50"
                  >
                    Manage Team
                  </button>
                </article>
              );
            })
          )}
        </div>
      ) : activeTab === 'departments' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
          {filteredDepartments.length === 0 ? (
            <div className="p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-on-primary-container">apartment</span>
              <p className="mt-2 text-sm font-semibold text-on-surface">No departments</p>
              <p className="text-xs text-on-primary-container">Create one to start organizing teams.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredDepartments.map((department) => {
                const teamCount = teams.filter((team) => team.department_id === department.department_id).length;
                return (
                  <li
                    key={department.department_id}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-slate-50/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-secondary">
                      <span className="material-symbols-outlined">apartment</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-primary">{department.name}</p>
                      <p className="truncate text-xs text-on-primary-container">
                        {department.description || 'No description'} - {teamCount} team
                        {teamCount === 1 ? '' : 's'} - Updated {formatDate(department.updated_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDepartment(department)}
                        className="rounded-lg p-2 text-on-primary-container transition hover:bg-blue-50 hover:text-secondary"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        disabled={deletingDepartmentId === department.department_id}
                        onClick={() =>
                          handleDeleteDepartment(department.department_id, department.name || `#${department.department_id}`)
                        }
                        className="rounded-lg p-2 text-on-primary-container transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-secondary">person_add</span>
          <p className="mt-2 text-sm font-semibold text-on-surface">Create a managed account</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-on-primary-container">
            Sets up Supabase Auth, the public.users row, and the public.user_details profile in one step.
          </p>
          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            className={`${primaryButtonClass} mt-4`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Account
          </button>
        </div>
      )}

      {/* New Team Modal */}
      <Modal
        open={showTeamModal}
        onClose={closeTeamModal}
        title="New Team"
        description="Set up a team and assign its leadership."
      >
        <form id="new-team-form" onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className={labelClass}>Team Name</label>
            <input
              value={teamDraft.name}
              onChange={(event) => setTeamDraft((previous) => ({ ...previous, name: event.target.value }))}
              required
              placeholder="e.g. Rapid Response Alpha"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <select
              value={teamDraft.department_id}
              onChange={(event) =>
                setTeamDraft((previous) => ({ ...previous, department_id: event.target.value }))
              }
              required
              className={inputClass}
            >
              <option value="">{loadingDepartmentChoices ? 'Loading...' : 'Select department'}</option>
              {sortedDepartmentChoices.map((department) => (
                <option key={department.department_id} value={department.department_id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Leader</label>
              <select
                value={teamDraft.leader_id}
                onChange={(event) => setTeamDraft((previous) => ({ ...previous, leader_id: event.target.value }))}
                className={inputClass}
              >
                <option value="">None</option>
                {fieldWorkerUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {formatPersonName(usersIndex.get(user.user_id)?.details, user.email)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sub Leader</label>
              <select
                value={teamDraft.sub_leader_id}
                onChange={(event) =>
                  setTeamDraft((previous) => ({ ...previous, sub_leader_id: event.target.value }))
                }
                className={inputClass}
              >
                <option value="">None</option>
                {fieldWorkerUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {formatPersonName(usersIndex.get(user.user_id)?.details, user.email)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={closeTeamModal} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="submit" form="new-team-form" disabled={creatingTeam} className={primaryButtonClass}>
            {creatingTeam ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </Modal>

      {/* New Department Modal */}
      <Modal
        open={showDepartmentModal}
        onClose={closeDepartmentModal}
        title="New Department"
        description="Departments hold related teams."
      >
        <form id="new-department-form" onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={departmentDraft.name}
              onChange={(event) =>
                setDepartmentDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              required
              placeholder="e.g. Public Works"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={departmentDraft.description}
              onChange={(event) =>
                setDepartmentDraft((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={3}
              placeholder="Short description"
              className={inputClass}
            />
          </div>
        </form>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={closeDepartmentModal} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="submit"
            form="new-department-form"
            disabled={creatingDepartment}
            className={primaryButtonClass}
          >
            {creatingDepartment ? 'Creating...' : 'Create Department'}
          </button>
        </div>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        open={Boolean(editingDepartment)}
        onClose={() => setEditingDepartment(null)}
        title="Edit Department"
        description={editingDepartment?.name}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={editingDepartmentDraft.name}
              onChange={(event) =>
                setEditingDepartmentDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={editingDepartmentDraft.description}
              onChange={(event) =>
                setEditingDepartmentDraft((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={3}
              className={inputClass}
            />
          </div>
          {editingDepartment ? (
            <p className="text-xs text-on-primary-container">
              Created {formatDate(editingDepartment.created_at)} - Updated{' '}
              {formatDate(editingDepartment.updated_at)}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditingDepartment(null)}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDepartment}
            disabled={savingDepartmentId === editingDepartment?.department_id}
            className={primaryButtonClass}
          >
            {savingDepartmentId === editingDepartment?.department_id ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Manage Team Modal */}
      <Modal
        open={Boolean(managingTeam)}
        onClose={() => setManagingTeamId(null)}
        title={managingTeam ? `Manage ${managingTeam.name}` : 'Manage Team'}
        description={managingTeamDepartment?.name}
        size="lg"
      >
        {managingTeam ? (
          <div className="space-y-6">
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                Leadership
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Leader</label>
                  <select
                    className={inputClass}
                    value={managingLeadDraft.leader_id}
                    onChange={(event) =>
                      setLeadershipDrafts((previous) => ({
                        ...previous,
                        [managingTeam.team_id]: { ...managingLeadDraft, leader_id: event.target.value },
                      }))
                    }
                  >
                    <option value="">None</option>
                    {fieldWorkerUsers.map((user) => (
                      <option key={`lead-${user.user_id}`} value={user.user_id}>
                        {formatPersonName(usersIndex.get(user.user_id)?.details, user.email)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sub Leader</label>
                  <select
                    className={inputClass}
                    value={managingLeadDraft.sub_leader_id}
                    onChange={(event) =>
                      setLeadershipDrafts((previous) => ({
                        ...previous,
                        [managingTeam.team_id]: { ...managingLeadDraft, sub_leader_id: event.target.value },
                      }))
                    }
                  >
                    <option value="">None</option>
                    {fieldWorkerUsers.map((user) => (
                      <option key={`sub-${user.user_id}`} value={user.user_id}>
                        {formatPersonName(usersIndex.get(user.user_id)?.details, user.email)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={busyTeamId === managingTeam.team_id}
                  onClick={() => handleSaveLeadership(managingTeam.team_id)}
                  className={primaryButtonClass}
                >
                  {busyTeamId === managingTeam.team_id ? 'Saving...' : 'Save Leadership'}
                </button>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                  Members ({managingTeamMembers.length})
                </h4>
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                {managingTeamMembers.length ? (
                  managingTeamMembers.map((member) => {
                    const person = usersIndex.get(member.user_id);
                    return (
                      <div
                        key={member.team_members_id}
                        className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-on-surface">
                          {formatPersonName(person?.details, person?.email || `User #${member.user_id}`)}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                          {member.member_role}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-2 py-3 text-center text-xs text-on-primary-container">No members yet.</p>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_auto]">
                <select
                  className={inputClass}
                  value={managingMemberDraft.user_id}
                  onChange={(event) =>
                    setMemberDrafts((previous) => ({
                      ...previous,
                      [managingTeam.team_id]: { ...managingMemberDraft, user_id: event.target.value },
                    }))
                  }
                >
                  <option value="">Select member</option>
                  {fieldWorkerUsers.map((user) => (
                    <option key={`member-${user.user_id}`} value={user.user_id}>
                      {formatPersonName(usersIndex.get(user.user_id)?.details, user.email)}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={managingMemberDraft.member_role}
                  onChange={(event) =>
                    setMemberDrafts((previous) => ({
                      ...previous,
                      [managingTeam.team_id]: { ...managingMemberDraft, member_role: event.target.value },
                    }))
                  }
                >
                  <option value="member">member</option>
                  <option value="leader">leader</option>
                  <option value="sub leader">sub leader</option>
                </select>
                <button
                  type="button"
                  disabled={busyTeamId === managingTeam.team_id || !managingMemberDraft.user_id}
                  onClick={() => handleAddMember(managingTeam.team_id)}
                  className={primaryButtonClass}
                >
                  Add
                </button>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                  Team Schedule ({managingTeamTasks.length})
                </h4>
                <p className="text-[11px] text-on-primary-container">Sorted by scheduled start</p>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {managingTeamTasks.length ? (
                  managingTeamTasks.map((task) => {
                    const startLabel = formatScheduleLabel(task.scheduled_start);
                    const endLabel = formatScheduleLabel(task.scheduled_end);
                    return (
                      <div
                        key={`task-${task.report_id}`}
                        className="rounded-lg border border-slate-100 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-on-surface">
                            {task.detail?.title || `Report #${task.report_id}`}
                          </p>
                          <span className="ml-2 shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            {getWorkflowStatusLabel(task.detail?.status, task.assigned_team_id)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-on-primary-container">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-secondary">
                              event
                            </span>
                            {startLabel
                              ? endLabel
                                ? `${startLabel} - ${endLabel}`
                                : startLabel
                              : 'Not scheduled'}
                          </span>
                          {task.estimated_minutes ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-secondary">
                                schedule
                              </span>
                              Est. {formatMinutes(task.estimated_minutes)}
                            </span>
                          ) : null}
                          {task.detail?.severity ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-rose-500">
                                priority_high
                              </span>
                              {task.detail.severity}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-on-primary-container">
                    No pending tasks for this team.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-end">
          <button type="button" onClick={() => setManagingTeamId(null)} className={secondaryButtonClass}>
            Close
          </button>
        </div>
      </Modal>

      {/* New Account Modal */}
      <Modal
        open={showAccountModal}
        onClose={closeAccountModal}
        title="New Account"
        description="Create the auth user, users row, and user_details profile."
        size="xl"
      >
        <form id="new-account-form" onSubmit={handleCreateAccount} className="space-y-6">
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
              Login & Access
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Official Email</label>
                <input
                  value={accountForm.email}
                  onChange={handleAccountFieldChange('email')}
                  type="email"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={accountForm.role}
                  onChange={handleAccountFieldChange('role')}
                  className={inputClass}
                >
                  {accountRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Access Start</label>
                <input
                  value={accountForm.access_start}
                  onChange={handleAccountFieldChange('access_start')}
                  type="datetime-local"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Access End</label>
                <input
                  value={accountForm.access_end}
                  onChange={handleAccountFieldChange('access_end')}
                  type="datetime-local"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
              Personal Details
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input
                  value={accountForm.first_name}
                  onChange={handleAccountFieldChange('first_name')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Middle Name</label>
                <input
                  value={accountForm.middle_name}
                  onChange={handleAccountFieldChange('middle_name')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input
                  value={accountForm.last_name}
                  onChange={handleAccountFieldChange('last_name')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Suffix</label>
                <input
                  value={accountForm.suffix}
                  onChange={handleAccountFieldChange('suffix')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Birthdate</label>
                <input
                  value={accountForm.birthdate}
                  onChange={handleAccountFieldChange('birthdate')}
                  type="date"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  value={accountForm.gender}
                  onChange={handleAccountFieldChange('gender')}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Photo Path</label>
                <input
                  value={accountForm.photo_path}
                  onChange={handleAccountFieldChange('photo_path')}
                  placeholder="e.g. profiles/user-photo.jpg"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
              Address
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>Country</label>
                <input
                  value={accountForm.country}
                  onChange={handleAccountFieldChange('country')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Region</label>
                <input
                  value={accountForm.region}
                  onChange={handleAccountFieldChange('region')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Province</label>
                <input
                  value={accountForm.province}
                  onChange={handleAccountFieldChange('province')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  value={accountForm.city}
                  onChange={handleAccountFieldChange('city')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Barangay</label>
                <input
                  value={accountForm.barangay}
                  onChange={handleAccountFieldChange('barangay')}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Street</label>
                <input
                  value={accountForm.street}
                  onChange={handleAccountFieldChange('street')}
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </form>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setAccountForm(emptyAccountForm)}
            disabled={creatingAccount}
            className={secondaryButtonClass}
          >
            Reset Form
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={closeAccountModal} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-account-form"
              disabled={creatingAccount}
              className={primaryButtonClass}
            >
              {creatingAccount ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default ManageTeamsPage;
