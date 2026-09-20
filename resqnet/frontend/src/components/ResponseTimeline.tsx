import { Clock, CheckCircle, AlertCircle, Radio, Navigation, MapPin, Activity } from 'lucide-react';
import type { ResponseEvent } from '../types';
import { format } from 'date-fns';

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; dotColor: string }> = {
  reported: { icon: AlertCircle, color: 'text-slate-400', dotColor: 'bg-slate-500' },
  analyzed: { icon: Activity, color: 'text-blue-400', dotColor: 'bg-blue-500' },
  resources_matched: { icon: CheckCircle, color: 'text-purple-400', dotColor: 'bg-purple-500' },
  dispatched: { icon: Radio, color: 'text-orange-400', dotColor: 'bg-orange-500' },
  hospital_notified: { icon: MapPin, color: 'text-teal-400', dotColor: 'bg-teal-500' },
  route_calculated: { icon: Navigation, color: 'text-indigo-400', dotColor: 'bg-indigo-500' },
  en_route: { icon: Navigation, color: 'text-amber-400', dotColor: 'bg-amber-500' },
  arrived: { icon: MapPin, color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  resolved: { icon: CheckCircle, color: 'text-green-400', dotColor: 'bg-green-500' },
};

function formatTime(timestamp: string) {
  try {
    return format(new Date(timestamp), 'HH:mm:ss');
  } catch {
    return '—';
  }
}

interface ResponseTimelineProps {
  events: ResponseEvent[];
}

export default function ResponseTimeline({ events }: ResponseTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const cfg = EVENT_CONFIG[event.event_type] || { icon: Clock, color: 'text-slate-400', dotColor: 'bg-slate-500' };
        const Icon = cfg.icon;
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-3 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            {/* Line */}
            {!isLast && (
              <div className="absolute left-[9px] top-6 bottom-0 w-px bg-white/10" />
            )}

            {/* Dot */}
            <div className="relative shrink-0 mt-0.5">
              <div className={`w-5 h-5 rounded-full ${cfg.dotColor} flex items-center justify-center`}>
                <Icon size={10} className="text-white" />
              </div>
            </div>

            {/* Content */}
            <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${cfg.color} mb-0.5`}>
                {event.event_type.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-slate-300">{event.description}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                {formatTime(event.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
