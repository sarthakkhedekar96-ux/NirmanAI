import React, { useState, useEffect } from 'react';
import { Network, Filter, AlertCircle, CheckCircle2, Info, ArrowRight, ShieldCheck, Activity, Search, RefreshCw, HelpCircle } from 'lucide-react';
import { BottleneckLeaderboardView } from './BottleneckLeaderboardView';
import { api } from '../../services/apiClient';

interface NodeItem {
  id: string;
  type: string;
  key: string;
  name: string;
  evidence_status: string;
}

interface EdgeItem {
  id: string;
  source: string;
  target: string;
  source_key: string;
  target_key: string;
  relationship_type: string;
  evidence_status: string;
  confidence: number;
  evidence_text: string;
  source_reference: string;
}

interface BottleneckItem {
  entity: string;
  entity_key: string;
  entity_type: string;
  projects_affected: number;
  dependency_count: number;
  documented_dependencies: number;
  inferred_dependencies: number;
  coordination_pressure_index: number;
  bottleneck_indicator: boolean;
  reasons: string[];
}

interface DependencyIntelligenceViewProps {
  onSelectProject?: (code: string) => void;
  initialProjectCode?: string | null;
}

const safeString = (val: any, fallback: string = 'Unknown / Not Available'): string => {
  if (!val) return fallback;
  const s = String(val).trim();
  if (['nan', 'nan', 'none', 'null', 'undefined', 'sector:nan'].includes(s.toLowerCase())) {
    return fallback;
  }
  return s;
};

