import { useMemo } from 'react';
import SimpleAnalyticsPage from '../shared/SimpleAnalyticsPage';
import { useRoleData } from '../../hooks/useRoleData';
import { buildReportsViewModel } from '../../lib/dataUtils';
import { WORKFLOW_STATUS } from '../../lib/reportStatus';

function toPercent(part, whole) {
  if (!whole) {
    return '0%';
  }
  return `${Math.round((part / whole) * 100)}%`;
}

function ReportCheckerAnalyticsPage() {
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

  const totals = useMemo(() => {
    const total = reportView.length;
    const pending = reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.PENDING).length;
    const assigned = reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.ASSIGNED).length;
    const inProgress = reportView.filter(
      (report) => report.workflow_status === WORKFLOW_STATUS.IN_PROGRESS
    ).length;
    const completed = reportView.filter((report) => report.workflow_status === WORKFLOW_STATUS.COMPLETED).length;
    const withCategory = reportView.filter((report) => Boolean(report.detail?.category)).length;
    const withSeverity = reportView.filter((report) => Boolean(report.detail?.severity)).length;
    const withLocation = reportView.filter(
      (report) =>
        Boolean(report.detail?.city) ||
        Boolean(report.detail?.barangay) ||
        Boolean(report.detail?.street) ||
        (report.detail?.latitude !== null && report.detail?.latitude !== undefined) ||
        (report.detail?.longitude !== null && report.detail?.longitude !== undefined)
    ).length;
    const analyzed = reportView.filter(
      (report) => Boolean(report.detail?.category) || Boolean(report.detail?.severity)
    ).length;

    return {
      total,
      pending,
      assigned,
      inProgress,
      completed,
      withCategory,
      withSeverity,
      withLocation,
      analyzed,
    };
  }, [reportView]);

  const cards = [
    { label: 'Total Reports', value: totals.total },
    { label: 'Pending Checks', value: totals.pending },
    { label: 'In Progress', value: totals.inProgress },
    { label: 'Completed', value: totals.completed },
  ];

  const rows = [
    {
      key: 'category',
      metric: 'Category Detection Coverage',
      value: toPercent(totals.withCategory, totals.total),
      notes: `${totals.withCategory}/${totals.total} reports have a category.`,
    },
    {
      key: 'severity',
      metric: 'Severity Detection Coverage',
      value: toPercent(totals.withSeverity, totals.total),
      notes: `${totals.withSeverity}/${totals.total} reports have severity.`,
    },
    {
      key: 'location',
      metric: 'Location Detection Coverage',
      value: toPercent(totals.withLocation, totals.total),
      notes: `${totals.withLocation}/${totals.total} reports include parsed location data.`,
    },
    {
      key: 'analyzed',
      metric: 'AI-Analyzed Reports',
      value: toPercent(totals.analyzed, totals.total),
      notes: `${totals.analyzed}/${totals.total} reports have AI-derived core fields.`,
    },
    {
      key: 'pending',
      metric: 'Pending Review Queue',
      value: `${totals.pending}`,
      notes: 'Reports waiting for checker confirmation.',
    },
    {
      key: 'assigned',
      metric: 'Assigned Queue',
      value: `${totals.assigned}`,
      notes: 'Reports assigned to teams but not yet in progress.',
    },
    {
      key: 'completion',
      metric: 'Completion Rate',
      value: toPercent(totals.completed, totals.total),
      notes: `${totals.completed}/${totals.total} reports completed.`,
    },
  ];

  return (
    <SimpleAnalyticsPage
      title="Analytics"
      description="AI analysis coverage and report-checking throughput."
      cards={cards}
      columns={[
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'notes', label: 'Notes' },
      ]}
      rows={rows}
    />
  );
}

export default ReportCheckerAnalyticsPage;
