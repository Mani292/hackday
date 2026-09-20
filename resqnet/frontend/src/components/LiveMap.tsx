import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Incident, Resource, Hospital } from '../types';

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
}

export default function LiveMap({
  incidents,
  resources,
  hospitals,
  height = '400px',
  selectedIncident,
}: LiveMapProps) {
  // KL center
  const center: [number, number] = [3.1390, 101.6869];

  // Build route polyline if a selected incident has ambulance + hospital
  const routePoints: [number, number][] = [];
  if (selectedIncident) {
    const amb = resources.find(r => r.id === selectedIncident.assigned_ambulance_id);
    if (amb) routePoints.push([amb.latitude, amb.longitude]);
    routePoints.push([selectedIncident.latitude, selectedIncident.longitude]);
    const hosp = hospitals.find(h => h.id === selectedIncident.assigned_hospital_id);
    if (hosp) routePoints.push([hosp.latitude, hosp.longitude]);
  }

  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden border border-white/5">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <FitBounds incidents={incidents} resources={resources} />

        {/* Route polyline */}
        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 4', opacity: 0.8 }}
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
