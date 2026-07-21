import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const AUTO_STYLE_ZOOM = 5.2;
const GLOBE_ZOOM_THRESHOLD = 3.1;
const DEFAULT_CENTER = [120.8966, 14.9547];
const BASEMAP_TRANSITION_MS = 320;
const MIN_MAP_ZOOM = 1.28;
const MAX_MAP_ZOOM = 18;
const GEOLOCATION_TIMEOUT_MS = 20000;

const STAR_FIELD_CLASS = "pointer-events-none absolute inset-0 z-[1] opacity-90 [background-image:radial-gradient(1.4px_1.4px_at_16px_26px,rgba(255,255,255,0.95),rgba(255,255,255,0)),radial-gradient(1.2px_1.2px_at_74px_48px,rgba(255,255,255,0.88),rgba(255,255,255,0)),radial-gradient(1px_1px_at_132px_118px,rgba(255,255,255,0.8),rgba(255,255,255,0)),radial-gradient(1.6px_1.6px_at_178px_168px,rgba(255,255,255,0.82),rgba(255,255,255,0))] [background-size:210px_210px,250px_250px,290px_290px,330px_330px] [background-position:0_0,25px_40px,70px_20px,110px_90px] [mask-image:radial-gradient(circle_at_50%_52%,transparent_0_39%,black_46%)] [-webkit-mask-image:radial-gradient(circle_at_50%_52%,transparent_0_39%,black_46%)]";

const COMPOSITE_BASE_STYLE = {
  version: 8,
  sources: {
    street: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'OpenStreetMap contributors',
    },
    satellite: {
      type: 'raster',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri',
    },
  },
  layers: [
    {
      id: 'space-bg',
      type: 'background',
      paint: {
        'background-color': '#060b16',
      },
    },
    {
      id: 'street-base',
      type: 'raster',
      source: 'street',
      paint: {
        'raster-saturation': -0.1,
        'raster-contrast': 0.05,
        'raster-opacity': 1,
      },
    },
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'satellite',
      paint: {
        'raster-saturation': -0.02,
        'raster-opacity': 0,
      },
    },
  ],
};

