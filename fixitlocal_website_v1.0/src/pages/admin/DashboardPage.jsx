import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CityMapPanel from '../../components/CityMapPanel';
import ReportsFeedTabs from '../../components/ReportsFeedTabs';
import { useRoleData } from '../../hooks/useRoleData';
import { getDateKeyInManila } from '../../lib/manilaTime';
import { isCompletedWorkflowStatus } from '../../lib/reportStatus';

function DashboardPage() {
  const navigate = useNavigate();
  const { systemData, refreshData, loading } = useRoleData();
  const { reports, reportDetails } = systemData;

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const metrics = useMemo(() => {
    const now = new Date();
    const isHigh = (severity) => /high|critical/i.test(severity || '');
    const sameDay = (value) => {
      if (!value) {
        return false;
      }
      return getDateKeyInManila(value) === getDateKeyInManila(now);
    };

    const detailsByReportId = new Map(reportDetails.map((detail) => [detail.report_id, detail]));
    const activeReports = reports.filter((report) => {
      const detail = detailsByReportId.get(report.report_id);
      return !isCompletedWorkflowStatus(detail?.status, report.assigned_team_id);
    }).length;
    const highPriority = reportDetails.filter((item) => isHigh(item.severity)).length;
    const pendingAnalysis = reportDetails.filter((item) => !item.category || !item.severity).length;
    const completedToday = reports.filter((item) => {
      const detail = detailsByReportId.get(item.report_id);
      if (!isCompletedWorkflowStatus(detail?.status, item.assigned_team_id)) {
        return false;
      }
      return sameDay(detail?.updated_at || item.updated_at || item.created_at);
    }).length;
    const trendPercent = reports.length ? Math.round((completedToday / reports.length) * 100) : 0;

    return { activeReports, highPriority, pendingAnalysis, completedToday, trendPercent };
  }, [reportDetails, reports]);

  const joinedReports = useMemo(() => {
    const detailsByReportId = new Map(reportDetails.map((detail) => [detail.report_id, detail]));

    return reports
      .map((report) => {
        const detail = detailsByReportId.get(report.report_id) || null;
        return {
          id: report.report_id,
          reportedBy: report.reported_by,
          title: detail?.title || `Report #${report.report_id}`,
          description: detail?.description || '',
          location: [detail?.city, detail?.barangay, detail?.street].filter(Boolean).join(', ') || 'No location',
          severity: detail?.severity || 'Low',
          status: detail?.status || 'pending',
          assignedTeamId: report.assigned_team_id,
          imagePath: (detail?.image_path || '').trim(),
          createdAt: report.created_at,
          longitude: detail?.longitude,
          latitude: detail?.latitude,
        };
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [reportDetails, reports]);

  return (
    <>
      <div className="space-y-8 bg-surface">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 transition-all hover:shadow-lg hover:shadow-blue-500/5">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-blue-50 p-2 text-secondary">
                <span className="material-symbols-outlined">emergency</span>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-600">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                {metrics.trendPercent}%
              </span>
            </div>
            <h3 className="mb-1 text-sm font-medium text-on-primary-container">Active Reports</h3>
            <p className="font-headline text-3xl font-bold text-primary">{metrics.activeReports.toLocaleString()}</p>
          </article>

          <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 transition-all hover:shadow-lg hover:shadow-blue-500/5">
            <div className="mb-4 rounded-lg bg-red-50 p-2 text-error">
              <span className="material-symbols-outlined">priority_high</span>
            </div>
            <h3 className="mb-1 text-sm font-medium text-on-primary-container">High Priority</h3>
            <p className="font-headline text-3xl font-bold text-primary">{metrics.highPriority.toLocaleString()}</p>
          </article>

          <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 transition-all hover:shadow-lg hover:shadow-blue-500/5">
            <div className="mb-4 rounded-lg bg-purple-50 p-2 text-purple-600">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <h3 className="mb-1 text-sm font-medium text-on-primary-container">Pending AI Analysis</h3>
            <p className="font-headline text-3xl font-bold text-primary">{metrics.pendingAnalysis.toLocaleString()}</p>
          </article>

          <article className="rounded-xl border border-slate-200/50 bg-surface-container-lowest p-6 transition-all hover:shadow-lg hover:shadow-blue-500/5">
            <div className="mb-4 rounded-lg bg-green-50 p-2 text-green-600">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <h3 className="mb-1 text-sm font-medium text-on-primary-container">Completed Today</h3>
            <p className="font-headline text-3xl font-bold text-primary">{metrics.completedToday.toLocaleString()}</p>
          </article>
        </section>

        <section className="flex min-h-[660px] flex-col gap-6 xl:min-h-[700px] xl:flex-row">
          <div className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-200/50 bg-surface-container-low xl:max-h-[700px] xl:w-1/3">
            <div className="flex items-center justify-between border-b border-slate-200/50 bg-white/70 p-5 backdrop-blur-sm">
              <h2 className="font-headline font-bold text-primary">Live Report Feed</h2>
              <button
                type="button"
                onClick={() => navigate('/admin/manage-reports')}
                className="text-xs font-semibold text-secondary hover:underline"
              >
                View All
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="p-4 text-sm text-on-surface-variant">Loading reports...</div>
              ) : joinedReports.length === 0 ? (
                <div className="p-4 text-sm text-on-surface-variant">
                  No reports loaded. Check `reports` and `report_details` select policies (RLS) for the logged-in admin.
                </div>
              ) : (
                <ReportsFeedTabs
                  reports={joinedReports}
                  maxListHeightClass="max-h-[620px]"
                />
              )}
            </div>
          </div>

          <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 xl:w-2/3">
            <div className="h-full min-h-[440px]">
              <CityMapPanel embedded reportsData={joinedReports} />
            </div>
          </div>
        </section>
      </div>

    </>
  );
}

export default DashboardPage;
