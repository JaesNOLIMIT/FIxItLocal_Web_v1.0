import { useMemo } from 'react';
import SimpleAnalyticsPage from '../shared/SimpleAnalyticsPage';
import { useRoleData } from '../../hooks/useRoleData';
import { useAuth } from '../../context/AuthContext';
import { buildAccessibleReportIdSetForTeams, buildReportsViewModel } from '../../lib/dataUtils';
import { WORKFLOW_STATUS } from '../../lib/reportStatus';

function FieldWorkerAnalyticsPage() {
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

  const primaryMembership = useMemo(
    () =>
      [...teamMembers]
        .filter((member) => Number(member.user_id) === Number(profile?.user_id) && member.is_active)
        .sort((left, right) => {
          const leftTime = left.joined_at ? new Date(left.joined_at).getTime() : 0;
          const rightTime = right.joined_at ? new Date(right.joined_at).getTime() : 0;
          return rightTime - leftTime;
        })[0] || null,
    [profile?.user_id, teamMembers]
  );

  const teamIds = useMemo(
    () => new Set(primaryMembership ? [Number(primaryMembership.team_id)] : []),
    [primaryMembership]
  );

  const accessibleReportIds = useMemo(
    () => buildAccessibleReportIdSetForTeams(reports, reportResponseTeams, teamIds),
    [reportResponseTeams, reports, teamIds]
  );
  const assigned = reportView.filter((report) => accessibleReportIds.has(Number(report.report_id)));

  const cards = [
    { label: 'Assigned Reports', value: assigned.length },
    {
      label: 'Completed',
      value: assigned.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length,
    },
    {
      label: 'In Progress',
      value: assigned.filter((report) => report.workflow_status === WORKFLOW_STATUS.IN_PROGRESS).length,
    },
    {
      label: 'Pending/Assigned',
      value: assigned.filter((report) =>
        [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.ASSIGNED].includes(report.workflow_status)
      ).length,
    },
  ];

  const rows = teams
    .filter((team) => teamIds.has(Number(team.team_id)))
    .map((team) => {
      const teamReports = assigned.filter((report) => {
        if (Number(report.assigned_team_id) === Number(team.team_id)) {
          return true;
        }
        return reportResponseTeams.some(
          (row) =>
            Number(row.report_id) === Number(report.report_id) &&
            Number(row.team_id) === Number(team.team_id)
        );
      });
      return {
        key: `team-${team.team_id}`,
        team: team.name,
        assigned: teamReports.length,
        pending: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.PENDING).length,
        queued: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.ASSIGNED).length,
        in_progress: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.IN_PROGRESS).length,
        completed: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length,
      };
    });

  return (
    <SimpleAnalyticsPage
      title="Analytics"
      description="Workload and completion rates for your team."
      cards={cards}
      columns={[
        { key: 'team', label: 'Team' },
        { key: 'assigned', label: 'Assigned Reports' },
        { key: 'pending', label: 'Pending' },
        { key: 'queued', label: 'Assigned' },
        { key: 'in_progress', label: 'In Progress' },
        { key: 'completed', label: 'Completed' },
      ]}
      rows={rows}
    />
  );
}

export default FieldWorkerAnalyticsPage;