const FALLBACK_REPORTS = [
  {
    id: 'rpt-01',
    title: 'Severe Pothole - DRT Highway',
    location: 'Barangay Pagala, Baliuag',
    coordinates: [120.9042, 14.9608],
    severity: 'High',
    weight: 0.92,
  },
  {
    id: 'rpt-02',
    title: 'Street Light Failure - Benigno S. Aquino Ave',
    location: 'Barangay Tangos, Baliuag',
    coordinates: [120.9148, 14.9497],
    severity: 'Medium',
    weight: 0.74,
  },
  {
    id: 'rpt-03',
    title: 'Water Main Seepage - M. Villarica Road',
    location: 'Barangay Santo Cristo, Baliuag',
    coordinates: [120.8892, 14.9642],
    severity: 'Medium',
    weight: 0.68,
  },
  {
    id: 'rpt-04',
    title: 'Road Surface Crack - Marian Road',
    location: 'Barangay Tarcan, Baliuag',
    coordinates: [120.9014, 14.9422],
    severity: 'Low',
    weight: 0.56,
  },
  {
    id: 'rpt-05',
    title: 'Blocked Drainage - Riverside Access',
    location: 'Barangay Sabang, Baliuag',
    coordinates: [120.8796, 14.9558],
    severity: 'Medium',
    weight: 0.64,
  },
  {
    id: 'rpt-06',
    title: 'Street Sign Damage - Cagayan Valley Road',
    location: 'Barangay San Jose, Baliuag',
    coordinates: [120.8858, 14.9498],
    severity: 'Low',
    weight: 0.55,
  },
  {
    id: 'rpt-07',
    title: 'Flood-prone Segment - Doa Rosario',
    location: 'Barangay Poblacion, Baliuag',
    coordinates: [120.8967, 14.9553],
    severity: 'High',
    weight: 0.84,
  },
  {
    id: 'rpt-08',
    title: 'Uneven Pavement - Makinabang Link',
    location: 'Barangay Makinabang, Baliuag',
    coordinates: [120.9006, 14.9688],
    severity: 'Low',
    weight: 0.51,
  },
  {
    id: 'rpt-09',
    title: 'Shoulder Erosion - Tibag Connector',
    location: 'Barangay Tibag, Baliuag',
    coordinates: [120.9107, 14.9721],
    severity: 'Medium',
    weight: 0.6,
  },
  {
    id: 'rpt-10',
    title: 'Collapsed Drain Slab - F. Gonzales St',
    location: 'Barangay Poblacion, Baliuag',
    coordinates: [120.8937, 14.9531],
    severity: 'High',
    weight: 0.88,
  },
  {
    id: 'rpt-11',
    title: 'Major Rutting - Baliuag-Candaba Road',
    location: 'Barangay San Roque, Baliuag',
    coordinates: [120.9211, 14.9586],
    severity: 'High',
    weight: 0.81,
  },
  {
    id: 'rpt-12',
    title: 'Intersection Pooling - Bypass Access',
    location: 'Barangay Santo Nino, Baliuag',
    coordinates: [120.9086, 14.9455],
    severity: 'Medium',
    weight: 0.66,
  },
  {
    id: 'rpt-13',
    title: 'Shoulder Subsidence - Pinagbarilan Rd',
    location: 'Barangay Pinagbarilan, Baliuag',
    coordinates: [120.8871, 14.9727],
    severity: 'Low',
    weight: 0.48,
  },
  {
    id: 'rpt-14',
    title: 'Damaged Barrier - Pagala-Tangos Link',
    location: 'Barangay Tangos, Baliuag',
    coordinates: [120.9099, 14.9572],
    severity: 'Medium',
    weight: 0.62,
  },
  {
    id: 'rpt-15',
    title: 'Road Edge Collapse - Villarica Extension',
    location: 'Barangay Santo Cristo, Baliuag',
    coordinates: [120.8925, 14.9614],
    severity: 'High',
    weight: 0.86,
  },
  {
    id: 'rpt-16',
    title: 'Canal Overflow Point - Sabang Riverbank',
    location: 'Barangay Sabang, Baliuag',
    coordinates: [120.8769, 14.9528],
    severity: 'Medium',
    weight: 0.63,
  },
  {
    id: 'rpt-17',
    title: 'Pavement Breakup - Tibag North Curve',
    location: 'Barangay Tibag, Baliuag',
    coordinates: [120.9144, 14.9764],
    severity: 'Low',
    weight: 0.5,
  },
  {
    id: 'rpt-18',
    title: 'Frequent Flooding - Sto Cristo Chapel Rd',
    location: 'Barangay Santo Cristo, Baliuag',
    coordinates: [120.8862, 14.9675],
    severity: 'High',
    weight: 0.79,
  },
];

function buildCurrentLocationPoint(center) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { label: 'Your location' },
        geometry: {
          type: 'Point',
          coordinates: center,
        },
      },
    ],
  };
}

function getZoneBucket([lng, lat]) {
  if (lat >= 14.9685) {
    return 'north';
  }
  if (lng <= 120.8885) {
    return 'west';
  }
  if (lng >= 120.9095) {
    return 'east';
  }
  if (lat <= 14.9498) {
    return 'south';
  }
  return 'central';
}

function buildZonePolygon(points) {
  const lngValues = points.map((point) => point[0]);
  const latValues = points.map((point) => point[1]);

  const minLng = Math.min(...lngValues);
  const maxLng = Math.max(...lngValues);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const spreadLng = Math.max(maxLng - minLng, 0.0048);
  const spreadLat = Math.max(maxLat - minLat, 0.0038);

  const padLng = spreadLng * 0.36;
  const padLat = spreadLat * 0.38;

  const ring = [
    [minLng - padLng * 0.5, minLat - padLat * 0.2],
    [minLng - padLng * 0.9, centerLat - padLat * 0.05],
    [minLng - padLng * 0.25, maxLat + padLat * 0.85],
    [centerLng - padLng * 0.1, maxLat + padLat * 1.15],
    [maxLng + padLng * 0.75, maxLat + padLat * 0.45],
    [maxLng + padLng * 0.95, centerLat - padLat * 0.1],
    [maxLng + padLng * 0.2, minLat - padLat * 0.85],
    [centerLng - padLng * 0.2, minLat - padLat * 1.05],
    [minLng - padLng * 0.5, minLat - padLat * 0.2],
  ];

  return ring;
}

