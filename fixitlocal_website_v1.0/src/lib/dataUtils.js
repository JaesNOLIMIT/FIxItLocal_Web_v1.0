import { getWorkflowStatusLabel, normalizeWorkflowStatus } from './reportStatus';
import { formatDateTimeInManila } from './manilaTime';

export function formatPersonName(details, fallback = 'N/A') {
  if (!details) {
    return fallback;
  }
  const fullName = [details.first_name, details.middle_name, details.last_name, details.suffix]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return fullName || fallback;
}

export function buildUsersIndex(users, userDetails) {
  const detailsByUserId = new Map(userDetails.map((details) => [details.user_id, details]));
  return new Map(
    users.map((user) => [
      user.user_id,
      {
        ...user,
        details: detailsByUserId.get(user.user_id) || null,
      },
    ])
  );
}

export function buildReportsViewModel({ reports, reportDetails, departments, teams, users, userDetails }) {
  const usersIndex = buildUsersIndex(users, userDetails);
  const detailsByReportId = new Map(reportDetails.map((details) => [details.report_id, details]));
  const departmentsById = new Map(departments.map((department) => [department.department_id, department]));
  const teamsById = new Map(teams.map((team) => [team.team_id, team]));

  return reports
    .map((report) => {
      const detail = detailsByReportId.get(report.report_id) || null;
      const reporter = usersIndex.get(report.reported_by) || null;

      return {
        ...report,
        detail,
        workflow_status: normalizeWorkflowStatus(detail?.status, report.assigned_team_id),
        workflow_status_label: getWorkflowStatusLabel(detail?.status, report.assigned_team_id),
        reporter,
        department: departmentsById.get(report.assigned_department_id) || null,
        team: teamsById.get(report.assigned_team_id) || null,
      };
    })
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export function buildAccessibleReportIdSetForTeams(reports, reportResponseTeams, teamIds) {
  const teamIdSet = new Set([...teamIds].map((value) => Number(value)));
  const accessibleReportIds = new Set();

  for (const report of reports) {
    if (teamIdSet.has(Number(report.assigned_team_id))) {
      accessibleReportIds.add(Number(report.report_id));
    }
  }

  for (const row of reportResponseTeams || []) {
    if (teamIdSet.has(Number(row.team_id))) {
      accessibleReportIds.add(Number(row.report_id));
    }
  }

  return accessibleReportIds;
}

export function formatDate(value) {
  return formatDateTimeInManila(value, 'N/A');
}

export function getReportStatusLabel(status) {
  if (!status) {
    return 'Unknown';
  }
  return status;
}
