import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Shield, LayoutDashboard, AlertTriangle, Truck, BarChart3,
  X, Zap, Activity, Wifi, WifiOff
} from 'lucide-react';
import { api } from './services/api';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIAssistant from './components/AIAssistant';

function NavLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-command-600/20 text-command-400 border border-command-600/30'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function Navbar({ onSimulate }: { onSimulate: () => void }) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    api.health.check()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center shadow-lg shadow-emergency-900/50">
            <Shield size={16} className="text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-white text-base tracking-tight">ResQNet</span>
            <span className="text-slate-500 text-[10px] hidden sm:block">Emergency Response AI</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavLink to="/incidents" icon={AlertTriangle} label="Incidents" />
          <NavLink to="/resources" icon={Truck} label="Resources" />
          <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* API status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {apiOnline === null ? (
              <Activity size={12} className="text-slate-500 animate-pulse" />
            ) : apiOnline ? (
              <>
                <Wifi size={12} className="text-green-400" />
                <span className="text-green-400 font-mono">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-red-400" />
                <span className="text-red-400 font-mono">OFFLINE</span>
              </>
            )}
          </div>

          {/* Simulate button */}
          <button
            id="simulate-emergency-btn"
            onClick={onSimulate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-emergency-900/30"
          >
            <Zap size={14} />
            <span className="hidden sm:inline">Simulate</span>
          </button>

          <Link
            to="/report"
            className="btn-primary text-xs"
            id="report-emergency-nav-btn"
          >
            <AlertTriangle size={14} />
            <span className="hidden md:inline">Report Emergency</span>
            <span className="md:hidden">Report</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function SimulateModal({ isOpen, onClose, result }: {
  isOpen: boolean;
  onClose: () => void;
  result: { incident_id: string } | null;
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emergency-600/20 flex items-center justify-center">
              <Zap size={20} className="text-emergency-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Demo Emergency Simulated</h3>
              <p className="text-slate-400 text-sm">AI pipeline executed successfully</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {result ? (
          <>
            <div className="bg-emergency-950/50 border border-emergency-700/30 rounded-lg p-4 mb-4">
              <div className="text-xs text-slate-400 mb-1">INCIDENT ID</div>
              <div className="font-mono text-emergency-300 font-bold text-lg">{result.incident_id}</div>
              <div className="text-xs text-slate-400 mt-2">
                Major road accident near Central Junction, KL. AI analysis complete.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5 text-center text-xs">
              <div className="bg-dark-800 rounded-lg p-2">
                <div className="text-green-400 font-semibold">✓</div>
                <div className="text-slate-400">AI Analysis</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-2">
                <div className="text-green-400 font-semibold">✓</div>
                <div className="text-slate-400">Resources</div>
              </div>
              <div className="bg-dark-800 rounded-lg p-2">
                <div className="text-green-400 font-semibold">✓</div>
                <div className="text-slate-400">Route Ready</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onClose(); navigate(`/incidents/${result.incident_id}`); }}
                className="btn-emergency flex-1 justify-center"
                id="view-incident-btn"
              >
                View Incident Details
              </button>
              <button
                onClick={() => { onClose(); navigate('/dashboard'); }}
                className="btn-outline flex-1 justify-center"
                id="view-dashboard-btn"
              >
                Command Center
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-emergency-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Running AI pipeline…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [simResult, setSimResult] = useState<{ incident_id: string } | null>(null);
  const [simOpen, setSimOpen] = useState(false);

  const handleSimulate = async () => {
    setSimOpen(true);
    setSimResult(null);
    try {
      const res = await api.demo.simulate();
      setSimResult({ incident_id: res.incident_id });
    } catch (err) {
      console.error('Simulate failed:', err);
      setSimOpen(false);
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-950 text-white">
        <div className="demo-banner">
          ⚠️ DEMO MODE — All incidents, resources and routes are simulated for demonstration purposes. Not for real emergency use.
        </div>
        <Navbar onSimulate={handleSimulate} />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage onSimulate={handleSimulate} />} />
            <Route path="/dashboard" element={<DashboardPage onSimulate={handleSimulate} />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/incidents" element={<DashboardPage onSimulate={handleSimulate} />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
        <AIAssistant />
        <SimulateModal
          isOpen={simOpen}
          onClose={() => setSimOpen(false)}
          result={simResult}
        />
      </div>
    </BrowserRouter>
  );
}
