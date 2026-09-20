import { Navigation, Clock, Gauge, CheckCircle, AlertTriangle } from 'lucide-react';
import type { RouteResult } from '../types';

function TrafficBadge({ traffic }: { traffic: string }) {
  const config: Record<string, { label: string; color: string }> = {
    light: { label: 'Light Traffic', color: 'text-green-400' },
    moderate: { label: 'Moderate Traffic', color: 'text-amber-400' },
    heavy: { label: 'Heavy Traffic', color: 'text-red-400' },
  };
  const cfg = config[traffic] || { label: traffic, color: 'text-slate-400' };
  return <span className={`text-xs font-medium ${cfg.color}`}>⬤ {cfg.label}</span>;
}

interface RoutePanelProps {
  routes: RouteResult | null;
}

export default function RoutePanel({ routes }: RoutePanelProps) {
  if (!routes) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Route information not available.
      </div>
    );
  }

  const { primary_route, alternative_route } = routes;

  return (
    <div className="space-y-3">
      {/* Primary route */}
      <div className="bg-command-950/50 border border-command-700/40 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-command-600 flex items-center justify-center">
              <CheckCircle size={14} className="text-white" />
            </div>
            <div>
              <div className="text-xs text-command-400 font-semibold uppercase tracking-wide">Recommended Route</div>
              <div className="text-sm font-semibold text-white">{primary_route.name}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
            <Clock size={14} className="text-command-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{primary_route.eta_minutes}</div>
            <div className="text-xs text-slate-400">minutes</div>
          </div>
          <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
            <Navigation size={14} className="text-command-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{primary_route.distance_km}</div>
            <div className="text-xs text-slate-400">km</div>
          </div>
          <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
            <Gauge size={14} className="text-command-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-white capitalize">{primary_route.traffic}</div>
            <div className="text-xs text-slate-400">traffic</div>
          </div>
        </div>

        <TrafficBadge traffic={primary_route.traffic} />

        {/* Waypoints */}
        {primary_route.waypoints && primary_route.waypoints.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto">
            {primary_route.waypoints.map((wp, idx) => (
              <span key={idx} className="flex items-center gap-1.5 shrink-0">
                <span className="bg-command-600/30 text-command-300 px-2 py-0.5 rounded-full">
                  {wp.name}
                </span>
                {idx < primary_route.waypoints.length - 1 && <span className="text-slate-600">→</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alternative route */}
      <div className="bg-dark-900 border border-white/5 rounded-xl p-4 opacity-80">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
              <AlertTriangle size={14} className="text-slate-300" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Alternative Route</div>
              <div className="text-sm font-semibold text-slate-300">{alternative_route.name}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-800 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-slate-300">{alternative_route.eta_minutes}</div>
            <div className="text-xs text-slate-500">minutes</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-slate-300">{alternative_route.distance_km}</div>
            <div className="text-xs text-slate-500">km</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-2.5 text-center">
            <div className="text-sm font-bold text-slate-300 capitalize">{alternative_route.traffic}</div>
            <div className="text-xs text-slate-500">traffic</div>
          </div>
        </div>

        <div className="mt-2">
          <TrafficBadge traffic={alternative_route.traffic} />
        </div>
      </div>

      {routes.leg_to_incident_km !== undefined && (
        <div className="text-xs text-slate-500 flex gap-4 px-1">
          <span>📍 To scene: {routes.leg_to_incident_km} km</span>
          <span>🏥 To hospital: {routes.leg_to_hospital_km} km</span>
        </div>
      )}
    </div>
  );
}
