import { useEffect, useState } from 'react';
import * as L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import type { Incident, Resource, Hospital } from '../types';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFqaW4zM2siLCJhIjoiY211OW55NXF1MDNxcTJ3czd4N2hoOGYxcyJ9.lm6xjumcxbZzFT-kjNyGRw';
const MAPBOX_TILE_URL = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons using divIcon
function createIcon(color: string, symbol: string, size: number = 28) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.8);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "><span style="transform: rotate(45deg); font-size: ${size * 0.45}px; line-height:1">${symbol}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const incidentIcon = (severity: string | null) => {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };
  return createIcon(colors[severity || 'medium'] || '#ef4444', '🚨', 32);
};

const ambulanceIcon = createIcon('#3b82f6', '🚑', 26);
const hospitalIcon = createIcon('#10b981', '🏥', 26);
const fireIcon = createIcon('#f97316', '🚒', 26);
const rescueIcon = createIcon('#8b5cf6', '🆘', 26);
const policeIcon = createIcon('#64748b', '🚔', 26);

function resourceIcon(type: string) {
  if (type === 'ambulance') return ambulanceIcon;
  if (type === 'fire_unit') return fireIcon;
  if (type === 'rescue_team') return rescueIcon;
  if (type === 'police') return policeIcon;
  return ambulanceIcon;
}

// Auto-fit bounds when data changes
function FitBounds({ incidents, resources }: { incidents: Incident[]; resources: Resource[] }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      ...incidents.map((i): [number, number] => [i.latitude, i.longitude]),
      ...resources.filter(r => r.status !== 'offline').map((r): [number, number] => [r.latitude, r.longitude]),
    ];

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [incidents, resources, map]);

  return null;
}

interface LiveMapProps {
  incidents: Incident[];
  resources: Resource[];
  hospitals: Hospital[];
  height?: string;
  selectedIncident?: Incident | null;
  routePath?: [number, number][];
}

function buildRoadLikePolyline(points: [number, number][]): [number, number][] {
  if (points.length < 2) return points;

  const corridor: [number, number][] = [points[0]];

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];

    const latDelta = next[0] - current[0];
    const lngDelta = next[1] - current[1];
    const absLat = Math.abs(latDelta);
    const absLng = Math.abs(lngDelta);
    const dominantAxis = absLat >= absLng ? 'lat' : 'lng';
    const roadBias = 0.004 + Math.min(0.014, (absLat + absLng) * 0.8);

    const laneLat = dominantAxis === 'lat' ? Math.sign(latDelta || 1) * roadBias * 0.8 : Math.sign(lngDelta || 1) * roadBias * 0.2;
    const laneLng = dominantAxis === 'lng' ? Math.sign(lngDelta || 1) * roadBias * 0.8 : Math.sign(latDelta || 1) * roadBias * 0.2;

    const bendA: [number, number] = [
      current[0] + latDelta * 0.22 + laneLat,
      current[1] + lngDelta * 0.22 + laneLng,
    ];
    const mid: [number, number] = [
      (current[0] + next[0]) / 2 + laneLat * 1.5,
      (current[1] + next[1]) / 2 + laneLng * 1.5,
    ];
    const bendB: [number, number] = [
      next[0] - latDelta * 0.22 + laneLat * 0.5,
      next[1] - lngDelta * 0.22 + laneLng * 0.5,
    ];

    const path = [current, bendA, mid, bendB, next];
    const samples = 8;

    for (let step = 1; step < path.length; step += 1) {
      const prev = path[step - 1];
      const curr = path[step];
      for (let s = 1; s <= samples; s += 1) {
        const t = s / samples;
        const lat = prev[0] + (curr[0] - prev[0]) * t;
        const lng = prev[1] + (curr[1] - prev[1]) * t;
        corridor.push([lat, lng]);
      }
    }
  }

  return corridor.filter((point, index, arr) => index === 0 || !(Math.abs(point[0] - arr[index - 1][0]) < 1e-10 && Math.abs(point[1] - arr[index - 1][1]) < 1e-10));
}

