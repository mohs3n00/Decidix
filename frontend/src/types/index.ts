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
  as_of?: string;
  index: {
    score?: number;
    current?: number;
    max_score?: number;
    change: number;
    compared_with?: string;
    band: 'low' | 'moderate_low' | 'moderate' | 'moderate_high' | 'high' | string;
    regions_count?: number;
    population?: number;
    at_risk_count?: number;
    year?: number;
  };
  kpis?: Array<{
    key: string;
    label: string;
    arabic_label?: string;
    value: number;
    unit: string;
    change?: number;
    higher_is_better?: boolean;
    sparkline?: number[];
  }>;
  trend: {
    points: Array<{ year: number | string; value: number }>;
    range: Range;
  };
  national_index?: {
    current: number;
    change: number;
    band: string;
  };
  top_improvers?: Array<{
    region_id: string;
    name: string;
    arabic_name?: string;
    delta: number;
    current: number;
  }>;
  needs_attention?: Array<{
    id?: string;
    region_id?: string;
    name: string;
    arabic_name?: string;
    score: number;
    population?: number;
    priority: PriorityLevel | string;
    change?: number;
  }>;
  key_indicators?: Metric[];
  ai_insight?: {
    text: string;
    arabic_text?: string;
  };
  provenance?: {
    source: string;
    dataset_version: string;
    observation_period: string;
    verification_status: string;
    disclaimer_en?: string;
    disclaimer_ar?: string;
  };
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
  id: string;
  region_id?: string;
  name: string;
  arabic_name?: string;
  rank: number;
  rank_total?: number;
  score: number;
  change: number;
  priority: PriorityLevel;
  population: number;
  area_km2?: number;
  area_available?: boolean;
  domains: Array<{
    key: string;
    label?: string;
    name?: string;
    arabic_label?: string;
    arabic_name?: string;
    score: number;
    is_measured?: boolean;
    change?: number;
  }>;
  history?: {
    region: Array<{ year: number; value: number }>;
    national: Array<{ year: number; value: number }>;
  };
  history_source?: string;
  history_is_observed?: boolean;
  ai_insight?: {
    text: string;
    arabic_text?: string;
  };
  data_quality?: {
    score: number;
    updated_at: string;
    source: string;
    is_official?: boolean;
  };
}

export interface SectorInsightData {
  sector: Sector;
  title?: string;
  arabic_title?: string;
  data_classification?: string;
  is_official?: boolean;
  source_classification?: string;
  dataset_version?: string;
  index: {
    score: number;
    change: number;
  };
  normalization?: {
    method: string;
    scale: number[];
    direction_adjusted: boolean;
    weights: string;
    reference_year: number;
    previous_year: number;
    indicators_used: number;
    indicators_missing: number;
    note: string;
  };
  kpis: Array<{
    key: string;
    label: string;
    arabic_label?: string;
    value: number;
    unit?: string;
    change?: number;
    higher_is_better?: boolean;
  }>;
  trend?: {
    points: Array<{ year: number; value: number }>;
  };
  breakdown?: {
    title: string;
    arabic_title?: string;
    unit: string;
    bars: any[];
  };
  indicators?: Array<{
    key: string;
    label: string;
    arabic_label?: string;
    value: number;
    unit?: string;
  }>;
  ranking: {
    basis?: string;
    top: Array<{ rank: number; region_id: string; name: string; arabic_name?: string; score: number }>;
    bottom: Array<{ rank: number; region_id: string; name: string; arabic_name?: string; score: number }>;
  };
  ai_insight?: {
    text: string;
    arabic_text?: string;
  };
  provenance?: ProvenanceMeta;
}

export interface ComparisonData {
  a: {
    id: string;
    name: string;
    arabic_name?: string;
    score: number;
  };
  b: {
    id: string;
    name: string;
    arabic_name?: string;
    score: number;
  };
  metrics: Array<{
    key: string;
    label: string;
    arabic_label?: string;
    score_a: number;
    score_b: number;
  }>;
  gap_analysis: {
    text: string;
    arabic_text?: string;
  };
  provenance?: ProvenanceMeta;
}

