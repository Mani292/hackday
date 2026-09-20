import { Link } from 'react-router-dom';
import { Clock, Users, MapPin, Ambulance } from 'lucide-react';
import type { Incident } from '../types';
import { SeverityBadge, StatusBadge } from './Badges';

function IncidentTypeIcon({ type }: { type: string | null }) {
  const icons: Record<string, string> = {
    road_accident: '🚗',
    medical_emergency: '🏥',
    fire: '🔥',
    natural_disaster: '🌊',
    other: '⚠️',
  };
  return <span className="text-lg">{icons[type || 'other'] || '⚠️'}</span>;
}

interface IncidentCardProps {
  incident: Incident;
  compact?: boolean;
}

export function IncidentCard({ incident, compact = false }: IncidentCardProps) {
  const typeLabel = incident.incident_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';

  return (
    <Link
      to={`/incidents/${incident.id}`}
      id={`incident-card-${incident.id}`}
      className="block card-hover animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <IncidentTypeIcon type={incident.incident_type} />
          <div>
            <div className="font-mono text-xs text-slate-400">{incident.id}</div>
            <div className="font-semibold text-white text-sm">{typeLabel}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
        <MapPin size={11} />
        <span className="truncate">{incident.location}</span>
      </div>

      {!compact && (
        <>
          {/* Description */}
          <p className="text-slate-300 text-xs line-clamp-2 mb-3">{incident.description}</p>

          {/* Footer */}
          <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-white/5 pt-2">
            <span className="flex items-center gap-1">
              <Users size={10} />
              {incident.affected_people} affected
            </span>
            {incident.estimated_eta && (
              <span className="flex items-center gap-1 text-amber-400">
                <Clock size={10} />
                ETA {incident.estimated_eta} min
              </span>
            )}
            {incident.assigned_ambulance && (
              <span className="flex items-center gap-1 text-blue-400">
                <Ambulance size={10} />
                {incident.assigned_ambulance.name}
              </span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}
