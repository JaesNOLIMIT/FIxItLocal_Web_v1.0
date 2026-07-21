import { useMemo, useState } from 'react';
import { useRoleData } from '../../hooks/useRoleData';
import { useAuth } from '../../context/AuthContext';
import { buildReportsViewModel, formatDate, formatPersonName } from '../../lib/dataUtils';
import {
  formatMonthYearInManila,
  formatTimeInManila,
  getDateKeyInManila,
  getMinutesFromMidnightInManila,
  getTodayDateKeyInManila,
} from '../../lib/manilaTime';
import { getWorkflowStatusLabel, isCompletedWorkflowStatus } from '../../lib/reportStatus';
import PageHeader from '../shared/PageHeader';

const WORKDAY_START_MINUTES = 8 * 60;
const WORKDAY_END_MINUTES = 17 * 60;
const WORKDAY_DURATION_MINUTES = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES;
const TIMELINE_HEIGHT = 540;
const DEFAULT_TASK_MINUTES = 60;
const MIN_TIMELINE_BLOCK_MINUTES = 15;

function getDateKey(value) {
  return getDateKeyInManila(value);
}

function getTodayDateKey() {
  return getTodayDateKeyInManila();
}

function getMinutesFromMidnight(value) {
  return getMinutesFromMidnightInManila(value);
}

function formatTime(value) {
  return formatTimeInManila(value, '-');
}

function resolveTaskSchedule(task) {
  if (!task?.scheduled_start) {
    return null;
  }
  const startDate = new Date(task.scheduled_start);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  let endDate = task.scheduled_end ? new Date(task.scheduled_end) : null;
  if (!endDate || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    const minutes = Number(task.estimated_minutes);
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_TASK_MINUTES;
    endDate = new Date(startDate.getTime() + safeMinutes * 60_000);
  }

  return {
    start: startDate,
    end: endDate,
  };
}

function isSameMonth(day, monthCursor) {
  return day.getFullYear() === monthCursor.getFullYear() && day.getMonth() === monthCursor.getMonth();
}

