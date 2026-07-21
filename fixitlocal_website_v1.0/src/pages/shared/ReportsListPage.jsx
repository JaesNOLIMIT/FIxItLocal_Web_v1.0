import PageHeader from './PageHeader';
import { formatDate } from '../../lib/dataUtils';

function statusBadgeClass(status) {
  if (/completed/i.test(status || '')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (/in progress/i.test(status || '')) {
    return 'bg-amber-100 text-amber-800';
  }
  if (/assigned/i.test(status || '')) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-slate-100 text-slate-700';
}

function formatScheduleWindow(start, end) {
  if (!start) {
    return '';
  }
  if (!end) {
    return `Scheduled: ${formatDate(start)}`;
  }
  return `Scheduled: ${formatDate(start)} to ${formatDate(end)}`;
}

function ReportsListPage({ title, description, reports }) {
  return (
    <section>
      <PageHeader title={title} description={description} />

      {reports.length ? (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <article key={report.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-primary">{report.title}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
                    report.status
                  )}`}
                >
                  {report.status}
                </span>
              </div>
              {report.teamName ? (
                <p className="mt-1 text-xs font-semibold text-on-primary-container">Assigned Team: {report.teamName}</p>
              ) : null}
              <p className="mt-1 text-sm text-on-surface">{report.description || 'No description.'}</p>
              <p className="mt-2 text-xs text-on-primary-container">
                {report.location} - {formatDate(report.created_at)}
              </p>
              {report.scheduled_start ? (
                <p className="mt-1 text-xs text-on-primary-container">
                  {formatScheduleWindow(report.scheduled_start, report.scheduled_end)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-on-primary-container shadow-soft">
          No reports assigned yet.
        </div>
      )}
    </section>
  );
}

export default ReportsListPage;