export const DependencyIntelligenceView: React.FC<DependencyIntelligenceViewProps> = ({
  onSelectProject,
  initialProjectCode
}) => {
  const [activeTab, setActiveTab] = useState<'graph' | 'bottlenecks'>('graph');
  const [loading, setLoading] = useState<boolean>(true);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [edges, setEdges] = useState<EdgeItem[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [health, setHealth] = useState<any>(null);

  // Filters
  const [stateFilter, setStateFilter] = useState<string>('');
  const [agencyFilter, setAgencyFilter] = useState<string>('');
  const [relFilter, setRelFilter] = useState<string>('');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchGraphData();
    fetchBottlenecks();
    fetchHealth();
  }, [stateFilter, agencyFilter, relFilter, evidenceFilter]);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const queryObj: Record<string, string> = { limit: '120' };
      if (stateFilter) queryObj.state = stateFilter;
      if (agencyFilter) queryObj.agency = agencyFilter;
      if (relFilter) queryObj.relationship_type = relFilter;
      if (evidenceFilter) queryObj.evidence_status = evidenceFilter;

      const data = await api.getDependencyGraph(queryObj);
      const rawNodes: NodeItem[] = data?.nodes || [];
      const cleanedNodes = rawNodes
        .filter(n => n.key !== 'SECTOR:NAN' && safeString(n.name, '').toLowerCase() !== 'nan')
        .map(n => ({
          ...n,
          name: safeString(n.name, 'Unknown / Not Available'),
          key: n.key === 'SECTOR:NAN' ? 'SECTOR:UNKNOWN' : safeString(n.key, 'UNKNOWN')
        }));

      setNodes(cleanedNodes);
      setEdges(data?.edges || []);
    } catch (err) {
      console.error('Failed to fetch dependency graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBottlenecks = async () => {
    try {
      const data = await api.getBottlenecks();
      const cleaned = (data || [])
        .filter((b: BottleneckItem) => b.entity_key !== 'SECTOR:NAN' && safeString(b.entity, '').toLowerCase() !== 'nan')
        .map((b: BottleneckItem) => ({
          ...b,
          entity: safeString(b.entity, 'Unknown / Not Available'),
          entity_key: b.entity_key === 'SECTOR:NAN' ? 'SECTOR:UNKNOWN' : safeString(b.entity_key, 'UNKNOWN')
        }));
      setBottlenecks(cleaned);
    } catch (err) {
      console.error('Failed to fetch bottleneck indicators:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const data = await api.getDependencyHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch dependency health:', err);
    }
  };

  const getNodeColor = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'PROJECT': return 'bg-blue-600 text-white border-blue-400';
      case 'AGENCY': return 'bg-purple-600 text-white border-purple-400';
      case 'DEPARTMENT': return 'bg-indigo-600 text-white border-indigo-400';
      case 'CLEARANCE_AUTHORITY': return 'bg-amber-600 text-white border-amber-400';
      case 'FUNDING_ENTITY': return 'bg-emerald-600 text-white border-emerald-400';
      case 'STATE': return 'bg-teal-600 text-white border-teal-400';
      default: return 'bg-slate-700 text-white border-slate-500';
    }
  };

  const getEvidenceBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'OBSERVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60" title="Directly observed from project data">
            <CheckCircle2 className="w-3 h-3" /> OBSERVED
          </span>
        );
      case 'DOCUMENTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-400 border border-blue-700/60" title="Supported by documented administrative records">
            <ShieldCheck className="w-3 h-3" /> DOCUMENTED
          </span>
        );
      case 'INFERRED':
        return (
          <div className="relative group inline-block">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-700/60 cursor-help">
              <Info className="w-3 h-3" /> INFERRED
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-slate-950 border border-amber-700/80 rounded shadow-xl text-[10px] text-amber-200 z-50 pointer-events-none">
              INFERRED indicates a deterministic dependency derived from applicable sector/state rules. It is not a confirmed project-specific record.
            </div>
          </div>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{st}</span>;
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const connectedEdges = edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dependency Intelligence</h1>
              <p className="text-xs text-slate-400">Cross-Department Operational Graph & Neutral Coordination Pressure Analysis</p>
            </div>
          </div>
        </div>

        {/* Health summary pill bar */}
        {health && (
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL NODES</span>
              <span className="font-bold text-slate-200">{health.nodes}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL EDGES</span>
              <span className="font-bold text-slate-200">{health.edges}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">DOCUMENTED</span>
              <span className="font-bold text-blue-400">{health.documented_edges}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">INFERRED</span>
              <span className="font-bold text-amber-400">{health.inferred_edges}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'graph' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" /> Global Dependency Network
          </button>
          <button
            onClick={() => setActiveTab('bottlenecks')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bottlenecks' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Coordination Bottleneck Indicators ({bottlenecks.length})
          </button>
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 pb-2">
          <span className="font-semibold text-slate-300">Evidence Status Legend:</span>
          {getEvidenceBadge('OBSERVED')}
          {getEvidenceBadge('DOCUMENTED')}
          {getEvidenceBadge('INFERRED')}
        </div>
      </div>

      {/* GRAPH TAB */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          {/* Controls / Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Filter className="w-4 h-4 text-blue-400" /> Filters:
            </div>

            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Agencies</option>
              <option value="BHAVNI">BHAVINI</option>
              <option value="NR">Northern Railway</option>
              <option value="SR">Southern Railway</option>
              <option value="NHAI">NHAI</option>
              <option value="NTPC">NTPC</option>
              <option value="PGCIL">Power Grid</option>
            </select>

            <select
              value={relFilter}
              onChange={(e) => setRelFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Relationship Types</option>
              <option value="IMPLEMENTS">IMPLEMENTS</option>
              <option value="OWNS">OWNS</option>
              <option value="DEPENDS_ON">DEPENDS_ON</option>
              <option value="CLEARANCE_FROM">CLEARANCE_FROM</option>
              <option value="FUNDS">FUNDS</option>
              <option value="AFFECTS">AFFECTS</option>
            </select>

            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Evidence Types</option>
              <option value="OBSERVED">OBSERVED</option>
              <option value="DOCUMENTED">DOCUMENTED</option>
              <option value="INFERRED">INFERRED</option>
            </select>

            {(agencyFilter || relFilter || evidenceFilter) && (
              <button
                onClick={() => { setAgencyFilter(''); setRelFilter(''); setEvidenceFilter(''); }}
                className="text-xs text-blue-400 hover:underline"
              >
                Reset Filters
              </button>
            )}

            {loading && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin ml-auto" />}
          </div>

          {/* Graph Visualization Container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Node Cards Layout */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[480px] space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Network Nodes ({nodes.length}) & Edges ({edges.length})
                </span>
                <span className="text-[11px] text-slate-400">Click a node to inspect dependencies</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-500" /> Loading dependency network...
                </div>
              ) : nodes.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                  No dependency nodes found matching current filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-2">
                  {nodes.map((node) => {
                    const isSelected = node.id === selectedNodeId;
                    const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-blue-500 shadow-lg ring-1 ring-blue-500'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getNodeColor(node.type)}`}>
                            {node.type}
                          </span>
                          {getEvidenceBadge(node.evidence_status)}
                        </div>

                        <h4 className="text-xs font-bold text-slate-100 line-clamp-2 mb-1">{node.name}</h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                          <span>Key: <code className="text-slate-300 font-mono">{node.key}</code></span>
                          <span className="font-semibold text-blue-400">{nodeEdges.length} links</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inspector Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-300 border-b border-slate-800 pb-3">
                Dependency Detail Inspector
              </h3>

              {selectedNode ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">SELECTED ENTITY</span>
                    <h4 className="text-base font-bold text-white">{selectedNode.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getNodeColor(selectedNode.type)}`}>
                        {selectedNode.type}
                      </span>
                      {getEvidenceBadge(selectedNode.evidence_status)}
                    </div>
                  </div>

                  {selectedNode.type === 'PROJECT' && onSelectProject && (
                    <button
                      onClick={() => onSelectProject(selectedNode.key.replace('PROJECT:', ''))}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      Open Project Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-2">Connected Dependency Links ({connectedEdges.length})</span>
                    {connectedEdges.length === 0 ? (
                      <p className="text-slate-400 italic">No direct links found for this node.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {connectedEdges.map(edge => {
                          const isSource = edge.source === selectedNode.id;
                          const otherNode = nodes.find(n => n.id === (isSource ? edge.target : edge.source));

                          return (
                            <div key={edge.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-blue-400">{edge.relationship_type}</span>
                                {getEvidenceBadge(edge.evidence_status)}
                              </div>
                              <div className="font-semibold text-slate-200">
                                {isSource ? '→ ' : '← '} {otherNode ? safeString(otherNode.name) : (isSource ? safeString(edge.target_key) : safeString(edge.source_key))}
                              </div>
                              {edge.evidence_text && (
                                <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-900/80 p-1.5 rounded border border-slate-800">
                                  "{edge.evidence_text}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 space-y-2">
                  <Info className="w-8 h-8 text-slate-400" />
                  <p className="text-xs">Select any node from the left panel to inspect its exact connected relationships, evidence status, and operational text.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTLENECK TAB */}
      {activeTab === 'bottlenecks' && (
        <BottleneckLeaderboardView
          onSelectProject={onSelectProject}
          onNavigateToGraph={() => setActiveTab('graph')}
        />
      )}
    </div>
  );
};
