export interface PortfolioKPIs {
  total_projects: number;
  total_original_cost_cr: number;
  total_latest_cost_cr: number;
  total_cost_overrun_cr: number;
  avg_cost_overrun_pct: number;
  avg_schedule_delay_months: number;
  high_critical_risk_count: number;
  high_risk_projects_count: number;
  critical_risk_projects_count: number;
  data_as_of: string;
  top_sectors_by_cost_overrun?: Array<{
    sector: string;
    overrun_cr: number;
    project_count: number;
  }>;
  top_states_by_high_risk?: Array<{
    state: string;
    high_risk_count: number;
  }>;
}

export interface ProjectSummary {
  id?: number;
  project_code: string;
  project_name: string;
  sector: string;
  ministry?: string;
  state: string;
  original_cost_cr: number;
  revised_cost_cr?: number | null;
  latest_cost_cr: number;
  cost_overrun_cr: number;
  cost_overrun_pct: number;
  original_delay_months?: number;
  delay_months?: number;
  physical_progress_pct?: number;
  financial_progress_pct?: number;
  risk_score: number;
  predicted_severe_risk_prob?: number;
  risk_category: 'Normal' | 'Watchlist' | 'High' | 'Critical';
  operational_flag?: boolean;
  last_observation_date?: string;
}

export interface ProjectListResponse {
  total: number;
  page: number;
  page_size: number;
  projects: ProjectSummary[];
}

export interface EarlyWarningAlert {
  project_code: string;
  project_name: string;
  sector: string;
  risk_score: number;
  predicted_severe_risk_prob?: number;
  risk_category: 'Normal' | 'Watchlist' | 'High' | 'Critical';
  primary_trigger: string;
  cost_overrun_cr: number;
  delay_months: number;
  summary: string;
}

export interface EarlyWarningsResponse {
  total_alerts: number;
  threshold_used: number;
  alerts: EarlyWarningAlert[];
}

export interface RiskDriver {
  factor: string;
  plain_english: string;
  impact: 'Critical Increase' | 'Moderate Increase' | 'Low Impact' | 'Risk Reducing';
  shap_value: number;
}

export interface ShapTechnicalDetail {
  feature_name: string;
  feature_value: number | string;
  shap_contribution: number;
}

export interface EvidenceSnippet {
  document_name: string;
  doc_type: string;
  date?: string;
  excerpt: string;
  rrf_score: number;
  chunk_id?: string;
}

export interface RiskIntelligenceResponse {
  project_code: string;
  project_name: string;
  sector: string;
  ministry: string;
  state: string;
  risk_score: number;
  predicted_severe_risk_prob?: number;
  risk_category: 'Normal' | 'Watchlist' | 'High' | 'Critical';
  operational_flag: boolean;
  officer_summary: string;
  key_risk_drivers: RiskDriver[];
  shap_technical_details: ShapTechnicalDetail[];
  financial_metrics: {
    original_cost_cr: number;
    latest_cost_cr: number;
    overrun_cr: number;
    overrun_pct: number;
    expenditure_cr?: number;
    expenditure_pct?: number;
  };
  schedule_metrics: {
    original_date?: string;
    latest_date?: string;
    delay_months: number;
    physical_progress_pct: number;
  };
  evidence_snippets: EvidenceSnippet[];
}

export interface ProjectObservation {
  reporting_month: string;
  revised_cost?: number | null;
  anticipated_cost?: number | null;
  cumulative_expenditure?: number | null;
  physical_progress?: number | null;
  original_doc?: string | null;
  anticipated_doc?: string | null;
  delay_months?: number | null;
}

export interface ProjectDetail {
  project_code: string;
  project_name: string | null;
  name?: string | null;
  agency: string | null;
  state: string | null;
  sector: string | null;
  approval_date: string | null;
  original_cost: number | null;
  latest_anticipated_cost: number | null;
  latest_delay_months: number | null;
  latest_physical_progress: number | null;
  latest_original_doc: string | null;
  latest_anticipated_doc: string | null;
  observations?: ProjectObservation[];
}

export interface RiskDecompositionDriver {
  feature_code?: string;
  feature_name: string;
  value?: number | string;
  points_added?: string;
  influence_type?: 'RISK_DRIVER' | 'PROTECTIVE_FACTOR';
  description?: string;
}

export interface RiskDecompositionResponse {
  project_code: string;
  project_name?: string;
  agency?: string;
  state?: string;
  reporting_month?: string;
  risk_score?: number;
  overall_risk_score?: number;
  risk_category?: string;
  predicted_prob?: number;
  early_warning?: boolean;
  primary_risk_drivers: RiskDecompositionDriver[];
  protective_factors: RiskDecompositionDriver[];
  shap_caveat_note?: string;
}

