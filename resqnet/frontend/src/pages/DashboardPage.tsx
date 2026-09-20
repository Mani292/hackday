import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Ambulance, Hospital, Users, Activity, RefreshCw, Zap, Shield } from 'lucide-react';
import { api } from '../services/api';
import type { Incident, Resource, Hospital as HospitalType, DashboardStats } from '../types';
import { IncidentCard } from '../components/IncidentCard';
import LiveMap from '../components/LiveMap';

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        <div className="text-right">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage({ onSimulate }: { onSimulate?: () => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    try {
      const [inc, res, hosp, st] = await Promise.all([
        api.incidents.list(),
        api.resources.list(),
        api.hospitals.list(),
        api.dashboard.stats(),
      ]);
      setIncidents(inc);
      setResources(res);
      setHospitals(hosp);
      setStats(st);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const criticalIncidents = activeIncidents.filter(i => i.severity === 'critical');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-command-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-command-400" />
            Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Live emergency operations dashboard · Refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSimulate && (
            <button onClick={onSimulate} className="btn-emergency" id="dashboard-simulate-btn">
              <Zap size={14} /> Simulate Emergency
            </button>
          )}
          <button onClick={refresh} className="btn-outline" id="refresh-dashboard-btn">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Critical alert banner */}
      {criticalIncidents.length > 0 && (
        <div className="flex items-center gap-3 bg-emergency-950/60 border border-emergency-700/50 rounded-xl p-4 animate-pulse-slow">
          <AlertTriangle size={20} className="text-emergency-400 shrink-0" />
          <div>
            <div className="font-semibold text-emergency-300">
              {criticalIncidents.length} CRITICAL INCIDENT{criticalIncidents.length > 1 ? 'S' : ''} ACTIVE
            </div>
            <div className="text-xs text-emergency-400/70">
              {criticalIncidents.map(i => i.id).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Active" value={stats?.active_incidents ?? 0} icon={Activity} color="bg-emergency-600" sub="Incidents" />
        <StatCard label="Critical" value={stats?.critical_incidents ?? 0} icon={AlertTriangle} color="bg-red-600" />
        <StatCard label="Ambulances" value={stats?.available_ambulances ?? 0} icon={Ambulance} color="bg-blue-600" sub="Available" />
        <StatCard label="Hospitals" value={stats?.available_hospitals ?? 0} icon={Hospital} color="bg-emerald-600" sub="Operational" />
        <StatCard label="Responders" value={stats?.active_responders ?? 0} icon={Users} color="bg-purple-600" sub="Deployed" />
        <StatCard label="Resolved" value={stats?.resolved_incidents ?? 0} icon={Activity} color="bg-slate-600" />
      </div>

      {/* Main grid: map + incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="p-3 border-b border-white/5 flex items-center gap-2">
            <Activity size={14} className="text-command-400" />
            <span className="text-sm font-semibold text-white">Live Incident Map</span>
            <span className="ml-auto text-xs text-slate-500">Kuala Lumpur Area · OpenStreetMap</span>
          </div>
          <LiveMap
            incidents={activeIncidents}
            resources={resources}
            hospitals={hospitals}
            height="460px"
          />
          {/* Map legend */}
          <div className="p-3 border-t border-white/5 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>🚨 Incident</span>
            <span>🚑 Ambulance</span>
            <span>🏥 Hospital</span>
            <span>🚒 Fire Unit</span>
            <span>🆘 Rescue</span>
          </div>
        </div>

        {/* Active incidents panel */}
        <div className="card p-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-emergency-400" />
              <span className="text-sm font-semibold text-white">Active Incidents</span>
            </div>
            <span className="badge bg-emergency-900/50 text-emergency-300 border border-emergency-700/30">
              {activeIncidents.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {activeIncidents.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No active incidents.
              </div>
            ) : (
              activeIncidents.map(inc => (
                <div key={inc.id} className="p-3">
                  <IncidentCard incident={inc} compact />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resource status overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ambulances */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Ambulance size={14} className="text-blue-400" />
              Ambulances
            </h3>
          </div>
          <div className="space-y-2">
            {resources.filter(r => r.resource_type === 'ambulance').map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.name}</span>
                <span className={`text-xs font-medium ${
                  r.status === 'available' ? 'text-green-400' :
                  r.status === 'dispatched' ? 'text-orange-400' : 'text-amber-400'
                }`}>{r.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hospitals */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Hospital size={14} className="text-emerald-400" />
              Hospitals
            </h3>
          </div>
          <div className="space-y-2">
            {hospitals.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-slate-300 truncate max-w-[160px]">{h.name}</div>
                  <div className="text-xs text-slate-500">Cap: {h.available_capacity}/{h.capacity}</div>
                </div>
                <div className="text-right">
                  {h.trauma_capable && <div className="text-xs text-red-400">Trauma</div>}
                  {h.icu_available && <div className="text-xs text-purple-400">ICU</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other resources */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Users size={14} className="text-orange-400" />
              Fire & Rescue
            </h3>
          </div>
          <div className="space-y-2">
            {resources.filter(r => r.resource_type !== 'ambulance').map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{r.name}</span>
                <span className={`text-xs font-medium ${r.status === 'available' ? 'text-green-400' : 'text-orange-400'}`}>
                  {r.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
