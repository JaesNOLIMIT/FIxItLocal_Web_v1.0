function PageHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-primary">{title}</h1>
      {description ? <p className="text-sm text-on-primary-container">{description}</p> : null}
    </div>
  );
}

export default PageHeader;