export interface HistoricalData {
  range: string;
  points: Array<{ year: number; value: number }>;
  annual_change: number;
  milestones: any[];
  milestones_note?: string;
  data_classification?: string;
  is_official?: boolean;
  source_classification?: string;
  dataset_version?: string;
  provenance?: ProvenanceMeta;
}

export interface PriorityQueueItem {
  rank: number;
  region_id: string;
  name: string;
  arabic_name?: string;
  priority: string;
  need_score: number;
  weakest_domain?: string | null;
}

export interface PriorityQueueData {
  summary: {
    high: number;
    medium: number;
    low: number;
  };
  queue: PriorityQueueItem[];
  provenance?: ProvenanceMeta;
}

export interface DataQualityData {
  score: number;
  completeness: number;
  timeliness: number;
  accuracy: number;
  coverage: string;
  data_classification?: string;
  is_official?: boolean;
  source_classification?: string;
  dataset_version?: string;
  accuracy_definition?: string;
  provenance?: ProvenanceMeta;
  sources: Array<{
    id: string;
    name: string;
    arabic_name?: string;
    original_source?: string;
    license?: string;
    record_count: number;
    frequency?: string;
    status: string;
    age_days?: number;
  }>;
}

export interface SimulationResponse {
  region_id: string;
  horizon_months: number;
  today_score: number;
  projected_score: number;
  gain: number;
  total_package: {
    amount: number;
    currency: string;
  };
  levers: Array<{
    domain: string;
    amount: number;
    gain: number;
    yield_per_million: number;
  }>;
  best_lever: {
    domain: string;
    yield_per_million: number;
  };
  note: {
    text: string;
    arabic_text?: string;
  };
  metadata?: {
    model_id: string;
    disclaimer: string;
  };
  provenance?: ProvenanceMeta;
}

export interface ProjectsResponse {
  summary: {
    projects_count: number;
    total_budget: {
      amount: number;
      currency: string;
    };
    delayed_count: number;
  };
  items: Array<{
    id: string;
    title: string;
    arabic_title?: string;
    region: {
      region_id: string;
      name: string;
      arabic_name?: string;
    };
    status: 'planned' | 'in_progress' | 'delayed' | 'completed';
    progress: number;
    budget: {
      amount: number;
      currency: string;
    };
    due_date?: string | null;
    completed_at?: string | null;
  }>;
}

export interface CitizenReportsResponse {
  summary: {
    open_this_week: {
      value: number;
      change: number;
      higher_is_better: boolean;
    };
    resolved_rate: {
      value: number;
      change: number;
      higher_is_better: boolean;
    };
  };
  items: Array<{
    id: string;
    category: string;
    title: string;
    arabic_title?: string;
    region: {
      region_id: string;
      name: string;
      arabic_name?: string;
    };
    created_at: string;
    likes: number;
    priority: string;
    status: string;
    liked_by_me?: boolean;
  }>;
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

// -------------------------------------------------------------
// Workspaces & Collaborative Teams (Multi-Tenant Architecture)
// -------------------------------------------------------------

export type WorkspaceType = 'national' | 'personal' | 'team';

export interface WorkspaceContextState {
  type: WorkspaceType;
  id: string; // 'national' | userId | teamId
  name: string;
  arabicName: string;
  activeDatasetId?: string;
  activeDatasetName?: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  arabicName?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  arabicName?: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDataset {
  id: string;
  name: string;
  arabicName?: string;
  description?: string;
  workspaceType?: WorkspaceType;
  workspaceId?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByRole?: string;
  filename: string;
  format: string;
  recordCount: number;
  uploadedAt: string;
  status: 'ready' | 'processing' | 'error';
  approvalStatus: 'approved' | 'pending_review' | 'rejected';
  rejectionReason?: string;
  validatedAt?: string;
  qualityScore: number;
  completenessPct: number;
  accuracyPct: number;
  coverage: string;
  isActiveInWorkspace?: boolean;
  kpis?: {
    nationalIndex: number;
    delta: number;
    healthScore: number;
    educationScore: number;
    economyScore: number;
    infrastructureScore: number;
    topGovernorates?: string[];
    priorityGovernorates?: string[];
  };
}

