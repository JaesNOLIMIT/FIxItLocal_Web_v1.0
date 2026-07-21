import { useMemo } from 'react';
import RoleDashboardPage from '../shared/RoleDashboardPage';
import { useRoleData } from '../../hooks/useRoleData';
import { buildReportsViewModel } from '../../lib/dataUtils';
import { WORKFLOW_STATUS } from '../../lib/reportStatus';

function ReportCheckerDashboardPage() {
  const { systemData } = useRoleData();
  const { users, userDetails, departments, teams, reports, reportDetails } = systemData;

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

  const cards = [
    { label: 'Total Reports', value: reportView.length },
    {
      label: 'Pending Checks',
      value: reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.PENDING).length,
    },
    {
      label: 'Assigned Queue',
      value: reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.ASSIGNED).length,
    },
    {
      label: 'Completed',
      value: reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length,
    },
  ];

  return (
    <RoleDashboardPage
      title="Report Checker Dashboard"
      description="Double-check reports analyzed by AI."
      cards={cards}
    />
  );
}

export default ReportCheckerDashboardPage;
