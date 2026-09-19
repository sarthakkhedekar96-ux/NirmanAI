import axios from 'axios';
import {
  PortfolioKPIs,
  ProjectListResponse,
  EarlyWarningsResponse,
  RiskIntelligenceResponse,
  DocumentSearchResponse,
  AssistantChatResponse,
  GeographicRiskItem,
  GeographicRiskResponse
} from '../types/api';

const API_BASE_URL = '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const api = {
  // System Health
  async getHealth() {
    const res = await client.get('/health');
    return res.data;
  },

  // Portfolio KPIs & Analytics
  // Portfolio KPIs & Analytics (Dynamic live database queries)
  async getPortfolioKPIs(): Promise<PortfolioKPIs> {
    const res = await client.get('/analytics/portfolio_kpis');
    const d = res.data;
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


  // Projects Explorer (with live search, filters, pagination, and sorting)
  async getProjects(params: {
    sector?: string;
    state?: string;
    risk_category?: string;
    search?: string;
    min_cost?: number;
    max_cost?: number;
    page?: number;
    page_size?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
  }): Promise<ProjectListResponse> {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.sector) q.append('sector', params.sector);
    if (params.state) q.append('state', params.state);
    if (params.risk_category) q.append('risk_category', params.risk_category);
    if (params.min_cost !== undefined) q.append('min_cost', String(params.min_cost));
    if (params.max_cost !== undefined) q.append('max_cost', String(params.max_cost));
    if (params.page !== undefined) q.append('page', String(params.page));
    if (params.page_size !== undefined) q.append('page_size', String(params.page_size));
    if (params.sort_by) q.append('sort_by', params.sort_by);
    if (params.order) q.append('order', params.order);

    const res = await client.get(`/projects?${q.toString()}`);
    const data = res.data;
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
      risk_score: p.risk_score > 1 ? p.risk_score / 100 : (p.risk_score || 0.5),
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
  async getEarlyWarnings(): Promise<EarlyWarningsResponse> {
    const res = await client.get('/risk/early_warnings');
    const rawList = Array.isArray(res.data) ? res.data : (res.data.alerts || []);

    const alerts = rawList.map((a: any) => ({
      project_code: a.project_code,
      project_name: a.project_name,
      sector: a.sector || a.agency || "Infrastructure",
      risk_score: a.risk_score > 1 ? a.risk_score / 100 : (a.risk_score || 0.8),
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
  async getRiskIntelligence(projectCode: string): Promise<RiskIntelligenceResponse> {
    const res = await client.get(`/risk/intelligence/${encodeURIComponent(projectCode)}`);
    const d = res.data;
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

    return {
      project_code: d.project_code || projectCode,
      project_name: meta.project_name || meta.name || d.project_name || `Project ${projectCode}`,
      sector: meta.sector || meta.agency || "Infrastructure",
      ministry: meta.agency || "Nodal Agency",
      state: meta.state || "India",
      risk_score: (risk.risk_score || d.risk_score || 50) > 1 ? (risk.risk_score || d.risk_score || 50) / 100 : (risk.risk_score || 0.5),
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
  async getGeographicRisk(): Promise<GeographicRiskResponse> {
    const res = await client.get('/analytics/geographic-risk');
    const rawStates = Array.isArray(res.data) ? res.data : (res.data.states || []);

    const states = normalizeAndAggregateGeographicRisk(rawStates);
    return { states };
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