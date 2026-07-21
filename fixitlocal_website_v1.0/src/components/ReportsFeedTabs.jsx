import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { WORKFLOW_STATUS, getWorkflowStatusLabel, normalizeWorkflowStatus } from '../lib/reportStatus';

function statusClass(status, assignedTeamId = null) {
  const normalized = normalizeWorkflowStatus(status, assignedTeamId);
  if (normalized === WORKFLOW_STATUS.COMPLETED) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (normalized === WORKFLOW_STATUS.IN_PROGRESS) {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === WORKFLOW_STATUS.ASSIGNED) {
    return 'bg-blue-100 text-blue-700';
  }
  return 'bg-slate-100 text-slate-700';
}

function severityClass(severity) {
  if (/high|critical/i.test(severity || '')) {
    return 'bg-red-100 text-red-700';
  }
  if (/medium/i.test(severity || '')) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-emerald-100 text-emerald-700';
}

function toAgeLabel(createdAt) {
  if (!createdAt) {
    return 'Unknown';
  }

  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) {
    return 'Unknown';
  }

  const diffMs = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }
  return `${Math.floor(diffMs / day)}d ago`;
}

function ReportsFeedTabs({
  reports = [],
  className = '',
  maxListHeightClass = 'max-h-[560px]',
}) {
  const filtered = useMemo(() => reports, [reports]);

  return (
    <section className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className={`custom-scrollbar flex-1 overflow-y-auto px-4 py-4 sm:px-5 ${maxListHeightClass}`}>
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((report) => (
              <article
                key={report.id}
                className="cursor-pointer rounded-xl border border-slate-100 bg-surface-container-lowest p-4 transition-all hover:border-secondary/20 hover:shadow-md"
              >
                <div className="flex gap-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
                    {report.imagePath ? (
                      <img
                        src={report.imagePath}
                        alt={report.title || `Report #${report.id}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${severityClass(report.severity)}`}>
                        {report.severity || 'Low'}
                      </span>
                      <span className="text-[10px] font-medium text-on-primary-container">{toAgeLabel(report.createdAt)}</span>
                    </div>

                    <h4 className="truncate text-sm font-bold text-primary">{report.title || `Report #${report.id}`}</h4>
                    <p className="mb-2 line-clamp-1 text-xs text-on-surface-variant">{report.description || 'No description provided.'}</p>

                    <div className="mb-2 flex items-center gap-2">
                      <MapPin size={13} className="text-on-primary-container" />
                      <span className="truncate text-[10px] font-medium text-on-primary-container">{report.location || 'No location'}</span>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(
                        report.status,
                        report.assignedTeamId
                      )}`}
                    >
                      {getWorkflowStatusLabel(report.status, report.assignedTeamId)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-on-surface-variant">
            No reports available for this view.
          </div>
        )}
      </div>
    </section>
  );
}

export default ReportsFeedTabs;
