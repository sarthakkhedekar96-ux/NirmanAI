import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import api from '../../services/apiClient';
import {
  PortfolioKPIs,
  ProjectSummary,
  RiskCategoryDistributionItem
} from '../../types/api';
import {
  formatIndianCr,
  formatIndianNumber,
  formatPercent,
  formatMonths
} from '../../utils/formatters';

interface RiskMonitorViewProps {
  onSelectProject: (code: string) => void;
  onOpenAssistant: (query?: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#f59e0b',
  LOW: '#10b981',
  NORMAL: '#10b981'
};

export const RiskMonitorView: React.FC<RiskMonitorViewProps> = ({
  onSelectProject,
  onOpenAssistant
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null);
  const [riskDist, setRiskDist] = useState<RiskCategoryDistributionItem[]>([]);
  
  // Projects Table State
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('cost_overrun_cr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = async () => {
    setRefreshing(true);
    const startTime = performance.now();
    try {
      const [kpiRes, distRes, projRes] = await Promise.all([
        api.getPortfolioKPIs(),
        api.getRiskDistribution(),
        api.getProjects({
          search: search.trim() || undefined,
          risk_category: riskFilter !== 'ALL' ? riskFilter : undefined,
          state: stateFilter !== 'ALL' ? stateFilter : undefined,
          agency: agencyFilter !== 'ALL' ? agencyFilter : undefined,
          page,
          page_size: pageSize,
          sort_by: sortBy,
          order: sortOrder
        })
      ]);

      setKpis(kpiRes);
      setRiskDist(distRes);
      setProjects(projRes.projects);
      setTotalProjects(projRes.total);
      setLastRefreshed(new Date().toLocaleTimeString());
      console.log(`[PERF] feature:primary-ready risk-monitor ${Math.round(performance.now() - startTime)}ms`);
    } catch (err) {
      console.error("Failed to load risk monitor data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[PERF] feature:shell risk-monitor 0ms');
    loadData();
  }, [page, pageSize, riskFilter, stateFilter, agencyFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const distChartData = useMemo(() => {
    if (!riskDist || riskDist.length === 0) return [];
    return riskDist.map(item => ({
      name: item.risk_category,
      count: item.project_count,
      pct: item.percent_of_total,
      costCr: item.total_anticipated_cost_crore,
      color: RISK_COLORS[item.risk_category.toUpperCase()] || '#64748b'
    }));
  }, [riskDist]);

  const totalPages = Math.ceil(totalProjects / pageSize) || 1;

  const criticalCount = kpis?.critical_risk_projects_count ?? 0;
  const highCount = kpis?.high_risk_projects_count ?? 0;
  const totalCount = kpis?.total_projects ?? 1;
  const modLowCount = Math.max(0, totalCount - (criticalCount + highCount));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Risk Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous project risk assessment surveillance across central infrastructure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> API Connected
            </span>
            <span className="font-mono text-[11px] text-slate-400">Refreshed: {lastRefreshed}</span>
          </div>

          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Risk Monitor Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION B — PORTFOLIO RISK SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Total Monitored */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500 font-medium block">Total Monitored Projects</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900">
            {formatIndianNumber(totalCount)}
          </div>
          <span className="text-[11px] text-slate-400 block">Active MoSPI Surveillance</span>
        </div>

        {/* Critical Risk */}
        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm space-y-1 bg-red-50/20">
          <div className="flex justify-between items-center">
            <span className="text-red-700 font-bold block uppercase tracking-wider text-[11px]">Critical Risk</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-red-600">
              {formatIndianNumber(criticalCount)}
            </span>
            <span className="text-xs font-mono font-bold text-red-700">
              ({formatPercent((criticalCount / totalCount) * 100)})
            </span>
          </div>
          <span className="text-[11px] text-red-600 block">Severe probability &ge; 0.75</span>
        </div>

        {/* High Risk */}
        <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm space-y-1 bg-orange-50/20">
          <div className="flex justify-between items-center">
            <span className="text-orange-700 font-bold block uppercase tracking-wider text-[11px]">High Risk</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-orange-600">
              {formatIndianNumber(highCount)}
            </span>
            <span className="text-xs font-mono font-bold text-orange-700">
              ({formatPercent((highCount / totalCount) * 100)})
            </span>
          </div>
          <span className="text-[11px] text-orange-600 block">Probability &ge; 0.28 (T* Cutoff)</span>
        </div>

        {/* Moderate / Low Risk */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-1 bg-emerald-50/20">
          <div className="flex justify-between items-center">
            <span className="text-emerald-700 font-bold block uppercase tracking-wider text-[11px]">Moderate / Normal Risk</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-600">
              {formatIndianNumber(modLowCount)}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              ({formatPercent((modLowCount / totalCount) * 100)})
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 block">Below operational threshold T*</span>
        </div>
      </div>

      {/* SECTION C & E — RISK DISTRIBUTION CHART & THRESHOLD EXPLANATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Visualization */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Portfolio Risk Tier Distribution
              </h2>
              <p className="text-[11px] text-slate-500">
                Breakdown of project count and total anticipated outlay per calibrated risk category
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    name === 'count' ? `${value} Projects` : value,
                    name === 'count' ? 'Project Count' : name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION E — Operational Threshold Explanation Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Operational Threshold T* = 0.28</h3>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Projects with calibrated predicted severe-risk probability at or above the operational threshold (<strong className="text-slate-900 font-mono">T* = 0.28</strong>) are flagged for proactive surveillance.
            </p>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
              <span className="font-bold text-blue-900 block text-[11px]">Threshold Calibration:</span>
              <p className="text-blue-800 text-[11px]">
                The cutoff $T^* = 0.28$ is the configured operational threshold derived from precision-recall optimization on MoSPI historical monitoring records.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 italic">
            Historical portfolio risk trend is not available in the current API response.
          </div>
        </div>
      </div>

      {/* SECTION D — RISK SURVEILLANCE TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Risk Surveillance Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Monitored project ledger with risk score, failure probability, and cost/schedule metrics
            </p>
          </div>

          {/* Filters & Search Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search project code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            {/* Risk Category Filter */}
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MODERATE">Moderate Risk</option>
              <option value="LOW">Low Risk</option>
            </select>

            {/* Sort Control */}
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
            >
              <option value="cost_overrun_cr:desc">Sort: Highest Cost Overrun</option>
              <option value="risk_score:desc">Sort: Highest Risk Score</option>
              <option value="delay_months:desc">Sort: Longest Delay</option>
              <option value="original_cost:desc">Sort: Largest Baseline Cost</option>
            </select>
          </div>
        </div>

        {/* Risk Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Project Code &amp; Name</th>
                <th className="py-3 px-3">State / Agency</th>
                <th className="py-3 px-3 text-center">Risk Category</th>
                <th className="py-3 px-3 text-right">Risk Score</th>
                <th className="py-3 px-3 text-right">Cost Overrun</th>
                <th className="py-3 px-3 text-right">Delay</th>
                <th className="py-3 px-3 text-center">Threshold</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No projects found matching the specified surveillance filters.
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const score100 = p.risk_score > 1 ? p.risk_score : p.risk_score * 100;
                  const prob = score100 / 100;
                  const isBreached = prob >= 0.28;
                  const cat = p.risk_category.toUpperCase();

                  const badgeStyle = cat === 'CRITICAL'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : cat === 'HIGH'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : cat === 'MODERATE' || cat === 'WATCHLIST'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={p.project_code} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 max-w-xs">
                        <span className="font-mono text-[11px] font-bold text-blue-700 block">
                          {p.project_code}
                        </span>
                        <span className="font-semibold text-slate-900 block truncate" title={p.project_name}>
                          {p.project_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="block font-medium text-slate-800">{p.state || 'Multi-State'}</span>
                        <span className="text-[11px] text-slate-400">{p.ministry}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${badgeStyle}`}>
                          {cat}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {score100.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-red-600 font-semibold">
                        {p.cost_overrun_cr > 0 ? `+${formatIndianCr(p.cost_overrun_cr)}` : '₹0 Cr'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700">
                        {formatMonths(p.delay_months || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${isBreached ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                          {isBreached ? 'BREACH' : 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onSelectProject(p.project_code)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition"
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

        {/* Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Showing Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({formatIndianNumber(totalProjects)} total projects)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2 text-slate-700">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMonitorView;