function getZoneRisk(reports) {
  if (!reports.length) {
    return 'Low';
  }

  const score = reports.reduce((sum, report) => {
    if (report.severity === 'High') {
      return sum + 3;
    }
    if (report.severity === 'Medium') {
      return sum + 2;
    }
    return sum + 1;
  }, 0);

  const averageScore = score / reports.length;

  if (averageScore >= 2.35) {
    return 'High';
  }
  if (averageScore >= 1.65) {
    return 'Medium';
  }
  return 'Low';
}

function buildIssuePoints(reports) {
  return {
    type: 'FeatureCollection',
    features: reports.map((report) => ({
      type: 'Feature',
      properties: {
        pointType: 'report',
        id: report.id,
        title: report.title,
        location: report.location,
        severity: report.severity,
        weight: report.weight,
      },
      geometry: {
        type: 'Point',
        coordinates: report.coordinates,
      },
    })),
  };
}

function buildServiceZones(reports) {
  const zones = {
    north: { name: 'North Cluster', reports: [] },
    east: { name: 'East Cluster', reports: [] },
    south: { name: 'South Cluster', reports: [] },
    west: { name: 'West Cluster', reports: [] },
    central: { name: 'Central Cluster', reports: [] },
  };

  reports.forEach((report) => {
    const bucket = getZoneBucket(report.coordinates);
    zones[bucket].reports.push(report);
  });

  const features = Object.values(zones)
    .filter((zone) => zone.reports.length > 0)
    .map((zone) => {
      const points = zone.reports.map((report) => report.coordinates);
      const polygon = buildZonePolygon(points);

      return {
        type: 'Feature',
        properties: {
          name: zone.name,
          reportCount: zone.reports.length,
          risk: getZoneRisk(zone.reports),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygon],
        },
      };
    });

  return {
    type: 'FeatureCollection',
    features,
  };
}

function setVisibility(map, layerId, isVisible) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
  }
}

