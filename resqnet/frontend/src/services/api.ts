import type {
  Incident,
  IncidentCreate,
  Resource,
  Hospital,
  DashboardStats,
  AnalyticsData,
  RouteResult,
  ResponseEvent,
  CoordinationPlan,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ──────────────────────────────────────────────────────────────────────────────
// Incidents
// ──────────────────────────────────────────────────────────────────────────────

export const api = {
  incidents: {
    list: (filters?: { status?: string; severity?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.severity) params.set('severity', filters.severity);
      const qs = params.toString();
      return request<Incident[]>(`/incidents${qs ? `?${qs}` : ''}`);
    },

    get: (id: string) => request<Incident>(`/incidents/${id}`),

    create: (data: IncidentCreate) =>
      request<{ id: string; status: string; message: string }>('/incidents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateStatus: (id: string, status: string) =>
      request<{ id: string; status: string }>(`/incidents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    analyze: (id: string) =>
      request<Record<string, unknown>>(`/incidents/${id}/analyze`, { method: 'POST' }),

    coordinate: (id: string) =>
      request<{
        incident_id: string;
        analysis: Record<string, unknown>;
        resources: Record<string, unknown>;
        hospital: Record<string, unknown>;
        routes: RouteResult;
        coordination_plan: CoordinationPlan;
      }>(`/incidents/${id}/coordinate`, { method: 'POST' }),

    getRoutes: (id: string) => request<RouteResult>(`/incidents/${id}/routes`),

    getTimeline: (id: string) => request<ResponseEvent[]>(`/incidents/${id}/timeline`),
  },

  resources: {
    list: (filters?: { resource_type?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.resource_type) params.set('resource_type', filters.resource_type);
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return request<Resource[]>(`/resources${qs ? `?${qs}` : ''}`);
    },
  },

  hospitals: {
    list: () => request<Hospital[]>('/hospitals'),
  },

  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
  },

  analytics: {
    get: () => request<AnalyticsData>('/analytics'),
  },

  assistant: {
    query: (query: string, incident_id?: string) =>
      request<{ response: string; method: string }>('/assistant/query', {
        method: 'POST',
        body: JSON.stringify({ query, incident_id }),
      }),
  },

  demo: {
    simulate: () =>
      request<{ incident_id: string; message: string; result: Record<string, unknown> }>(
        '/demo/simulate',
        { method: 'POST' }
      ),
  },

  health: {
    check: () => request<{ status: string }>('/health'),
  },
};
