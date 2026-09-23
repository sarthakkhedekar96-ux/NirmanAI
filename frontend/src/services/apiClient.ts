import axios from 'axios';
import {
  PortfolioKPIs,
  ProjectListResponse,
  EarlyWarningsResponse,
  RiskIntelligenceResponse,
  DocumentSearchResponse,
  AssistantChatResponse,
  GeographicRiskItem,
  GeographicRiskResponse,
  ProjectDetail,
  RiskDecompositionResponse,
  RiskTrajectoryResponse,
  PrescriptiveRecommendationsResponse,
  ProjectDocumentsResponse,
  StateStatItem,
  AgencyStatItem,
  RawEarlyWarningItem,
  InAppNotification,
  AlertDetail,
  NotificationDeliveryAudit,
  UserNotificationPreferences,
  NotificationInfrastructureHealth,
  ProjectEnvironmentalReport,
  RegionalEnvironmentalOverviewResponse,
  BottleneckItem
} from '../types/api';
import { UserProfile } from '../types/auth';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 60000,
});

// Session expiration callback handler
let onSessionExpiredCallback: (() => void) | null = null;
let onForbiddenCallback: ((message: string) => void) | null = null;

export const setAuthCallbacks = (
  onExpired: () => void,
  onForbidden: (msg: string) => void
) => {
  onSessionExpiredCallback = onExpired;
  onForbiddenCallback = onForbidden;
};

// Request Interceptor: Attach JWT Bearer Token if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('nirman_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Catch 401 (Session Expired) and 403 (Forbidden)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;

    if (status === 401) {
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
    } else if (status === 403) {
      if (onForbiddenCallback) {
        onForbiddenCallback(typeof detail === 'string' ? detail : "You do not have permission to perform this action.");
      }
    }
    return Promise.reject(error);
  }
);

// In-Memory Frontend Cache & In-Flight Request Deduplication
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export function clearFrontendCache(urlPrefix?: string): void {
  if (!urlPrefix) {
    memoryCache.clear();
    console.log('[PERF] cache:cleared all');
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      memoryCache.delete(key);
    }
  }
  console.log(`[PERF] cache:cleared prefix ${urlPrefix}`);
}

