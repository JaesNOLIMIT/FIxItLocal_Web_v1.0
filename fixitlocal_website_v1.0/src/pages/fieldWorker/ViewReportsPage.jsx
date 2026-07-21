import { useMemo } from 'react';
import ReportsListPage from '../shared/ReportsListPage';
import { useRoleData } from '../../hooks/useRoleData';
import { useAuth } from '../../context/AuthContext';
import { buildAccessibleReportIdSetForTeams, buildReportsViewModel } from '../../lib/dataUtils';
import { getWorkflowStatusLabel } from '../../lib/reportStatus';

function FieldWorkerViewReportsPage() {
  const { profile } = useAuth();
  const { systemData } = useRoleData();
  const { users, userDetails, departments, teams, reports, reportDetails, teamMembers, reportResponseTeams = [] } =
    systemData;

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

  const teamIds = useMemo(
    () => {
      const activeMemberships = [...teamMembers]
        .filter((member) => Number(member.user_id) === Number(profile?.user_id) && member.is_active)
        .sort((left, right) => {
          const leftTime = left.joined_at ? new Date(left.joined_at).getTime() : 0;
          const rightTime = right.joined_at ? new Date(right.joined_at).getTime() : 0;
          return rightTime - leftTime;
        });
      const primaryTeamId = activeMemberships[0] ? Number(activeMemberships[0].team_id) : null;
      return new Set(primaryTeamId ? [primaryTeamId] : []);
    },
    [profile?.user_id, teamMembers]
  );
  const responseRowsByReportId = useMemo(() => {
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
  const teamsById = useMemo(
    () => new Map(teams.map((team) => [Number(team.team_id), team])),
    [teams]
  );

  const accessibleReportIds = useMemo(
    () => buildAccessibleReportIdSetForTeams(reports, reportResponseTeams, teamIds),
    [reportResponseTeams, reports, teamIds]
  );

  const list = reportView
    .filter((report) => accessibleReportIds.has(Number(report.report_id)))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .map((report) => {
      const responseRows = responseRowsByReportId.get(Number(report.report_id)) || [];
      const workerResponseRow = responseRows.find((row) => teamIds.has(Number(row.team_id)));
      const responseTeamName = workerResponseRow
        ? teamsById.get(Number(workerResponseRow.team_id))?.name
        : '';

      return {
        key: `report-${report.report_id}`,
        title: report.detail?.title || `Report #${report.report_id}`,
        status: getWorkflowStatusLabel(report.detail?.status, report.assigned_team_id),
        description: report.detail?.description || '',
        location:
          [report.detail?.city, report.detail?.barangay, report.detail?.street].filter(Boolean).join(', ') ||
          'No location',
        teamName: responseTeamName || report.team?.name || 'Unassigned Team',
        created_at: report.created_at,
        scheduled_start: workerResponseRow?.scheduled_start || report.scheduled_start,
        scheduled_end: workerResponseRow?.scheduled_end || report.scheduled_end,
      };
    });

  return (
    <ReportsListPage
      title="View Reports"
      description="Reports assigned to your team."
      reports={list}
    />
  );
}

export default FieldWorkerViewReportsPage;
