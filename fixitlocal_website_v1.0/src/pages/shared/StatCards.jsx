function StatCards({ cards }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-primary-container">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-primary">{card.value}</p>
        </article>
      ))}
    </div>
  );
}

export default StatCards;
