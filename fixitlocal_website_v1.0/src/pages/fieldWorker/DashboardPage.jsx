import { useMemo } from 'react';
import RoleDashboardPage from '../shared/RoleDashboardPage';
import { useRoleData } from '../../hooks/useRoleData';
import { useAuth } from '../../context/AuthContext';
import { buildAccessibleReportIdSetForTeams, buildReportsViewModel } from '../../lib/dataUtils';
import { WORKFLOW_STATUS } from '../../lib/reportStatus';

function FieldWorkerDashboardPage() {
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

  const workerTeamIdSet = useMemo(
    () => new Set(primaryMembership ? [Number(primaryMembership.team_id)] : []),
    [primaryMembership]
  );
  const accessibleReportIds = useMemo(
    () => buildAccessibleReportIdSetForTeams(reports, reportResponseTeams, workerTeamIdSet),
    [reportResponseTeams, reports, workerTeamIdSet]
  );
  const assignedReports = reportView.filter((report) =>
    accessibleReportIds.has(Number(report.report_id))
  );

  const cards = [
    { label: 'My Team', value: workerTeamIdSet.size },
    { label: 'Assigned Reports', value: assignedReports.length },
    {
      label: 'In Progress',
      value: assignedReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.IN_PROGRESS).length,
    },
    {
      label: 'Completed',
      value: assignedReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length,
    },
  ];

  return (
    <RoleDashboardPage
      title="Dashboard"
      description="Overview of assigned work for your current team."
      cards={cards}
    />
  );
}

export default FieldWorkerDashboardPage;