export default function LiveMap({
  incidents,
  resources,
  hospitals,
  height = '400px',
  selectedIncident,
  routePath,
}: LiveMapProps) {
  // India demo center
  const center: [number, number] = [28.6139, 77.2090];

  // Build route polylines for the active incident or the map overview
  const routePoints: [number, number][] = routePath ? [...routePath] : [];
  if (!routePoints.length && selectedIncident) {
    const amb = resources.find(r => r.id === selectedIncident.assigned_ambulance_id);
    if (amb) routePoints.push([amb.latitude, amb.longitude]);
    routePoints.push([selectedIncident.latitude, selectedIncident.longitude]);
    const hosp = hospitals.find(h => h.id === selectedIncident.assigned_hospital_id);
    if (hosp) routePoints.push([hosp.latitude, hosp.longitude]);
  }

  const incidentRoutes = incidents
    .map(incident => {
      const amb = resources.find(r => r.id === incident.assigned_ambulance_id);
      const hosp = hospitals.find(h => h.id === incident.assigned_hospital_id);
      const points: [number, number][] = [];
      if (amb) points.push([amb.latitude, amb.longitude]);
      points.push([incident.latitude, incident.longitude]);
      if (hosp) points.push([hosp.latitude, hosp.longitude]);
      return points.length > 1 ? { incidentId: incident.id, points } : null;
    })
    .filter(Boolean) as { incidentId: string; points: [number, number][] }[];

  const [mapboxRoutes, setMapboxRoutes] = useState<Record<string, [number, number][]>>({});

  useEffect(() => {
    const segments = routePath ? [{ incidentId: 'selected', points: routePoints }] : incidentRoutes;
    if (!segments.length || segments.every(seg => seg.points.length < 2)) {
      setMapboxRoutes({});
      return undefined;
    }

    let isMounted = true;
    const requests = segments.map(async ({ incidentId, points }) => {
      const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&steps=false&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      const geometry = data?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(geometry) && geometry.length > 1) {
        return {
          incidentId,
          route: geometry.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
        };
      }
      return { incidentId, route: buildRoadLikePolyline(points) };
    });

    Promise.all(requests)
      .then(results => {
        if (!isMounted) return;
        setMapboxRoutes(Object.fromEntries(results.map(r => [r.incidentId, r.route])));
      })
      .catch(() => {
        if (isMounted) {
          setMapboxRoutes(Object.fromEntries(segments.map(seg => [seg.incidentId, buildRoadLikePolyline(seg.points)])));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(routePath ?? []), JSON.stringify(incidents), JSON.stringify(resources), JSON.stringify(hospitals)]);

  const selectedRoadRoute = routePath && routePath.length > 1 ? mapboxRoutes.selected ?? buildRoadLikePolyline(routePath) : mapboxRoutes.selected ?? buildRoadLikePolyline(routePoints);

  return (
    <div style={{ height }} className="relative z-0 w-full rounded-xl overflow-hidden border border-slate-200 bg-white">
      <MapContainer
        center={center}
        zoom={12}
        className="z-0"
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url={MAPBOX_TILE_URL}
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={20}
          detectRetina={true}
        />

        <FitBounds incidents={incidents} resources={resources} />

        {/* Route polyline(s) */}
        {selectedRoadRoute.length >= 2 && (
          <Polyline
            positions={selectedRoadRoute}
            pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            smoothFactor={1.2}
          />
        )}

        {/* Incident markers */}
        {incidents.map(inc => (
          <Marker key={inc.id} position={[inc.latitude, inc.longitude]} icon={incidentIcon(inc.severity)}>
            <Popup>
              <div className="text-xs">
                <div className="font-mono font-bold text-emergency-300">{inc.id}</div>
                <div className="font-semibold capitalize">{inc.incident_type?.replace(/_/g, ' ')}</div>
                <div className="text-slate-300">{inc.location}</div>
                <div className="mt-1">
                  <span className="uppercase font-semibold" style={{ color: inc.severity === 'critical' ? '#ef4444' : inc.severity === 'high' ? '#f97316' : '#eab308' }}>
                    {inc.severity}
                  </span>
                  {' · '}{inc.status.replace(/_/g, ' ')}
                </div>
                {inc.affected_people > 0 && <div>{inc.affected_people} person(s) affected</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Resource markers */}
        {resources.map(r => (
          <Marker key={r.id} position={[r.latitude, r.longitude]} icon={resourceIcon(r.resource_type)}>
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{r.name}</div>
                <div className="capitalize">{r.resource_type.replace(/_/g, ' ')}</div>
                <div>Status: <span className="font-semibold capitalize">{r.status}</span></div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Hospital markers */}
        {hospitals.map(h => (
          <Marker key={h.id} position={[h.latitude, h.longitude]} icon={hospitalIcon}>
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{h.name}</div>
                <div>Capacity: {h.available_capacity}/{h.capacity}</div>
                <div>Trauma: {h.trauma_capable ? '✓' : '✗'} · ICU: {h.icu_available ? '✓' : '✗'}</div>
                <div>Status: <span className="font-semibold capitalize">{h.status}</span></div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
