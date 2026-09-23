import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  ShieldAlert,
  ChevronRight,
  BarChart2,
  RefreshCcw,
  PieChart as PieChartIcon,
  Building2,
  MapPin,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import api from '../../services/apiClient';
import { PortfolioKPIs, EarlyWarningAlert } from '../../types/api';
import {
  formatIndianCr,
  formatLakhCr,
  formatIndianNumber,
  formatPercent,
  formatMonths
} from '../../utils/formatters';
import { GeographicRiskMap } from '../analytics/GeographicRiskMap';

interface OverviewDashboardProps {
  onSelectProject: (code: string) => void;
  onOpenAssistant?: (initialQuery?: string) => void;
}

interface RiskDistItem {
  risk_category: string;
  project_count: number;
  percent_of_total: number;
  avg_risk_score: number;
  total_anticipated_cost_crore: number;
}

interface CostDelayStats {
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
}

const formatSectorName = (name: string): string => {
  if (!name) return 'Unknown Sector';
  const clean = name.trim();
  if (clean === 'ROAD TRANSPORT AND HIGHWAYS') return 'Road Transport & Highways';
  if (clean === 'TELECOMMUNICATIONS') return 'Telecommunications';
  if (clean === 'URBAN DEVELOPMENT') return 'Urban Development';
  if (clean === 'WATER RESOURCES') return 'Water Resources';
  if (clean === 'CIVIL AVIATION') return 'Civil Aviation';
  if (clean === 'ATOMIC ENERGY') return 'Atomic Energy';
  return clean.toLowerCase().replace(/(?:^|\s|-)\S/g, m => m.toUpperCase());
};

