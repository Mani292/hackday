// All shared TypeScript types for ResQNet

export type IncidentType = 
  | 'road_accident'
  | 'medical_emergency'
  | 'fire'
  | 'natural_disaster'
  | 'other';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus =
  | 'reported'
  | 'analyzing'
  | 'resources_matched'
  | 'dispatched'
  | 'en_route'
  | 'arrived'
  | 'resolved';

export type ResourceType = 'ambulance' | 'fire_unit' | 'rescue_team' | 'police';

export type ResourceStatus = 'available' | 'dispatched' | 'en_route' | 'busy' | 'offline';

export interface Incident {
  id: string;
  incident_type: IncidentType | null;
  description: string;
  severity: SeverityLevel | null;
  location: string;
  latitude: number;
  longitude: number;
  affected_people: number;
  status: IncidentStatus;
  reporter_name?: string;
  reporter_phone?: string;
  ai_summary?: string;
  required_resources: string[];
  coordination_plan?: CoordinationPlan | null;
  assigned_ambulance_id?: string | null;
  assigned_hospital_id?: string | null;
  assigned_ambulance?: ResourceSummary | null;
  assigned_hospital?: HospitalSummary | null;
  estimated_eta?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Resource {
  id: string;
  resource_type: ResourceType;
  name: string;
  status: ResourceStatus;
  latitude: number;
  longitude: number;
  capabilities: string[];
  assigned_incident_id?: string | null;
  distance_km?: number;
  estimated_travel_min?: number;
}

export interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  available_capacity: number;
  trauma_capable: boolean;
  icu_available: boolean;
  emergency_dept: boolean;
  status: 'operational' | 'limited' | 'full';
  distance_km?: number;
  estimated_travel_min?: number;
}

export interface ResourceSummary {
  id: string;
  name: string;
  status: string;
  latitude: number;
  longitude: number;
}

export interface HospitalSummary {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  trauma_capable: boolean;
}

export interface CoordinationPlan {
  actions: string[];
  narrative: string;
  priority_level: 'immediate' | 'urgent' | 'standard';
  estimated_scene_arrival_min: number;
  coordination_method: string;
}

export interface ResponseEvent {
  id: string;
  event_type: string;
  description: string;
  timestamp: string;
}

export interface Route {
  name: string;
  distance_km: number;
  eta_minutes: number;
  traffic: 'light' | 'moderate' | 'heavy';
  waypoints: { name: string; lat: number; lng: number }[];
  recommended: boolean;
}

export interface RouteResult {
  primary_route: Route;
  alternative_route: Route;
  leg_to_incident_km?: number;
  leg_to_hospital_km?: number;
}

export interface DashboardStats {
  total_incidents: number;
  active_incidents: number;
  critical_incidents: number;
  available_ambulances: number;
  available_hospitals: number;
  active_responders: number;
  resolved_incidents: number;
}

export interface AnalyticsData {
  incidents_by_type: { type: string; count: number }[];
  incidents_by_severity: { severity: string; count: number }[];
  incidents_by_status: { status: string; count: number }[];
  avg_response_time_min: number;
  resource_utilization_pct: number;
  total_resources: number;
  busy_resources: number;
}

export interface IncidentCreate {
  incident_type?: IncidentType;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  affected_people: number;
  reporter_name?: string;
  reporter_phone?: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  method?: string;
}
