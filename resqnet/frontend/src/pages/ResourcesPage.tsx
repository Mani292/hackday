import { useEffect, useState } from 'react';
import { Ambulance, Building2, Flame, Shield, Truck } from 'lucide-react';
import { api } from '../services/api';
import type { Hospital, Resource } from '../types';

const resourceIconMap = {
  ambulance: Ambulance,
  fire_unit: Flame,
  rescue_team: Shield,
  police: Truck,
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [res, hosp] = await Promise.all([
          api.resources.list(),
          api.hospitals.list(),
        ]);
        setResources(res);
        setHospitals(hosp);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading resources and hospitals...
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Resources & Hospital Network</h1>
        <p className="text-slate-400 text-sm">Operational posture and live allocation view across the emergency network.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Field Resources</h2>
          </div>
          <div className="space-y-3">
            {resources.map((resource) => {
              const Icon = resourceIconMap[resource.resource_type] ?? Ambulance;
              return (
                <div key={resource.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-dark-800/70 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-command-900/60 p-2">
                      <Icon size={16} className="text-command-300" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{resource.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{resource.resource_type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold uppercase ${resource.status === 'available' ? 'text-green-400' : 'text-amber-300'}`}>
                      {resource.status}
                    </div>
                    <div className="text-xs text-slate-500">{resource.capabilities.join(', ') || 'General support'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title"><Building2 size={14} className="text-emerald-400" /> Hospitals</h2>
          </div>
          <div className="space-y-3">
            {hospitals.map((hospital) => (
              <div key={hospital.id} className="rounded-xl border border-white/5 bg-dark-800/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{hospital.name}</div>
                    <div className="text-xs text-slate-400">Capacity {hospital.available_capacity}/{hospital.capacity}</div>
                  </div>
                  <div className={`text-xs font-semibold uppercase ${hospital.status === 'operational' ? 'text-green-400' : 'text-amber-300'}`}>
                    {hospital.status}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {hospital.trauma_capable && <span className="rounded-full bg-red-900/40 px-2 py-1">Trauma</span>}
                  {hospital.icu_available && <span className="rounded-full bg-purple-900/40 px-2 py-1">ICU</span>}
                  {hospital.emergency_dept && <span className="rounded-full bg-blue-900/40 px-2 py-1">ED</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
