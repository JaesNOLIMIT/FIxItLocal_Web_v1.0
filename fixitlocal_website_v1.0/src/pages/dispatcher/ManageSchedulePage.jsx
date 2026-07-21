import { useMemo, useState } from 'react';
import { useRoleData } from '../../hooks/useRoleData';
import { buildReportsViewModel, formatDate } from '../../lib/dataUtils';
import {
  addReportResponseTeam,
  getValidAccessToken,
  upsertReportResponseTeamSchedule,
} from '../../lib/supabaseRest';
import { estimateRepairTime, formatMinutes } from '../../lib/gemini';
import { getWorkflowStatusLabel, isCompletedWorkflowStatus } from '../../lib/reportStatus';
import {
  formatDateTimeInManila,
  fromManilaDateTimeLocal,
  getDateKeyInManila,
  getMinutesFromMidnightInManila,
  getTodayDateKeyInManila,
  toManilaDateTimeLocal,
} from '../../lib/manilaTime';
import PageHeader from '../shared/PageHeader';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-on-surface placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-on-primary-container';

function getTodayDateKey() {
  return getTodayDateKeyInManila();
}

function toDateTimeLocal(value) {
  return toManilaDateTimeLocal(value);
}

function fromDateTimeLocal(value) {
  return fromManilaDateTimeLocal(value);
}

function matchesDate(value, selectedDate) {
  return Boolean(value && selectedDate && getDateKeyInManila(value) === selectedDate);
}

function formatDateTime(value) {
  return formatDateTimeInManila(value, 'Not scheduled');
}

function validateWorkdayScheduleWindow(startIso, endIso) {
  if (!startIso && !endIso) {
    return '';
  }
  if (!startIso || !endIso) {
    return 'Scheduled start and end must both be provided.';
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Invalid schedule date/time.';
  }

  const sameDay = getDateKeyInManila(startIso) === getDateKeyInManila(endIso);
  if (!sameDay) {
    return 'Schedule must start and end on the same date.';
  }

  const startMinutes = getMinutesFromMidnightInManila(startIso);
  const endMinutes = getMinutesFromMidnightInManila(endIso);
  if (startMinutes === null || endMinutes === null) {
    return 'Invalid schedule date/time.';
  }
  if (startMinutes < 8 * 60 || endMinutes > 17 * 60) {
    return 'Schedule must be within 08:00 to 17:00.';
  }
  if (end <= start) {
    return 'Scheduled end must be after scheduled start.';
  }

  return '';
}

function defaultScheduleDraft(task, selectedDate) {
  const defaultStart = `${selectedDate}T08:00`;
  const defaultEnd = `${selectedDate}T09:00`;
  return {
    scheduled_start: toDateTimeLocal(task.scheduled_start) || defaultStart,
    scheduled_end: toDateTimeLocal(task.scheduled_end) || defaultEnd,
    estimated_minutes:
      task.estimated_minutes === null || task.estimated_minutes === undefined
        ? ''
        : String(task.estimated_minutes),
    ai_estimate_notes: task.ai_estimate_notes || '',
    ai_estimate_source: '',
    ai_reestimate_recommended: false,
  };
}

