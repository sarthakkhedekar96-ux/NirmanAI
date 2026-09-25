import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export interface LandingStats {
  totalProjects: number;
  criticalRiskCount: number;
  highRiskCount: number;
  liveProjectsCount: number;
  avgDelayMonths: number;
  totalCostOverrunCr: number;
  totalAnticipatedCostCr: number;
  totalOriginalCostCr: number;
  riskDistribution?: Array<{
    risk_category: string;
    project_count: number;
    percent_of_total: number;
    avg_risk_score?: number;
  }>;
  dataAsOf?: string;
  isLiveData: boolean;
}

export interface ProjectPreview {
  project_code: string;
  project_name: string;
  sector?: string;
  state?: string;
  agency?: string;
  risk_category?: string;
  risk_score?: number;
  original_cost_cr?: number;
  latest_cost_cr?: number;
  cost_overrun_cr?: number;
  delay_months?: number;
  physical_progress_pct?: number;
  top_drivers?: Array<{ feature: string; impact: string; value: string | number }>;
}

export interface AgencyStat {
  agency: string;
  project_count: number;
  total_original_cost_crore: number;
  total_anticipated_cost_crore: number;
  total_cost_overrun_crore?: number;
  cumulative_expenditure_crore?: number;
  completed_during_month?: number;
  newly_added?: number;
  avg_delay_months?: number;
  avg_risk_score?: number;
}

export interface SectorStat {
  sector: string;
  project_count: number;
  total_original_cost_crore: number;
  total_anticipated_cost_crore: number;
  total_cost_overrun_crore?: number;
  cumulative_expenditure_crore?: number;
  completed_during_month?: number;
  newly_added?: number;
  avg_delay_months?: number;
  avg_risk_score?: number;
}

export interface StateStat {
  state: string;
  project_count: number;
  total_original_cost_crore: number;
  total_anticipated_cost_crore: number;
  total_cost_overrun_crore?: number;
  avg_delay_months?: number;
  avg_risk_score?: number;
  high_critical_risk_count?: number;
}

export interface GeographicRiskItem {
  state: string;
  total_projects: number;
  high_risk_projects: number;
  critical_risk_projects: number;
  total_cost_overrun_cr: number;
  avg_delay_months: number;
}

export interface HighValueProject {
  project_code: string;
  project_name: string;
  agency?: string;
  state?: string;
  sector?: string;
  original_cost_crore?: number;
  latest_cost_crore?: number;
  cost_overrun_crore?: number;
  delay_months?: number;
  physical_progress_pct?: number;
  risk_category?: string;
  risk_score?: number;
}

/**
 * Fetches public summary statistics for the landing page without authorization headers.
 */
export async function fetchLandingStats(): Promise<LandingStats | null> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/summary`, {
      timeout: 10000
    });

    const d = res.data;
    if (!d) return null;

    const totalProjects = d.total_master_projects ?? d.total_projects ?? 0;
    const criticalRisk = d.critical_risk_project_count ?? 0;
    const highRisk = d.high_risk_project_count ?? 0;
    const liveProjects = d.total_live_projects_2026 ?? totalProjects;

    return {
      totalProjects,
      criticalRiskCount: criticalRisk,
      highRiskCount: highRisk,
      liveProjectsCount: liveProjects,
      avgDelayMonths: Number(d.avg_delay_months || 0),
      totalCostOverrunCr: Number(d.total_cost_overrun_crore ?? 0),
      totalAnticipatedCostCr: Number(d.total_anticipated_cost_crore ?? 0),
      totalOriginalCostCr: Number(d.total_original_cost_crore ?? 0),
      dataAsOf: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      isLiveData: true
    };
  } catch (err) {
    console.warn("[LandingService] Public summary fetch unavailable:", err);
    return null;
  }
}

/**
 * Fetches Nodal Ministry & Agency statistics from public endpoint.
 */
export async function fetchAgencyStats(): Promise<AgencyStat[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/agencies?limit=20`, {
      timeout: 8000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn("[LandingService] Public agency stats fetch unavailable:", err);
    return [];
  }
}

/**
 * Fetches Sector-wise infrastructure statistics from public endpoint.
 */