import { clearFrontendCache } from '../../services/apiClient';

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onSelectProject,
}) => {
  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null);
  const [alerts, setAlerts] = useState<EarlyWarningAlert[]>([]);
  const [riskDist, setRiskDist] = useState<RiskDistItem[]>([]);
  const [costDelayStats, setCostDelayStats] = useState<CostDelayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (isRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    if (isRefresh) {
      clearFrontendCache();
    }
    const startTime = performance.now();
    try {
      const [kpiData, alertData, riskDistData, cdStats] = await Promise.all([
        api.getPortfolioKPIs(isRefresh),
        api.getEarlyWarnings(isRefresh),
        api.getRiskDistribution(isRefresh).catch(() => []),
        api.getCostDelayStats(isRefresh).catch(() => null)
      ]);
      setKpis(kpiData);
      setAlerts(alertData.alerts || []);
      setRiskDist(riskDistData);
      setCostDelayStats(cdStats);
      console.log(`[PERF] feature:primary-ready overview ${Math.round(performance.now() - startTime)}ms`);
    } catch (err: any) {
      console.error("Failed to load overview data:", err);
      setError("Unable to connect to backend analytics server. Ensure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[PERF] feature:shell overview 0ms');
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Sector Data for Horizontal Bar Chart
  const rawSectors = kpis?.top_sectors_by_cost_overrun || [];
  let sectorData = rawSectors
    .map(s => ({
      sector: s.sector || 'Unknown Sector',
      displaySector: formatSectorName(s.sector || ''),
      overrun_cr: Number(s.overrun_cr || (s as any).cost_overrun_cr || (s as any).cost_overrun_crore || 0),
      project_count: Number(s.project_count || 0)
    }))
    .filter(s => s.overrun_cr > 0);

  // Fallback: If top_sectors_by_cost_overrun is empty from DB query,
  // aggregate real cost overrun telemetry from costDelayStats and alerts!
  if (sectorData.length === 0) {
    const aggregated: Record<string, { overrun_cr: number; project_count: number }> = {};
    
    if (costDelayStats?.top_cost_overrun_projects) {
      costDelayStats.top_cost_overrun_projects.forEach(p => {
        let agencyName = p.agency && p.agency !== 'nan' && p.agency !== 'null' ? p.agency : '';
        if (!agencyName) {
          agencyName = p.project_name.includes('RAIL') ? 'Railways' : p.project_name.includes('PETRO') || p.project_name.includes('REFINERY') ? 'Petroleum & Refineries' : p.project_name.includes('STEEL') ? 'Steel & Mines' : 'Major Projects';
        }
        if (!aggregated[agencyName]) aggregated[agencyName] = { overrun_cr: 0, project_count: 0 };
        aggregated[agencyName].overrun_cr += Number(p.cost_overrun_crore || 0);
        aggregated[agencyName].project_count += 1;
      });
    }

    if (alerts && alerts.length > 0) {
      alerts.forEach(a => {
        const alt = a as any;
        let name = alt.agency && alt.agency !== 'N/A' && alt.agency !== 'nan' && alt.agency !== 'null' ? alt.agency : (alt.sector && alt.sector !== 'Infrastructure' ? alt.sector : '');
        if (!name) {
          name = a.project_name.includes('HYDRO') || a.project_name.includes('POWER') ? 'Power & Hydro' : a.project_name.includes('ROAD') || a.project_name.includes('HIGHWAY') ? 'Roads & Highways' : 'Infrastructure Baseline';
        }
        if (!aggregated[name]) aggregated[name] = { overrun_cr: 0, project_count: 0 };
        aggregated[name].overrun_cr += Number(alt.cost_overrun_cr || 0);
        aggregated[name].project_count += 1;
      });
    }

    sectorData = Object.entries(aggregated)
      .map(([name, data]) => ({
        sector: name,
        displaySector: formatSectorName(name),
        overrun_cr: Math.round(data.overrun_cr * 100) / 100,
        project_count: data.project_count
      }))
      .filter(s => s.overrun_cr > 0)
      .sort((a, b) => b.overrun_cr - a.overrun_cr)
      .slice(0, 7);
  }

  // Risk Distribution Donut Data
  const riskColorMap: Record<string, string> = {
    LOW: '#10B981',
    NORMAL: '#10B981',
    MODERATE: '#F59E0B',
    WATCHLIST: '#F59E0B',
    HIGH: '#F97316',
    CRITICAL: '#EF4444'
  };

  const formattedDonutData = riskDist.map(item => ({
    name: item.risk_category.toUpperCase(),
    value: item.project_count,
    percent: item.percent_of_total,
    color: riskColorMap[item.risk_category.toUpperCase()] || '#64748B'
  }));

  const totalDonutProjects = formattedDonutData.reduce((acc, curr) => acc + curr.value, 0) || (kpis?.total_projects ?? 0);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* PAGE HEADER */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Infrastructure Portfolio Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central Sector Major Projects Monitor | Surveillance Telemetry & Decision Support
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded border border-slate-200 hidden sm:inline">
            Updated: {kpis?.data_as_of ? new Date(kpis.data_as_of).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Live'}
          </span>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
            title="Refresh Portfolio Data"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PORTFOLIO SUMMARY: 5 EQUAL RESPONSIVE KPI CARDS */}
      <div className="space-y-2.5">
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500">
          Infrastructure Portfolio Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          {/* Card 1: Active Projects */}
          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between h-[165px] min-w-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Active Projects</span>
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center my-1.5 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tracking-tight leading-none">
                {formatIndianNumber(kpis?.total_projects ?? 0)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-1.5 truncate max-w-full">Monitored Baseline</span>
            </div>
            <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <span className="text-slate-500">Original Outlay:</span>
              <span className="font-mono font-semibold text-slate-800">{formatLakhCr(kpis?.total_original_cost_cr ?? 0)}</span>
            </div>
          </div>

          {/* Card 2: High / Critical Risk Projects */}
          <div className="bg-white p-4.5 rounded-lg border border-red-200 shadow-xs flex flex-col justify-between h-[165px] min-w-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider truncate">High / Critical Risk</span>
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center my-1.5 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-red-700 font-mono tracking-tight leading-none">
                {formatIndianNumber(kpis?.high_critical_risk_count ?? 0)}
              </span>
              <span className="text-[11px] text-red-600 font-medium block mt-1.5 truncate max-w-full">
                Requiring Priority Attention
              </span>
            </div>
            <div className="mt-auto pt-2.5 border-t border-red-100 flex items-center justify-between text-xs text-slate-700 shrink-0">
              <span className="text-slate-500">Critical Category:</span>
              <span className="font-mono font-bold text-red-700">{formatIndianNumber(kpis?.critical_risk_projects_count ?? 0)} Projects</span>
            </div>
          </div>

          {/* Card 3: Average Schedule Delay */}
          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between h-[165px] min-w-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Average Delay</span>
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center my-1.5 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono tracking-tight leading-none">
                {formatMonths(kpis?.avg_schedule_delay_months ?? 0)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-1.5 truncate max-w-full">Delay Against Baseline Schedule</span>
            </div>
            <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <span className="text-slate-500">Delayed Projects:</span>
              <span className="font-mono font-semibold text-amber-700">{costDelayStats ? costDelayStats.total_projects_with_delay : '—'}</span>
            </div>
          </div>

          {/* Card 4: Cumulative Cost Overrun */}
          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between h-[165px] min-w-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Cost Overrun</span>
              <TrendingUp className="w-4 h-4 text-red-600 shrink-0" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center my-1.5 min-w-0">
              <span className="text-xl sm:text-2xl lg:text-[26px] xl:text-2xl 2xl:text-3xl font-bold text-red-700 font-mono tracking-tight leading-none truncate max-w-full">
                {formatIndianCr(kpis?.total_cost_overrun_cr ?? 0)}
              </span>
              <span className="text-[11px] text-red-600 font-medium flex items-center justify-center gap-1 mt-1.5 truncate max-w-full">
                <ArrowUpRight className="w-3 h-3 shrink-0" />
                +{formatPercent(kpis?.avg_cost_overrun_pct ?? 0)} Variance
              </span>
            </div>
            <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <span className="text-slate-500">Anticipated Outlay:</span>
              <span className="font-mono font-semibold text-slate-800">{formatLakhCr(kpis?.total_latest_cost_cr ?? 0)}</span>
            </div>
          </div>

          {/* Card 5: Early Warnings */}
          <div className="bg-white p-4.5 rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between h-[165px] min-w-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider truncate">Early Warnings</span>
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center my-1.5 min-w-0">
              <span className="text-2xl sm:text-3xl font-bold text-amber-800 font-mono tracking-tight leading-none">
                {formatIndianNumber(alerts.length)}
              </span>
              <span className="text-[11px] text-amber-700 font-medium block mt-1.5 truncate max-w-full">T*=0.28 Risk Triggers</span>
            </div>
            <div className="mt-auto pt-2.5 border-t border-amber-100 flex items-center justify-between text-xs text-slate-700 shrink-0">
              <span className="text-slate-500">Critical Triggers:</span>
              <span className="font-mono font-bold text-red-700">
                {alerts.filter(a => a.risk_category?.toUpperCase() === 'CRITICAL').length} Projects
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* PROJECTS NEEDING ATTENTION (LIMITED PREVIEW SUMMARY TABLE - MAX 6 ROWS) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Projects Needing Attention
            </h2>
            <p className="text-xs text-slate-500">
              High and critical risk projects flagged by surveillance telemetry
            </p>
          </div>
          <button
            onClick={() => onSelectProject('')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
          >
            <span>View All Projects</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Project Code & Name</th>
                <th>Agency / State</th>
                <th>Sector</th>
                <th className="text-center">Risk Status</th>
                <th className="text-right">Risk Score</th>
                <th className="text-right">Delay</th>
                <th className="text-right">Cost Variance</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">
                    No critical risk projects flagged.
                  </td>
                </tr>
              ) : (
                alerts.slice(0, 6).map((alert, idx) => {
                  const isCritical = alert.risk_category?.toUpperCase() === 'CRITICAL';
                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectProject(alert.project_code)}
                      className="cursor-pointer"
                    >
                      <td className="font-medium text-slate-900">
                        <div className="font-mono text-[11px] text-blue-700 font-semibold">{alert.project_code}</div>
                        <div className="truncate max-w-xs text-slate-800 font-semibold">{alert.project_name}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{(alert as any).agency || alert.sector || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{(alert as any).state || 'India'}</span>
                        </div>
                      </td>
                      <td className="text-slate-600 font-medium">{alert.sector}</td>
                      <td className="text-center">
                        <span className={isCritical ? 'badge-risk-critical' : 'badge-risk-high'}>
                          {alert.risk_category?.toUpperCase() || 'HIGH'}
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-slate-900">
                        {alert.risk_score ? (alert.risk_score * 100).toFixed(1) : '—'}
                      </td>
                      <td className="text-right font-mono font-semibold text-amber-700">
                        {alert.delay_months ? formatMonths(alert.delay_months) : '—'}
                      </td>
                      <td className="text-right font-mono font-semibold text-red-700">
                        {alert.cost_overrun_cr ? formatIndianCr(alert.cost_overrun_cr) : '—'}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(alert.project_code);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[11px] font-semibold rounded transition"
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

        {/* View All Projects Bottom Banner Link */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>Showing top {Math.min(6, alerts.length)} high-risk projects requiring immediate review</span>
          <button
            onClick={() => onSelectProject('')}
            className="font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
          >
            <span>View all {formatIndianNumber(kpis?.total_projects ?? 0)} projects in Portfolio Explorer</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DASHBOARD SECTION GRID (12-COLUMN RESPONSIBLE LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN (8 Columns): Sector Exposure & Geographic Map */}
        <div className="lg:col-span-8 space-y-6">

          {/* Sector Cost Overrun Bar Chart */}
          <div className="enterprise-card flex flex-col">
            <div className="enterprise-card-header">
              <div>
                <h3 className="enterprise-title flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Cost Overrun Exposure by Sector
                </h3>
                <p className="enterprise-subtitle">
                  Accumulated cost variance across primary infrastructure sectors (₹ Cr)
                </p>
              </div>
            </div>

            {sectorData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                No sector-level cost overrun data available.
              </div>
            ) : (
              <div className="h-[320px] w-full min-w-0 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectorData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k Cr`}
                    />
                    <YAxis
                      type="category"
                      dataKey="displaySector"
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
                      width={150}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatIndianCr(Number(value)), 'Cost Overrun']}
                      labelFormatter={(label) => `Sector: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Bar dataKey="overrun_cr" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18}>
                      {sectorData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? '#b91c1c' : index === 1 ? '#c2410c' : index === 2 ? '#d97706' : '#2563eb'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* GIS Geographic Map */}
          <div className="enterprise-card">
            <div className="mb-4">
              <h3 className="enterprise-title">
                Geographic Risk Distribution
              </h3>
              <p className="enterprise-subtitle">
                State-level project density and regional infrastructure risk exposure
              </p>
            </div>
            <GeographicRiskMap onSelectProject={onSelectProject} hideTable={true} />
          </div>

        </div>

        {/* RIGHT COLUMN (4 Columns): Risk Donut & Early Warnings */}
        <div className="lg:col-span-4 space-y-6">

          {/* Portfolio Risk Distribution Donut */}
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div>
                <h3 className="enterprise-title flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-600" />
                  Portfolio Risk Breakdown
                </h3>
                <p className="enterprise-subtitle">Risk category breakdown</p>
              </div>
            </div>

            <div className="h-48 w-full relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {formattedDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${formatIndianNumber(Number(value))} Projects`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '12px', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-slate-900">{formatIndianNumber(totalDonutProjects)}</span>
                <span className="text-[10px] text-slate-500 uppercase font-medium">Projects</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              {formattedDonutData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-900 font-semibold">{formatIndianNumber(item.value)}</span>
                    <span className="text-slate-400 text-[11px] w-10 text-right">{item.percent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items & Early Warnings List */}
          <div className="enterprise-card flex flex-col">
            <div className="enterprise-card-header">
              <div>
                <h3 className="enterprise-title flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Recent Early Warnings
                </h3>
                <p className="enterprise-subtitle font-normal">Projects requiring administrative review</p>
              </div>
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded font-mono">
                {alerts.length} Active
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin">
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">No early warning alerts active.</p>
              ) : (
                alerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectProject(alert.project_code)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-md transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-semibold text-blue-700">
                        {alert.project_code}
                      </span>
                      <span className={alert.risk_category?.toUpperCase() === 'CRITICAL' ? 'badge-risk-critical' : 'badge-risk-high'}>
                        {alert.risk_category} Risk
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition line-clamp-1">
                      {alert.project_name}
                    </h4>

                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {alert.summary || alert.primary_trigger}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
                        Inspect Project <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};


