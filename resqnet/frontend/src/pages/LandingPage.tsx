import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Shield, Zap } from 'lucide-react';

interface LandingPageProps {
  onSimulate?: () => void;
}

export default function LandingPage({ onSimulate }: LandingPageProps) {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
        <section className="card p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-command-600/30 bg-command-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-command-300">
            <Shield size={14} /> AI Emergency Coordination Engine
          </div>

          <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Coordinate the entire emergency network with live AI decision support.
          </h1>

          <p className="mt-4 max-w-xl text-sm sm:text-base text-slate-300">
            Our AI continuously ranks incidents, predicts routing pressure, matches resources, and recommends the fastest
            hospital and dispatch plan across the whole response system.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard" className="btn-primary">
              <Activity size={16} /> Open AI Command Center
            </Link>
            <button onClick={onSimulate} className="btn-emergency">
              <Zap size={16} /> Run AI Simulation
            </button>
            <Link to="/report" className="btn-outline">
              <AlertTriangle size={16} /> Report Emergency
            </Link>
          </div>

          <div className="mt-8 grid sm:grid-cols-4 gap-3">
            {[
              ['12', 'Active incidents'],
              ['4', 'Critical alerts'],
              ['91%', 'AI confidence'],
              ['5', 'Agents active'],
            ].map(([value, label]) => (
              <div key={label} className="bg-dark-800/80 border border-white/5 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">Live decision support</div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Critical incidents</span>
                <span className="font-semibold text-emergency-400">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ambulances available</span>
                <span className="font-semibold text-blue-400">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hospitals at risk</span>
                <span className="font-semibold text-amber-400">2</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">What the platform evaluates</div>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Resource conflicts across live incidents</li>
              <li>• Hospital capacity and trauma readiness</li>
              <li>• Route congestion and ETA degradation</li>
              <li>• Cascading risks and reserve coverage</li>
            </ul>
            <Link to="/analytics" className="mt-4 inline-flex items-center gap-2 text-sm text-command-300 hover:text-white">
              View network analytics <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