function buildCalendarCells(monthCursor) {
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function FieldWorkerScheduledWorkPage() {
  const { profile } = useAuth();
  const { systemData } = useRoleData();
  const { users, userDetails, departments, teams, reports, reportDetails, teamMembers, reportResponseTeams = [] } =
    systemData;

  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const [monthCursor, setMonthCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedTaskKey, setSelectedTaskKey] = useState('');

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

  const workerMembership = useMemo(() => {
    return [...teamMembers]
      .filter((member) => Number(member.user_id) === Number(profile?.user_id) && member.is_active)
      .sort((left, right) => {
        const leftTime = left.joined_at ? new Date(left.joined_at).getTime() : 0;
        const rightTime = right.joined_at ? new Date(right.joined_at).getTime() : 0;
        return rightTime - leftTime;
      })[0];
  }, [profile?.user_id, teamMembers]);

  const workerTeam = useMemo(
    () => teams.find((team) => Number(team.team_id) === Number(workerMembership?.team_id)) || null,
    [teams, workerMembership?.team_id]
  );

  const teamTasks = useMemo(() => {
    if (!workerTeam) {
      return [];
    }

    const teamId = Number(workerTeam.team_id);
    const tasks = [];
    const seenReportIds = new Set();

    for (const row of reportResponseTeams) {
      if (Number(row.team_id) !== teamId) continue;
      const report = reportsById.get(Number(row.report_id));
      if (!report || isCompletedWorkflowStatus(report.detail?.status, report.assigned_team_id)) continue;
      seenReportIds.add(Number(row.report_id));
      tasks.push({
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

    for (const report of reportView) {
      if (Number(report.assigned_team_id) !== teamId) continue;
      if (seenReportIds.has(Number(report.report_id))) continue;
      if (isCompletedWorkflowStatus(report.detail?.status, report.assigned_team_id)) continue;
      tasks.push({
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

    return tasks.sort((left, right) => {
      const leftTime = left.scheduled_start ? new Date(left.scheduled_start).getTime() : Number.POSITIVE_INFINITY;
      const rightTime = right.scheduled_start ? new Date(right.scheduled_start).getTime() : Number.POSITIVE_INFINITY;
      return leftTime - rightTime;
    });
  }, [reportResponseTeams, reportView, reportsById, workerTeam]);

  const scheduledByDate = useMemo(() => {
    const map = new Map();
    for (const task of teamTasks) {
      const resolved = resolveTaskSchedule(task);
      if (!resolved) continue;
      const dateKey = getDateKey(resolved.start);
      if (!dateKey) continue;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push({
        ...task,
        resolved_start: resolved.start.toISOString(),
        resolved_end: resolved.end.toISOString(),
      });
    }
    return map;
  }, [teamTasks]);

  const selectedDateTasks = useMemo(() => {
    return [...(scheduledByDate.get(selectedDate) || [])].sort((left, right) => {
      const leftTime = new Date(left.resolved_start || left.scheduled_start).getTime();
      const rightTime = new Date(right.resolved_start || right.scheduled_start).getTime();
      return leftTime - rightTime;
    });
  }, [scheduledByDate, selectedDate]);

  const selectedTask =
    selectedDateTasks.find((task) => task.key === selectedTaskKey) || selectedDateTasks[0] || null;

  const timelineBlocks = useMemo(() => {
    return selectedDateTasks
      .map((task) => {
        const startMinutes = getMinutesFromMidnight(task.resolved_start || task.scheduled_start);
        const endMinutes = getMinutesFromMidnight(task.resolved_end || task.scheduled_end);
        if (startMinutes === null || endMinutes === null) {
          return null;
        }

        let clampedStart = Math.max(startMinutes, WORKDAY_START_MINUTES);
        let clampedEnd = Math.min(endMinutes, WORKDAY_END_MINUTES);

        if (startMinutes >= WORKDAY_END_MINUTES) {
          clampedStart = WORKDAY_END_MINUTES - MIN_TIMELINE_BLOCK_MINUTES;
          clampedEnd = WORKDAY_END_MINUTES;
        } else if (endMinutes <= WORKDAY_START_MINUTES) {
          clampedStart = WORKDAY_START_MINUTES;
          clampedEnd = WORKDAY_START_MINUTES + MIN_TIMELINE_BLOCK_MINUTES;
        }

        if (clampedEnd <= clampedStart) {
          return null;
        }

        const top = ((clampedStart - WORKDAY_START_MINUTES) / WORKDAY_DURATION_MINUTES) * TIMELINE_HEIGHT;
        const height = Math.max(
          26,
          ((clampedEnd - clampedStart) / WORKDAY_DURATION_MINUTES) * TIMELINE_HEIGHT
        );

        return {
          key: task.key,
          task,
          top,
          height,
          active: selectedTask?.key === task.key,
        };
      })
      .filter(Boolean);
  }, [selectedDateTasks, selectedTask?.key]);

  const calendarCells = useMemo(() => buildCalendarCells(monthCursor), [monthCursor]);

  const availableDateKeys = useMemo(() => new Set(scheduledByDate.keys()), [scheduledByDate]);

  return (
    <section>
      <PageHeader
        title="Scheduled Work"
        description="Team calendar and timeline view of your assigned schedule. Click a highlighted block to view work details."
      />

      {!workerTeam ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-on-primary-container shadow-soft">
          You are not assigned to an active team yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-on-primary-container">Calendar</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {workerTeam.name}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setMonthCursor((previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))
                }
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Prev
              </button>
              <p className="text-sm font-semibold text-primary">
                {formatMonthYearInManila(monthCursor, '')}
              </p>
              <button
                type="button"
                onClick={() =>
                  setMonthCursor((previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))
                }
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Next
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-on-primary-container">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarCells.map((day, index) => {
                if (!day) {
                  return <div key={`blank-${index}`} className="h-10 rounded-md bg-transparent" />;
                }
                const dayKey = getDateKey(day);
                const isActiveDay = selectedDate === dayKey;
                const hasTask = availableDateKeys.has(dayKey);
                return (
                  <button
                    type="button"
                    key={dayKey}
                    onClick={() => {
                      setSelectedDate(dayKey);
                      setSelectedTaskKey('');
                    }}
                    className={`relative h-10 rounded-md border text-xs font-semibold transition ${
                      isActiveDay
                        ? 'border-blue-300 bg-blue-100 text-blue-900'
                        : isSameMonth(day, monthCursor)
                          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {day.getDate()}
                    {hasTask ? (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                Selected Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedTaskKey('');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft xl:col-span-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-primary-container">
              Timeline ({selectedDate})
            </h2>

            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div className="relative" style={{ height: `${TIMELINE_HEIGHT}px` }}>
                {Array.from({ length: 10 }).map((_, index) => {
                  const hour = 8 + index;
                  const top = (index / 9) * TIMELINE_HEIGHT;
                  return (
                    <div
                      key={`label-${hour}`}
                      className="absolute right-0 -translate-y-1/2 pr-1 text-[11px] text-on-primary-container"
                      style={{ top: `${top}px` }}
                    >
                      {hour}:00
                    </div>
                  );
                })}
              </div>

              <div className="relative rounded-lg border border-slate-200 bg-slate-50/70" style={{ height: `${TIMELINE_HEIGHT}px` }}>
                {Array.from({ length: 10 }).map((_, index) => {
                  const top = (index / 9) * TIMELINE_HEIGHT;
                  return (
                    <div
                      key={`line-${index}`}
                      className="absolute left-0 right-0 border-t border-slate-200"
                      style={{ top: `${top}px` }}
                    />
                  );
                })}

                {timelineBlocks.length ? (
                  timelineBlocks.map((block) => (
                    <button
                      type="button"
                      key={block.key}
                      onClick={() => setSelectedTaskKey(block.key)}
                      className={`absolute left-2 right-2 overflow-hidden rounded-md border px-2 py-1 text-left text-xs transition ${
                        block.active
                          ? 'border-blue-300 bg-blue-100 text-blue-900'
                          : 'border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                      }`}
                      style={{ top: `${block.top}px`, height: `${block.height}px` }}
                    >
                      <p className="truncate font-semibold">{block.task.report.detail?.title || `Report #${block.task.report_id}`}</p>
                      <p className="truncate">
                        {formatTime(block.task.resolved_start || block.task.scheduled_start)} -{' '}
                        {formatTime(block.task.resolved_end || block.task.scheduled_end)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-on-primary-container">
                    No scheduled work blocks for this date.
                  </div>
                )}
              </div>
            </div>

            {selectedTask ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-primary">
                  {selectedTask.report.detail?.title || `Report #${selectedTask.report_id}`}
                </h3>
                <p className="mt-1 text-xs text-on-primary-container">
                  {getWorkflowStatusLabel(selectedTask.report.detail?.status, selectedTask.report.assigned_team_id)} -{' '}
                  {formatTime(selectedTask.resolved_start || selectedTask.scheduled_start)} -{' '}
                  {formatTime(selectedTask.resolved_end || selectedTask.scheduled_end)}
                </p>
                <p className="mt-2 text-sm text-on-surface">
                  {selectedTask.report.detail?.description || 'No description available.'}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-on-primary-container md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-on-surface">Location:</span>{' '}
                    {[selectedTask.report.detail?.city, selectedTask.report.detail?.barangay, selectedTask.report.detail?.street]
                      .filter(Boolean)
                      .join(', ') || 'No location'}
                  </p>
                  <p>
                    <span className="font-semibold text-on-surface">Reporter:</span>{' '}
                    {formatPersonName(
                      selectedTask.report.reporter?.details,
                      selectedTask.report.reporter?.email || 'Unknown'
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-on-surface">Created:</span> {formatDate(selectedTask.report.created_at)}
                  </p>
                  <p>
                    <span className="font-semibold text-on-surface">Estimated:</span>{' '}
                    {selectedTask.estimated_minutes ? `${selectedTask.estimated_minutes} min` : 'Not set'}
                  </p>
                </div>
                {selectedTask.ai_estimate_notes ? (
                  <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-secondary">
                    {selectedTask.ai_estimate_notes}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        </div>
      )}
    </section>
  );
}

export default FieldWorkerScheduledWorkPage;
