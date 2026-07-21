import PageHeader from './PageHeader';
import StatCards from './StatCards';

function RoleDashboardPage({ title, description, cards, children }) {
  return (
    <section>
      <PageHeader title={title} description={description} />
      <StatCards cards={cards} />
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export default RoleDashboardPage;
