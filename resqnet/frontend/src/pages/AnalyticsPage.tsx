import { useEffect, useState } from 'react';
import { BarChart3, Gauge, HeartPulse, ShieldAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api';
import type { AnalyticsData } from '../types';

const EMPTY: AnalyticsData = {
  incidents_by_type: [],
  incidents_by_severity: [],
  incidents_by_status: [],
  avg_response_time_min: 0,
  resource_utilization_pct: 0,
  total_resources: 0,
  busy_resources: 0,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const analytics = await api.analytics.get();
        setData(analytics);
      } catch (err) {
        console.error('Analytics fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-400">Loading analytics...</div>;
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="text-command-400" size={18} />
        <h1 className="text-2xl font-bold text-white">Network Analytics</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 uppercase">Avg Response</div>
          <div className="mt-2 text-3xl font-bold text-white">{data.avg_response_time_min.toFixed(1)}</div>
          <div className="text-xs text-slate-500">minutes</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 uppercase">Resource Utilization</div>
          <div className="mt-2 text-3xl font-bold text-white">{data.resource_utilization_pct}%</div>
          <div className="text-xs text-slate-500">busy units</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 uppercase">Total resources</div>
          <div className="mt-2 text-3xl font-bold text-white">{data.total_resources}</div>
          <div className="text-xs text-slate-500">tracked assets</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 uppercase">Busy assets</div>
          <div className="mt-2 text-3xl font-bold text-white">{data.busy_resources}</div>
          <div className="text-xs text-slate-500">currently active</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="section-header">
            <h2 className="section-title"><Gauge size={14} className="text-command-400" /> Incidents by type</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.incidents_by_type}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="type" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h2 className="section-title"><ShieldAlert size={14} className="text-emergency-400" /> Severity distribution</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.incidents_by_severity} dataKey="count" nameKey="severity" innerRadius={50} outerRadius={90} fill="#60a5fa" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2 className="section-title"><HeartPulse size={14} className="text-emerald-400" /> Operational status</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.incidents_by_status}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="status" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
