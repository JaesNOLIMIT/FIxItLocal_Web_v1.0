export const WORKFLOW_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

const LEGACY_TO_WORKFLOW = new Map([
  ['open', WORKFLOW_STATUS.PENDING],
  ['new', WORKFLOW_STATUS.PENDING],
  ['pending', WORKFLOW_STATUS.PENDING],
  ['inreview', WORKFLOW_STATUS.PENDING],
  ['review', WORKFLOW_STATUS.PENDING],
  ['assigned', WORKFLOW_STATUS.ASSIGNED],
  ['queued', WORKFLOW_STATUS.ASSIGNED],
  ['scheduled', WORKFLOW_STATUS.ASSIGNED],
  ['inprogress', WORKFLOW_STATUS.IN_PROGRESS],
  ['ongoing', WORKFLOW_STATUS.IN_PROGRESS],
  ['working', WORKFLOW_STATUS.IN_PROGRESS],
  ['completed', WORKFLOW_STATUS.COMPLETED],
  ['resolved', WORKFLOW_STATUS.COMPLETED],
  ['closed', WORKFLOW_STATUS.COMPLETED],
  ['done', WORKFLOW_STATUS.COMPLETED],
]);

export const WORKFLOW_STATUS_OPTIONS = [
  WORKFLOW_STATUS.PENDING,
  WORKFLOW_STATUS.ASSIGNED,
  WORKFLOW_STATUS.IN_PROGRESS,
  WORKFLOW_STATUS.COMPLETED,
];

export const WORKFLOW_STATUS_LABELS = {
  [WORKFLOW_STATUS.PENDING]: 'Pending',
  [WORKFLOW_STATUS.ASSIGNED]: 'Assigned',
  [WORKFLOW_STATUS.IN_PROGRESS]: 'In Progress',
  [WORKFLOW_STATUS.COMPLETED]: 'Completed',
};

function normalizeStatusToken(status) {
  if (!status) {
    return '';
  }
  return String(status).toLowerCase().replace(/[\s-]/g, '_').replace(/_/g, '');
}

export function normalizeWorkflowStatus(status, assignedTeamId = null) {
  const normalized = normalizeStatusToken(status);
  const mapped = LEGACY_TO_WORKFLOW.get(normalized);
  if (mapped) {
    return mapped;
  }
  if (normalized === WORKFLOW_STATUS.PENDING.replace('_', '')) {
    return WORKFLOW_STATUS.PENDING;
  }
  if (normalized === WORKFLOW_STATUS.ASSIGNED.replace('_', '')) {
    return WORKFLOW_STATUS.ASSIGNED;
  }
  if (normalized === WORKFLOW_STATUS.IN_PROGRESS.replace('_', '')) {
    return WORKFLOW_STATUS.IN_PROGRESS;
  }
  if (normalized === WORKFLOW_STATUS.COMPLETED.replace('_', '')) {
    return WORKFLOW_STATUS.COMPLETED;
  }
  return assignedTeamId ? WORKFLOW_STATUS.ASSIGNED : WORKFLOW_STATUS.PENDING;
}

export function getWorkflowStatusLabel(status, assignedTeamId = null) {
  const normalized = normalizeWorkflowStatus(status, assignedTeamId);
  return WORKFLOW_STATUS_LABELS[normalized] || WORKFLOW_STATUS_LABELS[WORKFLOW_STATUS.PENDING];
}

export function isCompletedWorkflowStatus(status, assignedTeamId = null) {
  return normalizeWorkflowStatus(status, assignedTeamId) === WORKFLOW_STATUS.COMPLETED;
}

export function isActiveWorkflowStatus(status, assignedTeamId = null) {
  return normalizeWorkflowStatus(status, assignedTeamId) !== WORKFLOW_STATUS.COMPLETED;
}