export interface RiskTrajectoryItem {
  reporting_month: string;
  risk_score: number;
  risk_category: string;
  predicted_prob: number;
  cost_risk_index: number;
  schedule_risk_index: number;
}

export interface RiskTrajectoryResponse {
  project_code: string;
  model_version?: string;
  total_observations: number;
  trajectory: RiskTrajectoryItem[];
  trend: 'DETERIORATING' | 'IMPROVING' | 'VOLATILE' | 'STABLE' | 'INSUFFICIENT_HISTORY';
  trend_slope: number;
  trend_variance: number;
  trend_description: string;
}

export interface PrescriptiveRecommendationItem {
  recommendation_code?: string;
  triggered?: boolean;
  severity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MEDIUM' | 'LOW' | string;
  trigger_conditions?: Array<{
    feature: string;
    value: number | string;
    threshold: number | string;
  }>;
  rationale?: string;
  recommended_review?: string;
  code?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  category?: string;
  title?: string;
  description?: string;
  action_owner?: string;
  action?: string;
  disclaimer?: string;
}

export interface PrescriptiveRecommendationsResponse {
  project_code: string;
  recommendations: PrescriptiveRecommendationItem[];
}

export interface ProjectDocumentChunk {
  chunk_id: string;
  content: string;
  source_file: string;
  relative_path?: string;
  page_number?: number | null;
  reporting_month?: string;
  reporting_year?: number;
  document_type?: string;
  project_code?: string;
  citation?: string;
}

export interface ProjectDocumentsResponse {
  project_code: string;
  total_documents: number;
  document_chunks: ProjectDocumentChunk[];
}

export interface DocumentChunk {
  chunk_id: string;
  doc_name: string;
  doc_type: string;
  project_code: string | null;
  sector: string;
  report_date: string;
  chunk_text: string;
  rrf_score: number;
  dense_score?: number;
  sparse_score?: number;
}

export interface DocumentSearchResponse {
  total_results: number;
  query: string;
  results: DocumentChunk[];
}

export interface CitedDocument {
  doc_name: string;
  snippet: string;
  rrf_score: number;
}

export interface AssistantChatResponse {
  response: string;
  cited_documents: CitedDocument[];
  suggested_followups: string[];
  active_project_code: string | null;
}

export interface GeographicRiskItem {
  state: string;
  total_projects: number;
  high_risk_projects: number;
  critical_risk_projects: number;
  total_cost_overrun_cr: number;
  avg_delay_months: number;
}

export interface GeographicRiskResponse {
  states: GeographicRiskItem[];
}

export interface RiskCategoryDistributionItem {
  risk_category: string;
  project_count: number;
  percent_of_total: number;
  avg_risk_score: number;
  total_anticipated_cost_crore: number;
}

export interface StateStatItem {
  state: string;
  project_count: number;
  total_original_cost_crore: number;
  total_anticipated_cost_crore: number;
  avg_risk_score: number | null;
  high_critical_risk_count: number;
}

export interface AgencyStatItem {
  agency: string;
  project_count: number;
  total_original_cost_crore: number;
  total_anticipated_cost_crore: number;
  cost_overrun_percent: number;
  avg_risk_score: number | null;
  high_critical_risk_count: number;
}

export interface RawEarlyWarningItem {
  urgency_rank: number;
  project_code: string;
  project_name: string;
  agency: string;
  state: string;
  risk_score: number;
  risk_category: string;
  predicted_prob: number;
  trajectory_trend: string;
  early_warning: boolean;
  cost_warning: boolean;
  schedule_warning: boolean;
  cost_overrun_cr: number;
  delay_months: number;
  sector: string;
  urgency_reason: string;
  reporting_month: string;
}

// ==========================================
// Phase 8: Notification & Alert Types
// ==========================================

export interface InAppNotification {
  id: number;
  alert_id: number;
  channel: 'IN_APP' | 'EMAIL';
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  project_code: string;
  alert_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  risk_score: number | null;
  predicted_severe_risk_prob: number | null;
}

export interface AlertRecipient {
  notification_id: number;
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  channel: string;
  in_app_status: string;
  email_delivery_status: string;
  sent_at: string | null;
  failure_reason: string | null;
}