async function cachedGet<T>(url: string, params?: any, ttlMs: number = 60000, skipCache: boolean = false): Promise<T> {
  const paramString = params ? JSON.stringify(params) : '';
  const cacheKey = `${url}?${paramString}`;
  const now = Date.now();
  const isSat = url.includes('/satellite');

  if (!skipCache) {
    const entry = memoryCache.get(cacheKey);
    if (entry && (now - entry.timestamp) < entry.ttl) {
      console.log(`[PERF] cache:hit GET ${cacheKey}`);
      if (isSat) console.log(`[SAT] cache:hit GET ${cacheKey}`);
      return entry.data;
    }
  }

  if (inFlightRequests.has(cacheKey)) {
    console.log(`[PERF] dedup:hit GET ${cacheKey}`);
    if (isSat) console.log(`[SAT] dedup:hit GET ${cacheKey}`);
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const startTime = performance.now();
  console.log(`[PERF] api:start GET ${url}`);
  if (isSat) {
    if (skipCache) console.log(`[SAT] retry GET ${url}`);
    console.log(`[SAT] request:start GET ${url}`);
  }

  const requestPromise = client.get(url, { params })
    .then(res => {
      const duration = Math.round(performance.now() - startTime);
      console.log(`[PERF] api:end GET ${url} ${duration}ms`);
      if (isSat) console.log(`[SAT] request:end GET ${url} ${duration}ms status=${res.data?.status || 'OK'}`);
      const data = res.data;
      if (ttlMs > 0) {
        memoryCache.set(cacheKey, { data, timestamp: Date.now(), ttl: ttlMs });
      }
      inFlightRequests.delete(cacheKey);
      return data;
    })
    .catch(err => {
      const duration = Math.round(performance.now() - startTime);
      console.log(`[PERF] api:error GET ${url} ${duration}ms`, err?.message || err);
      if (isSat) console.log(`[SAT] status:error GET ${url} ${duration}ms`, err?.message || err);
      inFlightRequests.delete(cacheKey);
      throw err;
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export const api = {
  // Authentication & Session
  async login(usernameOrEmail: string, password: string): Promise<{ access_token: string; token_type: string; user: UserProfile }> {
    const res = await client.post('/auth/login', { username_or_email: usernameOrEmail, password });
    if (res.data.access_token) {
      localStorage.setItem('nirman_auth_token', res.data.access_token);
    }
    return res.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await client.get('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await client.post('/auth/logout');
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('nirman_auth_token');
      clearFrontendCache();
    }
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> {
    const res = await client.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return res.data;
  },

  // Admin User Management (Role: ADMIN)
  async getUsers(): Promise<UserProfile[]> {
    const res = await client.get('/auth/users');
    return Array.isArray(res.data) ? res.data : [];
  },

  async createUser(data: { username: string; email: string; full_name: string; password: string; role: string }): Promise<UserProfile> {
    const res = await client.post('/auth/users', data);
    return res.data;
  },

  async updateUser(userId: number, data: { full_name?: string; role?: string; is_active?: boolean }): Promise<UserProfile> {
    const res = await client.patch(`/auth/users/${userId}`, data);
    return res.data;
  },

  // System Health (Public)
  async getHealth() {
    return cachedGet('/health', undefined, 10000);
  },

  // Portfolio KPIs & Analytics (Dynamic live database queries)
  async getPortfolioKPIs(skipCache: boolean = false): Promise<PortfolioKPIs> {
    const d = await cachedGet<any>('/analytics/portfolio_kpis', undefined, 60000, skipCache);
    return {
      total_projects: d.total_master_projects || d.total_projects || 0,
      total_original_cost_cr: d.total_original_cost_crore || 0,
      total_latest_cost_cr: d.total_anticipated_cost_crore || 0,
      total_cost_overrun_cr: d.total_cost_overrun_crore || 0,
      avg_cost_overrun_pct: d.overall_cost_overrun_percent || 0,
      avg_schedule_delay_months: d.avg_delay_months || 0,
      high_critical_risk_count: d.high_critical_risk_count || (d.critical_risk_project_count + d.high_risk_project_count) || 0,
      high_risk_projects_count: d.high_risk_project_count || 0,
      critical_risk_projects_count: d.critical_risk_project_count || 0,
      data_as_of: new Date().toISOString(),
      top_sectors_by_cost_overrun: d.top_sectors_by_cost_overrun || []
    };
  },

  // Risk Category Distribution (LOW, MODERATE, HIGH, CRITICAL)
  async getRiskDistribution(skipCache: boolean = false): Promise<Array<{
    risk_category: string;
    project_count: number;
    percent_of_total: number;
    avg_risk_score: number;
    total_anticipated_cost_crore: number;
  }>> {
    const data = await cachedGet<any>('/analytics/risk-distribution', undefined, 60000, skipCache);
    return Array.isArray(data) ? data : [];
  },

  // Cost Expansion & Delay Performance Analytics
  async getCostDelayStats(skipCache: boolean = false): Promise<{
    total_projects_with_cost_expansion: number;
    avg_cost_expansion_ratio: number;
    max_cost_expansion_ratio: number;
    total_projects_with_delay: number;
    avg_delay_months: number;
    max_delay_months: number;
    top_cost_overrun_projects: Array<{
      project_code: string;
      project_name: string;
      agency: string;
      state: string;
      original_cost_crore: number;
      cost_expansion_ratio: number;
      cost_overrun_crore: number;
    }>;
    top_delayed_projects: Array<{
      project_code: string;
      project_name: string;
      agency: string;
      state: string;
      delay_months: number;
    }>;
  }> {
    const data = await cachedGet<any>('/analytics/cost-delay-stats', undefined, 60000, skipCache);
    return data || {};
  },


  // Projects Explorer (with live search, filters, pagination, and sorting)
  async getProjects(params: {
    sector?: string;
    state?: string;
    agency?: string;
    risk_category?: string;
    search?: string;
    min_cost?: number;
    max_cost?: number;
    page?: number;
    page_size?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }, skipCache: boolean = false): Promise<ProjectListResponse> {
    const data = await cachedGet<any>('/projects', params, 30000, skipCache);
    const rawList = Array.isArray(data) ? data : (data.projects || []);
    const serverTotal = typeof data.total === 'number' ? data.total : rawList.length;

    const projects = rawList.map((p: any) => ({
      project_code: p.project_code,
      project_name: p.project_name || p.name || `Project ${p.project_code}`,
      sector: p.sector || "Infrastructure & Development",
      ministry: p.agency || "Nodal Agency",
      state: p.state || "Multi-State",
      original_cost_cr: p.original_cost || 0,
      revised_cost_cr: p.anticipated_cost || null,
      latest_cost_cr: p.anticipated_cost || p.original_cost || 0,
      cost_overrun_cr: p.anticipated_cost ? Math.max(0, p.anticipated_cost - (p.original_cost || 0)) : 0,
      cost_overrun_pct: (p.original_cost && p.anticipated_cost && p.original_cost > 0) ? Math.max(0, ((p.anticipated_cost - p.original_cost) / p.original_cost * 100)) : 0,
      original_delay_months: p.delay_months || 0,
      delay_months: p.delay_months || 0,
      physical_progress_pct: p.physical_progress || 0,
      risk_score: (p.risk_score !== null && p.risk_score !== undefined) ? Number(p.risk_score) : 50,
      predicted_severe_risk_prob: (p.predicted_severe_risk_prob !== null && p.predicted_severe_risk_prob !== undefined) ? Number(p.predicted_severe_risk_prob) : (p.risk_score !== null && p.risk_score !== undefined ? Number(p.risk_score) / 100 : 0.5),
      risk_category: (p.risk_category || 'LOW') as any
    }));

    return {
      total: serverTotal,
      page: params.page || 1,
      page_size: params.page_size || 15,
      projects
    };
  },


  // Early Warning Alerts Stream
  async getEarlyWarnings(skipCache: boolean = false): Promise<EarlyWarningsResponse> {
    const data = await cachedGet<any>('/risk/early_warnings', undefined, 30000, skipCache);
    const rawList = Array.isArray(data) ? data : (data.alerts || []);

    const alerts = rawList.map((a: any) => ({
      project_code: a.project_code,
      project_name: a.project_name,
      sector: a.sector || a.agency || "Infrastructure",
      risk_score: (a.risk_score !== null && a.risk_score !== undefined) ? Number(a.risk_score) : 80,
      predicted_severe_risk_prob: (a.predicted_prob !== null && a.predicted_prob !== undefined) ? Number(a.predicted_prob) : (a.risk_score !== null && a.risk_score !== undefined ? Number(a.risk_score) / 100 : 0.8),
      risk_category: (a.risk_category || 'High') as any,
      primary_trigger: a.urgency_reason || "Triggered XGBoost Risk Threshold",
      cost_overrun_cr: a.cost_overrun_cr || 0,
      delay_months: a.delay_months || 0,
      summary: a.urgency_reason || "High risk escalation detected."
    }));

    return {
      total_alerts: alerts.length,
      threshold_used: 0.28,
      alerts
    };
  },

  // Deep-Dive Risk Intelligence for a Project Code
  async getRiskIntelligence(projectCode: string, skipCache: boolean = false): Promise<RiskIntelligenceResponse> {
    const d = await cachedGet<any>(`/risk/intelligence/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
    const meta = d.project_metadata || {};
    const risk = d.risk_assessment || {};
    const decomp = d.risk_decomposition || {};
    const recs = d.prescriptive_recommendations?.recommendations || [];

    const drivers = (decomp.primary_risk_drivers || risk.risk_drivers || []).map((drv: any) => ({
      factor: drv.feature_name || drv.feature_code || "Cost Expansion Ratio",
      plain_english: drv.description || `Feature contribution: ${drv.points_added || drv.value}`,
      impact: 'Critical Increase' as const,
      shap_value: drv.value || 0.15
    }));

    const origCost = meta.original_cost || 0;
    const latestCost = meta.latest_anticipated_cost || meta.anticipated_cost || origCost;
    const overrunCr = Math.max(0, latestCost - origCost);
    const overrunPct = origCost > 0 ? (overrunCr / origCost * 100) : 0;

    const rawScore = risk.risk_score !== null && risk.risk_score !== undefined ? Number(risk.risk_score) : (d.risk_score !== null && d.risk_score !== undefined ? Number(d.risk_score) : 50);

    return {
      project_code: d.project_code || projectCode,
      project_name: meta.project_name || meta.name || d.project_name || `Project ${projectCode}`,
      sector: meta.sector || meta.agency || "Infrastructure",
      ministry: meta.agency || "Nodal Agency",
      state: meta.state || "India",
      risk_score: rawScore,
      predicted_severe_risk_prob: risk.predicted_severe_risk_prob !== null && risk.predicted_severe_risk_prob !== undefined ? Number(risk.predicted_severe_risk_prob) : (decomp.predicted_prob !== undefined ? Number(decomp.predicted_prob) : rawScore / 100),
      risk_category: (risk.risk_category || d.risk_category || 'High') as any,
      operational_flag: true,
      officer_summary: decomp.shap_caveat_note || "XGBoost v1 Explainable Risk Assessment derived from longitudinal monitoring metrics.",
      key_risk_drivers: drivers.length > 0 ? drivers : [
        { factor: "Cost Expansion Ratio", plain_english: "Anticipated cost expansion exceeds baseline sanctioned allocation.", impact: "Critical Increase", shap_value: 0.25 },
        { factor: "Schedule Delay Months", plain_english: "Project execution timeline experiences significant month slippage.", impact: "Moderate Increase", shap_value: 0.18 }
      ],
      shap_technical_details: drivers.map((drv: any) => ({
        feature_name: drv.factor,
        feature_value: drv.shap_value,
        shap_contribution: drv.shap_value
      })),
      financial_metrics: {
        original_cost_cr: origCost,
        latest_cost_cr: latestCost,
        overrun_cr: overrunCr,
        overrun_pct: overrunPct
      },
      schedule_metrics: {
        original_date: meta.latest_original_doc || meta.approval_date || "2018-01",
        latest_date: meta.latest_anticipated_doc || meta.latest_original_doc || "2026-12",
        delay_months: meta.latest_delay_months !== null && meta.latest_delay_months !== undefined ? meta.latest_delay_months : (risk.schedule_risk_index || 0),
        physical_progress_pct: meta.latest_physical_progress !== null && meta.latest_physical_progress !== undefined ? meta.latest_physical_progress : 0
      },

      evidence_snippets: [
        {
          document_name: "PAIMANA_Flash_Report.pdf",
          doc_type: "Monthly Flash Report",
          excerpt: "Project execution monitored under MoSPI surveillance framework with cost and schedule slippage tracking.",
          rrf_score: 0.92
        }
      ]
    };
  },

  // Project Detail & Observations Metadata (GET /api/projects/{code})
  async getProjectDetail(projectCode: string, skipCache: boolean = false): Promise<ProjectDetail> {
    return cachedGet<ProjectDetail>(`/projects/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
  },

  // TreeSHAP Risk Decomposition (GET /api/risk/decomposition/{code})
  async getRiskDecomposition(projectCode: string, skipCache: boolean = false): Promise<RiskDecompositionResponse> {
    return cachedGet<RiskDecompositionResponse>(`/risk/decomposition/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
  },

  // Model-Versioned Risk Trajectory (GET /api/risk/trajectory/{code})
  async getRiskTrajectory(projectCode: string, skipCache: boolean = false): Promise<RiskTrajectoryResponse> {
    return cachedGet<RiskTrajectoryResponse>(`/risk/trajectory/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
  },

  // Prescriptive Recommendations (GET /api/risk/recommendations/{code})
  async getPrescriptiveRecommendations(projectCode: string, skipCache: boolean = false): Promise<PrescriptiveRecommendationsResponse> {
    return cachedGet<PrescriptiveRecommendationsResponse>(`/risk/recommendations/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
  },

  // Project-Specific Document Chunks (GET /api/documents/project/{code})
  async getProjectDocuments(projectCode: string, limit: number = 10, skipCache: boolean = false): Promise<ProjectDocumentsResponse> {
    try {
      return await cachedGet<ProjectDocumentsResponse>(`/documents/project/${encodeURIComponent(projectCode)}`, { limit }, 60000, skipCache);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { project_code: projectCode, total_documents: 0, document_chunks: [] };
      }
      throw err;
    }
  },

  // State Statistics Analytics (GET /api/analytics/by-state)
  async getStateStats(limit: number = 50, skipCache: boolean = false): Promise<StateStatItem[]> {
    const data = await cachedGet<any>('/analytics/by-state', { limit }, 60000, skipCache);
    return Array.isArray(data) ? data : [];
  },

  // Agency Statistics Analytics (GET /api/analytics/by-agency)
  async getAgencyStats(limit: number = 50, skipCache: boolean = false): Promise<AgencyStatItem[]> {
    const data = await cachedGet<any>('/analytics/by-agency', { limit }, 60000, skipCache);
    return Array.isArray(data) ? data : [];
  },

  // Raw Early Warnings List (GET /api/risk/early_warnings)
  async getRawEarlyWarnings(limit: number = 50, skipCache: boolean = false): Promise<RawEarlyWarningItem[]> {
    const data = await cachedGet<any>('/risk/early_warnings', { limit }, 30000, skipCache);
    return Array.isArray(data) ? data : [];
  },

  // RAG Document Search
  async searchDocuments(params: {
    query: string;
    sector?: string;
    project_code?: string;
    top_k?: number;
  }): Promise<DocumentSearchResponse> {
    const res = await client.get('/documents/search', { params });
    const d = res.data;
    const rawChunks = d.retrieved_chunks || d.results || [];

    const results = rawChunks.map((c: any) => ({
      chunk_id: c.chunk_id || "chunk_1",
      doc_name: c.source_file || c.doc_name || "PAIMANA_Report.pdf",
      doc_type: c.document_type || "Audit Report",
      project_code: c.project_code !== "nan" ? c.project_code : null,
      sector: c.sector || "Infrastructure",
      report_date: c.reporting_month || c.report_date || "2020-01",
      chunk_text: c.content || c.chunk_text || "Document excerpt text.",
      rrf_score: c.combined_score || c.rrf_score || 0.85
    }));

    return {
      total_results: d.total_matches || results.length,
      query: params.query,
      results
    };
  },

  // AI Assistant Chat
  async sendAssistantMessage(message: string, projectCode?: string | null): Promise<AssistantChatResponse> {
    const res = await client.post('/assistant/chat', {
      message,
      project_code: projectCode || null
    });
    const d = res.data;
    return {
      response: d.answer || d.response || "No response received.",
      cited_documents: (d.citations || []).map((c: any) => ({
        doc_name: c.title || c.source_file || "PAIMANA Report",
        snippet: c.snippet || c.title,
        rrf_score: 0.95
      })),
      suggested_followups: d.next_actions && d.next_actions.length > 0 ? d.next_actions : [
        "What are the top risk drivers for this project?",
        "Summarize cost overrun exposure.",
        "Show historical PAIMANA document evidence."
      ],
      active_project_code: projectCode || null
    };
  },

  // Geographic Risk Analytics
  async getGeographicRisk(skipCache: boolean = false): Promise<GeographicRiskResponse> {
    const data = await cachedGet<any>('/analytics/geographic-risk', undefined, 60000, skipCache);
    const rawStates = Array.isArray(data) ? data : (data.states || []);

    const states = normalizeAndAggregateGeographicRisk(rawStates);
    return { states };
  },

  // Phase 8: Real-Time Notifications & Alerts
  async getNotifications(unreadOnly: boolean = false): Promise<InAppNotification[]> {
    const res = await client.get('/notifications', { params: { unread_only: unreadOnly } });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getUnreadNotificationCount(): Promise<number> {
    const res = await client.get('/notifications/unread-count');
    return res.data?.unread_count || 0;
  },

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await client.patch(`/notifications/${notificationId}/read`);
  },

  async markAllNotificationsAsRead(): Promise<void> {
    await client.patch('/notifications/read-all');
  },

  async getNotificationPreferences(): Promise<UserNotificationPreferences> {
    const res = await client.get('/notifications/preferences');
    return res.data;
  },

  async updateNotificationPreferences(prefs: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> {
    const res = await client.put('/notifications/preferences', prefs);
    return res.data.preferences;
  },

  async getAlerts(params?: { severity?: string; alert_type?: string; project_code?: string }): Promise<AlertDetail[]> {
    const res = await client.get('/notifications/alerts', { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getAlertDetail(alertId: number): Promise<AlertDetail> {
    const res = await client.get(`/notifications/alerts/${alertId}`);
    return res.data;
  },

  async getNotificationDeliveriesAudit(): Promise<NotificationDeliveryAudit[]> {
    const res = await client.get('/notifications/deliveries');
    return Array.isArray(res.data) ? res.data : [];
  },

  async sendTestEmail(recipientEmail: string): Promise<{ message: string; result: any }> {
    const res = await client.post('/notifications/test-email', { recipient_email: recipientEmail });
    return res.data;
  },

  async triggerOnDemandAlertScan(): Promise<{ message: string; results: any }> {
    const res = await client.post('/notifications/generate-alerts');
    return res.data;
  },

  async getNotificationHealth(): Promise<NotificationInfrastructureHealth> {
    const res = await client.get('/notifications/health');
    return res.data;
  },

  async getEmailProviderHealth(): Promise<{
    configured: boolean;
    status: string;
    provider: string;
    smtp_host: string;
    smtp_port: number;
    smtp_use_tls: boolean;
    email_from: string;
    message: string;
  }> {
    const res = await client.get('/notifications/email/health');
    return res.data;
  },

  // Environmental Intelligence API
  async getProjectEnvironmentalReport(projectCode: string, skipCache: boolean = false): Promise<ProjectEnvironmentalReport> {
    return cachedGet<ProjectEnvironmentalReport>(`/environment/project/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
  },

  async getRegionalEnvironmentalOverview(skipCache: boolean = false): Promise<RegionalEnvironmentalOverviewResponse> {
    return cachedGet<RegionalEnvironmentalOverviewResponse>('/environment/regional-overview', undefined, 120000, skipCache);
  },

  async getBottlenecks(skipCache: boolean = false): Promise<BottleneckItem[]> {
    return cachedGet<BottleneckItem[]>('/dependencies/bottlenecks', undefined, 60000, skipCache);
  },

  async getDependencyGraph(params?: Record<string, string>, skipCache: boolean = false): Promise<any> {
    return cachedGet<any>('/dependencies/graph', params, 60000, skipCache);
  },

  async getDependencyHealth(skipCache: boolean = false): Promise<any> {
    return cachedGet<any>('/dependencies/health', undefined, 60000, skipCache);
  },

  async getProjectDependencies(projectCode: string, skipCache: boolean = false): Promise<any> {
    return cachedGet<any>(`/dependencies/project/${encodeURIComponent(projectCode)}`, undefined, 60000, skipCache);
  },

  async runStressTest(projectCode: string, payload: any): Promise<any> {
    const res = await client.post(`/stress-test/project/${encodeURIComponent(projectCode)}`, payload);
    return res.data;
  },

  async getSatelliteChange(projectCode: string, skipCache: boolean = false): Promise<any> {
    const params = skipCache ? { skipCache: true } : undefined;
    return cachedGet<any>(`/satellite/project/${encodeURIComponent(projectCode)}`, params, 60000, skipCache);
  }
};

const CANONICAL_STATES_SET = new Set([
  'ANDAMAN AND NICOBAR ISLANDS', 'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR',
  'CHANDIGARH', 'CHHATTISGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'DELHI', 'GOA',
  'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JAMMU AND KASHMIR', 'JHARKHAND', 'KARNATAKA',
  'KERALA', 'LADAKH', 'LAKSHADWEEP', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA',
  'MIZORAM', 'MULTI STATE', 'NAGALAND', 'ODISHA', 'PUDUCHERRY', 'PUNJAB', 'RAJASTHAN',
  'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL'
]);

export const EXPLICIT_STATE_MAPPINGS: Record<string, string> = {
  // Alternate Spellings & Typos
  'CHHATISGARH': 'CHHATTISGARH',
  'ORISSA': 'ODISHA',
  'UTTRANCHAL': 'UTTARAKHAND',
  'UTTARANCHAL': 'UTTARAKHAND',
  'PONDICHERRY': 'PUDUCHERRY',
  'JAMMU AND': 'JAMMU AND KASHMIR',
  'JAMMU & KASHMIR': 'JAMMU AND KASHMIR',
  'J&K': 'JAMMU AND KASHMIR',
  'A & N ISLANDS': 'ANDAMAN AND NICOBAR ISLANDS',
  'ANDAMAN & NICOBAR': 'ANDAMAN AND NICOBAR ISLANDS',
  'ANDAMAN AND NICOBAR': 'ANDAMAN AND NICOBAR ISLANDS',
  'D & N HAVELI': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DADRA AND NAGAR HAVELI': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DAMAN AND DIU': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'MULTI-STATE': 'MULTI STATE',
  'DELHI NCR': 'DELHI',
  'NCT OF DELHI': 'DELHI',

  // Procurement & Contract Mode Suffixes (EPC)
  'ARUNACHAL PRADESH EPC': 'ARUNACHAL PRADESH',
  'ASSAM EPC': 'ASSAM',
  'BIHAR EPC': 'BIHAR',
  'DELHI EPC': 'DELHI',
  'GUJARAT EPC': 'GUJARAT',
  'HIMACHAL PRADESH EPC': 'HIMACHAL PRADESH',
  'HARYANA EPC': 'HARYANA',
  'JAMMU AND KASHMIR EPC': 'JAMMU AND KASHMIR',
  'JHARKHAND EPC': 'JHARKHAND',
  'KARNATAKA EPC': 'KARNATAKA',
  'KERALA EPC': 'KERALA',
  'LADAKH EPC': 'LADAKH',
  'MADHYA PRADESH EPC': 'MADHYA PRADESH',
  'MAHARASHTRA EPC': 'MAHARASHTRA',
  'MANIPUR EPC': 'MANIPUR',
  'MEGHALAYA EPC': 'MEGHALAYA',
  'MIZORAM EPC': 'MIZORAM',
  'NAGALAND EPC': 'NAGALAND',
  'ODISHA EPC': 'ODISHA',
  'PUNJAB EPC': 'PUNJAB',
  'RAJASTHAN EPC': 'RAJASTHAN',
  'SIKKIM EPC': 'SIKKIM',
  'TAMIL NADU EPC': 'TAMIL NADU',
  'TELANGANA EPC': 'TELANGANA',
  'TRIPURA EPC': 'TRIPURA',
  'UTTAR PRADESH EPC': 'UTTAR PRADESH',
  'WEST BENGAL EPC': 'WEST BENGAL',

  // BOT / PPP / Total / Joint Venture Suffixes
  'MAHARASHTRA , BOT (TOLL)': 'MAHARASHTRA',
  'MADHYA PRADESH , BOT (TOLL)': 'MADHYA PRADESH',
  'RAJASTHAN , BOT (TOLL)': 'RAJASTHAN',
  'RAJASTHAN PPP (BOT)': 'RAJASTHAN',
  'ASSAM PPP (BOT)': 'ASSAM',
  'MULTI STATE PPP (BOT)': 'MULTI STATE',
  'WEST BENGAL , Total': 'WEST BENGAL',
  'MULTI STATE , Total': 'MULTI STATE',
  'PUNJAB , Total': 'PUNJAB',
  'BIHAR , Joint Venture': 'BIHAR',
  'UTTAR PRADESH Joint Venture': 'UTTAR PRADESH',
  'UTTAR PRADESH , Joint Venture': 'UTTAR PRADESH',
  'TAMIL NADU Joint Venture': 'TAMIL NADU',
  'MULTI STATE Joint Venture': 'MULTI STATE',

  // Agency / Ministry Prefixes
  'FOR MHA,UTTAR PRADESH': 'UTTAR PRADESH',
  'METRO RAI,BIHAR': 'BIHAR',
  'Universi,SIKKIM': 'SIKKIM',
  'REFIN,KARNATAKA': 'KARNATAKA'
};

export function normalizeRawStateName(rawInput: string): string {
  if (!rawInput) return 'Unknown State';
  const trimmed = rawInput.trim().toUpperCase();

  if (CANONICAL_STATES_SET.has(trimmed)) {
    return trimmed;
  }
  if (EXPLICIT_STATE_MAPPINGS[trimmed]) {
    return EXPLICIT_STATE_MAPPINGS[trimmed];
  }
  return rawInput.trim();
}

function normalizeAndAggregateGeographicRisk(rawItems: any[]): GeographicRiskItem[] {
  const aggregatedMap = new Map<string, {
    state: string;
    total_projects: number;
    high_risk_projects: number;
    critical_risk_projects: number;
    total_cost_overrun_cr: number;
    weighted_delay_sum: number;
  }>();

  for (const item of rawItems) {
    const rawState = item.state || item.state_name || "Unknown State";
    const normState = normalizeRawStateName(rawState);

    const totalProjects = Number(item.total_projects || item.project_count || 0);
    const highRisk = Number(item.high_risk_projects || item.high_risk_count || 0);
    const criticalRisk = Number(item.critical_risk_projects || item.critical_risk_count || 0);
    const costOverrun = Number(item.total_cost_overrun_cr || item.overrun_cr || 0);
    const avgDelay = Number(item.avg_delay_months || 0);

    const existing = aggregatedMap.get(normState);
    if (existing) {
      existing.total_projects += totalProjects;
      existing.high_risk_projects += highRisk;
      existing.critical_risk_projects += criticalRisk;
      existing.total_cost_overrun_cr += costOverrun;
      existing.weighted_delay_sum += (avgDelay * totalProjects);
    } else {
      aggregatedMap.set(normState, {
        state: normState,
        total_projects: totalProjects,
        high_risk_projects: highRisk,
        critical_risk_projects: criticalRisk,
        total_cost_overrun_cr: costOverrun,
        weighted_delay_sum: (avgDelay * totalProjects)
      });
    }
  }

  const result: GeographicRiskItem[] = [];
  for (const [_, agg] of aggregatedMap.entries()) {
    const tot = agg.total_projects;
    result.push({
      state: agg.state,
      total_projects: tot,
      high_risk_projects: agg.high_risk_projects,
      critical_risk_projects: agg.critical_risk_projects,
      total_cost_overrun_cr: Math.round(agg.total_cost_overrun_cr * 100) / 100,
      avg_delay_months: tot > 0 ? Math.round((agg.weighted_delay_sum / tot) * 10) / 10 : 0
    });
  }

  return result;
}

export default api;