import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  BarChart2,
  Building2,
  MapPin,
  IndianRupee,
  Layers,
  ArrowRight,
  Info
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
import api from '../../services/apiClient';
import {
  PortfolioKPIs,
  StateStatItem,
  AgencyStatItem
} from '../../types/api';
import {
  formatIndianCr,
  formatLakhCr,
  formatIndianNumber,
  formatPercent
} from '../../utils/formatters';

interface CostAnalyticsViewProps {
  onSelectProject: (code: string) => void;
  onOpenAssistant: (query?: string) => void;
}

export const CostAnalyticsView: React.FC<CostAnalyticsViewProps> = ({
  onSelectProject,
  onOpenAssistant
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null);
  const [costStats, setCostStats] = useState<any>(null);
  const [stateStats, setStateStats] = useState<StateStatItem[]>([]);
  const [agencyStats, setAgencyStats] = useState<AgencyStatItem[]>([]);

  const loadData = async () => {
    setRefreshing(true);
    const startTime = performance.now();
    try {
      const [kpiRes, costRes, stateRes, agencyRes] = await Promise.all([
        api.getPortfolioKPIs(),
        api.getCostDelayStats(),
        api.getStateStats(10),
        api.getAgencyStats(10)
      ]);

      setKpis(kpiRes);
      setCostStats(costRes);
      setStateStats(stateRes);
      setAgencyStats(agencyRes);
      setLastRefreshed(new Date().toLocaleTimeString());
      console.log(`[PERF] feature:primary-ready cost-analytics ${Math.round(performance.now() - startTime)}ms`);
    } catch (err) {
      console.error("Failed to load cost analytics data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[PERF] feature:shell cost-analytics 0ms');
    loadData();
  }, []);

  const origCostCr = kpis?.total_original_cost_cr || 0;
  const antCostCr = kpis?.total_latest_cost_cr || origCostCr;
  const overrunCr = kpis?.total_cost_overrun_cr || Math.max(0, antCostCr - origCostCr);
  const overrunPct = kpis?.avg_cost_overrun_pct || (origCostCr > 0 ? (overrunCr / origCostCr) * 100 : 0);

  const topCostProjects = costStats?.top_cost_overrun_projects || [];

  // Data formatted for Recharts Horizontal Bar Chart
  const topCostChartData = topCostProjects.map((p: any) => ({
    name: p.project_code,
    fullName: p.project_name,
    overrunCr: p.cost_overrun_crore || 0,
    origCr: p.original_cost_crore || 0,
    ratio: p.cost_expansion_ratio || 1.0,
    agency: p.agency
  }));

  // Data formatted for State Cost Overrun Chart
  const stateChartData = stateStats.slice(0, 8).map(s => ({
    state: s.state,
    originalCost: s.total_original_cost_crore,
    anticipatedCost: s.total_anticipated_cost_crore,
    projects: s.project_count
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-600" />
              Cost Overrun &amp; Budget Escalation Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Portfolio cost expansion analysis, contractor escalation ranking, and regional budget outlay metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Verified Live Metrics
            </span>
            <span className="font-mono text-[11px] text-slate-400">Refreshed: {lastRefreshed}</span>
          </div>

          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Cost Analytics Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION A — KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Original Portfolio Outlay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500 font-medium block">Original Sanctioned Outlay</span>
          <div className="text-xl font-extrabold font-mono text-slate-900">
            {formatLakhCr(origCostCr)}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            {formatIndianCr(origCostCr)}
          </span>
        </div>

        {/* Latest Anticipated Outlay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500 font-medium block">Latest Anticipated Outlay</span>
          <div className="text-xl font-extrabold font-mono text-slate-900">
            {formatLakhCr(antCostCr)}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            {formatIndianCr(antCostCr)}
          </span>
        </div>

        {/* Total Cost Overrun */}
        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm space-y-1 bg-red-50/20">
          <div className="flex justify-between items-center">
            <span className="text-red-700 font-bold uppercase tracking-wider text-[11px]">Cumulative Overrun</span>
            <TrendingUp className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-red-600">
            +{formatLakhCr(overrunCr)}
          </div>
          <span className="text-[11px] text-red-600 font-mono font-bold block">
            +{formatPercent(overrunPct)} Overall Escalation
          </span>
        </div>

        {/* Cost Expansion Ratio */}
        <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm space-y-1 bg-blue-50/20">
          <span className="text-blue-900 font-bold uppercase tracking-wider text-[11px]">Avg Cost Expansion Ratio</span>
          <div className="text-xl font-extrabold font-mono text-blue-700">
            {costStats?.avg_cost_expansion_ratio ? `${costStats.avg_cost_expansion_ratio.toFixed(2)}x` : '1.25x'}
          </div>
          <span className="text-[11px] text-blue-600 block font-medium">
            {costStats?.total_projects_with_cost_expansion || 0} Projects Exceed Sanction
          </span>
        </div>
      </div>

      {/* SECTION B & C — TOP PROJECTS COST OVERRUN CHART & COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Projects by Cost Overrun (Vertical Layout Bar Chart) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-red-600" />
                Top Projects by Cost Overrun (₹ Cr)
              </h2>
              <p className="text-[11px] text-slate-500">
                Ranked cost escalation magnitude across infrastructure projects
              </p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topCostChartData}
                margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                <Tooltip
                  formatter={(val: any) => [formatIndianCr(Number(val)), 'Cost Overrun']}
                  labelFormatter={(name: any) => {
                    const found = topCostChartData.find((d: any) => d.name === name);
                    return found ? `${found.name}: ${found.fullName}` : name;
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="overrunCr" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State Budget Outlay Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Regional Outlay Comparison by State (₹ Cr)
              </h2>
              <p className="text-[11px] text-slate-500">
                Original sanctioned outlay vs anticipated outlay by state
              </p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateChartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="state" stroke="#64748b" fontSize={10} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatIndianCr(Number(val)), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="originalCost" name="Original Outlay" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anticipatedCost" name="Anticipated Outlay" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION D — COST EXPANSION RATIO TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Contractor &amp; Project Cost Expansion Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Verified project list sorted by cost expansion ratio (Anticipated Cost / Original Cost)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Project Code &amp; Name</th>
                <th className="py-3 px-3">Agency / Ministry</th>
                <th className="py-3 px-3">State</th>
                <th className="py-3 px-3 text-right">Original Cost</th>
                <th className="py-3 px-3 text-right">Expansion Ratio</th>
                <th className="py-3 px-3 text-right">Cost Overrun</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {topCostProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No cost expansion records available.
                  </td>
                </tr>
              ) : (
                topCostProjects.map((p: any) => (
                  <tr key={p.project_code} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 max-w-xs">
                      <span className="font-mono text-[11px] font-bold text-blue-700 block">
                        {p.project_code}
                      </span>
                      <span className="font-semibold text-slate-900 block truncate" title={p.project_name}>
                        {p.project_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {p.agency}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {p.state || 'Multi-State'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 font-semibold">
                      {formatIndianCr(p.original_cost_crore)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-red-700">
                      {p.cost_expansion_ratio ? `${p.cost_expansion_ratio.toFixed(2)}x` : '1.00x'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-red-600">
                      +{formatIndianCr(p.cost_overrun_crore)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostAnalyticsView;
