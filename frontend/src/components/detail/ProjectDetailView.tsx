import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  ShieldAlert,
  Building2,
  MapPin,
  FileSearch,
  Info,
  MessageSquare,
  Printer
} from 'lucide-react';
import api from '../../services/apiClient';
import {
  RiskIntelligenceResponse,
  ProjectDetail,
  RiskDecompositionResponse,
  RiskTrajectoryResponse,
  PrescriptiveRecommendationsResponse,
  ProjectDocumentsResponse,
  ProjectDocumentChunk,
  ProjectEnvironmentalReport
} from '../../types/api';
import { EnvironmentalCard } from './EnvironmentalCard';
import { DependencyCard } from './DependencyCard';
import { SatelliteChangeCard } from './SatelliteChangeCard';
import {
  formatIndianCr,
  formatMonths
} from '../../utils/formatters';

interface ProjectDetailViewProps {
  projectCode: string;
  onBack: () => void;
  onOpenAssistant: (
    initialQuery?: string,
    sectionContext?: { sectionName: string; starterQuestions?: string[] }
  ) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectCode,
  onBack,
  onOpenAssistant
}) => {
  const [primaryLoading, setPrimaryLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);
  const [envLoading, setEnvLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [riskData, setRiskData] = useState<RiskIntelligenceResponse | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [decomposition, setDecomposition] = useState<RiskDecompositionResponse | null>(null);
  const [trajectory, setTrajectory] = useState<RiskTrajectoryResponse | null>(null);
  const [recommendations, setRecommendations] = useState<PrescriptiveRecommendationsResponse | null>(null);
  const [documents, setDocuments] = useState<ProjectDocumentsResponse | null>(null);
  const [envReport, setEnvReport] = useState<ProjectEnvironmentalReport | null>(null);

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const code = projectCode.trim();
    const startTime = performance.now();
    console.log(`[PERF] feature:shell project-detail 0ms code=${code}`);

    setPrimaryLoading(true);
    setRecsLoading(true);
    setDocsLoading(true);
    setEnvLoading(true);
    setError(null);
    setRiskData(null);
    setProjectDetail(null);
    setDecomposition(null);
    setTrajectory(null);
    setRecommendations(null);
    setDocuments(null);
    setEnvReport(null);

    // 1. Primary Core Data (Header, Risk Score, KPIs)
    Promise.allSettled([
      api.getRiskIntelligence(code),
      api.getProjectDetail(code),
      api.getRiskDecomposition(code),
      api.getRiskTrajectory(code)
    ]).then(([riskRes, detailRes, decompRes, trajRes]) => {
      if (!mounted) return;
      if (riskRes.status === 'fulfilled') setRiskData(riskRes.value);
      if (detailRes.status === 'fulfilled') setProjectDetail(detailRes.value);
      if (decompRes.status === 'fulfilled') setDecomposition(decompRes.value);
      if (trajRes.status === 'fulfilled') setTrajectory(trajRes.value);

      if (riskRes.status === 'rejected' && detailRes.status === 'rejected') {
        setError(`Could not retrieve project intelligence for project code: ${code}. Verify project code exists.`);
      }
      setPrimaryLoading(false);
      console.log(`[PERF] feature:primary-ready project-detail ${Math.round(performance.now() - startTime)}ms`);
    });

    // 2. Secondary Intelligence Modules (Independent Async Loading)
    api.getPrescriptiveRecommendations(code)
      .then(res => { if (mounted) setRecommendations(res); })
      .catch(() => {})
      .finally(() => { if (mounted) setRecsLoading(false); });

    api.getProjectDocuments(code, 15)
      .then(res => { if (mounted) setDocuments(res); })
      .catch(() => {})
      .finally(() => { if (mounted) setDocsLoading(false); });

    api.getProjectEnvironmentalReport(code)
      .then(res => { if (mounted) setEnvReport(res); })
      .catch(() => {})
      .finally(() => { if (mounted) setEnvLoading(false); });

    return () => {
      mounted = false;
    };
  }, [projectCode]);

  const handleAskSectionAssistant = (sectionName: string, starterQuestions: string[]) => {
    onOpenAssistant(undefined, {
      sectionName,
      starterQuestions
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  const toggleDoc = (chunkId: string) => {
    setExpandedDoc(prev => ({
      ...prev,
      [chunkId]: !prev[chunkId]
    }));
  };

  if (primaryLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="enterprise-card animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!riskData && !projectDetail)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700 max-w-xl mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="font-bold text-base mb-1">Project Intelligence Not Found</h3>
          <p className="text-xs text-red-600 mb-4">{error || `No records found for project code '${projectCode}'.`}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 transition cursor-pointer"
          >
            Return to Projects
          </button>
        </div>
      </div>
    );
  }

  // Normalized fields
  const projectName = projectDetail?.project_name || projectDetail?.name || riskData?.project_name || `Project ${projectCode}`;
  const agency = projectDetail?.agency || riskData?.ministry || "Nodal Agency";
  const state = projectDetail?.state || riskData?.state || "Multi-State";
  const sector = projectDetail?.sector || riskData?.sector || "Infrastructure";

  const originalCostCr = projectDetail?.original_cost ?? riskData?.financial_metrics?.original_cost_cr ?? 0;
  const latestCostCr = projectDetail?.latest_anticipated_cost ?? riskData?.financial_metrics?.latest_cost_cr ?? originalCostCr;
  const costOverrunCr = Math.max(0, latestCostCr - originalCostCr);
  const costOverrunPct = originalCostCr > 0 ? (costOverrunCr / originalCostCr) * 100 : 0;

  const delayMonths = projectDetail?.latest_delay_months ?? riskData?.schedule_metrics?.delay_months ?? 0;
  const progressPct = projectDetail?.latest_physical_progress ?? riskData?.schedule_metrics?.physical_progress_pct ?? 0;

  const riskScore = riskData?.risk_score ?? 50;
  const riskCategory = (riskData?.risk_category || 'MODERATE').toUpperCase();

  const isEarlyWarning = (riskData?.predicted_severe_risk_prob ?? (riskScore / 100)) >= 0.28;

  const getRiskBadge = (cat: string) => {
    switch (cat) {
      case 'CRITICAL': return 'badge-risk-critical';
      case 'HIGH': return 'badge-risk-high';
      case 'MODERATE':
      case 'WATCHLIST': return 'badge-risk-moderate';
      case 'NORMAL':
      case 'LOW': return 'badge-risk-low';
      default: return 'badge-unavailable';
    }
  };

  const recList = recommendations?.recommendations || [];
  const docList = documents?.document_chunks || [];
  const driversList = riskData?.key_risk_drivers || decomposition?.primary_risk_drivers || [];

  return (
    <>
      {/* SCREEN INTERACTIVE VIEW */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:hidden">

        {/* Top Header Row with Back Link & Export / Assistant Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects List
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAskSectionAssistant('Risk Assessment', [
                'Why is this project currently high risk?',
                'What are the main risk drivers?',
                'What should be reviewed first?'
              ])}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-3.5 py-1.5 bg-gov-navy hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-200" />
              <span>Export Project Report</span>
            </button>
          </div>
        </div>

        {/* LEVEL 1 — DECISION (HEADER & KEY METRICS) */}
        <div className="enterprise-card space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {projectCode}
                </span>
                <span className="text-xs text-slate-500">• {sector}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{projectName}</h1>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {agency}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {state}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Risk Assessment</span>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className={getRiskBadge(riskCategory)}>{riskCategory}</span>
                  <span className="font-mono font-bold text-base text-slate-900">{riskScore.toFixed(1)}</span>
                </div>
              </div>

              {isEarlyWarning && (
                <span className="badge-risk-critical flex items-center gap-1 py-1.5 px-3">
                  <ShieldAlert className="w-4 h-4 text-red-700" />
                  <span>Early Warning Active</span>
                </span>
              )}

              <button
                onClick={() => handleAskSectionAssistant('Risk Assessment', [
                  'Why is this project currently high risk?',
                  'What are the main risk drivers?',
                  'What should be reviewed first?'
                ])}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer ml-1"
                title="Ask Assistant about Risk Assessment"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Ask Assistant</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Physical Progress</span>
              <span className="text-xl font-bold font-mono text-slate-900">{progressPct.toFixed(1)}%</span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}></div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Schedule Delay</span>
              <span className="text-xl font-bold font-mono text-amber-700">{formatMonths(delayMonths)}</span>
              <span className="text-[11px] text-slate-500 block mt-1">Slippage vs Original COD</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cost Variance</span>
              <span className="text-xl font-bold font-mono text-red-700">+{formatIndianCr(costOverrunCr)}</span>
              <span className="text-[11px] text-slate-500 block mt-1">+{costOverrunPct.toFixed(1)}% Outlay Change</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Anticipated Outlay</span>
              <span className="text-xl font-bold font-mono text-slate-900">{formatIndianCr(latestCostCr)}</span>
              <span className="text-[11px] text-slate-500 block mt-1">Original: {formatIndianCr(originalCostCr)}</span>
            </div>
          </div>
        </div>

        {/* LEVEL 2 — EXPLANATION (WHY THIS PROJECT NEEDS ATTENTION) */}
        <div className="enterprise-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="enterprise-title flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Why This Project Needs Attention
            </h2>
            <button
              onClick={() => handleAskSectionAssistant('Why This Project Needs Attention', [
                'Explain the main reasons this project needs attention.',
                'Which issue has the greatest impact?',
                'Summarize the immediate concerns.'
              ])}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            {delayMonths > 0 && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-900">Schedule Delay Accumulation:</span>
                  <span className="ml-1 text-slate-800">
                    Project execution has experienced {delayMonths} months of schedule delay beyond the baseline commissioning target date.
                  </span>
                </div>
              </div>
            )}

            {costOverrunCr > 0 && (
              <div className="p-3 bg-red-50/60 border border-red-200 rounded flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-red-900">Capital Cost Variance:</span>
                  <span className="ml-1 text-slate-800">
                    Total anticipated expenditure has increased by ₹{costOverrunCr.toFixed(2)} Cr ({costOverrunPct.toFixed(1)}% expansion) over the original sanctioned cost.
                  </span>
                </div>
              </div>
            )}

            {driversList.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5">
                <span className="font-semibold text-slate-900 block">Primary Risk Drivers:</span>
                <ul className="space-y-1">
                  {driversList.map((driver: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-800">{driver.plain_english || driver.feature_name || driver.factor}</span>
                      <span className="font-mono text-red-700 font-semibold">{driver.points_added || driver.impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* LEVEL 2 — RECOMMENDED REVIEW */}
        <div className="enterprise-card space-y-4">
          <div className="enterprise-card-header">
            <div>
              <h2 className="enterprise-title">Recommended Review</h2>
              <p className="enterprise-subtitle">Actionable administrative review recommendations for project oversight</p>
            </div>
            <button
              onClick={() => handleAskSectionAssistant('Recommended Review', [
                'Explain these recommended reviews.',
                'Which review should be prioritized?',
                'What triggered these recommendations?'
              ])}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>
          </div>

          {recsLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
            </div>
          ) : recList.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No specific review actions required at current risk assessment level.</p>
          ) : (
            <div className="space-y-3">
              {recList.map((rec: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">
                      {rec.recommendation_code ? rec.recommendation_code.replace(/_/g, ' ') : `Action ${idx + 1}`}
                    </h3>
                    <span className={rec.severity === 'HIGH' || rec.severity === 'CRITICAL' ? 'badge-risk-high' : 'badge-risk-moderate'}>
                      {rec.severity}
                    </span>
                  </div>
                  {rec.trigger_conditions && (
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Trigger Reason:</span> {typeof rec.trigger_conditions === 'string' ? rec.trigger_conditions : JSON.stringify(rec.trigger_conditions)}
                    </p>
                  )}
                  {rec.recommended_review && (
                    <p className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded border border-slate-200">
                      <span className="font-semibold text-blue-800">Recommended Action:</span> {rec.recommended_review}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LEVEL 3 — EVIDENCE & CONTEXT (ENVIRONMENTAL, DEPENDENCIES, SATELLITE, DOCUMENTS) */}
        <div className="space-y-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Project Context & Audit Evidence
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnvironmentalCard
              report={envReport}
              loading={envLoading}
              onAskAssistant={handleAskSectionAssistant}
            />
            <DependencyCard
              projectCode={projectCode}
              onAskAssistant={handleAskSectionAssistant}
            />
          </div>

          <SatelliteChangeCard
            projectCode={projectCode}
            onAskAssistant={handleAskSectionAssistant}
          />

          {/* Document Evidence */}
          <div className="enterprise-card space-y-4">
            <div className="enterprise-card-header">
              <div>
                <h3 className="enterprise-title flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-blue-600" />
                  Project Documents & Evidence
                </h3>
                <p className="enterprise-subtitle">Historical PAIMANA reporting chunks and citations</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAskSectionAssistant('Project Documents & Evidence', [
                    'Summarize the supporting project evidence.',
                    'Which documents support this assessment?',
                    'Show the most relevant evidence for this project.'
                  ])}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ask Assistant</span>
                </button>
                <span className="text-xs text-slate-500 font-mono">{docList.length} Chunks</span>
              </div>
            </div>

            {docsLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 bg-slate-100 rounded"></div>
                <div className="h-16 bg-slate-100 rounded"></div>
              </div>
            ) : docList.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No document evidence chunks recorded for this project.</p>
            ) : (
              <div className="space-y-3">
                {docList.map((doc: ProjectDocumentChunk, idx: number) => {
                  const chunkId = doc.chunk_id || `chunk-${idx}`;
                  const isExpanded = !!expandedDoc[chunkId];

                  return (
                    <div key={chunkId} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-medium text-slate-900 truncate">
                          {doc.source_file} (Page {doc.page_number})
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-slate-500">{doc.reporting_month}</span>
                          <button
                            onClick={() => toggleDoc(chunkId)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-0.5 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <p className={`text-xs text-slate-700 leading-relaxed font-mono text-[11px] bg-white p-2.5 rounded border border-slate-200 ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}>
                        {doc.content}
                      </p>

                      {doc.citation && (
                        <div className="text-[11px] text-slate-500 italic">
                          Citation: {doc.citation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* LEVEL 4 — TECHNICAL CALCULATION DETAILS (COLLAPSED ACCORDION) */}
        <div className="enterprise-card border-slate-300">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between py-1 text-left cursor-pointer"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Technical Calculation Details</h3>
              <p className="text-xs text-slate-500">Methodology specs, calibrated probabilities, threshold metrics</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
              <span>{showTechnicalDetails ? 'Collapse' : 'Expand Details'}</span>
              {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showTechnicalDetails && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs font-mono text-slate-800 bg-slate-50 p-4 rounded">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-900 block mb-1">ML Risk Model Specs:</span>
                  <div>Model: XGBoost Classifier v1.0</div>
                  <div>Calibration: Platt Sigmoidal Scaling</div>
                  <div>Operational Threshold T*: 0.28</div>
                  <div>Calibrated Probability: {((riskData?.predicted_severe_risk_prob ?? (riskScore/100))).toFixed(4)}</div>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block mb-1">RAG Retrieval Metrics:</span>
                  <div>Retrieval Method: Dense Hybrid RRF + BM25</div>
                  <div>Embedding Space: All-MiniLM-L6-v2 (384D)</div>
                  <div>Reciprocal Rank Fusion k: 60.0</div>
                </div>
              </div>

              {driversList.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">TreeSHAP Feature Contributions:</span>
                  <pre className="text-[11px] bg-slate-900 text-slate-200 p-3 rounded overflow-x-auto">
                    {JSON.stringify(driversList, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* PRINT-ONLY INSTITUTIONAL PROJECT REPORT */}
      <div className="hidden print:block print-report-container space-y-6 bg-white text-slate-900 p-6 font-sans">
        {/* Report Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              NIRMAN AI / INFRAPREDICT • INSTITUTIONAL DECISION SUPPORT SYSTEM
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              PROJECT INTELLIGENCE REPORT
            </h1>
            <div className="text-sm font-semibold text-slate-800 mt-1">
              {projectName} <span className="font-mono text-blue-800 font-bold">({projectCode})</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600 font-mono space-y-0.5">
            <div><strong>Agency:</strong> {agency}</div>
            <div><strong>State:</strong> {state}</div>
            <div><strong>Sector:</strong> {sector}</div>
            <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* 1. PROJECT RISK ASSESSMENT */}
        <div className="space-y-3 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex justify-between">
            <span>1. PROJECT RISK ASSESSMENT</span>
            <span className="font-mono">Category: {riskCategory} | Score: {riskScore.toFixed(1)}/100</span>
          </h2>
          <div className="grid grid-cols-4 gap-3 text-xs border border-slate-300 p-3 bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Physical Progress</span>
              <span className="font-mono font-bold text-sm text-slate-900">{progressPct.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Schedule Delay</span>
              <span className="font-mono font-bold text-sm text-amber-800">{formatMonths(delayMonths)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Cost Overrun</span>
              <span className="font-mono font-bold text-sm text-red-800">+{formatIndianCr(costOverrunCr)} (+{costOverrunPct.toFixed(1)}%)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Anticipated Outlay</span>
              <span className="font-mono font-bold text-sm text-slate-900">{formatIndianCr(latestCostCr)}</span>
            </div>
          </div>
          {isEarlyWarning && (
            <div className="p-2 bg-red-50 border border-red-300 text-red-800 font-bold text-xs">
              ⚠️ EARLY WARNING ACTIVE — Calibrated Failure Probability ≥ 0.28 threshold.
            </div>
          )}
        </div>

        {/* 2. WHY THIS PROJECT NEEDS ATTENTION */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            2. WHY THIS PROJECT NEEDS ATTENTION
          </h2>
          <div className="space-y-1.5 text-xs text-slate-800">
            {delayMonths > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <strong>Schedule Delay Accumulation:</strong> Project execution has experienced {delayMonths} months of schedule delay beyond the baseline commissioning target date.
              </div>
            )}
            {costOverrunCr > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <strong>Capital Cost Variance:</strong> Total anticipated expenditure has increased by ₹{costOverrunCr.toFixed(2)} Cr ({costOverrunPct.toFixed(1)}% expansion) over the original sanctioned cost.
              </div>
            )}
            {driversList.length === 0 && delayMonths === 0 && costOverrunCr === 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 italic">
                No active risk alerts or cost/schedule variances recorded.
              </div>
            )}
          </div>
        </div>

        {/* 3. PRIMARY RISK DRIVERS */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            3. PRIMARY RISK DRIVERS (TreeSHAP Analysis)
          </h2>
          {driversList.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No primary risk drivers available for this project.</p>
          ) : (
            <table className="w-full text-xs text-left border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 text-[10px] uppercase font-mono border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">Factor / Feature</th>
                  <th className="p-2 border-r border-slate-300">Plain English Description</th>
                  <th className="p-2 text-right">Points Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {driversList.map((d: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2 font-mono font-semibold border-r border-slate-200">{d.feature_name || d.factor || `Factor ${i+1}`}</td>
                    <td className="p-2 border-r border-slate-200">{d.plain_english || d.description || 'N/A'}</td>
                    <td className="p-2 text-right font-mono font-bold text-red-700">{d.points_added || d.impact || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. RECOMMENDED REVIEW */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            4. RECOMMENDED REVIEW
          </h2>
          {recList.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No specific review actions required at current risk assessment level.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {recList.map((rec: any, i: number) => (
                <div key={i} className="p-3 border border-slate-300 bg-slate-50 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{rec.recommendation_code ? rec.recommendation_code.replace(/_/g, ' ') : `Recommendation ${i+1}`}</span>
                    <span className="font-mono text-xs">{rec.severity}</span>
                  </div>
                  {rec.trigger_conditions && (
                    <div className="text-slate-600"><strong>Trigger Reason:</strong> {typeof rec.trigger_conditions === 'string' ? rec.trigger_conditions : JSON.stringify(rec.trigger_conditions)}</div>
                  )}
                  {rec.recommended_review && (
                    <div className="text-slate-900 font-semibold bg-white p-2 border border-slate-200 mt-1">
                      <strong>Recommended Action:</strong> {rec.recommended_review}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. ENVIRONMENTAL CONDITIONS */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            5. ENVIRONMENTAL CONDITIONS
          </h2>
          {!envReport || envReport.environmental_data_status !== 'AVAILABLE' || !envReport.weather ? (
            <p className="text-xs text-slate-500 italic">Environmental Data Unavailable. Live meteorological telemetry could not be resolved for this location.</p>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-4 gap-2 border border-slate-300 p-2 bg-slate-50 text-center font-mono">
                <div><span className="text-[10px] text-slate-500 block">Temperature</span><strong>{envReport.weather.temperature_c !== null ? `${envReport.weather.temperature_c.toFixed(1)}°C` : 'Unavailable'}</strong></div>
                <div><span className="text-[10px] text-slate-500 block">Precipitation</span><strong>{envReport.weather.precipitation_mm !== null ? `${envReport.weather.precipitation_mm.toFixed(1)} mm` : '0 mm'}</strong></div>
                <div><span className="text-[10px] text-slate-500 block">Wind Speed</span><strong>{envReport.weather.wind_speed_kmh !== null ? `${envReport.weather.wind_speed_kmh.toFixed(1)} km/h` : 'Unavailable'}</strong></div>
                <div><span className="text-[10px] text-slate-500 block">Severity</span><strong>{envReport.environmental_assessment?.overall_severity || 'NORMAL'}</strong></div>
              </div>
              {envReport.physical_condition_advice?.recommended_actions && envReport.physical_condition_advice.recommended_actions.length > 0 && (
                <div className="p-2 border border-slate-200 bg-slate-50">
                  <strong>Environmental Impact & Guidance:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-700">
                    {envReport.physical_condition_advice.recommended_actions.map((act: string, i: number) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. DEPENDENCY ANALYSIS */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            6. DEPENDENCY ANALYSIS
          </h2>
          <div className="text-xs text-slate-800 space-y-1">
            <p>Inter-agency linkages and regulatory clearance tracking available via dependency graph.</p>
          </div>
        </div>

        {/* 7. SATELLITE CHANGE ANALYSIS */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            7. SATELLITE CHANGE ANALYSIS
          </h2>
          <div className="text-xs text-slate-800">
            <p>Sentinel-2 L2A Earth Observation surface activity check integrated in Project Detail view.</p>
            <p className="text-[10px] text-slate-500 italic mt-0.5">Note: Satellite spectral change indicates surface reflectance variation; it does not independently confirm construction progress.</p>
          </div>
        </div>

        {/* 8. PROJECT DOCUMENT EVIDENCE */}
        <div className="space-y-2 print-break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            8. PROJECT DOCUMENT EVIDENCE ({docList.length} Chunks)
          </h2>
          {docList.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No document evidence chunks recorded for this project.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {docList.map((doc: ProjectDocumentChunk, i: number) => (
                <div key={i} className="p-2.5 border border-slate-300 bg-slate-50 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{doc.source_file} (Page {doc.page_number})</span>
                    <span className="font-mono text-slate-500">{doc.reporting_month}</span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-800 bg-white p-2 border border-slate-200">
                    "{doc.content}"
                  </p>
                  {doc.citation && <div className="text-[10px] text-slate-500 italic">Citation: {doc.citation}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 9. TECHNICAL CALCULATION DETAILS */}
        <div className="space-y-2 print-break-inside-avoid pt-2 border-t border-slate-300">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            9. TECHNICAL METHODOLOGY & CALCULATION DETAILS
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono p-3 bg-slate-50 border border-slate-300">
            <div>
              <strong>ML Risk Model Specs:</strong>
              <div>Model: XGBoost Classifier v1.0</div>
              <div>Calibration: Platt Sigmoidal Scaling</div>
              <div>Operational Threshold T*: 0.28</div>
              <div>Calibrated Probability: {((riskData?.predicted_severe_risk_prob ?? (riskScore/100))).toFixed(4)}</div>
            </div>
            <div>
              <strong>RAG Retrieval Metrics:</strong>
              <div>Retrieval Method: Dense Hybrid RRF + BM25</div>
              <div>Embedding Space: All-MiniLM-L6-v2 (384D)</div>
              <div>Reciprocal Rank Fusion k: 60.0</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-400 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
          <span>NIRMAN AI / INFRAPREDICT — Infrastructure Risk Intelligence Platform</span>
          <span>Page 1 of 1 (Institutional Copy)</span>
        </div>
      </div>
    </>
  );
};
