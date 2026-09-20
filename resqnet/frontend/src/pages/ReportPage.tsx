import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, Users, Send, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { IncidentType } from '../types';

const INCIDENT_TYPES: { value: IncidentType; label: string; emoji: string }[] = [
  { value: 'road_accident', label: 'Road Accident', emoji: '🚗' },
  { value: 'medical_emergency', label: 'Medical Emergency', emoji: '🏥' },
  { value: 'fire', label: 'Fire', emoji: '🔥' },
  { value: 'natural_disaster', label: 'Natural Disaster', emoji: '🌊' },
  { value: 'other', label: 'Other Emergency', emoji: '⚠️' },
];

// KL landmarks for location picker
const KL_LOCATIONS = [
  { label: 'KLCC / Petronas Towers', lat: 3.1578, lng: 101.7116 },
  { label: 'Central Junction, Jalan Ampang', lat: 3.1570, lng: 101.7120 },
  { label: 'Mid Valley Megamall', lat: 3.1173, lng: 101.6773 },
  { label: 'Bukit Bintang', lat: 3.1462, lng: 101.7100 },
  { label: 'Chow Kit Market', lat: 3.1640, lng: 101.6980 },
  { label: 'KL Sentral', lat: 3.1339, lng: 101.6866 },
  { label: 'Masjid India', lat: 3.1520, lng: 101.7010 },
  { label: 'Bangsar', lat: 3.1218, lng: 101.6733 },
];

export default function ReportPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    incident_type: '' as IncidentType | '',
    description: '',
    location: '',
    latitude: 3.1570,
    longitude: 101.7120,
    affected_people: 1,
    reporter_name: '',
    reporter_phone: '',
  });

  const setField = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleLocationPick = (loc: typeof KL_LOCATIONS[0]) => {
    setField('location', loc.label);
    setField('latitude', loc.lat);
    setField('longitude', loc.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.description.trim() || form.description.length < 10) {
      setError('Please provide a description of at least 10 characters.');
      return;
    }
    if (!form.location.trim()) {
      setError('Please provide a location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.incidents.create({
        incident_type: form.incident_type || undefined,
        description: form.description,
        location: form.location,
        latitude: form.latitude,
        longitude: form.longitude,
        affected_people: form.affected_people,
        reporter_name: form.reporter_name || undefined,
        reporter_phone: form.reporter_phone || undefined,
      });
      setSuccess(res.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit incident. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Incident Reported</h2>
        <p className="text-slate-400 mb-2">Your emergency has been submitted. AI analysis is starting.</p>
        <div className="font-mono text-lg text-emergency-300 font-bold bg-emergency-950/50 border border-emergency-700/30 rounded-lg px-6 py-3 mb-6">
          {success}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(`/incidents/${success}`)}
            className="btn-emergency"
            id="view-new-incident-btn"
          >
            Track Incident
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-outline"
          >
            Command Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle size={22} className="text-emergency-400" />
            Report Emergency
          </h1>
          <p className="text-slate-400 text-sm">Submit a new emergency incident for AI coordination</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="report-form">
        {/* Incident type */}
        <div className="card">
          <label className="label">Incident Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INCIDENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                id={`incident-type-${t.value}`}
                onClick={() => setField('incident_type', t.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  form.incident_type === t.value
                    ? 'bg-command-600/20 border-command-500 text-white'
                    : 'bg-dark-800 border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-left">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="card">
          <label className="label" htmlFor="description">Description *</label>
          <textarea
            id="description"
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            rows={4}
            placeholder="Describe the emergency in detail: what happened, number of people affected, visible injuries, hazards..."
            className="input resize-none"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Be as specific as possible. The AI analyzes your description to determine severity and required resources.
          </p>
        </div>

        {/* Location */}
        <div className="card">
          <label className="label">Location *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
            {KL_LOCATIONS.map(loc => (
              <button
                key={loc.label}
                type="button"
                onClick={() => handleLocationPick(loc)}
                className={`text-xs px-2 py-1.5 rounded-lg border transition-all text-left ${
                  form.location === loc.label
                    ? 'bg-command-600/20 border-command-500 text-white'
                    : 'bg-dark-800 border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            <input
              id="location"
              type="text"
              value={form.location}
              onChange={e => setField('location', e.target.value)}
              placeholder="Or type a specific location..."
              className="input"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="label">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={e => setField('latitude', parseFloat(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={e => setField('longitude', parseFloat(e.target.value))}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Affected people */}
        <div className="card">
          <label className="label" htmlFor="affected_people">
            <span className="flex items-center gap-1"><Users size={12} />People Affected *</span>
          </label>
          <input
            id="affected_people"
            type="number"
            min="0"
            max="999"
            value={form.affected_people}
            onChange={e => setField('affected_people', parseInt(e.target.value) || 0)}
            className="input w-32"
          />
        </div>

        {/* Reporter info */}
        <div className="card">
          <label className="label">Reporter Information (Optional)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs" htmlFor="reporter_name">Name</label>
              <input
                id="reporter_name"
                type="text"
                value={form.reporter_name}
                onChange={e => setField('reporter_name', e.target.value)}
                placeholder="Your name"
                className="input"
              />
            </div>
            <div>
              <label className="label text-xs" htmlFor="reporter_phone">Phone</label>
              <input
                id="reporter_phone"
                type="tel"
                value={form.reporter_phone}
                onChange={e => setField('reporter_phone', e.target.value)}
                placeholder="Your phone"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-emergency-950/50 border border-emergency-700/30 rounded-lg p-3 text-emergency-300 text-sm">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* AI disclaimer */}
        <div className="text-xs text-slate-500 bg-dark-900 rounded-lg p-3 border border-white/5">
          ⚠️ This system provides <strong className="text-slate-400">AI-generated coordination recommendations</strong> only.
          All dispatching decisions require human operator approval.
          Do not use for real emergencies — call your local emergency number.
        </div>

        {/* Submit */}
        <button
          type="submit"
          id="submit-emergency-btn"
          disabled={submitting}
          className="btn-emergency w-full py-3 justify-center text-base"
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> Submitting Emergency...</>
          ) : (
            <><Send size={18} /> Submit Emergency Report</>
          )}
        </button>
      </form>
    </div>
  );
}
