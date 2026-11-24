export type Language = 'kk' | 'ru' | 'en';

export type UserRole =
  | 'citizen'
  | 'city_operator'
  | 'agency_staff'
  | 'agency_head'
  | 'emergency_coordinator'
  | 'city_admin'
  | 'platform_admin';

export type CityId = 'shymkent' | 'astana' | 'almaty';

export type IncidentCategory =
  | 'traffic_accident'
  | 'fire_smoke'
  | 'flooding'
  | 'road_pothole'
  | 'congestion'
  | 'fallen_tree'
  | 'waste_overflow'
  | 'infrastructure_damage'
  | 'road_obstruction'
  | 'water_pipe'
  | 'power_outage';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus =
  | 'detected'
  | 'under_review'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export type AppSurfaceMode = 'command' | 'website' | 'citizen' | 'xr';

export type CommandTab =
  | 'home'
  | 'map'
  | 'brain'
  | 'vision'
  | 'predict'
  | 'traffic'
  | 'infrastructure'
  | 'emergency'
  | 'citizen'
  | 'eco'
  | 'response'
  | 'twin'
  | 'analytics'
  | 'settings';

export type CitizenTab = 'home' | 'map' | 'report' | 'ai' | 'profile';

export interface CityConfig {
  id: CityId;
  name: Record<Language, string>;
  lat: number;
  lng: number;
  zoom: number;
  status: 'active_pilot' | 'planned';
  districts: { id: string; name: Record<Language, string>; center: [number, number] }[];
}

export interface IncidentHistoryEntry {
  id: string;
  fromStatus?: IncidentStatus;
  toStatus: IncidentStatus;
  note: string;
  actorName: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  trackingNumber: string;
  cityId: CityId;
  district: string;
  category: IncidentCategory;
  severity: SeverityLevel;
  status: IncidentStatus;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  source: 'citizen' | 'vision_ai' | 'operator' | 'sensor';
  reporterUid: string;
  assignedDepartmentId?: string;
  assignedStaffName?: string;
  operatorVerified: boolean;
  aiSummary?: string;
  evidenceImage?: string;
  afterImage?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
  history: IncidentHistoryEntry[];
  comments: { id: string; author: string; text: string; createdAt: string }[];
  citizenFeedback?: string;
}

export interface CitizenReportDraft {
  id: string;
  cityId: CityId;
  category: IncidentCategory;
  description: string;
  lat: number;
  lng: number;
  address: string;
  photoDataUrl?: string;
  aiCategoryHint?: string;
  createdAt: string;
  synced: boolean;
}

export interface InfrastructureAsset {
  id: string;
  cityId: CityId;
  assetType:
    | 'road'
    | 'water_pipe'
    | 'power_grid'
    | 'sewage'
    | 'streetlight'
    | 'bridge'
    | 'public_building'
    | 'waste_system'
    | 'park'
    | 'pedestrian';
  name: Record<Language, string>;
  district: string;
  lat: number;
  lng: number;
  condition: 'good' | 'fair' | 'degraded' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  riskScore: number;
  departmentId: string;
  nextMaintenance: string;
  lastMaintenance: string;
  iotConnected: boolean;
  notes: string;
}

export interface WorkOrder {
  id: string;
  cityId: CityId;
  assetId?: string;
  incidentId?: string;
  departmentId: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'scheduled' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface WeatherSnapshot {
  source: string;
  fetchedAt: string;
  available: boolean;
  error?: string;
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    wind_speed_10m: number[];
  };
}

export interface EcoSnapshot {
  source: string;
  fetchedAt: string;
  available: boolean;
  error?: string;
  current?: {
    european_aqi: number;
    pm10: number;
    pm2_5: number;
    carbon_monoxide: number;
    nitrogen_dioxide: number;
    sulphur_dioxide: number;
    ozone: number;
  };
}

export interface RiskPrediction {
  id: string;
  type:
    | 'heavy_rain'
    | 'flood_risk'
    | 'strong_wind'
    | 'extreme_temp'
    | 'black_ice'
    | 'accident_hotspot'
    | 'congestion_prob'
    | 'infra_degradation';
  index: number;
  severity: SeverityLevel;
  reasons: string[];
  timeWindow: string;
  zone: string;
  preventiveActions: string[];
  source: string;
  updatedAt: string;
  kind: 'rule_based_prediction' | 'recorded_pattern';
}

export interface VisionAnalysisResult {
  detected: boolean;
  hazardCategory: IncidentCategory | 'none';
  title: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  recommendedDepartment: string;
  recommendedActions: string[];
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    label?: string;
  };
  analyzedAt: string;
  previewDataUrl?: string;
  operatorStatus: 'pending' | 'confirmed' | 'dismissed';
}

export interface BrainMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structured?: {
    riskLevel?: string;
    recommendedDepartment?: string;
    actionPlan?: string[];
    referencedIds?: string[];
  };
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  severity: SeverityLevel;
  createdAt: string;
  read: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  cityId: CityId;
  emailVerified: boolean;
}

export interface DemoScenario {
  id: string;
  category: IncidentCategory;
  severity: SeverityLevel;
  title: Record<Language, string>;
  district: string;
  lat: number;
  lng: number;
  address: string;
  departmentId: string;
  aiExplanation: Record<Language, string>;
  steps: { status: IncidentStatus; label: Record<Language, string>; delaySec: number }[];
}
