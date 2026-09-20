import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Users, Clock, RefreshCw,
  AlertTriangle, Ambulance, Hospital, Navigation
} from 'lucide-react';
import { api } from '../services/api';
import type { Incident, ResponseEvent, RouteResult } from '../types';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { AIAnalysisPanel, CoordinationPanel } from '../components/AIPanels';
import RoutePanel from '../components/RoutePanel';
import ResponseTimeline from '../components/ResponseTimeline';
import LiveMap from '../components/LiveMap';

const STATUS_OPTIONS = [
  'reported', 'analyzing', 'resources_matched',
  'dispatched', 'en_route', 'arrived', 'resolved',
];

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<ResponseEvent[]>([]);
  const [routes, setRoutes] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [coordLoading, setCoordLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'coordination' | 'route' | 'timeline'>('analysis');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inc, tl] = await Promise.all([
        api.incidents.get(id),
        api.incidents.getTimeline(id),
      ]);
      setIncident(inc);
      setTimeline(tl);

      if (inc.assigned_ambulance_id || inc.assigned_hospital_id) {
        try {
          const r = await api.incidents.getRoutes(id);
          setRoutes(r);
        } catch {}
      }
    } catch (err) {
      setError('Incident not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCoordinate = async () => {
    if (!id) return;
    setCoordLoading(true);
    try {
      await api.incidents.coordinate(id);
      await load();
      setActiveTab('coordination');
    } catch (err) {
      console.error('Coordination failed:', err);
    } finally {
      setCoordLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || !incident) return;
    setStatusUpdating(true);
    try {
      await api.incidents.updateStatus(id, newStatus);
      await load();
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-command-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle size={40} className="text-emergency-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Incident Not Found</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const typeLabel = incident.incident_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  const tabs = [
    { id: 'analysis', label: 'AI Analysis' },
    { id: 'coordination', label: 'Coordination' },
    { id: 'route', label: 'Routes' },
    { id: 'timeline', label: `Timeline (${timeline.length})` },
  ] as const;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost mt-1"
          id="back-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="font-mono text-sm text-slate-400 mb-0.5">{incident.id}</div>
          <h1 className="text-2xl font-bold text-white">{typeLabel}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {/* Status updater */}
        <div className="flex items-center gap-2">
          <select
            id="status-selector"
            value={incident.status}
            onChange={e => handleStatusUpdate(e.target.value)}
            disabled={statusUpdating}
            className="input text-sm py-1.5 w-auto pr-8"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
          {statusUpdating && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
        </div>
      </div>

      {/* Key info row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={10} />Location</div>
          <div className="text-sm text-white font-medium truncate">{incident.location}</div>
        </div>
        <div className="card-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Users size={10} />Affected</div>
          <div className="text-sm text-white font-medium">{incident.affected_people} person(s)</div>
        </div>
        <div className="card-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Clock size={10} />ETA</div>
          <div className="text-sm text-white font-medium">
            {incident.estimated_eta ? `${incident.estimated_eta} min` : '—'}
          </div>
        </div>
        <div className="card-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><AlertTriangle size={10} />Reported</div>
          <div className="text-sm text-white font-medium font-mono text-xs">
            {incident.created_at ? new Date(incident.created_at).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: description + AI tabs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card">
            <h3 className="section-title mb-2">
              <AlertTriangle size={14} className="text-emergency-400" />
              Incident Report
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">{incident.description}</p>
            {incident.reporter_name && (
              <p className="text-xs text-slate-500 mt-2">Reported by: {incident.reporter_name}</p>
            )}
          </div>

          {/* AI Actions */}
          {!incident.coordination_plan && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCoordinate}
                disabled={coordLoading}
                className="btn-primary"
                id="run-coordination-btn"
              >
                {coordLoading ? (
                  <><RefreshCw size={14} className="animate-spin" /> Running AI Pipeline...</>
                ) : (
                  <><Navigation size={14} /> Run AI Coordination</>
                )}
              </button>
            </div>
          )}

          {/* Tab navigation */}
          <div className="card p-0 overflow-hidden">
            <div className="flex border-b border-white/5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    activeTab === tab.id
                      ? 'text-command-400 border-b-2 border-command-400 bg-command-950/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {activeTab === 'analysis' && <AIAnalysisPanel incident={incident} />}
              {activeTab === 'coordination' && (
                <CoordinationPanel plan={incident.coordination_plan || null} />
              )}
              {activeTab === 'route' && <RoutePanel routes={routes} />}
              {activeTab === 'timeline' && <ResponseTimeline events={timeline} />}
            </div>
          </div>
        </div>

        {/* Right column: map + assigned */}
        <div className="space-y-4">
          {/* Map */}
          <div className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-white/5 text-sm font-semibold text-white flex items-center gap-2">
              <MapPin size={14} className="text-command-400" />
              Incident Map
            </div>
            <LiveMap
              incidents={[incident]}
              resources={incident.assigned_ambulance ? [{
                id: incident.assigned_ambulance.id,
                name: incident.assigned_ambulance.name,
                resource_type: 'ambulance',
                status: incident.assigned_ambulance.status as 'available',
                latitude: incident.assigned_ambulance.latitude,
                longitude: incident.assigned_ambulance.longitude,
                capabilities: [],
              }] : []}
              hospitals={incident.assigned_hospital ? [{
                id: incident.assigned_hospital.id,
                name: incident.assigned_hospital.name,
                latitude: incident.assigned_hospital.latitude,
                longitude: incident.assigned_hospital.longitude,
                capacity: 0,
                available_capacity: 0,
                trauma_capable: incident.assigned_hospital.trauma_capable,
                icu_available: false,
                emergency_dept: true,
                status: 'operational',
              }] : []}
              height="280px"
              selectedIncident={incident}
            />
          </div>

          {/* Assigned ambulance */}
          {incident.assigned_ambulance && (
            <div className="card">
              <h3 className="section-title mb-3">
                <Ambulance size={14} className="text-blue-400" />
                Assigned Ambulance
              </h3>
              <div className="bg-dark-800 rounded-lg p-3">
                <div className="font-semibold text-white">{incident.assigned_ambulance.name}</div>
                <div className="text-xs text-slate-400 mt-1">ID: {incident.assigned_ambulance.id}</div>
                <div className="text-xs text-blue-400 capitalize mt-0.5">{incident.assigned_ambulance.status}</div>
              </div>
            </div>
          )}

          {/* Assigned hospital */}
          {incident.assigned_hospital && (
            <div className="card">
              <h3 className="section-title mb-3">
                <Hospital size={14} className="text-emerald-400" />
                Assigned Hospital
              </h3>
              <div className="bg-dark-800 rounded-lg p-3">
                <div className="font-semibold text-white">{incident.assigned_hospital.name}</div>
                {incident.assigned_hospital.trauma_capable && (
                  <div className="text-xs text-red-400 mt-1">🏥 Trauma Capable</div>
                )}
                <div className="text-xs text-slate-400 mt-0.5">ID: {incident.assigned_hospital.id}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
