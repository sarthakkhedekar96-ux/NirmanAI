import React, { useState, useEffect } from 'react';
import { Network, AlertTriangle, ArrowRight, RefreshCw, MessageSquare } from 'lucide-react';
import api from '../../services/apiClient';

interface DependencyCardProps {
  projectCode: string;
  onViewGraph?: () => void;
  onAskAssistant?: (sectionName: string, starterQuestions: string[]) => void;
}

export const DependencyCard: React.FC<DependencyCardProps> = ({ projectCode, onViewGraph, onAskAssistant }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [depData, setDepData] = useState<any>(null);

  useEffect(() => {
    if (projectCode) {
      fetchProjectDependencies();
    }
  }, [projectCode]);

  const fetchProjectDependencies = async () => {
    setLoading(true);
    try {
      const data = await api.getProjectDependencies(projectCode);
      setDepData(data);
    } catch (err) {
      console.error('Error loading project dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="enterprise-card animate-pulse flex items-center justify-center h-40">
        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin mr-2" />
        <span className="text-xs text-slate-500 font-medium">Loading Dependency Analysis...</span>
      </div>
    );
  }

  if (!depData || !depData.summary) {
    return null;
  }

  const summary = depData.summary;
  const nodes = depData.nodes || [];
  const edges = depData.edges || [];

  return (
    <div className="enterprise-card space-y-4">
      {/* Header */}
      <div className="enterprise-card-header">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-600" />
            <h3 className="enterprise-title">Dependency Analysis</h3>
          </div>
          <p className="enterprise-subtitle">
            Inter-agency linkages and regulatory clearances
          </p>
        </div>

        <div className="flex items-center gap-2">
          {summary.coordination_bottleneck_indicator && (
            <span className="badge-risk-moderate flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-700" /> High Coordination Pressure
            </span>
          )}

          {onAskAssistant && (
            <button
              onClick={() => onAskAssistant('Dependency Analysis', [
                'Which dependencies require coordination?',
                'Explain the main coordination pressures.',
                'Which connected entities should be reviewed?'
              ])}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 border border-slate-200 rounded p-2.5">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Linkages</span>
          <span className="text-sm font-bold font-mono text-slate-900">{summary.node_count}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Documented</span>
          <span className="text-sm font-bold font-mono text-blue-700">{summary.documented_dependencies}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Inferred</span>
          <span className="text-sm font-bold font-mono text-amber-700">{summary.inferred_dependencies}</span>
        </div>
      </div>

      {/* Connected Entities */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-800 block uppercase tracking-wider text-[10px]">
          Connected Entities & Clearances
        </span>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {nodes.filter((n: any) => n.type !== 'PROJECT').map((node: any) => {
            const edge = edges.find((e: any) => e.source === node.id || e.target === node.id);

            return (
              <div key={node.id} className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900 block">{node.name}</span>
                  <span className="text-[11px] text-slate-500">{node.type} {edge ? `• ${edge.relationship_type}` : ''}</span>
                </div>
                <div className="shrink-0">
                  {node.evidence_status === 'OBSERVED' && (
                    <span className="badge-risk-low">OBSERVED</span>
                  )}
                  {node.evidence_status === 'DOCUMENTED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">DOCUMENTED</span>
                  )}
                  {node.evidence_status === 'INFERRED' && (
                    <span className="badge-risk-moderate">INFERRED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Graph Action */}
      {onViewGraph && (
        <button
          onClick={onViewGraph}
          className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 font-semibold rounded text-xs transition border border-slate-200 flex items-center justify-center gap-1.5"
        >
          View Full Dependency Graph <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
