function buildBBox(lat, lon, deltaDeg = 0.0035) {
  const minLon = Number(lon) - deltaDeg;
  const maxLon = Number(lon) + deltaDeg;
  const minLat = Number(lat) - deltaDeg;
  const maxLat = Number(lat) + deltaDeg;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

function ReportLocationMap({ latitude, longitude, height = 220, locationLabel }) {
  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    latitude !== undefined &&
    longitude !== undefined &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  if (!hasCoords) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-on-primary-container"
        style={{ height }}
      >
        <span className="material-symbols-outlined mr-1 text-[16px]">location_off</span>
        No coordinates for this report
      </div>
    );
  }

  const bbox = buildBBox(latitude, longitude);
  const marker = `${Number(latitude)},${Number(longitude)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  const viewHref = `https://www.openstreetmap.org/?mlat=${Number(latitude)}&mlon=${Number(longitude)}#map=18/${Number(latitude)}/${Number(longitude)}`;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <iframe
        title={locationLabel ? `Map of ${locationLabel}` : 'Report location map'}
        src={src}
        width="100%"
        style={{ height, border: 0 }}
        loading="lazy"
      />
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] text-on-primary-container">
        <span className="truncate">
          <span className="material-symbols-outlined mr-1 align-middle text-[12px]">place</span>
          {locationLabel || `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`}
        </span>
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-semibold text-secondary hover:underline"
        >
          Open in OSM
        </a>
      </div>
    </div>
  );
}

export default ReportLocationMap;
