import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  FileCheck,
  HelpCircle,
  X,
  AlertCircle,
  Network,
  Building2,
  FileText,
  Landmark,
  Scale,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { api } from '../../services/apiClient';
import { BottleneckItem } from '../../types/api';

interface BottleneckLeaderboardViewProps {
  onSelectProject?: (code: string) => void;
  onNavigateToGraph?: () => void;
}

const getPressureLevel = (cpi: number): { label: string; bg: string; text: string; border: string; bar: string } => {
  if (cpi >= 80) {
    return {
      label: 'Very High Pressure',
      bg: 'bg-red-950/40',
      text: 'text-red-400',
      border: 'border-red-800/60',
      bar: 'bg-red-500'
    };
  }
  if (cpi >= 60) {
    return {
      label: 'High Pressure',
      bg: 'bg-orange-950/40',
      text: 'text-orange-400',
      border: 'border-orange-800/60',
      bar: 'bg-orange-500'
    };
  }
  if (cpi >= 30) {
    return {
      label: 'Moderate Pressure',
      bg: 'bg-amber-950/40',
      text: 'text-amber-400',
      border: 'border-amber-800/60',
      bar: 'bg-amber-500'
    };
  }
  return {
    label: 'Low Pressure',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    bar: 'bg-emerald-500'
  };
};

const getEntityTypeIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'DEPARTMENT':
      return Landmark;
    case 'AGENCY':
      return Building2;
    case 'CLEARANCE_AUTHORITY':
      return Scale;
    case 'FUNDING_ENTITY':
      return DollarSign;
    case 'CONTRACTOR':
      return Briefcase;
    case 'PROJECT':
      return FileText;
    default:
      return Layers;
  }
};

const getEvidenceBadge = (docCount: number, infCount: number) => {
  if (docCount > 0 && infCount === 0) {
    return {
      status: 'DOCUMENTED',
      label: 'DOCUMENTED',
      bg: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
      tooltip: 'Supported by documented administrative or allocation information.'
    };
  }
  if (docCount > 0 && infCount > 0) {
    return {
      status: 'DOCUMENTED',
      label: 'DOCUMENTED / INFERRED',
      bg: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
      tooltip: 'Supported by both documented administrative records and sector inference.'
    };
  }
  if (infCount > 0) {
    return {
      status: 'INFERRED',
      label: 'INFERRED',
      bg: 'bg-slate-800/80 text-amber-300 border-amber-800/50',
      tooltip: 'INFERRED indicates a deterministic dependency derived from applicable sector/state rules. It is not a confirmed project-specific record.'
    };
  }
  return {
    status: 'OBSERVED',
    label: 'OBSERVED',
    bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    tooltip: 'Directly supported by project or administrative data.'
  };
};

