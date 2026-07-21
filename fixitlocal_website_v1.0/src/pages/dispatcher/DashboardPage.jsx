import { useMemo } from 'react';
import RoleDashboardPage from '../shared/RoleDashboardPage';
import { useRoleData } from '../../hooks/useRoleData';
import { buildReportsViewModel } from '../../lib/dataUtils';
import { getDateKeyInManila } from '../../lib/manilaTime';
import {
  WORKFLOW_STATUS,
  isActiveWorkflowStatus,
  normalizeWorkflowStatus,
} from '../../lib/reportStatus';

function isSameDay(value, referenceDate) {
  if (!value) {
    return false;
  }
  return getDateKeyInManila(value) === getDateKeyInManila(referenceDate);
}

function DispatcherDashboardPage() {
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

  const assignedReportIds = useMemo(() => {
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

  const teamScheduleSnapshot = useMemo(
    () => {
      const today = new Date();
      return teams
        .map((team) => {
          const teamId = Number(team.team_id);
          const seenReportIds = new Set();
          const activeTeamAssignments = [];

          for (const row of reportResponseTeams) {
            if (Number(row.team_id) !== teamId) {
              continue;
            }
            const report = reportsById.get(Number(row.report_id));
            if (!report || !isActiveWorkflowStatus(report.detail?.status, report.assigned_team_id)) {
              continue;
            }
            seenReportIds.add(Number(report.report_id));
            activeTeamAssignments.push({
              report,
              scheduled_start: row.scheduled_start || report.scheduled_start || null,
            });
          }

          for (const report of reportView) {
            if (Number(report.assigned_team_id) !== teamId) {
              continue;
            }
            if (seenReportIds.has(Number(report.report_id))) {
              continue;
            }
            if (!isActiveWorkflowStatus(report.detail?.status, report.assigned_team_id)) {
              continue;
            }
            activeTeamAssignments.push({
              report,
              scheduled_start: report.scheduled_start || null,
            });
          }

          const todayReports = activeTeamAssignments.filter(
            (entry) =>
              isSameDay(entry.scheduled_start, today) ||
              normalizeWorkflowStatus(entry.report.detail?.status, entry.report.assigned_team_id) ===
                WORKFLOW_STATUS.IN_PROGRESS
          );

          return {
            key: `team-${team.team_id}`,
            teamName: team.name,
            today: todayReports.length,
            backlog: Math.max(activeTeamAssignments.length - todayReports.length, 0),
          };
        })
        .sort((left, right) => right.today - left.today);
    },
    [reportResponseTeams, reportView, reportsById, teams]
  );

  const cards = [
    { label: 'Reports In Queue', value: reportView.filter((report) => !report.assigned_team_id).length },
    { label: 'Assigned Reports', value: assignedReportIds.size },
    {
      label: 'Active Workload',
      value: reportView.filter((report) => isActiveWorkflowStatus(report.detail?.status, report.assigned_team_id))
        .length,
    },
    { label: 'Teams With Today Schedule', value: teamScheduleSnapshot.filter((team) => team.today > 0).length },
  ];

  return (
    <RoleDashboardPage
      title="Dashboard"
      description="Dispatch overview, assignment queue, and per-team daily schedule status."
      cards={cards}
    >
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold text-primary">Today's Team Schedule Snapshot</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Team</th>
                <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Today</th>
                <th className="px-3 py-2 text-left font-semibold text-on-primary-container">Backlog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamScheduleSnapshot.map((team) => (
                <tr key={team.key}>
                  <td className="px-3 py-2 text-on-surface">{team.teamName}</td>
                  <td className="px-3 py-2 text-on-surface">{team.today}</td>
                  <td className="px-3 py-2 text-on-surface">{team.backlog}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RoleDashboardPage>
  );
}

export default DispatcherDashboardPage;

