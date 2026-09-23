import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Building2,
  MapPin,
  IndianRupee,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { api } from '../../services/apiClient';
import {
  ProjectSummary,
  StateStatItem,
  AgencyStatItem,
  RiskCategoryDistributionItem
} from '../../types/api';
import {
  formatIndianCr,
  formatPercent,
  formatMonths,
  formatIndianNumber
} from '../../utils/formatters';

interface BenchmarkingViewProps {
  onSelectProject: (code: string) => void;
  onOpenAssistant?: (query?: string) => void;
}

export const BenchmarkingView: React.FC<BenchmarkingViewProps> = ({
  onSelectProject,
  onOpenAssistant
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  // Raw API Data
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [totalServerProjects, setTotalServerProjects] = useState<number>(0);
  const [stateStats, setStateStats] = useState<StateStatItem[]>([]);
  const [agencyStats, setAgencyStats] = useState<AgencyStatItem[]>([]);
  const [riskDist, setRiskDist] = useState<RiskCategoryDistributionItem[]>([]);

  // Filter States
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedAgency, setSelectedAgency] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subjectProjectCode, setSubjectProjectCode] = useState<string>('');

  // Table Sorting & Pagination
  const [sortBy, setSortBy] = useState<'cost_overrun_pct' | 'delay_months' | 'risk_score' | 'latest_cost_cr'>('cost_overrun_pct');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const loadData = async () => {
    setRefreshing(true);
    setError(null);
    const startTime = performance.now();
    try {
      const [projRes, statesRes, agenciesRes, riskDistRes] = await Promise.allSettled([
        api.getProjects({ page_size: 200, sort_by: 'cost_overrun_cr', order: 'desc' }),
        api.getStateStats(100),
        api.getAgencyStats(100),
        api.getRiskDistribution()
      ]);

      if (projRes.status === 'fulfilled') {
        setProjects(projRes.value.projects);
        setTotalServerProjects(projRes.value.total);
      }
      if (statesRes.status === 'fulfilled') {
        setStateStats(statesRes.value);
      }
      if (agenciesRes.status === 'fulfilled') {
        setAgencyStats(agenciesRes.value);
      }
      if (riskDistRes.status === 'fulfilled') {
        setRiskDist(riskDistRes.value);
      }

      setLastRefreshed(new Date().toLocaleTimeString());
      console.log(`[PERF] feature:primary-ready benchmarking ${Math.round(performance.now() - startTime)}ms`);
    } catch (err: any) {
      console.error("Failed to load benchmarking data:", err);
      setError(err?.message || "Failed to communicate with Nirman AI analytics endpoints.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[PERF] feature:shell benchmarking 0ms');
    loadData();
  }, []);

  // Dynamically extract unique Filter Options from real backend state/agency/sector responses
  const availableStates = useMemo(() => {
    const list = stateStats.map(s => s.state).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [stateStats]);

  const availableAgencies = useMemo(() => {
    const list = agencyStats.map(a => a.agency).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [agencyStats]);

  const availableSectors = useMemo(() => {
    const list = projects.map(p => p.sector).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [projects]);

  // Filtered dataset for benchmarking
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (selectedState !== 'ALL' && p.state !== selectedState) return false;
      if (selectedAgency !== 'ALL' && p.ministry !== selectedAgency) return false;
      if (selectedSector !== 'ALL' && p.sector !== selectedSector) return false;
      if (selectedRiskCategory !== 'ALL' && p.risk_category.toUpperCase() !== selectedRiskCategory.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = p.project_code.toLowerCase().includes(q);
        const matchName = (p.project_name || '').toLowerCase().includes(q);
        const matchAgency = (p.ministry || '').toLowerCase().includes(q);
        const matchState = (p.state || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchAgency && !matchState) return false;
      }
      return true;
    });
  }, [projects, selectedState, selectedAgency, selectedSector, selectedRiskCategory, searchQuery]);

  // Sorted dataset with Rank assigned mathematically
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects].sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'cost_overrun_pct') {
        valA = a.cost_overrun_pct;
        valB = b.cost_overrun_pct;
      } else if (sortBy === 'delay_months') {
        valA = a.delay_months || 0;
        valB = b.delay_months || 0;
      } else if (sortBy === 'risk_score') {
        valA = a.risk_score;
        valB = b.risk_score;
      } else if (sortBy === 'latest_cost_cr') {
        valA = a.latest_cost_cr;
        valB = b.latest_cost_cr;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return sorted.map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  }, [filteredProjects, sortBy, sortOrder]);

  // Subject project details
  const subjectProject = useMemo(() => {
    if (!subjectProjectCode) return null;
    return projects.find(p => p.project_code.toLowerCase() === subjectProjectCode.trim().toLowerCase()) || null;
  }, [projects, subjectProjectCode]);

  // Aggregate stats for filtered peer scope
  const peerScopeMetrics = useMemo(() => {
    const count = sortedProjects.length;
    if (count === 0) return null;

    const totalOrigCost = sortedProjects.reduce((acc, p) => acc + p.original_cost_cr, 0);
    const totalLatestCost = sortedProjects.reduce((acc, p) => acc + p.latest_cost_cr, 0);
    const totalOverrunCr = sortedProjects.reduce((acc, p) => acc + p.cost_overrun_cr, 0);
    const avgOverrunPct = totalOrigCost > 0 ? (totalOverrunCr / totalOrigCost) * 100 : 0;
    const avgDelayMonths = sortedProjects.reduce((acc, p) => acc + (p.delay_months || 0), 0) / count;
    const avgRiskScore = sortedProjects.reduce((acc, p) => acc + (p.risk_score * (p.risk_score <= 1 ? 100 : 1)), 0) / count;
    const highCriticalCount = sortedProjects.filter(p => ['HIGH', 'CRITICAL'].includes(p.risk_category.toUpperCase())).length;
    const avgPhysicalProgress = sortedProjects.reduce((acc, p) => acc + (p.physical_progress_pct || 0), 0) / count;

    return {
      count,
      totalOrigCost,
      totalLatestCost,
      totalOverrunCr,
      avgOverrunPct,
      avgDelayMonths,
      avgRiskScore,
      highCriticalCount,
      avgPhysicalProgress
    };
  }, [sortedProjects]);

  // Paginated Table Rows
  const totalPages = Math.ceil((sortedProjects.length || 1) / pageSize);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, currentPage]);

  // Recharts Data 1: State Performance Benchmark
  const stateChartData = useMemo(() => {
    return stateStats.slice(0, 7).map(s => ({
      name: s.state.length > 14 ? s.state.substring(0, 12) + '..' : s.state,
      fullName: s.state,
      original: s.total_original_cost_crore,
      anticipated: s.total_anticipated_cost_crore,
      overrun: Math.max(0, s.total_anticipated_cost_crore - s.total_original_cost_crore),
      projects: s.project_count
    }));
  }, [stateStats]);

  // Recharts Data 2: Agency Overrun & Risk Comparison
  const agencyChartData = useMemo(() => {
    return agencyStats.slice(0, 7).map(a => ({
      name: a.agency.length > 15 ? a.agency.substring(0, 13) + '..' : a.agency,
      fullName: a.agency,
      overrunPct: a.cost_overrun_percent || 0,
      avgRiskScore: a.avg_risk_score !== null ? (a.avg_risk_score <= 1 ? a.avg_risk_score * 100 : a.avg_risk_score) : 0,
      highCritical: a.high_critical_risk_count
    }));
  }, [agencyStats]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedAgency, selectedSector, selectedRiskCategory, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Institutional Peer Benchmarking Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Institutional Benchmarking Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Compare infrastructure project performance, cost escalation, timeline delays, and risk exposure against state, agency, and sector peer cohorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Backend Intelligence
            </span>
            <span className="font-mono text-[11px] text-slate-400">Refreshed: {lastRefreshed}</span>
          </div>

          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Benchmarking Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FILTER & SCOPE CONTROLS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Peer Scope &amp; Benchmark Filters
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            Filtered Peer Cohort: {sortedProjects.length} Projects
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* State Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">State / Union Territory</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All States ({availableStates.length})</option>
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Agency Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Executing Agency / Ministry</label>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Agencies ({availableAgencies.length})</option>
              {availableAgencies.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Infrastructure Sector</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Sectors ({availableSectors.length})</option>
              {availableSectors.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Risk Category Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Risk Category</label>
            <select
              value={selectedRiskCategory}
              onChange={(e) => setSelectedRiskCategory(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MODERATE">Moderate Risk</option>
              <option value="NORMAL">Normal / Low Risk</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Target Subject Project Comparator Box */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            Project vs. Peer Benchmark Target:
          </span>
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Enter Project Code (e.g. 020100044) for 1-vs-Peer benchmark..."
              value={subjectProjectCode}
              onChange={(e) => setSubjectProjectCode(e.target.value)}
              className="w-full bg-blue-50/50 text-slate-900 text-xs font-mono rounded-lg px-3 py-1.5 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {subjectProject && (
            <div className="flex items-center gap-2 text-xs bg-blue-100 text-blue-900 px-3 py-1 rounded-full border border-blue-300">
              <span className="font-bold">{subjectProject.project_code}</span>
              <span className="truncate max-w-[200px]">{subjectProject.project_name}</span>
              <button
                onClick={() => onSelectProject(subjectProject.project_code)}
                className="ml-1 text-[11px] underline font-medium hover:text-blue-700"
              >
                Inspect Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BENCHMARK SUMMARY METRICS CARDS */}
      {peerScopeMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Peer Cohort Size</span>
            <div className="text-2xl font-extrabold text-slate-900">{formatIndianNumber(peerScopeMetrics.count)}</div>
            <span className="text-[11px] text-slate-400 font-mono">Projects in current scope</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Peer Avg Cost Overrun</span>
            <div className="text-2xl font-extrabold text-red-600">{formatPercent(peerScopeMetrics.avgOverrunPct)}</div>
            <span className="text-[11px] text-slate-400 font-mono">Total Overrun: {formatIndianCr(peerScopeMetrics.totalOverrunCr)}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Peer Avg Schedule Delay</span>
            <div className="text-2xl font-extrabold text-amber-600">{formatMonths(peerScopeMetrics.avgDelayMonths)}</div>
            <span className="text-[11px] text-slate-400 font-mono">Average month slippage</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Peer Avg Risk Score</span>
            <div className="text-2xl font-extrabold text-blue-600">{peerScopeMetrics.avgRiskScore.toFixed(1)} / 100</div>
            <span className="text-[11px] text-slate-400 font-mono">XGBoost composite score</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">High / Critical Exposure</span>
            <div className="text-2xl font-extrabold text-rose-700">{formatIndianNumber(peerScopeMetrics.highCriticalCount)}</div>
            <span className="text-[11px] text-slate-400 font-mono">
              {formatPercent((peerScopeMetrics.highCriticalCount / peerScopeMetrics.count) * 100)} of peer cohort
            </span>
          </div>
        </div>
      )}

      {/* PROJECT VS PEER GROUP COMPARISON CARD (IF SUBJECT PROJECT IS SELECTED) */}
      {subjectProject && peerScopeMetrics && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl border border-slate-700 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                  {subjectProject.project_code}
                </span>
                <h3 className="text-base font-bold">{subjectProject.project_name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {subjectProject.ministry} | {subjectProject.state} | {subjectProject.sector}
              </p>
            </div>
            <button
              onClick={() => onSelectProject(subjectProject.project_code)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              Open Project Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Metric 1: Cost Overrun % */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
              <span className="text-slate-400 font-medium">Cost Overrun %</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-lg font-bold text-red-400">{formatPercent(subjectProject.cost_overrun_pct)}</span>
                <span className="text-slate-400 font-mono">Peer: {formatPercent(peerScopeMetrics.avgOverrunPct)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {subjectProject.cost_overrun_pct > peerScopeMetrics.avgOverrunPct
                  ? `▲ ${(subjectProject.cost_overrun_pct - peerScopeMetrics.avgOverrunPct).toFixed(1)}% higher than peer average`
                  : `▼ ${(peerScopeMetrics.avgOverrunPct - subjectProject.cost_overrun_pct).toFixed(1)}% lower than peer average`}
              </div>
            </div>

            {/* Metric 2: Schedule Delay */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
              <span className="text-slate-400 font-medium">Schedule Delay</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-lg font-bold text-amber-400">{formatMonths(subjectProject.delay_months || 0)}</span>
                <span className="text-slate-400 font-mono">Peer: {formatMonths(peerScopeMetrics.avgDelayMonths)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {(subjectProject.delay_months || 0) > peerScopeMetrics.avgDelayMonths
                  ? `▲ ${((subjectProject.delay_months || 0) - peerScopeMetrics.avgDelayMonths).toFixed(1)} months more than peer avg`
                  : `▼ ${(peerScopeMetrics.avgDelayMonths - (subjectProject.delay_months || 0)).toFixed(1)} months less than peer avg`}
              </div>
            </div>

            {/* Metric 3: Risk Score */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
              <span className="text-slate-400 font-medium">Risk Score</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-lg font-bold text-blue-400">
                  {(subjectProject.risk_score <= 1 ? subjectProject.risk_score * 100 : subjectProject.risk_score).toFixed(1)}
                </span>
                <span className="text-slate-400 font-mono">Peer: {peerScopeMetrics.avgRiskScore.toFixed(1)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Category: <span className="font-bold text-white uppercase">{subjectProject.risk_category}</span>
              </div>
            </div>

            {/* Metric 4: Latest Cost Outlay */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1">
              <span className="text-slate-400 font-medium">Latest Sanctioned Cost</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-lg font-bold text-emerald-400">{formatIndianCr(subjectProject.latest_cost_cr)}</span>
                <span className="text-slate-400 font-mono">Original: {formatIndianCr(subjectProject.original_cost_cr)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Overrun: {formatIndianCr(subjectProject.cost_overrun_cr)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BENCHMARK VISUALIZATIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: State Cost Outlay & Overrun Benchmark */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              State-wise Budget Outlay &amp; Anticipated Expansion
            </h3>
            <p className="text-[11px] text-slate-500">
              Original vs. Anticipated Cost (₹ Crore) across major state infrastructure portfolios.
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k Cr`} />
                <Tooltip
                  formatter={(value: any, name: string) => [formatIndianCr(Number(value)), name === 'original' ? 'Original Cost' : 'Anticipated Cost']}
                  labelFormatter={(label: any) => `State: ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="original" name="Original Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anticipated" name="Anticipated Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Agency Cost Overrun & Risk Exposure */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              Executing Agency Cost Overrun % Benchmark
            </h3>
            <p className="text-[11px] text-slate-500">
              Average cost expansion percentage and high-risk project counts by ministry/agency.
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agencyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: any) => [formatPercent(Number(value)), 'Cost Overrun %']}
                  labelFormatter={(label: any) => `Agency: ${label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                />
                <Bar dataKey="overrunPct" name="Cost Overrun %" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {agencyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.overrunPct > 30 ? '#dc2626' : entry.overrunPct > 15 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DENSE INSTITUTIONAL BENCHMARK TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Institutional Peer Benchmark Table
            </h2>
            <p className="text-[11px] text-slate-500">
              Ranked list of projects in the current scope ordered by cost overrun, delay, or XGBoost risk score.
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cost_overrun_pct">Cost Overrun %</option>
              <option value="delay_months">Schedule Delay (Months)</option>
              <option value="risk_score">Risk Score</option>
              <option value="latest_cost_cr">Anticipated Cost (₹ Cr)</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold rounded-lg border border-slate-300 transition"
              title="Toggle Sort Direction"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-3">Project Code &amp; Name</th>
                <th className="py-3 px-3">Agency</th>
                <th className="py-3 px-3">State</th>
                <th className="py-3 px-3 text-right">Original Cost</th>
                <th className="py-3 px-3 text-right">Anticipated Cost</th>
                <th className="py-3 px-3 text-right">Cost Overrun %</th>
                <th className="py-3 px-3 text-right">Delay</th>
                <th className="py-3 px-3 text-center">Risk Score</th>
                <th className="py-3 px-3 text-center">Category</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 text-xs">
                    No peer projects found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p) => {
                  const score100 = p.risk_score <= 1 ? p.risk_score * 100 : p.risk_score;
                  const catUpper = p.risk_category.toUpperCase();
                  const isSubject = subjectProjectCode && p.project_code.toLowerCase() === subjectProjectCode.trim().toLowerCase();

                  return (
                    <tr
                      key={p.project_code}
                      className={`hover:bg-slate-50 transition cursor-pointer ${isSubject ? 'bg-blue-50/80 font-medium' : ''}`}
                      onClick={() => onSelectProject(p.project_code)}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">{p.rank}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {p.project_code}
                          </span>
                          <span className="truncate max-w-[220px]" title={p.project_name}>{p.project_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[130px]" title={p.ministry}>{p.ministry}</td>
                      <td className="py-2.5 px-3 text-slate-700">{p.state}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatIndianCr(p.original_cost_cr)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">{formatIndianCr(p.latest_cost_cr)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">{formatPercent(p.cost_overrun_pct)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600">{formatMonths(p.delay_months || 0)}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span className={score100 >= 75 ? 'text-rose-700' : score100 >= 50 ? 'text-amber-600' : 'text-blue-600'}>
                          {score100.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          catUpper === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                          catUpper === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          catUpper === 'MODERATE' || catUpper === 'WATCHLIST' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {catUpper}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectProject(p.project_code)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold rounded text-[11px] transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedProjects.length > pageSize && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, sortedProjects.length)}</span> of{' '}
              <span className="font-bold text-slate-800">{sortedProjects.length}</span> peer projects
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarkingView;
