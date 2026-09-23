import React, { useState, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal,
  RefreshCw,
  Search,
  Bot,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronLeft,
  Info,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
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
  Cell,
  ReferenceLine
} from 'recharts';
import { api } from '../../services/apiClient';
import {
  RiskDecompositionResponse,
  RiskIntelligenceResponse,
  ProjectSummary,
  RiskDecompositionDriver
} from '../../types/api';
import {
  formatPercent,
  formatMonths,
  formatIndianCr
} from '../../utils/formatters';

interface DriverAnalysisViewProps {
  projectCode: string | null;
  onSelectProject: (code: string) => void;
  onOpenAssistant: (query?: string) => void;
}

export const DriverAnalysisView: React.FC<DriverAnalysisViewProps> = ({
  projectCode,
  onSelectProject,
  onOpenAssistant
}) => {
  const [inputCode, setInputCode] = useState<string>(projectCode || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [decomposition, setDecomposition] = useState<RiskDecompositionResponse | null>(null);
  const [intelligence, setIntelligence] = useState<RiskIntelligenceResponse | null>(null);
  const [searchProjectsList, setSearchProjectsList] = useState<ProjectSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Sync prop projectCode
  useEffect(() => {
    console.log(`[PERF] feature:shell driver-analysis 0ms code=${projectCode || 'none'}`);
    if (projectCode) {
      setInputCode(projectCode);
      fetchProjectData(projectCode);
    } else {
      setDecomposition(null);
      setIntelligence(null);
    }
  }, [projectCode]);

  // Load candidate projects for search dropdown if empty state
  useEffect(() => {
    if (!projectCode) {
      loadSearchCandidates();
    }
  }, [projectCode]);

  const loadSearchCandidates = async () => {
    setSearchLoading(true);
    try {
      const res = await api.getProjects({ page_size: 30, sort_by: 'cost_overrun_cr', order: 'desc' });
      setSearchProjectsList(res.projects);
    } catch (err) {
      console.error("Failed to load project search candidates:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchProjectData = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const [decompRes, intelRes] = await Promise.allSettled([
        api.getRiskDecomposition(code.trim()),
        api.getRiskIntelligence(code.trim())
      ]);

      if (decompRes.status === 'fulfilled') {
        setDecomposition(decompRes.value);
      } else {
        setDecomposition(null);
      }

      if (intelRes.status === 'fulfilled') {
        setIntelligence(intelRes.value);
      } else {
        setIntelligence(null);
      }

      if (decompRes.status === 'rejected' && intelRes.status === 'rejected') {
        setError(`No risk driver decomposition dataset found for project code '${code}'.`);
      }
    } catch (err: any) {
      console.error("Error fetching driver analysis:", err);
      setError(err?.message || "Failed to retrieve TreeSHAP risk decomposition from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      onSelectProject(inputCode.trim());
    }
  };

  // Combine Drivers and Protective Factors for SHAP Visualization
  const processedDrivers = useMemo(() => {
    if (!decomposition) return [];

    const riskDrivers = (decomposition.primary_risk_drivers || []).map(d => {
      let pts = 0;
      if (typeof d.points_added === 'string') {
        pts = parseFloat(d.points_added.replace('+', '')) || 0;
      } else if (typeof d.value === 'number') {
        pts = d.value;
      }
      return {
        featureName: d.feature_name || d.feature_code || 'Risk Driver',
        featureCode: d.feature_code || '',
        value: d.value,
        points: pts,
        formattedPoints: d.points_added || `+${pts.toFixed(1)}`,
        direction: 'Increases Risk' as const,
        type: 'RISK_DRIVER' as const,
        description: d.description || `Increases model risk assessment by relative influence of +${pts.toFixed(1)} points.`
      };
    });

    const protectiveFactors = (decomposition.protective_factors || []).map(p => {
      let pts = 0;
      if (typeof p.points_added === 'string') {
        pts = parseFloat(p.points_added) || 0;
      } else if (typeof p.value === 'number') {
        pts = -Math.abs(p.value);
      }
      return {
        featureName: p.feature_name || p.feature_code || 'Protective Factor',
        featureCode: p.feature_code || '',
        value: p.value,
        points: pts,
        formattedPoints: p.points_added || `${pts.toFixed(1)}`,
        direction: 'Reduces Risk' as const,
        type: 'PROTECTIVE_FACTOR' as const,
        description: p.description || `Exhibits favorable indicator behavior (${pts.toFixed(1)} relative impact).`
      };
    });

    const combined = [...riskDrivers, ...protectiveFactors];
    // Sort by absolute points desc
    combined.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
    return combined;
  }, [decomposition]);

  // Recharts Horizontal Diverging Bar Chart Data
  const divergingChartData = useMemo(() => {
    return processedDrivers.map(d => ({
      name: d.featureName.length > 22 ? d.featureName.substring(0, 20) + '..' : d.featureName,
      fullName: d.featureName,
      shapPoints: d.points,
      absPoints: Math.abs(d.points),
      direction: d.direction,
      formattedPoints: d.formattedPoints,
      observedValue: d.value !== undefined && d.value !== null ? String(d.value) : 'N/A'
    }));
  }, [processedDrivers]);

  // Frontend Significant Drivers Count Definition (> 2.0 SHAP points impact)
  const significantDriversCount = useMemo(() => {
    return processedDrivers.filter(d => Math.abs(d.points) >= 2.0).length;
  }, [processedDrivers]);

  const topRiskDriver = useMemo(() => {
    return processedDrivers.find(d => d.type === 'RISK_DRIVER') || null;
  }, [processedDrivers]);

  const topProtectiveFactor = useMemo(() => {
    return processedDrivers.find(d => d.type === 'PROTECTIVE_FACTOR') || null;
  }, [processedDrivers]);

  // Metrics from decomposition or intelligence
  const currentRiskScore = decomposition?.risk_score ?? intelligence?.risk_score ?? 0;
  const rawRiskScore100 = currentRiskScore <= 1 ? currentRiskScore * 100 : currentRiskScore;
  const severeRiskProb = decomposition?.predicted_prob ?? (rawRiskScore100 / 100);
  const isEarlyWarningTriggered = decomposition?.early_warning ?? (severeRiskProb >= 0.28);
  const riskCategory = (decomposition?.risk_category || intelligence?.risk_category || 'LOW').toUpperCase();

  // NO PROJECT SELECTED EMPTY STATE
  if (!projectCode && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search Header Card */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              TreeSHAP Risk Driver Analysis
            </h1>
            <p className="text-xs text-slate-500">
              Select an active infrastructure project code to inspect explainable XGBoost risk drivers, SHAP attribution points, and protective indicators.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter Project Code (e.g. 020100044)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              Inspect Drivers <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Quick Select Candidate Projects */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Select from High-Risk Infrastructure Projects
          </h2>

          {searchLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading candidate projects...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {searchProjectsList.slice(0, 9).map((p) => {
                const score100 = p.risk_score <= 1 ? p.risk_score * 100 : p.risk_score;
                return (
                  <button
                    key={p.project_code}
                    onClick={() => onSelectProject(p.project_code)}
                    className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600 group-hover:underline">
                        {p.project_code}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        score100 >= 75 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        Score {score100.toFixed(0)}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate">{p.project_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{p.ministry} • {p.state}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Decomposing XGBoost TreeSHAP Risk Drivers for {projectCode}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectProject('')}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Change Project Selection"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-6 h-6 text-blue-600" />
                Risk Driver Analysis &amp; TreeSHAP Decomposition
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
              <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                {decomposition?.project_code || intelligence?.project_code || projectCode}
              </span>
              <span className="font-semibold text-slate-900">
                {decomposition?.project_name || intelligence?.project_name || 'Infrastructure Project'}
              </span>
              <span className="text-slate-400">•</span>
              <span>{decomposition?.agency || intelligence?.ministry}</span>
              <span className="text-slate-400">•</span>
              <span>{decomposition?.state || intelligence?.state}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAssistant(`Explain the main factors driving the current risk of project ${projectCode} (${decomposition?.project_name || intelligence?.project_name || ''}) and what actions could reduce the risk.`)}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-blue-200" />
              Ask Copilot About These Drivers
            </button>

            <button
              onClick={() => projectCode && fetchProjectData(projectCode)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Refresh Decomposition Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* METRICS & THRESHOLD BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Box 1: Risk Category */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">Risk Category</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full uppercase ${
                riskCategory === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                riskCategory === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                riskCategory === 'MODERATE' || riskCategory === 'WATCHLIST' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {riskCategory}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">LONGITUDINAL ASSIGNED</span>
          </div>

          {/* Box 2: Risk Score (0-100 Scale) */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">Composite Risk Score (0–100 Scale)</span>
            <div className="text-xl font-extrabold text-slate-900">{rawRiskScore100.toFixed(1)} / 100</div>
            <span className="text-[11px] text-slate-400 block">Longitudinal multi-dimensional score</span>
          </div>

          {/* Box 3: Calibrated Severe-Risk Probability (0-1 Scale) */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">Severe-Risk Probability (0.00–1.00 Scale)</span>
            <div className="text-xl font-extrabold text-blue-600">{(severeRiskProb * 100).toFixed(1)}% ({severeRiskProb.toFixed(3)})</div>
            <span className="text-[11px] text-slate-400 block">Isotonic calibrated probability</span>
          </div>

          {/* Box 4: Operational Threshold Status (T* = 0.28) */}
          <div className={`p-3.5 rounded-lg border space-y-1 ${
            isEarlyWarningTriggered ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <span className="font-semibold block flex items-center gap-1">
              {isEarlyWarningTriggered ? <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
              Operational Threshold Status
            </span>
            <div className="text-sm font-extrabold">
              {isEarlyWarningTriggered ? 'Triggered (Prob ≥ T*=0.28)' : 'Normal (Prob < T*=0.28)'}
            </div>
            <span className="text-[10px] block opacity-80 font-mono">
              Operational cutoff T* = 0.28 calibrated
            </span>
          </div>
        </div>

        {/* IMPORTANT SEMANTIC NOTE */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Model Semantics Clarification: </span>
            <span className="text-slate-700">
              The <strong>Risk Score</strong> is scaled from <strong>0 to 100</strong>, while the <strong>Severe-Risk Probability</strong> is calibrated on a <strong>0.00 to 1.00 scale</strong>. The operational early warning cutoff <strong>T* = 0.28</strong> applies specifically to the calibrated severe-risk probability.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* DRIVER SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Top Risk Driver */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Top Risk Driver</span>
          <div className="text-sm font-bold text-red-600 truncate" title={topRiskDriver?.featureName}>
            {topRiskDriver?.featureName || 'None identified'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono block">
            Impact: {topRiskDriver ? topRiskDriver.formattedPoints : '0.0'} points
          </span>
        </div>

        {/* Card 2: Strongest Protective Factor */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Strongest Protective Factor</span>
          <div className="text-sm font-bold text-emerald-600 truncate" title={topProtectiveFactor?.featureName}>
            {topProtectiveFactor?.featureName || 'None identified'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono block">
            Impact: {topProtectiveFactor ? topProtectiveFactor.formattedPoints : '0.0'} points
          </span>
        </div>

        {/* Card 3: Count of Significant Drivers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Significant Drivers</span>
          <div className="text-xl font-extrabold text-slate-900">{significantDriversCount} Drivers</div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Frontend threshold: &gt; 2.0 SHAP points
          </span>
        </div>

        {/* Card 4: SHAP Attribution Caveat */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Feature Influence Model</span>
          <div className="text-xs font-semibold text-slate-800">XGBoost TreeSHAP v1</div>
          <span className="text-[11px] text-slate-400 block">Relative log-odds contribution</span>
        </div>
      </div>

      {/* MAIN DIVERGING SHAP ATTRIBUTION CHART */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              TreeSHAP Feature Influence Breakdown (Diverging Attribution)
            </h2>
            <p className="text-[11px] text-slate-500">
              Left bars (Green) indicate protective factors reducing severe risk; Right bars (Red) indicate drivers increasing severe risk.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Reduces Risk
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <span className="w-3 h-3 rounded bg-red-500" /> Increases Risk
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          {divergingChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No SHAP risk drivers returned for this project.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={divergingChartData}
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} width={120} />
                <Tooltip
                  formatter={(value: any, name: string, item: any) => [
                    `${item.payload.formattedPoints} points (Observed Value: ${item.payload.observedValue})`,
                    item.payload.direction
                  ]}
                  labelFormatter={(label: any, items: any) => `Feature: ${items?.[0]?.payload?.fullName || label}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                />
                <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey="shapPoints" radius={[0, 4, 4, 0]}>
                  {divergingChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.shapPoints >= 0 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {decomposition?.shap_caveat_note && (
          <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 font-mono">
            Note: {decomposition.shap_caveat_note}
          </p>
        )}
      </div>

      {/* DETAILED DRIVER BREAKDOWN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Detailed SHAP Attribution &amp; Feature Influence Table
          </h2>
          <p className="text-[11px] text-slate-500">
            Granular breakdown of observed project indicators, relative points added/subtracted, and direction of impact.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
                <th className="py-3 px-3">Feature Indicator</th>
                <th className="py-3 px-3">Feature Code</th>
                <th className="py-3 px-3 text-right">Current Observed Value</th>
                <th className="py-3 px-3 text-right">SHAP Contribution</th>
                <th className="py-3 px-3 text-center">Direction of Impact</th>
                <th className="py-3 px-3">Human-Readable Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No risk decomposition features available.
                  </td>
                </tr>
              ) : (
                processedDrivers.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.featureName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{d.featureCode || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {d.value !== undefined && d.value !== null ? String(d.value) : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={d.type === 'RISK_DRIVER' ? 'text-red-600' : 'text-emerald-600'}>
                        {d.formattedPoints}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        d.type === 'RISK_DRIVER'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {d.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">{d.description}</td>
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

export default DriverAnalysisView;
