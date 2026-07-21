import { useMemo } from 'react';
import SimpleAnalyticsPage from '../shared/SimpleAnalyticsPage';
import { useRoleData } from '../../hooks/useRoleData';
import { buildReportsViewModel } from '../../lib/dataUtils';
import { WORKFLOW_STATUS } from '../../lib/reportStatus';

function DispatcherAnalyticsPage() {
  const { systemData } = useRoleData();
  const { users, userDetails, departments, teams, reports, reportDetails, reportResponseTeams = [] } = systemData;

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

  const reportsWithAnyTeam = useMemo(() => {
    const ids = new Set();
    for (const report of reportView) {
      if (report.assigned_team_id) {
        ids.add(Number(report.report_id));
      }
    }
    for (const row of reportResponseTeams) {
      ids.add(Number(row.report_id));
    }
    return ids;
  }, [reportResponseTeams, reportView]);

  const cards = [
    {
      label: 'Unassigned Reports',
      value: reportView.filter((report) => !reportsWithAnyTeam.has(Number(report.report_id))).length,
    },
    {
      label: 'Completed Reports',
      value: reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length,
    },
    {
      label: 'In Progress',
      value: reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.IN_PROGRESS).length,
    },
    {
      label: 'Pending/Assigned',
      value: reportView.filter((report) =>
        [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.ASSIGNED].includes(report.workflow_status)
      ).length,
    },
  ];

  const rows = teams.map((team) => {
    const teamId = Number(team.team_id);
    const teamReports = [];
    const seenReportIds = new Set();

    for (const row of reportResponseTeams) {
      if (Number(row.team_id) !== teamId) {
        continue;
      }
      const report = reportsById.get(Number(row.report_id));
      if (!report) {
        continue;
      }
      seenReportIds.add(Number(report.report_id));
      teamReports.push(report);
    }

    for (const report of reportView) {
      if (Number(report.assigned_team_id) !== teamId) {
        continue;
      }
      if (seenReportIds.has(Number(report.report_id))) {
        continue;
      }
      teamReports.push(report);
    }

    return {
      key: `team-${team.team_id}`,
      team: team.name,
      assigned: teamReports.length,
      in_progress: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.IN_PROGRESS).length,
      completed: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length,
      pending: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.PENDING).length,
      queued: teamReports.filter((report) => report.workflow_status === WORKFLOW_STATUS.ASSIGNED).length,
    };
  });

  return (
    <SimpleAnalyticsPage
      title="Analytics"
      description="Dispatch assignment and completion analytics."
      cards={cards}
      columns={[
        { key: 'team', label: 'Team' },
        { key: 'assigned', label: 'Assigned' },
        { key: 'pending', label: 'Pending' },
        { key: 'queued', label: 'Assigned' },
        { key: 'in_progress', label: 'In Progress' },
        { key: 'completed', label: 'Completed' },
      ]}
      rows={rows}
    />
  );
}

export default DispatcherAnalyticsPage;
