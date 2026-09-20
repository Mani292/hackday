import type { SeverityLevel } from '../types';

const CONFIG: Record<SeverityLevel, { label: string; className: string; dot: string }> = {
  critical: { label: 'CRITICAL', className: 'severity-critical', dot: 'bg-emergency-400' },
  high: { label: 'HIGH', className: 'severity-high', dot: 'bg-orange-400' },
  medium: { label: 'MEDIUM', className: 'severity-medium', dot: 'bg-yellow-400' },
  low: { label: 'LOW', className: 'severity-low', dot: 'bg-green-400' },
};

export function SeverityBadge({ severity }: { severity: SeverityLevel | null | undefined }) {
  if (!severity) return <span className="badge bg-slate-800 text-slate-400 border border-slate-600">UNKNOWN</span>;
  const cfg = CONFIG[severity];
  return (
    <span className={`badge ${cfg.className}`}>
      <span className={`pulse-dot ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  reported: { label: 'REPORTED', className: 'status-reported' },
  analyzing: { label: 'ANALYZING', className: 'status-analyzing' },
  resources_matched: { label: 'RESOURCES MATCHED', className: 'status-resources_matched' },
  dispatched: { label: 'DISPATCHED', className: 'status-dispatched' },
  en_route: { label: 'EN ROUTE', className: 'status-en_route' },
  arrived: { label: 'ARRIVED', className: 'status-arrived' },
  resolved: { label: 'RESOLVED', className: 'status-resolved' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status.toUpperCase(), className: 'badge bg-slate-800 text-slate-400' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export function ResourceStatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    available: 'bg-green-400',
    dispatched: 'bg-orange-400',
    en_route: 'bg-amber-400',
    busy: 'bg-red-400',
    offline: 'bg-slate-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status] || 'bg-slate-500'}`} />
  );
}
