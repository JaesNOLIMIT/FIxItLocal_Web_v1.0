import { useEffect, useMemo, useRef, useState } from 'react';
import { buildReportsViewModel, formatDate, formatPersonName } from '../../lib/dataUtils';
import {
  addReportResponseTeam,
  getValidAccessToken,
  removeReportResponseTeam,
  upsertReportResponseTeamSchedule,
  updateReportAssignment,
  updateReportSchedule,
  updateReportStatus,
} from '../../lib/supabaseRest';
import { useRoleData } from '../../hooks/useRoleData';
import { estimateRepairTime, formatMinutes, isGeminiConfigured } from '../../lib/gemini';
import {
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_OPTIONS,
  getWorkflowStatusLabel,
  normalizeWorkflowStatus,
} from '../../lib/reportStatus';
import {
  addDaysToDateKey,
  formatDateTimeInManila,
  fromManilaDateTimeLocal,
  getDateKeyInManila,
  getMinutesFromMidnightInManila,
  getTodayDateKeyInManila,
  parseManilaDateTimeLocal,
  toManilaDateTimeLocal,
} from '../../lib/manilaTime';
import PageHeader from './PageHeader';
import Modal from '../../components/Modal';
import ReportLocationMap from '../../components/ReportLocationMap';

const STATUS_STYLES = {
  [WORKFLOW_STATUS.PENDING]: 'bg-slate-50 text-slate-700 border-slate-200',
  [WORKFLOW_STATUS.ASSIGNED]: 'bg-blue-50 text-secondary border-blue-200',
  [WORKFLOW_STATUS.IN_PROGRESS]: 'bg-amber-50 text-amber-700 border-amber-200',
  [WORKFLOW_STATUS.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Unknown: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SEVERITY_STYLES = {
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-on-surface placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-on-primary-container';

const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-50 disabled:opacity-60';
const WORKDAY_START_MINUTES = 8 * 60;
const WORKDAY_END_MINUTES = 17 * 60;
const WORKDAY_DURATION_MINUTES = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES;
const SCHEDULE_STEP_MINUTES = 15;
const WORKDAY_TIMELINE_TICKS = Array.from(
  { length: WORKDAY_DURATION_MINUTES / 60 + 1 },
  (_, index) => WORKDAY_START_MINUTES + index * 60
);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function StatusBadge({ status, assignedTeamId = null, onImage = false }) {
  const normalizedStatus = normalizeWorkflowStatus(status, assignedTeamId);
  const key = STATUS_STYLES[normalizedStatus] ? normalizedStatus : 'Unknown';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        STATUS_STYLES[key]
      } ${onImage ? 'shadow-sm backdrop-blur-sm' : ''}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {getWorkflowStatusLabel(status, assignedTeamId)}
    </span>
  );
}

function SeverityBadge({ severity, onImage = false }) {
  const key = SEVERITY_STYLES[severity] || SEVERITY_STYLES.Low;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${key} ${
        onImage ? 'shadow-sm backdrop-blur-sm' : ''
      }`}
    >
      {severity || 'Low'}
    </span>
  );
}

function formatLocation(detail) {
  if (!detail) return '';
  return [detail.city, detail.barangay, detail.street].filter(Boolean).join(', ');
}

function formatDateTime(value) {
  return formatDateTimeInManila(value, '-');
}

function toDateTimeLocal(value) {
  return toManilaDateTimeLocal(value);
}

function fromDateTimeLocal(value) {
  return fromManilaDateTimeLocal(value);
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
    return 'Schedule must start and end on the same day.';
  }

  const startMinutes = getMinutesFromMidnightInManila(startIso);
  const endMinutes = getMinutesFromMidnightInManila(endIso);
  if (startMinutes === null || endMinutes === null) {
    return 'Invalid schedule date/time.';
  }
  if (startMinutes < WORKDAY_START_MINUTES || endMinutes > WORKDAY_END_MINUTES) {
    return 'Schedule must be within 08:00 to 17:00.';
  }

  if (end <= start) {
    return 'Scheduled end must be after scheduled start.';
  }

  return '';
}

function getMinutesFromLocalDate(date) {
  return getMinutesFromMidnightInManila(date);
}

function setLocalMinutes(date, minutesFromMidnight) {
  const dayKey = getDateKeyInManila(date);
  if (!dayKey) {
    return date;
  }
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const nextIso = fromManilaDateTimeLocal(`${dayKey}T${pad2(hour)}:${pad2(minute)}`);
  if (!nextIso) {
    return date;
  }
  return new Date(nextIso);
}

function alignDateToWorkdaySlot(rawValue) {
  const parsedLocal =
    (typeof rawValue === 'string' ? parseManilaDateTimeLocal(rawValue) : null) ||
    parseManilaDateTimeLocal(toManilaDateTimeLocal(rawValue));
  if (!parsedLocal) {
    return null;
  }
  const iso = fromManilaDateTimeLocal(
    `${parsedLocal.year}-${pad2(parsedLocal.month)}-${pad2(parsedLocal.day)}T${pad2(parsedLocal.hour)}:${pad2(
      parsedLocal.minute
    )}`
  );
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  const minutes = getMinutesFromLocalDate(date);
  const baseDayKey = getDateKeyInManila(date);
  if (minutes === null || !baseDayKey) {
    return null;
  }

  if (minutes < WORKDAY_START_MINUTES) {
    return setLocalMinutes(date, WORKDAY_START_MINUTES);
  }

  const roundedToStep = Math.ceil(minutes / SCHEDULE_STEP_MINUTES) * SCHEDULE_STEP_MINUTES;
  if (roundedToStep >= WORKDAY_END_MINUTES) {
    const nextDayKey = addDaysToDateKey(baseDayKey, 1);
    const nextIso = fromManilaDateTimeLocal(`${nextDayKey}T08:00`);
    return nextIso ? new Date(nextIso) : null;
  }

  return setLocalMinutes(date, roundedToStep);
}

function buildScheduleWindow(startDate, estimatedMinutes) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return {
      endDate: null,
      scheduledMinutes: 0,
      wasCapped: false,
    };
  }
  const minutesValue = Number(estimatedMinutes);
  const safeMinutes = Number.isFinite(minutesValue) && minutesValue > 0 ? minutesValue : 60;
  const roundedMinutes = Math.ceil(safeMinutes / SCHEDULE_STEP_MINUTES) * SCHEDULE_STEP_MINUTES;
  const scheduledMinutes = Math.max(
    SCHEDULE_STEP_MINUTES,
    Math.min(roundedMinutes, WORKDAY_DURATION_MINUTES)
  );
  const endDate = new Date(startDate.getTime() + scheduledMinutes * 60_000);

  return {
    endDate,
    scheduledMinutes,
    wasCapped: scheduledMinutes < roundedMinutes,
  };
}

function alignEndTimeForStart(startRawValue, endRawValue) {
  const startLocal =
    (typeof startRawValue === 'string' ? parseManilaDateTimeLocal(startRawValue) : null) ||
    parseManilaDateTimeLocal(toManilaDateTimeLocal(startRawValue));
  const endLocal =
    (typeof endRawValue === 'string' ? parseManilaDateTimeLocal(endRawValue) : null) ||
    parseManilaDateTimeLocal(toManilaDateTimeLocal(endRawValue));
  if (!startLocal || !endLocal) {
    return null;
  }

  const startDayKey = `${startLocal.year}-${pad2(startLocal.month)}-${pad2(startLocal.day)}`;
  const rounded = Math.ceil((endLocal.hour * 60 + endLocal.minute) / SCHEDULE_STEP_MINUTES) * SCHEDULE_STEP_MINUTES;
  const minEndMinutes = startLocal.hour * 60 + startLocal.minute + SCHEDULE_STEP_MINUTES;
  const clampedMinutes = Math.max(minEndMinutes, Math.min(rounded, WORKDAY_END_MINUTES));
  const hour = Math.floor(clampedMinutes / 60);
  const minute = clampedMinutes % 60;
  const endIso = fromManilaDateTimeLocal(`${startDayKey}T${pad2(hour)}:${pad2(minute)}`);
  return endIso ? new Date(endIso) : null;
}

function buildDateTimeLocalFromDateKey(dateKey, minutesFromMidnight) {
  if (!dateKey) {
    return '';
  }
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  return `${dateKey}T${pad2(hours)}:${pad2(minutes)}`;
}

function formatMinuteLabel(minutesFromMidnight) {
  const hour24 = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${pad2(minute)} ${suffix}`;
}

function formatIntervalLabel(interval) {
  return `${formatMinuteLabel(interval.start)} - ${formatMinuteLabel(interval.end)}`;
}

function getIntervalStyle(interval) {
  const total = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES;
  const start = Math.max(WORKDAY_START_MINUTES, Math.min(interval.start, WORKDAY_END_MINUTES));
  const end = Math.max(WORKDAY_START_MINUTES, Math.min(interval.end, WORKDAY_END_MINUTES));
  const left = ((start - WORKDAY_START_MINUTES) / total) * 100;
  const width = Math.max(0, ((end - start) / total) * 100);
  return {
    left: `${left}%`,
    width: `${width}%`,
  };
}

function mergeBusyIntervals(intervals) {
  if (!intervals.length) {
    return [];
  }
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged = [sorted[0]];
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const tail = merged[merged.length - 1];
    if (current.start <= tail.end) {
      tail.end = Math.max(tail.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function computeTeamDayAvailability({
  teamId,
  reportId,
  dateKey,
  reportResponseTeams,
}) {
  if (!teamId || !dateKey) {
    return {
      busyIntervals: [],
      freeIntervals: [{ start: WORKDAY_START_MINUTES, end: WORKDAY_END_MINUTES }],
      isBlockedDay: false,
    };
  }

  const busyIntervals = [];
  for (const row of reportResponseTeams || []) {
    if (Number(row.team_id) !== Number(teamId)) {
      continue;
    }
    if (Number(row.report_id) === Number(reportId)) {
      continue;
    }
    if (!row.scheduled_start || !row.scheduled_end) {
      continue;
    }
    if (getDateKeyInManila(row.scheduled_start) !== dateKey) {
      continue;
    }

    const startMinutes = getMinutesFromMidnightInManila(row.scheduled_start);
    const endMinutes = getMinutesFromMidnightInManila(row.scheduled_end);
    if (startMinutes === null || endMinutes === null) {
      continue;
    }

    const clampedStart = Math.max(startMinutes, WORKDAY_START_MINUTES);
    const clampedEnd = Math.min(endMinutes, WORKDAY_END_MINUTES);
    if (clampedEnd <= clampedStart) {
      continue;
    }

    busyIntervals.push({ start: clampedStart, end: clampedEnd });
  }

  const mergedBusy = mergeBusyIntervals(busyIntervals);
  const freeIntervals = [];
  let cursor = WORKDAY_START_MINUTES;
  for (const busy of mergedBusy) {
    if (busy.start > cursor) {
      freeIntervals.push({ start: cursor, end: busy.start });
    }
    cursor = Math.max(cursor, busy.end);
  }
  if (cursor < WORKDAY_END_MINUTES) {
    freeIntervals.push({ start: cursor, end: WORKDAY_END_MINUTES });
  }

  return {
    busyIntervals: mergedBusy,
    freeIntervals,
    isBlockedDay: freeIntervals.length === 0,
  };
}

function isScheduleInsideIntervals(startIso, endIso, intervals) {
  if (!startIso || !endIso) {
    return false;
  }
  const startMinutes = getMinutesFromMidnightInManila(startIso);
  const endMinutes = getMinutesFromMidnightInManila(endIso);
  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  return intervals.some((interval) => startMinutes >= interval.start && endMinutes <= interval.end);
}

function buildScheduleDraftFromSource(source) {
  const estimatedMinutes =
    source?.estimated_minutes === null || source?.estimated_minutes === undefined
      ? ''
      : String(source.estimated_minutes);

  if (!source?.scheduled_start) {
    return {
      scheduled_start: '',
      scheduled_end: '',
      schedule_date_key: getTodayDateKeyInManila(),
      estimated_minutes: estimatedMinutes,
      ai_estimate_notes: source?.ai_estimate_notes || '',
      ai_estimate_source: '',
      ai_reestimate_recommended: false,
    };
  }

  const alignedStart = alignDateToWorkdaySlot(source.scheduled_start);
  if (!alignedStart) {
    return {
      scheduled_start: '',
      scheduled_end: '',
      schedule_date_key: getTodayDateKeyInManila(),
      estimated_minutes: estimatedMinutes,
      ai_estimate_notes: source?.ai_estimate_notes || '',
      ai_estimate_source: '',
      ai_reestimate_recommended: false,
    };
  }

  let resolvedEndDate = null;
  if (source.scheduled_end) {
    const rawEndDate = new Date(source.scheduled_end);
    if (
      !Number.isNaN(rawEndDate.getTime()) &&
      validateWorkdayScheduleWindow(alignedStart.toISOString(), rawEndDate.toISOString()) === ''
    ) {
      resolvedEndDate = rawEndDate;
    }
  }

  if (!resolvedEndDate) {
    resolvedEndDate = buildScheduleWindow(alignedStart, Number(source?.estimated_minutes || 0)).endDate;
  }

  return {
    scheduled_start: toDateTimeLocal(alignedStart.toISOString()),
    scheduled_end: toDateTimeLocal(resolvedEndDate.toISOString()),
    schedule_date_key: getDateKeyInManila(alignedStart),
    estimated_minutes: estimatedMinutes,
    ai_estimate_notes: source?.ai_estimate_notes || '',
    ai_estimate_source: '',
    ai_reestimate_recommended: false,
  };
}

function getTeamScheduleSource(report, responseRows, teamId) {
  const teamIdNumber = teamId ? Number(teamId) : null;
  if (!teamIdNumber) {
    return {
      scheduled_start: report.scheduled_start,
      scheduled_end: report.scheduled_end,
      estimated_minutes: report.estimated_minutes,
      ai_estimate_notes: report.ai_estimate_notes,
    };
  }

  const teamRow = (responseRows || []).find((row) => Number(row.team_id) === teamIdNumber);
  if (!teamRow) {
    return {
      scheduled_start: report.scheduled_start,
      scheduled_end: report.scheduled_end,
      estimated_minutes: report.estimated_minutes,
      ai_estimate_notes: report.ai_estimate_notes,
    };
  }

  return {
    scheduled_start: teamRow.scheduled_start || report.scheduled_start || null,
    scheduled_end: teamRow.scheduled_end || report.scheduled_end || null,
    estimated_minutes:
      teamRow.estimated_minutes === null || teamRow.estimated_minutes === undefined
        ? report.estimated_minutes
        : teamRow.estimated_minutes,
    ai_estimate_notes: teamRow.ai_estimate_notes || report.ai_estimate_notes || '',
  };
}

function ManageReportsPage({ title, description, mode = 'reassign', teamScopeIds = null }) {
  const { systemData, refreshData } = useRoleData();
  const { users, userDetails, departments, teams, reports, reportDetails, reportResponseTeams = [] } = systemData;
  const [busyReportId, setBusyReportId] = useState(null);
  const [busyResponseId, setBusyResponseId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [draftAssignment, setDraftAssignment] = useState({});
  const [draftStatus, setDraftStatus] = useState({});
  const [draftSchedule, setDraftSchedule] = useState({});
  const [responseTeamDraft, setResponseTeamDraft] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);
  const [aiBusyReportId, setAiBusyReportId] = useState(null);
  const [aiErrorReportId, setAiErrorReportId] = useState(null);
  const scheduleDraftSourceRef = useRef('');

  const responseTeamsByReport = useMemo(() => {
    const map = new Map();
    for (const row of reportResponseTeams) {
      const reportIdKey = Number(row.report_id);
      if (!map.has(reportIdKey)) {
        map.set(reportIdKey, []);
      }
      map.get(reportIdKey).push(row);
    }
    return map;
  }, [reportResponseTeams]);

  const teamsById = useMemo(() => {
    const map = new Map();
    for (const team of teams) {
      map.set(Number(team.team_id), team);
    }
    return map;
  }, [teams]);

  const departmentsById = useMemo(() => {
    const map = new Map();
    for (const department of departments) {
      map.set(Number(department.department_id), department);
    }
    return map;
  }, [departments]);

  const list = useMemo(() => {
    const allReports = buildReportsViewModel({
      users,
      userDetails,
      departments,
      teams,
      reports,
      reportDetails,
    });
    const enrichedReports = allReports.map((report) => {
      const responseRows = responseTeamsByReport.get(Number(report.report_id)) || [];
      const scheduleSource = getTeamScheduleSource(report, responseRows, report.assigned_team_id);
      return {
        ...report,
        scheduled_start: scheduleSource.scheduled_start,
        scheduled_end: scheduleSource.scheduled_end,
        estimated_minutes: scheduleSource.estimated_minutes,
        ai_estimate_notes: scheduleSource.ai_estimate_notes,
      };
    });

    if (!teamScopeIds || !teamScopeIds.length) {
      return enrichedReports;
    }

    const scopedTeamIds = new Set(teamScopeIds.map((id) => Number(id)));
    return enrichedReports.filter((report) => scopedTeamIds.has(Number(report.assigned_team_id)));
  }, [departments, reportDetails, reports, responseTeamsByReport, teamScopeIds, teams, userDetails, users]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((report) => {
      if (statusFilter !== 'all' && report.workflow_status !== statusFilter) {
        return false;
      }
      if (severityFilter !== 'all' && (report.detail?.severity || 'Unknown') !== severityFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      const title = (report.detail?.title || `Report #${report.report_id}`).toLowerCase();
      const reporterName = formatPersonName(report.reporter?.details, report.reporter?.email || '').toLowerCase();
      const reporterEmail = (report.reporter?.email || '').toLowerCase();
      const departmentName = (report.department?.name || '').toLowerCase();
      const teamName = (report.team?.name || '').toLowerCase();
      return (
        title.includes(q) ||
        reporterName.includes(q) ||
        reporterEmail.includes(q) ||
        departmentName.includes(q) ||
        teamName.includes(q)
      );
    });
  }, [list, search, severityFilter, statusFilter]);

  const counts = useMemo(() => {
    const base = {
      all: list.length,
      [WORKFLOW_STATUS.PENDING]: 0,
      [WORKFLOW_STATUS.ASSIGNED]: 0,
      [WORKFLOW_STATUS.IN_PROGRESS]: 0,
      [WORKFLOW_STATUS.COMPLETED]: 0,
    };
    for (const report of list) {
      const status = report.workflow_status;
      if (status && base[status] !== undefined) {
        base[status] += 1;
      }
    }
    return base;
  }, [list]);

  const severityCounts = useMemo(() => {
    const base = { all: list.length, Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const report of list) {
      const severity = report.detail?.severity;
      if (severity && base[severity] !== undefined) {
        base[severity] += 1;
      }
    }
    return base;
  }, [list]);

  const editingReport = editingReportId
    ? list.find((entry) => entry.report_id === editingReportId)
    : null;

  // Initialize schedule draft when modal opens
  useEffect(() => {
    if (!editingReport) {
      return;
    }
    setDraftSchedule((previous) => {
      if (previous[editingReport.report_id]) {
        return previous;
      }

      const responseRows = responseTeamsByReport.get(Number(editingReport.report_id)) || [];
      const selectedTeamId = editingReport.assigned_team_id ? Number(editingReport.assigned_team_id) : null;
      const source = getTeamScheduleSource(editingReport, responseRows, selectedTeamId);

      return {
        ...previous,
        [editingReport.report_id]: buildScheduleDraftFromSource(source),
      };
    });
  }, [editingReport, responseTeamsByReport]);

  const handleAIEstimate = async (report) => {
    setAiBusyReportId(report.report_id);
    setAiErrorReportId(null);
    try {
      const result = await estimateRepairTime({
        title: report.detail?.title,
        description: report.detail?.description,
        category: report.detail?.category,
        severity: report.detail?.severity,
        location: formatLocation(report.detail),
      });

      setDraftSchedule((previous) => {
        const current = previous[report.report_id] || {};
        const startIso = current.scheduled_start ? fromDateTimeLocal(current.scheduled_start) : null;
        const { endDate, wasCapped } = startIso
          ? buildScheduleWindow(new Date(startIso), result.minutes)
          : { endDate: null, wasCapped: false };
        const next = {
          ...current,
          estimated_minutes: String(result.minutes),
          ai_estimate_notes: wasCapped
            ? `${result.notes} Schedule window auto-capped to fit 08:00-17:00.`
            : result.notes,
          ai_estimate_source: result.source || '',
          ai_reestimate_recommended: Boolean(result.reestimate_recommended),
        };
        if (startIso && endDate) {
          next.scheduled_end = toDateTimeLocal(endDate.toISOString());
        }

        return { ...previous, [report.report_id]: next };
      });
      setAiErrorReportId(
        result.source && result.source !== 'gemini'
          ? report.report_id
          : null
      );
    } catch (err) {
      setAiErrorReportId(report.report_id);
    } finally {
      setAiBusyReportId(null);
    }
  };

  const handleReassign = async (reportId) => {
    setBusyReportId(reportId);
    setError('');
    setMessage('');

    try {
      const draft = draftAssignment[reportId] || {};
      const currentReport = reports.find((entry) => entry.report_id === reportId) || {};
      const currentDetail = reportDetails.find((entry) => entry.report_id === reportId) || {};
      const currentStatus = normalizeWorkflowStatus(
        currentDetail.status,
        currentReport.assigned_team_id
      );

      const resolvedDepartmentId =
        draft.assigned_department_id !== undefined
          ? draft.assigned_department_id
          : currentReport.assigned_department_id ?? null;
      const resolvedTeamId =
        draft.assigned_team_id !== undefined
          ? draft.assigned_team_id
          : currentReport.assigned_team_id ?? null;

      const teamIdNumber = resolvedTeamId ? Number(resolvedTeamId) : null;
      const selectedTeam = teamIdNumber
        ? teams.find((team) => Number(team.team_id) === teamIdNumber) || null
        : null;
      const departmentIdNumber = resolvedDepartmentId
        ? Number(resolvedDepartmentId)
        : selectedTeam
          ? Number(selectedTeam.department_id)
          : null;
      const finalDepartmentId = departmentIdNumber ? String(departmentIdNumber) : null;

      if (!teamIdNumber) {
        throw new Error('Team assignment is required before saving.');
      }

      const teamMatchesDepartment =
        selectedTeam &&
        (departmentIdNumber === null || Number(selectedTeam.department_id) === departmentIdNumber);

      if (!teamMatchesDepartment) {
        throw new Error('Selected team does not belong to the selected department.');
      }

      const responseRows = responseTeamsByReport.get(Number(reportId)) || [];
      const reportForScheduleSource = list.find((entry) => Number(entry.report_id) === Number(reportId)) || currentReport;
      const scheduleSource = getTeamScheduleSource(reportForScheduleSource, responseRows, teamIdNumber);
      let schedule = draftSchedule[reportId] || buildScheduleDraftFromSource(scheduleSource);

      if (!schedule?.scheduled_start || !schedule?.scheduled_end) {
        throw new Error('Schedule is required before saving.');
      }
      const schedulePayload = {
        scheduled_start: fromDateTimeLocal(schedule.scheduled_start),
        scheduled_end: fromDateTimeLocal(schedule.scheduled_end),
        estimated_minutes: schedule.estimated_minutes,
        ai_estimate_notes: schedule.ai_estimate_notes,
      };
      const estimatedMinutesValue = Number(schedulePayload.estimated_minutes);
      if (!Number.isFinite(estimatedMinutesValue) || estimatedMinutesValue <= 0) {
        throw new Error('Please estimate repair minutes first before scheduling.');
      }
      const scheduleValidationError = validateWorkdayScheduleWindow(
        schedulePayload.scheduled_start,
        schedulePayload.scheduled_end
      );
      if (scheduleValidationError) {
        throw new Error(scheduleValidationError);
      }
      const scheduleStartMinutes = getMinutesFromMidnightInManila(schedulePayload.scheduled_start);
      const scheduleEndMinutes = getMinutesFromMidnightInManila(schedulePayload.scheduled_end);
      const scheduledDurationMinutes =
        scheduleStartMinutes !== null && scheduleEndMinutes !== null
          ? scheduleEndMinutes - scheduleStartMinutes
          : 0;
      if (scheduledDurationMinutes < roundedEstimatedMinutes) {
        throw new Error(
          `Scheduled window must fit the estimated duration (${formatMinutes(roundedEstimatedMinutes)}).`
        );
      }

      const scheduleDateKey = getDateKeyInManila(schedulePayload.scheduled_start);
      const availability = computeTeamDayAvailability({
        teamId: teamIdNumber,
        reportId,
        dateKey: scheduleDateKey,
        reportResponseTeams,
      });
      if (!isScheduleInsideIntervals(schedulePayload.scheduled_start, schedulePayload.scheduled_end, availability.freeIntervals)) {
        throw new Error('Selected team is not available in the chosen time window on this date.');
      }

      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      await upsertReportResponseTeamSchedule(reportId, teamIdNumber, schedulePayload, token);

      await updateReportAssignment(
        reportId,
        {
          assigned_department_id: finalDepartmentId,
          assigned_team_id: resolvedTeamId,
        },
        token
      );

      if (teamIdNumber) {
        const existingResponseRows = responseTeamsByReport.get(Number(reportId)) || [];
        const primaryAlreadyLinked = existingResponseRows.some(
          (row) => Number(row.team_id) === teamIdNumber
        );
        if (!primaryAlreadyLinked) {
          try {
            await addReportResponseTeam(reportId, teamIdNumber, token);
          } catch (insertError) {
            const duplicate = /duplicate|uniq|unique/i.test(insertError?.message || '');
            if (!duplicate) {
              throw insertError;
            }
          }
        }
      }

      const statusFromAssignment = teamIdNumber ? WORKFLOW_STATUS.ASSIGNED : WORKFLOW_STATUS.PENDING;
      if (
        (statusFromAssignment === WORKFLOW_STATUS.ASSIGNED && currentStatus === WORKFLOW_STATUS.PENDING) ||
        (statusFromAssignment === WORKFLOW_STATUS.PENDING && currentStatus === WORKFLOW_STATUS.ASSIGNED)
      ) {
        await updateReportStatus(reportId, statusFromAssignment, token);
      }

      await updateReportSchedule(
        reportId,
        schedulePayload,
        token
      );

      setDraftAssignment((previous) => {
        const next = { ...previous };
        delete next[reportId];
        return next;
      });
      setMessage('Assignment and schedule updated.');
      setEditingReportId(null);
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to reassign report.');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleAddResponseTeam = async (reportId) => {
    const draftTeamId = responseTeamDraft[reportId];
    if (!draftTeamId) {
      return;
    }

    setBusyReportId(reportId);
    setError('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      await addReportResponseTeam(reportId, draftTeamId, token);
      setResponseTeamDraft((previous) => ({ ...previous, [reportId]: '' }));
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to add responding team.');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleRemoveResponseTeam = async (responseTeamId) => {
    setBusyResponseId(responseTeamId);
    setError('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      await removeReportResponseTeam(responseTeamId, token);
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to remove responding team.');
    } finally {
      setBusyResponseId(null);
    }
  };

  const handleStatusSave = async (reportId) => {
    const nextStatus = draftStatus[reportId];
    if (!nextStatus) {
      return;
    }

    setBusyReportId(reportId);
    setError('');
    setMessage('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }
      await updateReportStatus(reportId, normalizeWorkflowStatus(nextStatus), token);
      setMessage('Status updated.');
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update report status.');
    } finally {
      setBusyReportId(null);
    }
  };

  const filterPills = [
    { value: 'all', label: 'All', count: counts.all },
    { value: WORKFLOW_STATUS.PENDING, label: 'Pending', count: counts[WORKFLOW_STATUS.PENDING] },
    { value: WORKFLOW_STATUS.ASSIGNED, label: 'Assigned', count: counts[WORKFLOW_STATUS.ASSIGNED] },
    {
      value: WORKFLOW_STATUS.IN_PROGRESS,
      label: 'In Progress',
      count: counts[WORKFLOW_STATUS.IN_PROGRESS],
    },
    { value: WORKFLOW_STATUS.COMPLETED, label: 'Completed', count: counts[WORKFLOW_STATUS.COMPLETED] },
  ];

  const severityPills = [
    { value: 'all', label: 'All', count: severityCounts.all, dot: 'bg-slate-400' },
    { value: 'Critical', label: 'Critical', count: severityCounts.Critical, dot: 'bg-rose-500' },
    { value: 'High', label: 'High', count: severityCounts.High, dot: 'bg-red-500' },
    { value: 'Medium', label: 'Medium', count: severityCounts.Medium, dot: 'bg-amber-500' },
    { value: 'Low', label: 'Low', count: severityCounts.Low, dot: 'bg-emerald-500' },
  ];

  // Build editing-modal helpers
  const editDraft = editingReport ? draftAssignment[editingReport.report_id] || {} : {};
  const editSelectedDepartmentRaw =
    editingReport &&
    (editDraft.assigned_department_id !== undefined
      ? editDraft.assigned_department_id
      : editingReport.assigned_department_id);
  const editSelectedDepartmentId = editSelectedDepartmentRaw ? Number(editSelectedDepartmentRaw) : null;
  const editTeamsForDepartment = editSelectedDepartmentId
    ? teams.filter((team) => Number(team.department_id) === editSelectedDepartmentId)
    : teams;
  const editSelectedTeamRaw =
    editingReport &&
    (editDraft.assigned_team_id !== undefined
      ? editDraft.assigned_team_id
      : editingReport.assigned_team_id);
  const editSelectedTeamId = editSelectedTeamRaw ? Number(editSelectedTeamRaw) : null;
  const editTeamBelongsToDepartment =
    editSelectedTeamId !== null &&
    (!editSelectedDepartmentId ||
      editTeamsForDepartment.some((team) => Number(team.team_id) === editSelectedTeamId));
  const editTeamSelectValue = editTeamBelongsToDepartment
    ? String(editSelectedTeamId)
    : editSelectedTeamId
      ? String(editSelectedTeamId)
      : '';

  const editResponseRows = useMemo(() => {
    if (!editingReport) {
      return [];
    }
    return responseTeamsByReport.get(Number(editingReport.report_id)) || [];
  }, [editingReport, responseTeamsByReport]);

  const editAvailableTeams = useMemo(() => {
    const usedTeamIds = new Set(editResponseRows.map((row) => Number(row.team_id)));
    if (editSelectedTeamId !== null) {
      usedTeamIds.add(editSelectedTeamId);
    }
    return teams.filter((team) => !usedTeamIds.has(Number(team.team_id)));
  }, [editResponseRows, editSelectedTeamId, teams]);
  const editResponseDraft = editingReport ? responseTeamDraft[editingReport.report_id] || '' : '';

  const scheduleDraft = editingReport ? draftSchedule[editingReport.report_id] || {} : {};
  const scheduleEstimateFromAi = scheduleDraft.ai_estimate_source === 'gemini';
  const scheduleNeedsReestimate = Boolean(scheduleDraft.ai_reestimate_recommended);
  const estimatedMinutesNumber = Number(scheduleDraft.estimated_minutes || 0);
  const hasEstimatedMinutes = Number.isFinite(estimatedMinutesNumber) && estimatedMinutesNumber > 0;
  const roundedEstimatedMinutes = hasEstimatedMinutes
    ? Math.max(
        SCHEDULE_STEP_MINUTES,
        Math.min(
          WORKDAY_DURATION_MINUTES,
          Math.ceil(estimatedMinutesNumber / SCHEDULE_STEP_MINUTES) * SCHEDULE_STEP_MINUTES
        )
      )
    : 0;
  const scheduleRequiresEstimate = !hasEstimatedMinutes;
  const scheduleInputLocked = scheduleRequiresEstimate || !editSelectedTeamId;
  const scheduleReferenceDateKey =
    scheduleDraft.schedule_date_key ||
    String(scheduleDraft.scheduled_start || scheduleDraft.scheduled_end || '').slice(0, 10) ||
    getTodayDateKeyInManila();
  const scheduleDraftStartMin = scheduleReferenceDateKey ? `${scheduleReferenceDateKey}T08:00` : '';
  const scheduleDraftStartMax = scheduleReferenceDateKey ? `${scheduleReferenceDateKey}T16:45` : '';
  const scheduleDraftEndMin = scheduleReferenceDateKey ? `${scheduleReferenceDateKey}T08:15` : '';
  const scheduleDraftEndMax = scheduleReferenceDateKey ? `${scheduleReferenceDateKey}T17:00` : '';

  const teamDayAvailability = useMemo(() => {
    if (!editingReport || !editSelectedTeamId || !scheduleReferenceDateKey || !hasEstimatedMinutes) {
      return {
        busyIntervals: [],
        freeIntervals: [{ start: WORKDAY_START_MINUTES, end: WORKDAY_END_MINUTES }],
        isBlockedDay: false,
      };
    }
    return computeTeamDayAvailability({
      teamId: editSelectedTeamId,
      reportId: editingReport.report_id,
      dateKey: scheduleReferenceDateKey,
      reportResponseTeams,
    });
  }, [editSelectedTeamId, editingReport, hasEstimatedMinutes, reportResponseTeams, scheduleReferenceDateKey]);

  const selectedDraftInterval = useMemo(() => {
    if (!scheduleDraft.scheduled_start || !scheduleDraft.scheduled_end) {
      return null;
    }
    const startIso = fromDateTimeLocal(scheduleDraft.scheduled_start);
    const endIso = fromDateTimeLocal(scheduleDraft.scheduled_end);
    if (!startIso || !endIso) {
      return null;
    }
    if (getDateKeyInManila(startIso) !== scheduleReferenceDateKey) {
      return null;
    }
    const startMinutes = getMinutesFromMidnightInManila(startIso);
    const endMinutes = getMinutesFromMidnightInManila(endIso);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return null;
    }
    return { start: startMinutes, end: endMinutes };
  }, [scheduleDraft.scheduled_end, scheduleDraft.scheduled_start, scheduleReferenceDateKey]);
  const fittingFreeIntervals = useMemo(() => {
    if (!hasEstimatedMinutes) {
      return [];
    }
    return teamDayAvailability.freeIntervals.filter(
      (interval) => interval.end - interval.start >= roundedEstimatedMinutes
    );
  }, [hasEstimatedMinutes, roundedEstimatedMinutes, teamDayAvailability]);
  const hasFittingWindow = fittingFreeIntervals.length > 0;

  useEffect(() => {
    if (!editingReport) {
      scheduleDraftSourceRef.current = '';
      return;
    }

    const sourceKey = `${editingReport.report_id}:${editSelectedTeamId || 'none'}`;
    if (scheduleDraftSourceRef.current === sourceKey) {
      return;
    }

    const source = getTeamScheduleSource(editingReport, editResponseRows, editSelectedTeamId);
    const nextDraft = buildScheduleDraftFromSource(source);
    if (!nextDraft.schedule_date_key) {
      nextDraft.schedule_date_key =
        String(nextDraft.scheduled_start || nextDraft.scheduled_end || '').slice(0, 10) ||
        getTodayDateKeyInManila();
    }
    setDraftSchedule((previous) => ({
      ...previous,
      [editingReport.report_id]: nextDraft,
    }));
    scheduleDraftSourceRef.current = sourceKey;
  }, [editResponseRows, editSelectedTeamId, editingReport]);

  const updateScheduleField = (reportId, field, value) => {
    setDraftSchedule((previous) => {
      const current = previous[reportId] || {};
      const next = { ...current };

      if (field === 'scheduled_start') {
        const alignedStart = alignDateToWorkdaySlot(value);
        next.scheduled_start = alignedStart ? toDateTimeLocal(alignedStart.toISOString()) : '';
        next.schedule_date_key = next.scheduled_start
          ? String(next.scheduled_start).slice(0, 10)
          : next.schedule_date_key || '';
        if (next.scheduled_start) {
          const startIso = fromDateTimeLocal(next.scheduled_start);
          const { endDate } = buildScheduleWindow(
            startIso ? new Date(startIso) : null,
            Number(next.estimated_minutes || 0)
          );
          next.scheduled_end = endDate ? toDateTimeLocal(endDate.toISOString()) : '';
        } else {
          next.scheduled_end = '';
        }
      } else if (field === 'scheduled_end') {
        if (next.scheduled_start) {
          const alignedEnd = alignEndTimeForStart(next.scheduled_start, value);
          next.scheduled_end = alignedEnd ? toDateTimeLocal(alignedEnd.toISOString()) : '';
        } else {
          const alignedEnd = alignDateToWorkdaySlot(value);
          next.scheduled_end = alignedEnd ? toDateTimeLocal(alignedEnd.toISOString()) : '';
        }
        if (!next.schedule_date_key) {
          next.schedule_date_key = String(next.scheduled_end || '').slice(0, 10);
        }
      } else if (field === 'schedule_date_key') {
        next.schedule_date_key = value;
        if (value && next.scheduled_start) {
          const startTime = String(next.scheduled_start).slice(11, 16) || '08:00';
          const alignedStart = alignDateToWorkdaySlot(`${value}T${startTime}`);
          next.scheduled_start = alignedStart ? toDateTimeLocal(alignedStart.toISOString()) : '';
          if (next.scheduled_start) {
            const startIso = fromDateTimeLocal(next.scheduled_start);
            const { endDate } = buildScheduleWindow(
              startIso ? new Date(startIso) : null,
              Number(next.estimated_minutes || 0)
            );
            next.scheduled_end = endDate ? toDateTimeLocal(endDate.toISOString()) : '';
          } else {
            next.scheduled_end = '';
          }
        } else if (value && next.scheduled_end) {
          const endTime = String(next.scheduled_end).slice(11, 16) || '09:00';
          const alignedEnd = alignDateToWorkdaySlot(`${value}T${endTime}`);
          next.scheduled_end = alignedEnd ? toDateTimeLocal(alignedEnd.toISOString()) : '';
        }
      } else if (field === 'estimated_minutes') {
        next.estimated_minutes = value;
        if (next.scheduled_start) {
          const startIso = fromDateTimeLocal(next.scheduled_start);
          const { endDate } = buildScheduleWindow(
            startIso ? new Date(startIso) : null,
            Number(value || 0)
          );
          next.scheduled_end = endDate ? toDateTimeLocal(endDate.toISOString()) : '';
        }
      } else {
        next[field] = value;
      }

      return { ...previous, [reportId]: next };
    });
  };

  const applyFirstAvailableWindow = (reportId) => {
    if (!teamDayAvailability.freeIntervals.length || !scheduleReferenceDateKey || !hasEstimatedMinutes) {
      return;
    }

    const firstWindow = fittingFreeIntervals[0] || teamDayAvailability.freeIntervals[0];
    if (!firstWindow) {
      return;
    }

    const startMinutes = firstWindow.start;
    const maxEndMinutes = firstWindow.end;
    if (maxEndMinutes - startMinutes < SCHEDULE_STEP_MINUTES) {
      return;
    }

    const desiredEndMinutes = Math.min(maxEndMinutes, startMinutes + roundedEstimatedMinutes);
    const endMinutes = Math.max(startMinutes + SCHEDULE_STEP_MINUTES, desiredEndMinutes);

    setDraftSchedule((previous) => ({
      ...previous,
      [reportId]: {
        ...(previous[reportId] || {}),
        schedule_date_key: scheduleReferenceDateKey,
        scheduled_start: buildDateTimeLocalFromDateKey(scheduleReferenceDateKey, startMinutes),
        scheduled_end: buildDateTimeLocalFromDateKey(scheduleReferenceDateKey, endMinutes),
      },
    }));
  };

  return (
    <section>
      <PageHeader title={title} description={description} />

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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-primary-container">
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, reporter, team, department..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <p className="text-xs text-on-primary-container">
          Showing <span className="font-semibold text-on-surface">{filteredList.length}</span> of {list.length}
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
          Status
        </span>
        {filterPills.map((pill) => {
          const active = statusFilter === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setStatusFilter(pill.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 bg-white text-on-primary-container hover:border-slate-300 hover:text-primary'
              }`}
            >
              {pill.label}
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-on-primary-container'
                }`}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
          Severity
        </span>
        {severityPills.map((pill) => {
          const active = severityFilter === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setSeverityFilter(pill.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 bg-white text-on-primary-container hover:border-slate-300 hover:text-primary'
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${pill.dot}`} />
              {pill.label}
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-on-primary-container'
                }`}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-primary-container">inbox</span>
          <p className="mt-2 text-sm font-semibold text-on-surface">No reports found</p>
          <p className="text-xs text-on-primary-container">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredList.map((report) => {
            const isExpanded = expandedReportId === report.report_id;
            const responseRows = responseTeamsByReport.get(Number(report.report_id)) || [];
            const reporterName = formatPersonName(
              report.reporter?.details,
              report.reporter?.email || 'Unknown reporter'
            );
            const locationLabel = formatLocation(report.detail);
            const imageSrc = (report.detail?.image_path || '').trim();

            return (
              <article
                key={report.report_id}
                className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-soft transition ${
                  isExpanded
                    ? 'border-primary md:col-span-2 xl:col-span-3'
                    : 'border-slate-200 hover:shadow-panel'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedReportId((current) => (current === report.report_id ? null : report.report_id))
                  }
                  className="group relative block w-full text-left"
                >
                  <div
                    className={`relative w-full overflow-hidden bg-slate-100 ${
                      isExpanded ? 'h-56 lg:h-64' : 'h-44'
                    }`}
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={report.detail?.title || `Report #${report.report_id}`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-on-primary-container">
                        <span className="material-symbols-outlined text-4xl">image</span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide">No image</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4">
                      <p className="line-clamp-2 text-base font-bold text-white drop-shadow">
                        {report.detail?.title || `Report #${report.report_id}`}
                      </p>
                      {locationLabel ? (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/90">
                          <span className="material-symbols-outlined text-[14px]">place</span>
                          {locationLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
                      <StatusBadge
                        status={report.detail?.status}
                        assignedTeamId={report.assigned_team_id}
                        onImage
                      />
                      <SeverityBadge severity={report.detail?.severity} onImage />
                    </div>
                  </div>
                </button>

                <div className="flex flex-1 flex-col p-4">
                  {!isExpanded ? (
                    <>
                      <p className="line-clamp-2 text-xs text-on-primary-container">
                        {report.detail?.description || 'No description.'}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-on-primary-container">Reporter</p>
                          <p className="truncate font-medium text-on-surface">{reporterName}</p>
                        </div>
                        <div>
                          <p className="text-on-primary-container">Team</p>
                          <p className="truncate font-medium text-on-surface">
                            {report.team?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-on-primary-container">Department</p>
                          <p className="truncate font-medium text-on-surface">
                            {report.department?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-on-primary-container">Scheduled</p>
                          <p className="truncate font-medium text-on-surface">
                            {report.scheduled_start ? formatDateTime(report.scheduled_start) : 'Not scheduled'}
                          </p>
                        </div>
                      </div>

                      {report.estimated_minutes ? (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-1.5 text-xs">
                          <span className="material-symbols-outlined text-[14px] text-secondary">schedule</span>
                          <span className="font-semibold text-secondary">
                            Est. {formatMinutes(report.estimated_minutes)}
                          </span>
                          <span className="truncate text-on-primary-container">
                            {report.ai_estimate_notes || ''}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="space-y-4">
                      {/* Meta strip */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs md:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-primary-container">
                            Reporter
                          </p>
                          <p className="mt-0.5 truncate font-semibold text-on-surface">{reporterName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-primary-container">
                            Department
                          </p>
                          <p className="mt-0.5 truncate font-semibold text-on-surface">
                            {report.department?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-primary-container">
                            Team
                          </p>
                          <p className="mt-0.5 truncate font-semibold text-on-surface">
                            {report.team?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-on-primary-container">
                            Created
                          </p>
                          <p className="mt-0.5 truncate font-semibold text-on-surface">
                            {formatDate(report.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Two-column body */}
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                        <div className="space-y-4 lg:col-span-3">
                          <div>
                            <h5 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
                              <span className="material-symbols-outlined text-[14px]">description</span>
                              Description
                            </h5>
                            <p className="text-sm leading-relaxed text-on-surface">
                              {report.detail?.description || 'No description provided.'}
                            </p>
                          </div>

                          <div>
                            <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              Schedule
                            </h5>
                            <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-xs">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-on-primary-container">
                                  Start
                                </p>
                                <p className="font-semibold text-on-surface">
                                  {report.scheduled_start ? formatDateTime(report.scheduled_start) : 'Not set'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-on-primary-container">
                                  End
                                </p>
                                <p className="font-semibold text-on-surface">
                                  {report.scheduled_end ? formatDateTime(report.scheduled_end) : 'Not set'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-on-primary-container">
                                  Est. duration
                                </p>
                                <p className="font-semibold text-on-surface">
                                  {report.estimated_minutes ? formatMinutes(report.estimated_minutes) : '-'}
                                </p>
                              </div>
                            </div>
                            {report.ai_estimate_notes ? (
                              <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[11px]">
                                <span className="material-symbols-outlined mt-0.5 text-[14px] text-secondary">
                                  auto_awesome
                                </span>
                                <p className="text-on-primary-container">{report.ai_estimate_notes}</p>
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
                              <span className="material-symbols-outlined text-[14px]">info</span>
                              Details
                            </h5>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              <div>
                                <dt className="text-on-primary-container">Category</dt>
                                <dd className="font-medium text-on-surface">{report.detail?.category || '-'}</dd>
                              </div>
                              <div>
                                <dt className="text-on-primary-container">Severity</dt>
                                <dd>
                                  <SeverityBadge severity={report.detail?.severity} />
                                </dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-on-primary-container">Reporter email</dt>
                                <dd className="truncate font-medium text-on-surface">
                                  {report.reporter?.email || '-'}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {responseRows.length ? (
                            <div>
                              <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
                                <span className="material-symbols-outlined text-[14px]">groups</span>
                                Responding Teams ({responseRows.length})
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {responseRows.map((row) => {
                                  const team = teamsById.get(Number(row.team_id));
                                  const dep = team ? departmentsById.get(Number(team.department_id)) : null;
                                  return (
                                    <span
                                      key={row.response_team_id}
                                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-on-surface"
                                    >
                                      {team?.name || `Team #${row.team_id}`}
                                      {dep ? ` - ${dep.name}` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="lg:col-span-2">
                          <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
                            <span className="material-symbols-outlined text-[14px]">map</span>
                            Location
                          </h5>
                          <ReportLocationMap
                            latitude={report.detail?.latitude}
                            longitude={report.detail?.longitude}
                            locationLabel={locationLabel}
                            height={300}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReportId((current) =>
                          current === report.report_id ? null : report.report_id
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                      {isExpanded ? 'Collapse' : 'View details'}
                    </button>
                    {mode === 'reassign' ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingReportId(report.report_id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                        Reassign & Schedule
                      </button>
                    ) : mode === 'review' ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                          value={draftStatus[report.report_id] ?? report.workflow_status}
                          onChange={(event) =>
                            setDraftStatus((previous) => ({
                              ...previous,
                              [report.report_id]: event.target.value,
                            }))
                          }
                          onClick={(event) => event.stopPropagation()}
                        >
                          {WORKFLOW_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {WORKFLOW_STATUS_LABELS[option]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busyReportId === report.report_id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStatusSave(report.report_id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-container disabled:opacity-60"
                        >
                          {busyReportId === report.report_id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-on-primary-container">View only</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reassign + Schedule Modal */}
      <Modal
        open={Boolean(editingReport) && mode === 'reassign'}
        onClose={() => setEditingReportId(null)}
        title={
          editingReport
            ? editingReport.detail?.title || `Report #${editingReport.report_id}`
            : 'Reassign Report'
        }
        description="Reassign the team, schedule the work, and let AI estimate the repair time."
        size="lg"
      >
        {editingReport ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-slate-50/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <p className="text-on-primary-container">Reporter</p>
                  <p className="font-semibold text-on-surface">
                    {formatPersonName(editingReport.reporter?.details, editingReport.reporter?.email || 'Unknown')}
                  </p>
                </div>
                <div>
                  <p className="text-on-primary-container">Status</p>
                  <StatusBadge
                    status={editingReport.detail?.status}
                    assignedTeamId={editingReport.assigned_team_id}
                  />
                </div>
                <div>
                  <p className="text-on-primary-container">Severity</p>
                  <SeverityBadge severity={editingReport.detail?.severity} />
                </div>
                <div>
                  <p className="text-on-primary-container">Created</p>
                  <p className="font-semibold text-on-surface">{formatDate(editingReport.created_at)}</p>
                </div>
              </div>
              {editingReport.detail?.description ? (
                <p className="mt-2 text-xs text-on-surface">{editingReport.detail.description}</p>
              ) : null}
            </div>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                Primary Assignment
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Department</label>
                  <select
                    className={inputClass}
                    value={editSelectedDepartmentId ? String(editSelectedDepartmentId) : ''}
                    onChange={(event) => {
                      const nextDepartmentRaw = event.target.value || null;
                      const nextDepartmentId = nextDepartmentRaw ? Number(nextDepartmentRaw) : null;
                      const keepTeam =
                        editSelectedTeamId !== null &&
                        nextDepartmentId !== null &&
                        teams.some(
                          (team) =>
                            Number(team.team_id) === editSelectedTeamId &&
                            Number(team.department_id) === nextDepartmentId
                        );
                      setDraftAssignment((previous) => ({
                        ...previous,
                        [editingReport.report_id]: {
                          ...previous[editingReport.report_id],
                          assigned_department_id: nextDepartmentRaw,
                          assigned_team_id: keepTeam
                            ? previous[editingReport.report_id]?.assigned_team_id ??
                              editingReport.assigned_team_id ??
                              null
                            : null,
                        },
                      }));
                    }}
                  >
                    <option value="">Unassigned</option>
                    {departments.map((department) => (
                      <option key={department.department_id} value={department.department_id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Team</label>
                  <select
                    className={inputClass}
                    value={editTeamSelectValue}
                    onChange={(event) => {
                      const nextTeamRaw = event.target.value || null;
                      const nextTeamId = nextTeamRaw ? Number(nextTeamRaw) : null;
                      const nextTeam = nextTeamId
                        ? teams.find((team) => Number(team.team_id) === nextTeamId) || null
                        : null;
                      setDraftAssignment((previous) => ({
                        ...previous,
                        [editingReport.report_id]: {
                          ...previous[editingReport.report_id],
                          assigned_team_id: nextTeamRaw,
                          assigned_department_id: nextTeam
                            ? String(nextTeam.department_id)
                            : previous[editingReport.report_id]?.assigned_department_id ??
                              editingReport.assigned_department_id ??
                              null,
                        },
                      }));
                    }}
                  >
                    <option value="">
                      {editTeamsForDepartment.length ? 'Select team' : 'No teams available'}
                    </option>
                    {editTeamsForDepartment.map((team) => (
                      <option key={team.team_id} value={team.team_id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                  Schedule & AI Estimate
                </h4>
                <button
                  type="button"
                  onClick={() => handleAIEstimate(editingReport)}
                  disabled={aiBusyReportId === editingReport.report_id}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-blue-100 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {aiBusyReportId === editingReport.report_id ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  {aiBusyReportId === editingReport.report_id
                    ? 'Estimating...'
                    : scheduleNeedsReestimate
                      ? 'Re-estimate with AI'
                      : 'Estimate with AI'}
                </button>
              </div>
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                  <div>
                    <label className={labelClass}>Schedule Date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={scheduleReferenceDateKey}
                      disabled={scheduleRequiresEstimate}
                      onChange={(event) =>
                        updateScheduleField(editingReport.report_id, 'schedule_date_key', event.target.value)
                      }
                    />
                  </div>
                  <div className="text-xs">
                    {scheduleRequiresEstimate ? (
                      <p className="font-semibold text-amber-700">
                        Estimate repair minutes first to unlock date, timeline, and free windows.
                      </p>
                    ) : !editSelectedTeamId ? (
                      <p className="text-on-primary-container">Select a team to view available schedule windows.</p>
                    ) : teamDayAvailability.isBlockedDay ? (
                      <div>
                        <p className="font-semibold text-rose-700">No free window on this date for this team.</p>
                        {teamDayAvailability.busyIntervals.length ? (
                          <p className="mt-1 text-rose-700">
                            Occupied: {teamDayAvailability.busyIntervals.map((interval) => formatIntervalLabel(interval)).join(', ')}
                          </p>
                        ) : null}
                      </div>
                    ) : !hasFittingWindow ? (
                      <div>
                        <p className="font-semibold text-rose-700">
                          No free window fits the estimated {formatMinutes(roundedEstimatedMinutes)}.
                        </p>
                        <p className="mt-1 text-on-primary-container">
                          Available: {teamDayAvailability.freeIntervals.map((interval) => formatIntervalLabel(interval)).join(', ')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-emerald-700">
                          Available: {fittingFreeIntervals.map((interval) => formatIntervalLabel(interval)).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="md:justify-self-end">
                    <button
                      type="button"
                      onClick={() => applyFirstAvailableWindow(editingReport.report_id)}
                      disabled={scheduleInputLocked || teamDayAvailability.isBlockedDay || !hasFittingWindow}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-on-surface transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Use First Free Slot
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-on-primary-container">
                    <span>Team Timeline (08:00 - 17:00)</span>
                    {editSelectedTeamId ? <span>{scheduleReferenceDateKey}</span> : null}
                  </div>
                  {scheduleRequiresEstimate ? (
                    <p className="text-xs text-on-primary-container">
                      Timeline is hidden until estimate minutes are set.
                    </p>
                  ) : !editSelectedTeamId ? (
                    <p className="text-xs text-on-primary-container">Select a team to render the schedule timeline.</p>
                  ) : (
                    <>
                      <div className="relative h-12 overflow-hidden rounded-md border border-slate-200 bg-emerald-50/60">
                        {WORKDAY_TIMELINE_TICKS.map((tick) => {
                          const left = ((tick - WORKDAY_START_MINUTES) / WORKDAY_DURATION_MINUTES) * 100;
                          return (
                            <span
                              key={`tick-${tick}`}
                              className="absolute inset-y-0 w-px bg-slate-200"
                              style={{ left: `${left}%` }}
                            />
                          );
                        })}
                        {teamDayAvailability.freeIntervals.map((interval, index) => (
                          <span
                            key={`free-${index}`}
                            className="absolute inset-y-1 rounded bg-emerald-200/80"
                            style={getIntervalStyle(interval)}
                          />
                        ))}
                        {teamDayAvailability.busyIntervals.map((interval, index) => (
                          <span
                            key={`busy-${index}`}
                            className="absolute inset-y-1 rounded bg-rose-300/90"
                            style={getIntervalStyle(interval)}
                          />
                        ))}
                        {selectedDraftInterval ? (
                          <span
                            className="absolute inset-y-0.5 rounded border border-secondary bg-secondary/35 shadow-sm"
                            style={getIntervalStyle(selectedDraftInterval)}
                          />
                        ) : null}
                      </div>
                      <div className="mt-2 grid grid-cols-10 gap-1 text-[10px] text-on-primary-container">
                        {WORKDAY_TIMELINE_TICKS.map((tick) => (
                          <span key={`label-${tick}`} className="text-center">
                            {formatMinuteLabel(tick)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-on-primary-container">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-emerald-300" />
                          Free
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-rose-300" />
                          Occupied
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm border border-secondary bg-secondary/35" />
                          Draft Selection
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Scheduled Start</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    disabled={scheduleInputLocked}
                    min={scheduleDraftStartMin || undefined}
                    max={scheduleDraftStartMax || undefined}
                    step="900"
                    value={scheduleDraft.scheduled_start || ''}
                    onChange={(event) =>
                      updateScheduleField(editingReport.report_id, 'scheduled_start', event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Scheduled End</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    disabled={scheduleInputLocked}
                    min={scheduleDraftEndMin || undefined}
                    max={scheduleDraftEndMax || undefined}
                    step="900"
                    value={scheduleDraft.scheduled_end || ''}
                    onChange={(event) =>
                      updateScheduleField(editingReport.report_id, 'scheduled_end', event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Est. Minutes</label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    className={inputClass}
                    value={scheduleDraft.estimated_minutes || ''}
                    onChange={(event) =>
                      updateScheduleField(editingReport.report_id, 'estimated_minutes', event.target.value)
                    }
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-on-primary-container">
                Estimate first, then select a team and date. Schedule must fit available windows between 08:00 and 17:00.
              </p>
              {scheduleDraft.ai_estimate_notes ? (
                <div className="mt-3 flex gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <span className="material-symbols-outlined text-[16px] text-secondary">auto_awesome</span>
                  <div className="text-xs">
                    <p className="font-semibold text-secondary">
                      {scheduleEstimateFromAi
                        ? `AI suggests ${formatMinutes(scheduleDraft.estimated_minutes)}`
                        : `Local estimate ${formatMinutes(scheduleDraft.estimated_minutes)}`}
                    </p>
                    <p className="text-on-primary-container">{scheduleDraft.ai_estimate_notes}</p>
                  </div>
                </div>
              ) : null}
              {!isGeminiConfigured() ? (
                <p className="mt-2 text-[11px] text-on-primary-container">
                  Gemini key not configured. Using a local heuristic. Set REACT_APP_GEMINI_API_KEY in your .env.
                </p>
              ) : null}
              {aiErrorReportId === editingReport.report_id ? (
                <p className="mt-2 text-[11px] text-rose-600">
                  AI estimate fallback is active. Use "Re-estimate with AI" to try again.
                </p>
              ) : null}
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                Responding Teams ({editResponseRows.length})
              </h4>
              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-3">
                {editResponseRows.length ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {editResponseRows.map((row) => {
                      const team = teamsById.get(Number(row.team_id));
                      const department = team ? departmentsById.get(Number(team.department_id)) : null;
                      const label = team
                        ? `${team.name}${department ? ` - ${department.name}` : ''}`
                        : `Team #${row.team_id}`;
                      return (
                        <span
                          key={row.response_team_id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-on-surface"
                        >
                          {label}
                          <button
                            type="button"
                            title="Remove"
                            disabled={busyResponseId === row.response_team_id}
                            onClick={() => handleRemoveResponseTeam(row.response_team_id)}
                            className="ml-1 rounded-full p-0.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-on-primary-container">No additional responding teams.</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={`${inputClass} flex-1 min-w-[200px]`}
                    value={editResponseDraft}
                    onChange={(event) =>
                      setResponseTeamDraft((previous) => ({
                        ...previous,
                        [editingReport.report_id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Add a team...</option>
                    {editAvailableTeams.map((team) => {
                      const department = departmentsById.get(Number(team.department_id));
                      return (
                        <option key={team.team_id} value={team.team_id}>
                          {team.name}
                          {department ? ` - ${department.name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    disabled={!editResponseDraft || busyReportId === editingReport.report_id}
                    onClick={() => handleAddResponseTeam(editingReport.report_id)}
                    className={primaryButtonClass}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-primary-container">
                Location
              </h4>
              <ReportLocationMap
                latitude={editingReport.detail?.latitude}
                longitude={editingReport.detail?.longitude}
                locationLabel={formatLocation(editingReport.detail)}
                height={220}
              />
            </section>
          </div>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setEditingReportId(null)} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            disabled={editingReport ? busyReportId === editingReport.report_id : false}
            onClick={() => editingReport && handleReassign(editingReport.report_id)}
            className={primaryButtonClass}
          >
            {editingReport && busyReportId === editingReport.report_id ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </Modal>
    </section>
  );
}

export default ManageReportsPage;
