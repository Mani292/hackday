import { Bot, AlertTriangle, Cpu, CheckCircle } from 'lucide-react';
import type { Incident } from '../types';
import { SeverityBadge } from './Badges';

interface AIAnalysisPanelProps {
  incident: Incident;
}

const RESOURCE_LABELS: Record<string, { label: string; emoji: string }> = {
  ambulance: { label: 'Ambulance', emoji: '🚑' },
  fire_unit: { label: 'Fire Unit', emoji: '🚒' },
  rescue_team: { label: 'Rescue Team', emoji: '🆘' },
  police: { label: 'Police', emoji: '🚔' },
  trauma_hospital: { label: 'Trauma Hospital', emoji: '🏥' },
  general_hospital: { label: 'General Hospital', emoji: '🏨' },
};

export function AIAnalysisPanel({ incident }: AIAnalysisPanelProps) {
  if (!incident.ai_summary) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        <Bot size={32} className="mx-auto mb-2 opacity-30" />
        AI analysis not yet available.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* AI disclaimer */}
      <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300">
          AI-generated recommendation. Human operator approval required before dispatch. Not for medical diagnosis.
        </p>
      </div>

      {/* Severity + type */}
      <div className="flex items-center gap-3 flex-wrap">
        <SeverityBadge severity={incident.severity} />
        <span className="text-sm text-slate-300 capitalize">
          {incident.incident_type?.replace(/_/g, ' ') || 'Unknown type'}
        </span>
        <span className="text-xs text-slate-500">·</span>
        <span className="text-sm text-slate-300">
          ~{incident.affected_people} person(s) affected
        </span>
      </div>

      {/* AI summary */}
      <div className="bg-dark-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-command-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-command-400">
            Incident Agent Analysis
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{incident.ai_summary}</p>
      </div>

      {/* Required resources */}
      {incident.required_resources && incident.required_resources.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Recommended Resources
          </div>
          <div className="flex flex-wrap gap-2">
            {incident.required_resources.map(r => {
              const cfg = RESOURCE_LABELS[r] || { label: r, emoji: '📋' };
              return (
                <div
                  key={r}
                  className="flex items-center gap-1.5 bg-dark-800 border border-white/5 rounded-lg px-3 py-1.5 text-sm"
                >
                  <span>{cfg.emoji}</span>
                  <span className="text-slate-300">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned resources */}
      {(incident.assigned_ambulance || incident.assigned_hospital) && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Assigned Resources
          </div>
          <div className="space-y-2">
            {incident.assigned_ambulance && (
              <div className="flex items-center gap-2 bg-command-950/40 border border-command-700/30 rounded-lg px-3 py-2">
                <CheckCircle size={14} className="text-command-400" />
                <span className="text-sm text-white">🚑 {incident.assigned_ambulance.name}</span>
                <span className="text-xs text-slate-400 ml-auto capitalize">{incident.assigned_ambulance.status}</span>
              </div>
            )}
            {incident.assigned_hospital && (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/30 rounded-lg px-3 py-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-sm text-white">🏥 {incident.assigned_hospital.name}</span>
                {incident.assigned_hospital.trauma_capable && (
                  <span className="text-xs text-emerald-400 ml-auto">Trauma Ready</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CoordinationPanelProps {
  plan: {
    actions: string[];
    narrative: string;
    priority_level: string;
    estimated_scene_arrival_min: number;
    coordination_method: string;
  } | null;
}

export function CoordinationPanel({ plan }: CoordinationPanelProps) {
  if (!plan) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        <Bot size={32} className="mx-auto mb-2 opacity-30" />
        Coordination plan not yet generated.
      </div>
    );
  }

  const priorityColor: Record<string, string> = {
    immediate: 'text-emergency-400',
    urgent: 'text-orange-400',
    standard: 'text-green-400',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Priority + ETA */}
      <div className="flex items-center gap-4">
        <div>
          <div className="text-xs text-slate-400">Priority</div>
          <div className={`font-bold uppercase ${priorityColor[plan.priority_level] || 'text-white'}`}>
            {plan.priority_level}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Est. Scene Arrival</div>
          <div className="font-bold text-white">{plan.estimated_scene_arrival_min} min</div>
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-dark-800 text-slate-400 px-2 py-0.5 rounded-full">
            via {plan.coordination_method === 'llm' ? 'Gemini AI' : 'AI Engine'}
          </span>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-dark-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={14} className="text-purple-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-400">
            Coordination Agent Narrative
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{plan.narrative}</p>
      </div>

      {/* Action steps */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Action Plan
        </div>
        <div className="space-y-2">
          {plan.actions.map((action, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-dark-800/50 border border-white/5 rounded-lg px-3 py-2.5 animate-slide-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="w-5 h-5 rounded-full bg-command-600/30 text-command-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <span className="text-sm text-slate-200">{action.replace(/^\d+\.\s*/, '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