export const BottleneckLeaderboardView: React.FC<BottleneckLeaderboardViewProps> = ({
  onSelectProject,
  onNavigateToGraph
}) => {
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedEntity, setSelectedEntity] = useState<BottleneckItem | null>(null);

  const fetchBottlenecks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBottlenecks();
      setBottlenecks(data || []);
    } catch (err: any) {
      console.error('Error fetching bottleneck leaderboard:', err);
      setError('Dependency intelligence is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottlenecks();
  }, []);

  // Filter & Deterministic Sort
  const filteredAndSortedLeaderboard = useMemo(() => {
    let result = [...bottlenecks];

    // Filter by type
    if (selectedType !== 'ALL') {
      result = result.filter(item => item.entity_type.toUpperCase() === selectedType.toUpperCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.entity.toLowerCase().includes(q) ||
          item.entity_key.toLowerCase().includes(q) ||
          item.entity_type.toLowerCase().includes(q)
      );
    }

    // Deterministic Sort: CPI desc -> total_dependencies desc -> entity name asc
    result.sort((a, b) => {
      if (b.coordination_pressure_index !== a.coordination_pressure_index) {
        return b.coordination_pressure_index - a.coordination_pressure_index;
      }
      if (b.dependency_count !== a.dependency_count) {
        return b.dependency_count - a.dependency_count;
      }
      return a.entity.localeCompare(b.entity);
    });

    return result;
  }, [bottlenecks, selectedType, searchQuery]);

  // KPI Summary Calculations
  const kpis = useMemo(() => {
    const totalEntities = bottlenecks.length;
    const highPressureCount = bottlenecks.filter(b => b.coordination_pressure_index >= 60).length;
    const avgPressure =
      totalEntities > 0
        ? (bottlenecks.reduce((sum, b) => sum + b.coordination_pressure_index, 0) / totalEntities).toFixed(1)
        : '0.0';
    const totalLinks = bottlenecks.reduce((sum, b) => sum + b.dependency_count, 0);

    return { totalEntities, highPressureCount, avgPressure, totalLinks };
  }, [bottlenecks]);

  // Available Entity Types for Filter Tabs
  const availableTypes = useMemo(() => {
    const types = new Set(bottlenecks.map(b => b.entity_type.toUpperCase()));
    return Array.from(types).sort();
  }, [bottlenecks]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>DEPENDENCY INTELLIGENCE MODULE</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            BOTTLENECK LEADERBOARD
          </h1>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">
            Dependency concentration requiring coordination attention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToGraph && (
            <button
              onClick={onNavigateToGraph}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs transition flex items-center gap-2"
            >
              <Network className="w-4 h-4 text-blue-600" />
              <span>Dependency Graph</span>
            </button>
          )}
          <button
            onClick={fetchBottlenecks}
            disabled={loading}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh API</span>
          </button>
        </div>
      </div>

      {/* Neutral Non-Blame Operational Disclaimer Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3 shadow-md">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">
            Operational Coordination Indicator
          </p>
          <p className="leading-relaxed">
            Ranks dependency entities by coordination pressure and network concentration. This is an operational dependency indicator, not a probability of project failure.
          </p>
          <p className="text-[11px] text-slate-400 italic">
            Coordination Pressure Index is a deterministic 0–100 indicator based on dependency concentration, clearance frequency, and cross-department connectivity. It is not a probability of project failure and does not indicate that an entity caused a project delay.
          </p>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Entities Analyzed</span>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{kpis.totalEntities}</div>
          <span className="text-[11px] text-slate-400 mt-1">In dependency network</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">High-Pressure Entities</span>
          <div className="text-2xl font-bold text-orange-400 mt-2 font-mono">{kpis.highPressureCount}</div>
          <span className="text-[11px] text-slate-400 mt-1">CPI ≥ 60.0 score</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Pressure Index</span>
          <div className="text-2xl font-bold text-blue-400 mt-2 font-mono">{kpis.avgPressure} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
          <span className="text-[11px] text-slate-400 mt-1">Deterministic CPI</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Dependency Links</span>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{kpis.totalLinks}</div>
          <span className="text-[11px] text-slate-400 mt-1">Graph edges attached</span>
        </div>
      </div>

      {/* Controls: Entity Type Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Type:
            </span>
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedType === 'ALL'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              All Types ({bottlenecks.length})
            </button>
            {availableTypes.map(t => {
              const cnt = bottlenecks.filter(b => b.entity_type.toUpperCase() === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                    selectedType === t
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {t.replace('_', ' ')} ({cnt})
                </button>
              );
            })}
          </div>

          {/* Local Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search entity name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Table / Loading / Empty / Error */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-white">Loading dependency bottlenecks...</p>
          <p className="text-xs text-slate-500 mt-1">Retrieving coordination pressure indicators from production graph</p>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm font-semibold text-white">{error}</p>
          <button
            onClick={fetchBottlenecks}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            Retry API Request
          </button>
        </div>
      ) : filteredAndSortedLeaderboard.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No dependency bottlenecks are currently available.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting filters or adjusting search queries.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Coordination Pressure</th>
                  <th className="py-3.5 px-4 text-center">Dependencies</th>
                  <th className="py-3.5 px-4 text-center">Connected Projects</th>
                  <th className="py-3.5 px-4">Evidence</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredAndSortedLeaderboard.map((item, idx) => {
                  const rank = idx + 1;
                  const pressure = getPressureLevel(item.coordination_pressure_index);
                  const Icon = getEntityTypeIcon(item.entity_type);
                  const evidenceBadge = getEvidenceBadge(item.documented_dependencies, item.inferred_dependencies);

                  return (
                    <tr
                      key={item.entity_key || idx}
                      onClick={() => setSelectedEntity(item)}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-sm">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          rank === 2 ? 'bg-slate-700/50 text-slate-300 border border-slate-600' :
                          rank === 3 ? 'bg-amber-900/20 text-amber-500 border border-amber-800/40' :
                          'text-slate-400'
                        }`}>
                          #{rank}
                        </span>
                      </td>

                      {/* Entity Name */}
                      <td className="py-4 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            <span className="text-slate-100 group-hover:text-blue-300 transition block font-medium">
                              {item.entity}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.entity_key}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Entity Type */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700 uppercase">
                          {item.entity_type.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Coordination Pressure Index */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 max-w-xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-mono font-bold ${pressure.text}`}>
                              {item.coordination_pressure_index.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${pressure.bg} ${pressure.text} ${pressure.border}`}>
                              {pressure.label}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${pressure.bar}`}
                              style={{ width: `${Math.min(100, Math.max(5, item.coordination_pressure_index))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Dependencies Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono font-bold text-white text-sm">
                          {item.dependency_count}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {item.documented_dependencies} doc / {item.inferred_dependencies} inf
                        </span>
                      </td>

                      {/* Connected Projects */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono font-bold text-blue-400 text-sm">
                          {item.projects_affected}
                        </span>
                        <span className="block text-[10px] text-slate-500">projects</span>
                      </td>

                      {/* Evidence Status */}
                      <td className="py-4 px-4">
                        <span
                          title={evidenceBadge.tooltip}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold border ${evidenceBadge.bg}`}
                        >
                          {evidenceBadge.label}
                        </span>
                      </td>

                      {/* Details Arrow */}
                      <td className="py-4 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition ml-auto" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entity Detail Drawer Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-end p-4 lg:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl h-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/50 text-blue-400 mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedEntity.entity_type}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {selectedEntity.entity_key}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {selectedEntity.entity}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Pressure Index Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Coordination Pressure Index
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded font-semibold border ${getPressureLevel(selectedEntity.coordination_pressure_index).bg} ${getPressureLevel(selectedEntity.coordination_pressure_index).text} ${getPressureLevel(selectedEntity.coordination_pressure_index).border}`}>
                    {getPressureLevel(selectedEntity.coordination_pressure_index).label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-white">
                    {selectedEntity.coordination_pressure_index.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100 max</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getPressureLevel(selectedEntity.coordination_pressure_index).bar}`}
                    style={{ width: `${Math.min(100, Math.max(5, selectedEntity.coordination_pressure_index))}%` }}
                  />
                </div>
              </div>

              {/* Entity Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 block">Connected Projects</span>
                  <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                    {selectedEntity.projects_affected}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 block">Total Dependency Edges</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {selectedEntity.dependency_count}
                  </span>
                </div>
              </div>

              {/* Evidence Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Evidence Classification Breakdown
                </span>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-400" /> Documented Dependencies
                    </span>
                    <span className="font-mono font-bold text-white">{selectedEntity.documented_dependencies}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Inferred Dependencies
                    </span>
                    <span className="font-mono font-bold text-white">{selectedEntity.inferred_dependencies}</span>
                  </div>
                </div>
              </div>

              {/* Grounding Reasons */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Coordination Pressure Drivers
                </span>
                <div className="space-y-2">
                  {selectedEntity.reasons.map((reason, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational Non-Causal Explanation */}
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Operational Clarification:</strong> High coordination pressure reflects multi-project administrative and clearance concentration. It does not imply fault, project failure, or ML risk escalation.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                NIRMAN AI — Dependency Intelligence Engine
              </span>
              <button
                onClick={() => setSelectedEntity(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