export async function fetchSectorStats(): Promise<SectorStat[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/sectors?limit=20`, {
      timeout: 8000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn("[LandingService] Public sector stats fetch unavailable:", err);
    return [];
  }
}

/**
 * Fetches State-wise infrastructure project statistics from public endpoint.
 */
export async function fetchStateStats(): Promise<StateStat[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/states?limit=50`, {
      timeout: 8000
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn("[LandingService] Public state stats fetch unavailable:", err);
    return [];
  }
}

/**
 * Fetches State Geographic Risk telemetry for IndiaMapSvg from public endpoint.
 */
export async function fetchGeographicRiskData(): Promise<GeographicRiskItem[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/geographic-risk`, {
      timeout: 8000
    });
    const raw = Array.isArray(res.data) ? res.data : (res.data?.states || []);
    return raw;
  } catch (err) {
    console.warn("[LandingService] Public geographic risk fetch unavailable:", err);
    return [];
  }
}

/**
 * Fetches major monitored capital projects from public endpoint.
 */
export async function fetchHighValueProjects(): Promise<HighValueProject[]> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/major-projects?limit=6`, {
      timeout: 8000
    });
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((p: any) => ({
      project_code: p.project_code,
      project_name: p.project_name || `Project ${p.project_code}`,
      agency: p.agency || undefined,
      state: p.state || undefined,
      sector: p.sector || undefined,
      original_cost_crore: p.original_cost_crore !== undefined && p.original_cost_crore !== null ? Number(p.original_cost_crore) : undefined,
      latest_cost_crore: p.latest_cost_crore !== undefined && p.latest_cost_crore !== null ? Number(p.latest_cost_crore) : undefined,
      cost_overrun_crore: p.cost_overrun_crore !== undefined && p.cost_overrun_crore !== null ? Number(p.cost_overrun_crore) : undefined,
      delay_months: p.delay_months !== undefined && p.delay_months !== null ? Number(p.delay_months) : undefined,
      physical_progress_pct: p.physical_progress_pct !== undefined && p.physical_progress_pct !== null ? Number(p.physical_progress_pct) : undefined,
      risk_category: p.risk_category || undefined,
      risk_score: p.risk_score !== undefined && p.risk_score !== null ? Number(p.risk_score) : undefined
    }));
  } catch (err) {
    console.warn("[LandingService] Public major projects fetch unavailable:", err);
    return [];
  }
}

/**
 * Fetches public project spotlight details for project code 020100044 without authentication.
 */
export async function fetchProjectSpotlight(projectCode: string = '020100044'): Promise<ProjectPreview | null> {
  try {
    const res = await axios.get(`${API_BASE_URL}/public/landing/project/${encodeURIComponent(projectCode)}`, {
      timeout: 10000
    });

    const d = res.data;
    if (!d) return null;

    return {
      project_code: d.project_code || projectCode,
      project_name: d.project_name || `Project ${projectCode}`,
      sector: d.sector || undefined,
      state: d.state || undefined,
      agency: d.agency || undefined,
      risk_category: d.risk_category || undefined,
      risk_score: d.risk_score !== undefined && d.risk_score !== null ? Number(d.risk_score) : undefined,
      original_cost_cr: d.original_cost_cr !== undefined && d.original_cost_cr !== null ? Number(d.original_cost_cr) : undefined,
      latest_cost_cr: d.latest_cost_cr !== undefined && d.latest_cost_cr !== null ? Number(d.latest_cost_cr) : undefined,
      cost_overrun_cr: d.cost_overrun_cr !== undefined && d.cost_overrun_cr !== null ? Number(d.cost_overrun_cr) : undefined,
      delay_months: d.delay_months !== undefined && d.delay_months !== null ? Number(d.delay_months) : undefined,
      physical_progress_pct: d.physical_progress_pct !== undefined && d.physical_progress_pct !== null ? Number(d.physical_progress_pct) : undefined,
      top_drivers: Array.isArray(d.top_drivers) && d.top_drivers.length > 0 ? d.top_drivers : undefined
    };
  } catch (err) {
    console.warn("[LandingService] Public project spotlight fetch unavailable:", err);
    return null;
  }
}
