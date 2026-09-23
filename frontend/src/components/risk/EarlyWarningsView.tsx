import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Bot,
  ChevronRight,
  ShieldCheck,
  Building2,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/apiClient';
import { RawEarlyWarningItem } from '../../types/api';
import {
  formatIndianCr,
  formatIndianNumber,
  formatPercent,
  formatMonths
} from '../../utils/formatters';

interface EarlyWarningsViewProps {
  onSelectProject: (code: string) => void;
  onOpenAssistant: (query?: string) => void;
}

export const EarlyWarningsView: React.FC<EarlyWarningsViewProps> = ({
  onSelectProject,
  onOpenAssistant
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const [warnings, setWarnings] = useState<RawEarlyWarningItem[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('urgency_rank');

  const loadData = async (isRefresh: boolean = false) => {
    setRefreshing(true);
    const startTime = performance.now();
    try {
      const data = await api.getRawEarlyWarnings(100, isRefresh);
      setWarnings(data);
      setLastRefreshed(new Date().toLocaleTimeString());
      console.log(`[PERF] feature:primary-ready early-warnings ${Math.round(performance.now() - startTime)}ms`);
    } catch (err) {
      console.error("Failed to load early warnings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[PERF] feature:shell early-warnings 0ms');
    loadData();
  }, []);

  const filteredWarnings = useMemo(() => {
    return warnings.filter(item => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = item.project_code.toLowerCase().includes(q);
        const matchName = item.project_name.toLowerCase().includes(q);
        const matchReason = (item.urgency_reason || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchReason) return false;
      }

      if (severityFilter !== 'ALL') {
        if (item.risk_category.toUpperCase() !== severityFilter) return false;
      }

      if (categoryFilter === 'COST' && !item.cost_warning) return false;
      if (categoryFilter === 'SCHEDULE' && !item.schedule_warning) return false;
      if (categoryFilter === 'THRESHOLD' && !item.early_warning) return false;

      if (stateFilter !== 'ALL' && item.state !== stateFilter) return false;

      if (agencyFilter !== 'ALL' && item.agency !== agencyFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'cost_overrun') {
        return b.cost_overrun_cr - a.cost_overrun_cr;
      }
      if (sortBy === 'delay') {
        return b.delay_months - a.delay_months;
      }
      if (sortBy === 'risk_score') {
        return b.risk_score - a.risk_score;
      }
      return a.urgency_rank - b.urgency_rank;
    });
  }, [warnings, search, severityFilter, categoryFilter, stateFilter, agencyFilter, sortBy]);

  const availableStates = useMemo(() => {
    const set = new Set<string>();
    warnings.forEach(w => { if (w.state) set.add(w.state); });
    return Array.from(set).sort();
  }, [warnings]);

  const availableAgencies = useMemo(() => {
    const set = new Set<string>();
    warnings.forEach(w => { if (w.agency) set.add(w.agency); });
    return Array.from(set).sort();
  }, [warnings]);

  const criticalCount = warnings.filter(w => w.risk_category.toUpperCase() === 'CRITICAL').length;
  const highCount = warnings.filter(w => w.risk_category.toUpperCase() === 'HIGH').length;
  const moderateCount = warnings.filter(w => w.risk_category.toUpperCase() === 'MODERATE' || w.risk_category.toUpperCase() === 'WATCHLIST').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Early Warnings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized stream of infrastructure projects requiring administrative review
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded border border-slate-200">
            Refreshed: {lastRefreshed}
          </span>
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Early Warnings Stream"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION B — WARNING SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500 font-medium block">Total Monitored Warnings</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900">
            {formatIndianNumber(warnings.length)}
          </div>
          <span className="text-[11px] text-slate-400 block">Operational Cutoff T* = 0.28</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm space-y-1 bg-red-50/20">
          <div className="flex justify-between items-center">
            <span className="text-red-700 font-bold uppercase tracking-wider text-[11px]">Critical Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-600">
            {formatIndianNumber(criticalCount)}
          </div>
          <span className="text-[11px] text-red-600 block">Immediate Executive Action</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm space-y-1 bg-orange-50/20">
          <div className="flex justify-between items-center">
            <span className="text-orange-700 font-bold uppercase tracking-wider text-[11px]">High Alerts</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-orange-600">
            {formatIndianNumber(highCount)}
          </div>
          <span className="text-[11px] text-orange-600 block">Requires Inter-Ministry Review</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-1 bg-amber-50/20">
          <div className="flex justify-between items-center">
            <span className="text-amber-700 font-bold uppercase tracking-wider text-[11px]">Moderate Watchlist</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600">
            {formatIndianNumber(moderateCount)}
          </div>
          <span className="text-[11px] text-amber-600 block">Monitoring Timeline Variance</span>
        </div>
      </div>

      {/* SECTION C — CONTROLS & FILTER BAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder="Search project code, name, or rationale..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Severity</option>
            <option value="HIGH">High Severity</option>
            <option value="MODERATE">Moderate Severity</option>
          </select>

          {/* Warning Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="ALL">All Trigger Types</option>
            <option value="COST">Cost Escalation Trigger</option>
            <option value="SCHEDULE">Schedule Delay Trigger</option>
            <option value="THRESHOLD">Operational Breach (T* &ge; 0.28)</option>
          </select>

          {/* State Filter */}
          {availableStates.length > 0 && (
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 max-w-[150px]"
            >
              <option value="ALL">All States ({availableStates.length})</option>
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}

          {/* Agency Filter */}
          {availableAgencies.length > 0 && (
            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 max-w-[150px]"
            >
              <option value="ALL">All Agencies ({availableAgencies.length})</option>
              {availableAgencies.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Sort Queue:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
          >
            <option value="urgency_rank">Highest Urgency Rank</option>
            <option value="cost_overrun">Largest Cost Overrun (₹ Cr)</option>
            <option value="delay">Longest Delay (Months)</option>
            <option value="risk_score">Highest Risk Score</option>
          </select>
        </div>
      </div>

      {/* SECTION D — WARNING QUEUE CARDS */}
      {filteredWarnings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            No Active Early Warnings Matching Filters
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Current monitored projects matching specified search criteria are below configured early warning threshold criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWarnings.map((warn) => {
            const cat = warn.risk_category.toUpperCase();
            const badgeStyle = cat === 'CRITICAL'
              ? 'bg-red-50 text-red-700 border-red-200'
              : cat === 'HIGH'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={warn.project_code}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                        RANK #{warn.urgency_rank} | CODE: {warn.project_code}
                      </span>
                      <span className="bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded text-[10px]">
                        ML EARLY WARNING
                      </span>
                      <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold px-2 py-0.5 rounded text-[10px]">
                        ENVIRONMENTAL CONTEXT
                      </span>
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 font-medium px-2 py-0.5 rounded">
                        {warn.sector || 'Infrastructure'}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" /> {warn.state || 'Multi-State'}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                        <Building2 className="w-3 h-3 text-slate-400" /> Agency: <strong className="text-slate-700">{warn.agency}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {warn.project_name}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border ${badgeStyle}`}>
                      {cat} SEVERITY ({warn.risk_score.toFixed(1)}/100)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Reporting Period: {warn.reporting_month}
                    </span>
                  </div>
                </div>

                {/* Urgency Rationale & Metric Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Urgency Rationale Box */}
                  <div className="md:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider block">
                      Trigger Rationale &amp; Interventions:
                    </span>
                    <p className="text-slate-700 text-xs">{warn.urgency_reason}</p>
                  </div>

                  {/* Quantitative Trigger Badges */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Cost Escalation:</span>
                      <span className={`font-mono font-bold ${warn.cost_overrun_cr > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {warn.cost_overrun_cr > 0 ? `+${formatIndianCr(warn.cost_overrun_cr)}` : '₹0 Cr'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Schedule Slippage:</span>
                      <span className={`font-mono font-bold ${warn.delay_months > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {formatMonths(warn.delay_months)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200 pt-1">
                      <span className="text-slate-500">Trajectory Trend:</span>
                      <span className={`font-mono font-bold text-[11px] ${warn.trajectory_trend === 'DETERIORATING' ? 'text-red-700' : 'text-slate-800'}`}>
                        {warn.trajectory_trend}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => onOpenAssistant(`Provide executive early-warning brief for project ${warn.project_code} (${warn.project_name}).`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition"
                  >
                    <Bot className="w-3.5 h-3.5" /> Ask Copilot
                  </button>

                  <button
                    onClick={() => onSelectProject(warn.project_code)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
                  >
                    Inspect Project <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EarlyWarningsView;
