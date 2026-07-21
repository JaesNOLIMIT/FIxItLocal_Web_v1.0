import PageHeader from './PageHeader';
import { formatDate } from '../../lib/dataUtils';

function ScheduleBoardPage({ title, description, schedules }) {
  return (
    <section>
      <PageHeader title={title} description={description} />
      {schedules.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {schedules.map((schedule) => (
            <article key={schedule.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-primary">{schedule.teamName}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {schedule.total} task(s)
                </span>
              </div>
              <div className="space-y-2">
                {schedule.tasks.length ? (
                  schedule.tasks.map((task) => (
                    <div key={task.key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-semibold text-on-surface">{task.title}</p>
                      <p className="text-xs text-on-primary-container">
                        {task.status} - {formatDate(task.scheduled_start || task.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-on-primary-container">No scheduled tasks.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-on-primary-container shadow-soft">
          No schedules available yet.
        </div>
      )}
    </section>
  );
}

export default ScheduleBoardPage;