function ensureOperationalLayers(map, issuePoints, serviceZones, currentLocationPoint) {
  if (!map.getSource('issue-points')) {
    map.addSource('issue-points', {
      type: 'geojson',
      data: issuePoints,
    });
  }

  if (!map.getSource('service-zones')) {
    map.addSource('service-zones', {
      type: 'geojson',
      data: serviceZones,
    });
  }

  if (!map.getSource('current-location')) {
    map.addSource('current-location', {
      type: 'geojson',
      data: currentLocationPoint,
    });
  }

  if (!map.getLayer('zone-fill')) {
    map.addLayer({
      id: 'zone-fill',
      type: 'fill',
      source: 'service-zones',
      paint: {
        'fill-color': [
          'match',
          ['get', 'risk'],
          'High',
          '#ef4444',
          'Medium',
          '#f59e0b',
          'Low',
          '#22c55e',
          '#2170e4',
        ],
        'fill-opacity': [
          'match',
          ['get', 'risk'],
          'High',
          0.18,
          'Medium',
          0.15,
          'Low',
          0.12,
          0.14,
        ],
      },
    });
  }

  if (!map.getLayer('zone-outline')) {
    map.addLayer({
      id: 'zone-outline',
      type: 'line',
      source: 'service-zones',
      paint: {
        'line-color': [
          'match',
          ['get', 'risk'],
          'High',
          '#b91c1c',
          'Medium',
          '#b45309',
          'Low',
          '#15803d',
          '#1d4ed8',
        ],
        'line-width': 2,
        'line-opacity': 0.82,
      },
    });
  }

  if (!map.getLayer('zone-label')) {
    map.addLayer({
      id: 'zone-label',
      type: 'symbol',
      source: 'service-zones',
      layout: {
        'text-field': ['concat', ['get', 'name'], ' (', ['to-string', ['get', 'reportCount']], ')'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 13, 12],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-padding': 3,
      },
      paint: {
        'text-color': '#0f2f66',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.4,
      },
    });
  }

  if (!map.getLayer('issue-density')) {
    map.addLayer({
      id: 'issue-density',
      type: 'heatmap',
      source: 'issue-points',
      paint: {
        'heatmap-weight': [
          '*',
          ['get', 'weight'],
          ['match', ['get', 'severity'], 'High', 1.35, 'Medium', 1.05, 'Low', 0.78, 1],
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.65, 8, 1.15, 12, 1.75, 15, 2.15],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(29, 78, 216, 0)',
          0.08,
          '#1d4ed8',
          0.18,
          '#2563eb',
          0.34,
          '#06b6d4',
          0.5,
          '#22c55e',
          0.68,
          '#eab308',
          0.84,
          '#f97316',
          1,
          '#dc2626',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 30, 8, 54, 12, 72, 15, 88],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0, 5.5, 0, 7, 0.74, 12, 0.86],
      },
    });
  }

  if (!map.getLayer('issue-marker-shadow')) {
    map.addLayer({
      id: 'issue-marker-shadow',
      type: 'circle',
      source: 'issue-points',
      filter: ['==', ['get', 'pointType'], 'report'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 6, 10, 9, 15, 12],
        'circle-color': 'rgba(15, 23, 42, 0.22)',
        'circle-translate': [0, 2],
        'circle-blur': 0.2,
      },
    });
  }

  if (!map.getLayer('issue-marker-outer')) {
    map.addLayer({
      id: 'issue-marker-outer',
      type: 'circle',
      source: 'issue-points',
      filter: ['==', ['get', 'pointType'], 'report'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 5, 10, 7, 15, 9],
        'circle-color': [
          'match',
          ['get', 'severity'],
          'High',
          '#ef4444',
          'Medium',
          '#f59e0b',
          'Low',
          '#22c55e',
          '#3b82f6',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.96,
      },
    });
  }

  if (!map.getLayer('issue-marker-core')) {
    map.addLayer({
      id: 'issue-marker-core',
      type: 'circle',
      source: 'issue-points',
      filter: ['==', ['get', 'pointType'], 'report'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 1.4, 10, 2.1, 15, 2.6],
        'circle-color': '#ffffff',
        'circle-opacity': 0.96,
      },
    });
  }

  if (!map.getLayer('current-location-marker')) {
    map.addLayer({
      id: 'current-location-marker',
      type: 'circle',
      source: 'current-location',
      paint: {
        'circle-radius': 8,
        'circle-color': '#3b82f6',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.5,
        'circle-opacity': 0.95,
      },
    });
  }

  if (!map.getLayer('current-location-glow')) {
    map.addLayer({
      id: 'current-location-glow',
      type: 'circle',
      source: 'current-location',
      paint: {
        'circle-radius': 17,
        'circle-color': '#60a5fa',
        'circle-opacity': 0.18,
      },
    }, 'current-location-marker');
  }

  if (!map.getLayer('current-location-label')) {
    map.addLayer({
      id: 'current-location-label',
      type: 'symbol',
      source: 'current-location',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 9, 12, 14, 13],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1e3a8a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.4,
      },
    });
  }
}

function applyOperationalVisibility(map, activeLayer) {
  setVisibility(map, 'issue-density', activeLayer === 'Heatmap');
  setVisibility(map, 'issue-marker-shadow', activeLayer === 'Markers');
  setVisibility(map, 'issue-marker-outer', activeLayer === 'Markers');
  setVisibility(map, 'issue-marker-core', activeLayer === 'Markers');
  setVisibility(map, 'zone-fill', activeLayer === 'Zones');
  setVisibility(map, 'zone-outline', activeLayer === 'Zones');
  setVisibility(map, 'zone-label', activeLayer === 'Zones');
}

function applyBasemapBlend(map, resolvedViewMode, immediate = false) {
  if (!map.getLayer('street-base') || !map.getLayer('satellite-base')) {
    return;
  }

  const transition = { duration: immediate ? 0 : BASEMAP_TRANSITION_MS, delay: 0 };
  const satelliteOpacity = resolvedViewMode === 'Satellite' ? 1 : 0;
  const streetOpacity = resolvedViewMode === 'Street' ? 1 : 0;

  map.setPaintProperty('street-base', 'raster-opacity-transition', transition);
  map.setPaintProperty('satellite-base', 'raster-opacity-transition', transition);

  map.setPaintProperty('street-base', 'raster-opacity', streetOpacity);
  map.setPaintProperty('satellite-base', 'raster-opacity', satelliteOpacity);
}

