import { useMemo } from 'react';
import { useRoleData } from '../../hooks/useRoleData';
import { getWeekdayIndexInManila } from '../../lib/manilaTime';
import { WORKFLOW_STATUS, isCompletedWorkflowStatus, normalizeWorkflowStatus } from '../../lib/reportStatus';

function bucketSeverity(severity) {
  if (/high|critical/i.test(severity || '')) {
    return 'High';
  }
  if (/medium/i.test(severity || '')) {
    return 'Medium';
  }
  return 'Low';
}

function AnalyticsPage() {
  const { systemData } = useRoleData();
  const { reports, reportDetails, departments, teams } = systemData;

  const viewModel = useMemo(() => {
    const detailsByReportId = new Map(reportDetails.map((item) => [item.report_id, item]));
    const departmentsById = new Map(departments.map((item) => [item.department_id, item.name]));
    const teamsById = new Map(teams.map((item) => [item.team_id, item.name]));

    const combined = reports.map((report) => {
      const detail = detailsByReportId.get(report.report_id) || null;
      return {
        reportId: report.report_id,
        status: normalizeWorkflowStatus(detail?.status, report.assigned_team_id),
        severity: bucketSeverity(detail?.severity),
        departmentName: departmentsById.get(report.assigned_department_id) || 'Unassigned',
        teamName: teamsById.get(report.assigned_team_id) || 'Unassigned',
        createdAt: report.created_at ? new Date(report.created_at) : null,
        resolvedAt: report.resolved_at ? new Date(report.resolved_at) : null,
      };
    });

    const severityCounts = { High: 0, Medium: 0, Low: 0 };
    const statusCounts = {
      [WORKFLOW_STATUS.PENDING]: 0,
      [WORKFLOW_STATUS.ASSIGNED]: 0,
      [WORKFLOW_STATUS.IN_PROGRESS]: 0,
      [WORKFLOW_STATUS.COMPLETED]: 0,
    };
    const departmentCounts = {};
    const teamCounts = {};
    const weekdayCounts = [
      { label: 'Sun', total: 0, completed: 0 },
      { label: 'Mon', total: 0, completed: 0 },
      { label: 'Tue', total: 0, completed: 0 },
      { label: 'Wed', total: 0, completed: 0 },
      { label: 'Thu', total: 0, completed: 0 },
      { label: 'Fri', total: 0, completed: 0 },
      { label: 'Sat', total: 0, completed: 0 },
    ];

    combined.forEach((item) => {
      severityCounts[item.severity] += 1;
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status] += 1;
      }

      departmentCounts[item.departmentName] = (departmentCounts[item.departmentName] || 0) + 1;
      if (!teamCounts[item.teamName]) {
        teamCounts[item.teamName] = {
          total: 0,
          pending: 0,
          assigned: 0,
          in_progress: 0,
          completed: 0,
        };
      }
      teamCounts[item.teamName].total += 1;
      if (teamCounts[item.teamName][item.status] !== undefined) {
        teamCounts[item.teamName][item.status] += 1;
      }

      if (item.createdAt && !Number.isNaN(item.createdAt.getTime())) {
        const day = getWeekdayIndexInManila(item.createdAt);
        if (day !== null) {
          weekdayCounts[day].total += 1;
        }
        if (day !== null && isCompletedWorkflowStatus(item.status)) {
          weekdayCounts[day].completed += 1;
        }
      }
    });

    const topDepartments = Object.entries(departmentCounts)
      .map(([departmentName, total]) => ({ departmentName, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);

    const totalReports = combined.length;
    const completedReports = statusCounts[WORKFLOW_STATUS.COMPLETED];
    const openReports = totalReports - completedReports;
    const completedRate = totalReports ? Math.round((completedReports / totalReports) * 100) : 0;
    const perTeam = Object.entries(teamCounts)
      .map(([teamName, counts]) => ({
        teamName,
        ...counts,
        completedRate: counts.total ? Math.round((counts.completed / counts.total) * 100) : 0,
      }))
      .sort((left, right) => right.total - left.total);

    return {
      totalReports,
      completedReports,
      openReports,
      completedRate,
      statusCounts,
      severityCounts,
      weekdayCounts,
      topDepartments,
      perTeam,
    };
  }, [departments, reportDetails, reports, teams]);

  const maxDayTotal = Math.max(...viewModel.weekdayCounts.map((item) => item.total), 1);
  const maxDepartmentTotal = Math.max(...viewModel.topDepartments.map((item) => item.total), 1);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary">Analytics</h1>
        <p className="text-on-surface-variant">System-wide report and operations metrics.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-on-primary-container">Total Reports</span>
            <span className="material-symbols-outlined text-secondary">assessment</span>
          </div>
          <p className="font-headline text-3xl font-bold text-primary">{viewModel.totalReports.toLocaleString()}</p>
        </article>

        <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-on-primary-container">Completed</span>
            <span className="material-symbols-outlined text-green-600">task_alt</span>
          </div>
          <p className="font-headline text-3xl font-bold text-primary">{viewModel.completedReports.toLocaleString()}</p>
        </article>

        <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-on-primary-container">Active</span>
            <span className="material-symbols-outlined text-error">pending_actions</span>
          </div>
          <p className="font-headline text-3xl font-bold text-primary">{viewModel.openReports.toLocaleString()}</p>
        </article>

        <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-on-primary-container">Completion Rate</span>
            <span className="material-symbols-outlined text-secondary">trending_up</span>
          </div>
          <p className="font-headline text-3xl font-bold text-primary">{viewModel.completedRate}%</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 xl:col-span-2">
          <h2 className="mb-4 font-headline text-lg font-bold text-primary">Weekly Activity</h2>
          <div className="space-y-3">
            {viewModel.weekdayCounts.map((item) => {
              const totalPercent = (item.total / maxDayTotal) * 100;
              const completedPercent = item.total ? (item.completed / item.total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">{item.label}</span>
                    <span className="text-on-primary-container">
                      {item.total} reports, {item.completed} completed
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="relative h-full rounded-full bg-slate-300" style={{ width: `${totalPercent}%` }}>
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${completedPercent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
          <h2 className="mb-4 font-headline text-lg font-bold text-primary">Severity Mix</h2>
          <div className="space-y-4">
            {[
              { label: 'High', className: 'bg-red-500' },
              { label: 'Medium', className: 'bg-amber-500' },
              { label: 'Low', className: 'bg-green-500' },
            ].map((item) => {
              const count = viewModel.severityCounts[item.label];
              const percent = viewModel.totalReports ? Math.round((count / viewModel.totalReports) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-on-surface">{item.label}</span>
                    <span className="font-bold text-primary">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${item.className}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-headline text-lg font-bold text-primary">Top Departments by Workload</h2>
        <div className="space-y-3">
          {viewModel.topDepartments.length ? (
            viewModel.topDepartments.map((item) => {
              const width = (item.total / maxDepartmentTotal) * 100;
              return (
                <div key={item.departmentName}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-on-surface">{item.departmentName}</span>
                    <span className="font-bold text-primary">{item.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-on-surface-variant">No department data available yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-headline text-lg font-bold text-primary">Per Team Report Performance</h2>
        {viewModel.perTeam.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Team</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Total Reports</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Pending</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Assigned</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">In Progress</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Completed</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewModel.perTeam.map((team) => (
                  <tr key={team.teamName}>
                    <td className="px-3 py-2 text-on-surface">{team.teamName}</td>
                    <td className="px-3 py-2 text-on-surface">{team.total}</td>
                    <td className="px-3 py-2 text-on-surface">{team.pending}</td>
                    <td className="px-3 py-2 text-on-surface">{team.assigned}</td>
                    <td className="px-3 py-2 text-on-surface">{team.in_progress}</td>
                    <td className="px-3 py-2 text-on-surface">{team.completed}</td>
                    <td className="px-3 py-2 text-on-surface">{team.completedRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No team report metrics available yet.</p>
        )}
      </section>
    </section>
  );
}

export default AnalyticsPage;
