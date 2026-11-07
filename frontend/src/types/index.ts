// Decidix Web Application Type Definitions
// Strictly matches docs/api_contract.md and backend models

export type Role = 'admin' | 'analyst' | 'decision_maker' | 'planner' | 'viewer';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type Sector = 'overall' | 'education' | 'healthcare' | 'economy' | 'infrastructure';
export type Range = '3Y' | '5Y' | '7Y';
export type ProjectStatus = 'all' | 'in_progress' | 'planned' | 'delayed' | 'completed';
export type ReportCategory = 'all' | 'roads' | 'health' | 'schools' | 'water';

export interface User {
  id: string;
  email: string;
  name: string;
  arabic_name?: string | null;
  role: Role;
  status: 'active' | 'suspended' | 'deleted';
  email_verified: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Metric {
  key: string;
  label: string;
  arabic_label?: string;
  value: number;
  unit: string;
  change?: number;
  higher_is_better?: boolean;
  sparkline?: number[];
}

export interface TrendPoint {
  year: number;
  value: number;
}

export interface RegionReference {
  region_id: string;
  name: string;
  arabic_name?: string;
}

export interface OverviewData {
  index: {
    current: number;
    change: number;
    band: 'low' | 'moderate_low' | 'moderate' | 'moderate_high' | 'high';
    year: number;
  };
  trend: {
    points: TrendPoint[];
    range: Range;
  };
  national_index?: {
    current: number;
    change: number;
    band: string;
  };
  top_improvers: Array<{
    region_id: string;
    name: string;
    arabic_name?: string;
    delta: number;
    current: number;
  }>;
  needs_attention: Array<{
    region_id: string;
    name: string;
    arabic_name?: string;
    score: number;
    priority: PriorityLevel;
  }>;
  key_indicators: Metric[];
}

export interface MapPoint {
  region_id: string;
  name: string;
  arabic_name?: string;
  latitude: number;
  longitude: number;
  score: number;
  priority: PriorityLevel;
  population?: number;
  key_challenges?: string[];
}

export interface RegionListItem {
  id: string;
  region_id: string;
  name: string;
  arabic_name?: string;
  rank: number;
  score: number;
  change: number;
  priority: PriorityLevel;
  population: number;
  sparkline?: number[];
}

export interface RegionProfile {
  region_id: string;
  name: string;
  arabic_name?: string;
  rank: number;
  score: number;
  change: number;
  priority: PriorityLevel;
  population: number;
  governorate?: string;
  history: {
    region: TrendPoint[];
    national: TrendPoint[];
  };
  domains: Array<{
    key: string;
    name: string;
    arabic_name?: string;
    score: number;
    change: number;
  }>;
  key_metrics: Metric[];
  strengths: string[];
  vulnerabilities: string[];
}

export interface SectorInsightData {
  sector: Sector;
  title: string;
  arabic_title?: string;
  kpis: Metric[];
  trend: TrendPoint[];
  breakdown: Array<{
    category: string;
    arabic_category?: string;
    value: number;
    percentage: number;
  }>;
  indicators: Metric[];
  ranking: {
    top: Array<{ region_id: string; name: string; score: number }>;
    bottom: Array<{ region_id: string; name: string; score: number }>;
  };
  ai_insight: {
    text: string;
    arabic_text?: string;
    confidence: number;
    generated_at: string;
  };
}

export interface PredictionSeriesPoint {
  year: number;
  value: number;
  is_forecast: boolean;
  lower?: number | null;
  upper?: number | null;
}

export interface PredictionsData {
  target_year: number;
  series: PredictionSeriesPoint[];
  models: Array<{
    name: string;
    type: string;
    mae?: number;
    rmse?: number;
    r2?: number | null;
    status: string;
  }>;
  forecast_classification?: {
    source: string;
    is_simulated: boolean;
    is_official: boolean;
    is_calibrated: boolean;
    validation_status: string;
    disclaimer_en: string;
    disclaimer_ar: string;
  };
}

export interface AssistantChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  provenance?: {
    answer_source?: 'model' | 'deterministic_fallback' | 'refusal';
    provider_status?: string | null;
    model_name?: string;
    retrieved_regions?: number;
    citations?: string[];
  };
  table?: {
    headers: string[];
    rows: (string | number)[][];
  } | null;
}

export interface Recommendation {
  id: string;
  title: string;
  arabic_title?: string;
  description: string;
  arabic_description?: string;
  sector: Sector;
  priority: PriorityLevel;
  estimated_impact_pts: number;
  estimated_cost: {
    amount: number;
    currency: string;
  };
  timeframe_months: number;
  status: 'suggested' | 'in_plan' | 'dismissed';
}

export interface SimulationResult {
  region_id: string;
  current_score: number;
  projected_score: number;
  net_gain: number;
  domain_impacts: {
    education: { before: number; after: number; delta: number };
    healthcare: { before: number; after: number; delta: number };
    infrastructure: { before: number; after: number; delta: number };
    economy: { before: number; after: number; delta: number };
  };
  cost_benefit_ratio: number;
}

export interface DevelopmentProject {
  id: string;
  title: string;
  arabic_title?: string;
  region: RegionReference;
  sector: Sector;
  status: 'planned' | 'in_progress' | 'delayed' | 'completed';
  budget: {
    amount: number;
    currency: string;
  };
  progress_percent: number;
  start_date: string;
  due_date?: string | null;
  completed_at?: string | null;
}

export interface CitizenReport {
  id: string;
  category: ReportCategory;
  region: RegionReference;
  title: string;
  arabic_title?: string;
  description: string;
  status: 'under_review' | 'escalated' | 'resolved';
  likes_count: number;
  liked_by_me: boolean;
  created_at: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface DatasetItem {
  id: string;
  name: string;
  description?: string;
  format: string;
  source: string;
  license: string;
  coverage: string;
  status: 'active' | 'archived' | 'pending' | 'processing';
  created_at: string;
  versions_count?: number;
  active_version?: {
    version: string;
    record_count: number;
    size_bytes: number;
    activated_at: string;
  };
}

export interface DatasetStats {
  total_datasets: number;
  active_datasets: number;
  total_records: number;
  total_storage_bytes: number;
  supported_formats: string[];
}

export interface AdminDashboardData {
  metrics: {
    total_users: number;
    active_users: number;
    suspended_users: number;
    deleted_users: number;
    total_datasets: number;
    active_datasets: number;
    total_records: number;
    total_storage_bytes: number;
  };
  activity_summary: {
    total_events: number;
    api_calls_today: number;
    active_sessions: number;
  };
  recent_logins: Array<{
    id: string;
    email: string;
    name: string;
    role: Role;
    last_login_at: string;
  }>;
}

export interface NotificationDispatch {
  id: string;
  title: string;
  body: string;
  target_audience: 'all' | 'user' | 'test';
  sent_by_user_id: string;
  sent_at: string;
  delivered_count: number;
  failed_count: number;
  status: 'delivered' | 'failed' | 'queued';
}