function CityMapPanel({ embedded = false, reportsData = [] }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const resizeFrameRef = useRef(null);
  const geolocationWatchIdRef = useRef(null);
  const activeLayerRef = useRef('Heatmap');
  const defaultViewRef = useRef({ center: [0, 0], zoom: 0 });
  const normalizedReports = useMemo(() => {
    const mapped = (reportsData || [])
      .map((report) => {
        const lng = Number(report.longitude);
        const lat = Number(report.latitude);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return null;
        }

        const severity = report.severity || 'Low';
        const weight = /high|critical/i.test(severity) ? 0.9 : /medium/i.test(severity) ? 0.65 : 0.45;
        return {
          id: report.id,
          title: report.title || `Report #${report.id}`,
          location: report.location || 'Unknown location',
          coordinates: [lng, lat],
          severity,
          weight,
        };
      })
      .filter(Boolean);

    return mapped.length ? mapped : FALLBACK_REPORTS;
  }, [reportsData]);
  const normalizedReportsRef = useRef(normalizedReports);

  const issueDataRef = useRef(buildIssuePoints(normalizedReports));
  const serviceZoneRef = useRef(buildServiceZones(normalizedReports));
  const currentLocationRef = useRef(buildCurrentLocationPoint(DEFAULT_CENTER));
  const [activeLayer, setActiveLayer] = useState('Heatmap');
  const [viewMode, setViewMode] = useState('Auto');
  const [mapZoom, setMapZoom] = useState(0);
  const [isGlobeMode, setIsGlobeMode] = useState(false);

  const resolvedViewMode = viewMode === 'Auto' ? (mapZoom <= AUTO_STYLE_ZOOM ? 'Satellite' : 'Street') : viewMode;
  const isFarView = mapZoom <= AUTO_STYLE_ZOOM;

  useEffect(() => {
    normalizedReportsRef.current = normalizedReports;
  }, [normalizedReports]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: COMPOSITE_BASE_STYLE,
      center: DEFAULT_CENTER,
      zoom: 13,
      attributionControl: false,
      scrollZoom: true,
      minZoom: MIN_MAP_ZOOM,
      maxZoom: MAX_MAP_ZOOM,
      renderWorldCopies: false,
    });

    mapRef.current = map;
    map.scrollZoom.enable();

    map.on('style.load', () => {
      ensureOperationalLayers(
        map,
        issueDataRef.current,
        serviceZoneRef.current,
        currentLocationRef.current
      );
      applyOperationalVisibility(map, activeLayerRef.current);
      applyBasemapBlend(map, 'Street', true);

      try {
        if (typeof map.setProjection === 'function') {
          map.setProjection({ type: 'globe' });
        }
      } catch {
        // Keep default projection if globe projection is unavailable.
      }
    });

    map.on('load', () => {
      const reportBounds = new maplibregl.LngLatBounds();
      normalizedReportsRef.current.forEach((report) => reportBounds.extend(report.coordinates));

      map.fitBounds(reportBounds, {
        padding: { top: 70, right: 70, bottom: 70, left: 70 },
        maxZoom: 13.8,
        duration: 0,
        essential: true,
      });

      map.resize();
      defaultViewRef.current = {
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
      };
      setMapZoom(map.getZoom());

      const updateCurrentLocationFromPosition = (position) => {
        const activeMap = mapRef.current;
        if (!activeMap) {
          return;
        }

        const coordinates = [position.coords.longitude, position.coords.latitude];
        currentLocationRef.current = buildCurrentLocationPoint(coordinates);

        const currentLocationSource = activeMap.getSource('current-location');
        if (currentLocationSource && typeof currentLocationSource.setData === 'function') {
          currentLocationSource.setData(currentLocationRef.current);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          updateCurrentLocationFromPosition,
          () => {
            // Keep default fallback location if permission is denied.
          },
          {
            enableHighAccuracy: true,
            timeout: GEOLOCATION_TIMEOUT_MS,
            maximumAge: 0,
          }
        );

        if (typeof navigator.geolocation.watchPosition === 'function') {
          geolocationWatchIdRef.current = navigator.geolocation.watchPosition(
            updateCurrentLocationFromPosition,
            () => {
              // Keep fallback location when live updates are unavailable.
            },
            {
              enableHighAccuracy: true,
              timeout: GEOLOCATION_TIMEOUT_MS,
              maximumAge: 5000,
            }
          );
        }
      }
    });

    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      if (geolocationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const issuePoints = buildIssuePoints(normalizedReports);
    const serviceZones = buildServiceZones(normalizedReports);
    issueDataRef.current = issuePoints;
    serviceZoneRef.current = serviceZones;

    const issueSource = map.getSource('issue-points');
    if (issueSource && typeof issueSource.setData === 'function') {
      issueSource.setData(issuePoints);
    }

    const zoneSource = map.getSource('service-zones');
    if (zoneSource && typeof zoneSource.setData === 'function') {
      zoneSource.setData(serviceZones);
    }

    if (normalizedReports.length) {
      const bounds = new maplibregl.LngLatBounds();
      normalizedReports.forEach((report) => bounds.extend(report.coordinates));
      map.fitBounds(bounds, {
        padding: { top: 70, right: 70, bottom: 70, left: 70 },
        maxZoom: 13.8,
        duration: 450,
        essential: true,
      });
    }
  }, [normalizedReports]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = requestAnimationFrame(() => {
        map.resize();
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    activeLayerRef.current = activeLayer;

    const map = mapRef.current;
    if (!map) {
      return;
    }

    applyOperationalVisibility(map, activeLayer);
  }, [activeLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    applyBasemapBlend(map, resolvedViewMode);
  }, [resolvedViewMode]);

  useEffect(() => {
    setIsGlobeMode(mapZoom <= GLOBE_ZOOM_THRESHOLD && resolvedViewMode === 'Satellite');
  }, [mapZoom, resolvedViewMode]);

  const adjustZoom = (delta) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const nextZoom = Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, map.getZoom() + delta));
    map.easeTo({ zoom: nextZoom, duration: 280, essential: true });
  };

  const recenter = () => {
    const { center, zoom } = defaultViewRef.current;

    mapRef.current?.flyTo({
      center,
      zoom,
      duration: 850,
      essential: true,
    });
  };

  const panelClass = embedded
    ? 'relative h-full w-full overflow-hidden bg-black'
    : 'relative h-full min-h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-black';

  return (
    <div className={panelClass}>
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {isFarView && <div className={STAR_FIELD_CLASS} />}

      {!isGlobeMode && !isFarView && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-100/20 to-slate-900/5 mix-blend-multiply" />
      )}

      <div className="absolute left-6 top-6 z-10 flex flex-col items-start gap-3">
        <div className="w-fit rounded-full border border-white/50 bg-white/90 p-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1">
          {['Heatmap', 'Markers', 'Zones'].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveLayer(label)}
              className={`rounded-full px-4 py-1.5 text-[10px] font-bold transition ${
                activeLayer === label ? 'bg-primary text-white' : 'text-primary hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>

        <div className="w-fit rounded-full border border-white/50 bg-white/90 p-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1">
          {['Auto', 'Street', 'Satellite'].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setViewMode(label)}
              className={`rounded-full px-4 py-1.5 text-[10px] font-bold transition ${
                viewMode === label ? 'bg-primary text-white' : 'text-primary hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10 max-w-xs rounded-xl border border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Density Legend</h5>
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#1d4ed8] via-[#22c55e] via-[#eab308] to-[#dc2626]" />
          <div className="flex justify-between text-[9px] font-bold uppercase text-on-primary-container">
            <span>None</span>
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="absolute right-6 top-6 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => adjustZoom(1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary shadow-md transition hover:bg-slate-50"
          aria-label="Zoom in"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary shadow-md transition hover:bg-slate-50"
          aria-label="Zoom out"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={recenter}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary shadow-md transition hover:bg-slate-50"
          aria-label="Recenter map"
        >
          <Crosshair size={18} />
        </button>
      </div>
    </div>
  );
}

export default CityMapPanel;
