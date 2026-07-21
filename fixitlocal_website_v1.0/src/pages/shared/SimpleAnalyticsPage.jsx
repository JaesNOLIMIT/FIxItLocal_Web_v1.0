import PageHeader from './PageHeader';
import StatCards from './StatCards';

function SimpleAnalyticsPage({ title, description, cards, rows = [], columns = [] }) {
  return (
    <section>
      <PageHeader title={title} description={description} />
      <StatCards cards={cards} />

      {rows.length ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left font-semibold text-on-primary-container">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key}>
                  {columns.map((column) => (
                    <td key={`${row.key}-${column.key}`} className="px-4 py-3 text-on-surface">
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default SimpleAnalyticsPage;