function DispatcherManageSchedulePage() {
  const { systemData, refreshData } = useRoleData();
  const { users, userDetails, departments, teams, reports, reportDetails, reportResponseTeams = [] } = systemData;

  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const [drafts, setDrafts] = useState({});
  const [linkDraft, setLinkDraft] = useState({ report_id: '', team_id: '' });
  const [savingKey, setSavingKey] = useState('');
  const [aiBusyKey, setAiBusyKey] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reportView = useMemo(
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

  const reportsById = useMemo(
    () => new Map(reportView.map((report) => [Number(report.report_id), report])),
    [reportView]
  );

  const activeReports = useMemo(
    () =>
      reportView.filter((report) => !isCompletedWorkflowStatus(report.detail?.status, report.assigned_team_id)),
    [reportView]
  );

  const responseRowsByReport = useMemo(() => {
    const map = new Map();
    for (const row of reportResponseTeams) {
      const key = Number(row.report_id);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(row);
    }
    return map;
  }, [reportResponseTeams]);

  const scheduleByTeam = useMemo(() => {
    return [...teams]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((team) => {
        const teamId = Number(team.team_id);
        const taskRows = [];
        const seenReportIds = new Set();

        for (const row of reportResponseTeams) {
          if (Number(row.team_id) !== teamId) {
            continue;
          }
          const report = reportsById.get(Number(row.report_id));
          if (!report || isCompletedWorkflowStatus(report.detail?.status, report.assigned_team_id)) {
            continue;
          }
          seenReportIds.add(Number(row.report_id));
          taskRows.push({
            key: `task-${row.response_team_id}`,
            report_id: Number(row.report_id),
            team_id: teamId,
            response_team_id: row.response_team_id,
            scheduled_start: row.scheduled_start || report.scheduled_start || null,
            scheduled_end: row.scheduled_end || report.scheduled_end || null,
            estimated_minutes:
              row.estimated_minutes === null || row.estimated_minutes === undefined
                ? report.estimated_minutes
                : row.estimated_minutes,
            ai_estimate_notes: row.ai_estimate_notes || report.ai_estimate_notes || '',
            report,
          });
        }

        for (const report of activeReports) {
          if (Number(report.assigned_team_id) !== teamId) {
            continue;
          }
          if (seenReportIds.has(Number(report.report_id))) {
            continue;
          }
          taskRows.push({
            key: `task-virtual-${report.report_id}-${teamId}`,
            report_id: Number(report.report_id),
            team_id: teamId,
            response_team_id: null,
            scheduled_start: report.scheduled_start || null,
            scheduled_end: report.scheduled_end || null,
            estimated_minutes: report.estimated_minutes,
            ai_estimate_notes: report.ai_estimate_notes || '',
            report,
          });
        }

        const scheduled = taskRows
          .filter((task) => matchesDate(task.scheduled_start, selectedDate))
          .sort((left, right) => {
            const leftTime = left.scheduled_start ? new Date(left.scheduled_start).getTime() : Number.POSITIVE_INFINITY;
            const rightTime = right.scheduled_start ? new Date(right.scheduled_start).getTime() : Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
          });

        const unscheduled = taskRows
          .filter((task) => !task.scheduled_start)
          .sort((left, right) => new Date(right.report.created_at).getTime() - new Date(left.report.created_at).getTime());

        return {
          key: `team-${teamId}`,
          team,
          scheduled,
          unscheduled,
        };
      });
  }, [activeReports, reportsById, reportResponseTeams, selectedDate, teams]);

  const availableTeamsForLink = useMemo(() => {
    if (!linkDraft.report_id) {
      return teams;
    }
    const usedTeamIds = new Set(
      (responseRowsByReport.get(Number(linkDraft.report_id)) || []).map((row) => Number(row.team_id))
    );
    return teams.filter((team) => !usedTeamIds.has(Number(team.team_id)));
  }, [linkDraft.report_id, responseRowsByReport, teams]);

  const getDraft = (task) => drafts[task.key] || defaultScheduleDraft(task, selectedDate);

  const updateDraftField = (task, field, value) => {
    setDrafts((previous) => {
      const current = previous[task.key] || defaultScheduleDraft(task, selectedDate);
      const next = { ...current, [field]: value };
      if (field === 'scheduled_start' && current.estimated_minutes && value) {
        const startIso = fromDateTimeLocal(value);
        const minutes = Number(current.estimated_minutes);
        const start = startIso ? new Date(startIso) : null;
        if (start && !Number.isNaN(start.getTime()) && !Number.isNaN(minutes)) {
          const endIso = new Date(start.getTime() + minutes * 60_000).toISOString();
          next.scheduled_end = toDateTimeLocal(endIso);
        }
      }
      return { ...previous, [task.key]: next };
    });
  };

  const handleEstimate = async (task) => {
    setAiBusyKey(task.key);
    setError('');
    try {
      const result = await estimateRepairTime({
        title: task.report.detail?.title,
        description: task.report.detail?.description,
        category: task.report.detail?.category,
        severity: task.report.detail?.severity,
        location: [task.report.detail?.city, task.report.detail?.barangay, task.report.detail?.street]
          .filter(Boolean)
          .join(', '),
      });

      setDrafts((previous) => {
        const current = previous[task.key] || defaultScheduleDraft(task, selectedDate);
        const next = {
          ...current,
          estimated_minutes: String(result.minutes),
          ai_estimate_notes: result.notes,
          ai_estimate_source: result.source || '',
          ai_reestimate_recommended: Boolean(result.reestimate_recommended),
        };
        if (current.scheduled_start) {
          const startIso = fromDateTimeLocal(current.scheduled_start);
          const start = startIso ? new Date(startIso) : null;
          if (start && !Number.isNaN(start.getTime())) {
            next.scheduled_end = toDateTimeLocal(
              new Date(start.getTime() + result.minutes * 60_000).toISOString()
            );
          }
        }
        return { ...previous, [task.key]: next };
      });
    } catch {
      setError('AI estimate request failed. Please try again.');
    } finally {
      setAiBusyKey('');
    }
  };

  const handleSaveSchedule = async (task) => {
    const draft = getDraft(task);
    setSavingKey(task.key);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      const scheduleStartIso = fromDateTimeLocal(draft.scheduled_start);
      const scheduleEndIso = fromDateTimeLocal(draft.scheduled_end);
      const scheduleValidationError = validateWorkdayScheduleWindow(scheduleStartIso, scheduleEndIso);
      if (scheduleValidationError) {
        throw new Error(scheduleValidationError);
      }

      await upsertReportResponseTeamSchedule(
        task.report_id,
        task.team_id,
        {
          scheduled_start: scheduleStartIso,
          scheduled_end: scheduleEndIso,
          estimated_minutes: draft.estimated_minutes,
          ai_estimate_notes: draft.ai_estimate_notes,
        },
        token
      );

      setMessage('Team schedule updated.');
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save team schedule.');
    } finally {
      setSavingKey('');
    }
  };

  const handleAddTeamLink = async () => {
    if (!linkDraft.report_id || !linkDraft.team_id) {
      return;
    }
    setAddingLink(true);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      await addReportResponseTeam(linkDraft.report_id, linkDraft.team_id, token);
      setLinkDraft({ report_id: '', team_id: '' });
      setMessage('Team was added to the report schedule list.');
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to add team to report.');
    } finally {
      setAddingLink(false);
    }
  };

  const dayMin = `${selectedDate}T08:00`;
  const dayMax = `${selectedDate}T17:00`;

  return (
    <section>
      <PageHeader
        title="Manage Schedule"
        description="Assign exact team schedule windows between 08:00 and 17:00, with conflict blocking per team/date."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
          <label className={labelClass}>Schedule Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className={inputClass}
          />
          <p className="mt-2 text-xs text-on-primary-container">Only 08:00-17:00 windows are allowed.</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-primary-container">Add Team If Missing</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              className={inputClass}
              value={linkDraft.report_id}
              onChange={(event) => setLinkDraft((previous) => ({ ...previous, report_id: event.target.value, team_id: '' }))}
            >
              <option value="">Select report</option>
              {activeReports.map((report) => (
                <option key={report.report_id} value={report.report_id}>
                  {report.detail?.title || `Report #${report.report_id}`}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={linkDraft.team_id}
              onChange={(event) => setLinkDraft((previous) => ({ ...previous, team_id: event.target.value }))}
            >
              <option value="">Select team</option>
              {availableTeamsForLink.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!linkDraft.report_id || !linkDraft.team_id || addingLink}
              onClick={handleAddTeamLink}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:opacity-60"
            >
              {addingLink ? 'Adding...' : 'Add Team'}
            </button>
          </div>
        </article>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {scheduleByTeam.map(({ key, team, scheduled, unscheduled }) => (
          <article key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-primary">{team.name}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {scheduled.length} task(s) on {selectedDate}
              </span>
            </div>

            <div className="space-y-3">
              {[...scheduled, ...unscheduled].length ? (
                [...scheduled, ...unscheduled].map((task) => {
                  const draft = getDraft(task);
                  const statusLabel = getWorkflowStatusLabel(task.report.detail?.status, task.report.assigned_team_id);
                  return (
                    <div key={task.key} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            {task.report.detail?.title || `Report #${task.report_id}`}
                          </p>
                          <p className="text-xs text-on-primary-container">
                            {statusLabel} - {formatDate(task.report.created_at)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-on-primary-container">
                          Current: {formatDateTime(task.scheduled_start)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                        <input
                          type="datetime-local"
                          className={inputClass}
                          min={dayMin}
                          max={dayMax}
                          step="900"
                          value={draft.scheduled_start || ''}
                          onChange={(event) => updateDraftField(task, 'scheduled_start', event.target.value)}
                        />
                        <input
                          type="datetime-local"
                          className={inputClass}
                          min={dayMin}
                          max={dayMax}
                          step="900"
                          value={draft.scheduled_end || ''}
                          onChange={(event) => updateDraftField(task, 'scheduled_end', event.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          step="15"
                          className={inputClass}
                          placeholder="Est. minutes"
                          value={draft.estimated_minutes || ''}
                          onChange={(event) => updateDraftField(task, 'estimated_minutes', event.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEstimate(task)}
                            disabled={aiBusyKey === task.key}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-secondary hover:bg-blue-100 disabled:opacity-60"
                          >
                            {aiBusyKey === task.key
                              ? 'AI...'
                              : draft.ai_reestimate_recommended
                                ? 'Re-estimate AI'
                                : 'AI Estimate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSchedule(task)}
                            disabled={savingKey === task.key}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-container disabled:opacity-60"
                          >
                            {savingKey === task.key ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>

                      {draft.ai_estimate_notes ? (
                        <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-secondary">
                          {draft.ai_estimate_source === 'gemini' ? 'AI estimate' : 'Local estimate'}:{' '}
                          {draft.estimated_minutes ? formatMinutes(Number(draft.estimated_minutes)) : '-'} -{' '}
                          {draft.ai_estimate_notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-on-primary-container">
                  No schedulable tasks for this team yet.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DispatcherManageSchedulePage;