export interface AlertDetail {
  id: number;
  project_code: string;
  project_name: string;
  agency: string;
  state: string;
  alert_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  description: string;
  trigger_reason: string;
  risk_score: number | null;
  predicted_severe_risk_prob: number | null;
  risk_category: string;
  risk_drivers: Array<{
    feature_name: string;
    description: string;
    points_added?: string;
  }>;
  recommended_actions: Array<{
    code: string;
    severity: string;
    action: string;
    rationale: string;
    disclaimer: string;
  }>;
  triggered_at: string;
  status: string;
  recipients?: AlertRecipient[];
}

export interface NotificationDeliveryAudit {
  id: number;
  notification_id: number;
  recipient_email: string;
  recipient_name: string;
  project_code: string;
  alert_type: string;
  severity: string;
  provider: string;
  provider_message_id: string | null;
  attempted_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'NOT_CONFIGURED';
  failure_reason: string | null;
  metadata: Record<string, any>;
}

export interface UserNotificationPreferences {
  user_id: number;
  email_enabled: boolean;
  in_app_enabled: boolean;
  critical_alerts_only: boolean;
  cost_alerts_enabled: boolean;
  schedule_alerts_enabled: boolean;
}

export interface NotificationInfrastructureHealth {
  email_service: {
    provider: string;
    configured: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_use_tls: boolean;
    smtp_use_ssl: boolean;
    email_from: string;
  };
  total_alerts: number;
  total_notifications: number;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  status: 'HEALTHY' | 'UNCONFIGURED_SMTP';
}

// ── Phase 16 — Environmental Intelligence Types ────────────────────────────────

export interface LocationMetadata {
  latitude: number;
  longitude: number;
  location_source: 'PROJECT_COORDINATES' | 'DISTRICT_COORDINATES' | 'STATE_CENTROID' | string;
  location_precision: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  state?: string | null;
  district?: string | null;
  display_location: string;
}

export interface WeatherObservation {
  temperature_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  condition: string;
  weather_code: number;
  observed_at: string;
  source: string;
}

export interface EnvironmentalAssessment {
  overall_severity: 'NORMAL' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'SEVERE' | 'UNAVAILABLE' | string;
  precipitation_severity?: string;
  wind_severity?: string;
  temperature_severity?: string;
  humidity_severity?: string;
  active_hazard_factors: string[];
  assessment_label: string;
}

export interface CategorizedAdvice {
  worker_safety: string[];
  materials: string[];
  equipment: string[];
  site_operations: string[];
  access_mobility: string[];
  concrete_construction: string[];
}

export interface PhysicalConditionAdvice {
  potential_impacts: string[];
  recommended_actions: string[];
  status?: 'AVAILABLE' | 'UNAVAILABLE' | string;
  priority?: string;
  hazards?: string[];
  categories?: CategorizedAdvice;
  advice_basis?: string[];
  generated_by?: string;
}


export interface DisruptionWindow {
  time: string;
  hour_offset: number;
  hazard_type: string;
  intensity: string;
  advisory: string;
}

export interface ContextualPriority {
  level: 'NORMAL' | 'ELEVATED' | 'HIGH ATTENTION' | 'CRITICAL ATTENTION' | string;
  escalated: boolean;
  reason: string;
  label: string;
}

export interface ProjectEnvironmentalReport {
  project_code: string;
  environmental_data_status: 'AVAILABLE' | 'UNAVAILABLE' | string;
  location: LocationMetadata;
  weather?: WeatherObservation | null;
  environmental_assessment: EnvironmentalAssessment;
  physical_condition_advice: PhysicalConditionAdvice;
  disruption_windows?: DisruptionWindow[];
  contextual_priority: ContextualPriority;
  base_ml_risk: {
    composite_risk_score: number;
    risk_category: string;
    unaltered_guarantee: boolean;
  };
  observed_at: string;
  source: string;
}

export interface RegionalEnvironmentalItem {
  state: string;
  environmental_data_status: 'AVAILABLE' | 'UNAVAILABLE' | string;
  location: LocationMetadata;
  weather: WeatherObservation | null;
  environmental_assessment: EnvironmentalAssessment;
  disruption_windows?: DisruptionWindow[];
}

export interface RegionalEnvironmentalOverviewResponse {
  states: Record<string, RegionalEnvironmentalItem>;
}

export interface BottleneckItem {
  entity: string;
  entity_key: string;
  entity_type: string;
  projects_affected: number;
  dependency_count: number;
  documented_dependencies: number;
  inferred_dependencies: number;
  coordination_pressure_index: number;
  bottleneck_indicator: boolean;
  reasons: string[];
}



