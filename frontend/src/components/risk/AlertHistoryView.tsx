import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, RefreshCw, Search, ShieldAlert, CheckCircle2, ChevronRight, FileText, Info, Zap, AlertCircle } from 'lucide-react';
import api from '../../services/apiClient';
import { AlertDetail } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

interface AlertHistoryViewProps {
  onSelectProject: (code: string) => void;
}

export const AlertHistoryView: React.FC<AlertHistoryViewProps> = ({ onSelectProject }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Alert for Details Modal
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadAlerts = () => {
    setLoading(true);
    api.getAlerts({
      severity: severityFilter || undefined,
      alert_type: typeFilter || undefined,
      project_code: searchQuery || undefined
    })
      .then(data => setAlerts(data))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, typeFilter]);

  const handleRunScan = () => {
    setScanning(true);
    api.triggerOnDemandAlertScan()
      .then(() => loadAlerts())
      .catch(err => console.error("Scan failed:", err))
      .finally(() => setScanning(false));
  };

  const handleOpenDetail = (alertId: number) => {
    api.getAlertDetail(alertId)
      .then(data => setSelectedAlert(data))
      .catch(err => console.error("Failed to load alert detail:", err));
  };

  const filteredAlerts = alerts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.project_code.toLowerCase().includes(q) ||
      a.project_name.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.trigger_reason.toLowerCase().includes(q)
    );
  });

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'INFO':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header — UNTOUCHED DARK NAVY HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-white tracking-tight">Institutional Alert History</h1>
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono px-2 py-0.5 rounded font-semibold">
              Auditable Risk Log
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded monitoring alerts, risk drivers, decision-support mitigation actions, and recipient delivery logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(user?.role === 'ADMIN' || user?.role === 'DECISION_MAKER') && (
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
            >
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
              <span>{scanning ? "Scanning Portfolio..." : "Run Portfolio Alert Scan"}</span>
            </button>
          )}

          <button
            onClick={loadAlerts}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
            title="Refresh Alert Stream"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls & Search Bar — LIGHT NEUTRAL FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-100/90 p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by project code, project name, or trigger reason..."
            className="w-full bg-white text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-4 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="w-full bg-white text-slate-700 text-xs rounded-lg px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-medium"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="INFO">INFO</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full bg-white text-slate-700 text-xs rounded-lg px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-medium"
          >
            <option value="">All Alert Types</option>
            <option value="CRITICAL_RISK">CRITICAL_RISK</option>
            <option value="EARLY_WARNING">EARLY_WARNING</option>
            <option value="COST_OVERRUN">COST_OVERRUN</option>
            <option value="SCHEDULE_DELAY">SCHEDULE_DELAY</option>
          </select>
        </div>
      </div>

      {/* Alert Stream List — LIGHT ENTERPRISE CONTENT CARDS */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          Loading system alert history...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 text-sm">
          No alerts found matching the selected filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(a => (
            <div
              key={a.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getSeverityBadgeClass(a.severity)}`}>
                    {a.severity}
                  </span>

                  <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 font-semibold">
                    {a.alert_type}
                  </span>

                  <span className="text-slate-700 text-xs font-mono font-bold">
                    Project {a.project_code}
                  </span>

                  <span className="text-slate-500 text-xs truncate max-w-[220px]">
                    — {a.project_name}
                  </span>

                  <span className="ml-auto text-[11px] text-slate-500 font-mono font-medium">
                    {a.triggered_at ? new Date(a.triggered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">{a.title}</div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {a.trigger_reason}
                </p>

                {a.recommended_actions && a.recommended_actions.length > 0 && (
                  <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Recommended Action for Review</div>
                    <div className="text-slate-800 text-xs font-medium">
                      {a.recommended_actions[0].action}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-end justify-between gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-mono font-semibold">Risk Score</span>
                  <span className={`text-sm font-bold font-mono ${a.risk_score ? (a.risk_score >= 70 ? 'text-red-600' : a.risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                    {a.risk_score ? a.risk_score.toFixed(1) : 'N/A'}/100
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectProject(a.project_code)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition shadow-2xs cursor-pointer"
                  >
                    View Project
                  </button>

                  <button
                    onClick={() => handleOpenDetail(a.id)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Audit</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Details Modal — CLEAN LIGHT ENTERPRISE AUDIT MODAL */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadgeClass(selectedAlert.severity)}`}>
                    {selectedAlert.severity} ALERT
                  </span>
                  <span className="text-slate-600 font-mono text-xs font-semibold">{selectedAlert.alert_type}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{selectedAlert.title}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Project Code: <span className="font-bold text-slate-700">{selectedAlert.project_code}</span> | {selectedAlert.project_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 6-Question Grounded Audit Content */}
            <div className="space-y-4">
              {/* 1 & 2: What & Why */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">WHY THIS ALERT WAS TRIGGERED</div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedAlert.trigger_reason}
                </p>
              </div>

              {/* 3: How Serious (Metrics Table) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Composite Risk Score</div>
                  <div className="text-lg font-bold font-mono text-red-600">
                    {selectedAlert.risk_score ? selectedAlert.risk_score.toFixed(1) : 'N/A'} / 100
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Failure Probability</div>
                  <div className="text-lg font-bold font-mono text-amber-600">
                    {selectedAlert.predicted_severe_risk_prob ? (selectedAlert.predicted_severe_risk_prob * 100).toFixed(1) : 'N/A'}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Risk Category</div>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedAlert.risk_category}
                  </div>
                </div>
              </div>

              {/* 4: Key SHAP Risk Drivers */}
              {selectedAlert.risk_drivers && selectedAlert.risk_drivers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Risk Drivers (TreeSHAP)</h4>
                  <div className="space-y-1.5">
                    {selectedAlert.risk_drivers.map((d, i) => (
                      <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                        <span className="font-semibold text-slate-800">{d.feature_name}</span>
                        <span className="text-slate-500 text-[11px]">{d.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5: Grounded Mitigation Actions */}
              {selectedAlert.recommended_actions && selectedAlert.recommended_actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Recommended Actions for Review</h4>
                  <div className="space-y-2">
                    {selectedAlert.recommended_actions.map((r, i) => (
                      <div key={i} className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span>{r.action}</span>
                        </div>
                        {r.rationale && <p className="text-[11px] text-slate-600 pl-7">{r.rationale}</p>}
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>IMPORTANT NOTICE:</strong> Recommendations are generated from available project data and should be reviewed by the responsible authority before action.
                    </div>
                  </div>
                </div>
              )}

              {/* 6: Recipient Dispatch Audit */}
              {selectedAlert.recipients && selectedAlert.recipients.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notification Dispatch Audit</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-700">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-mono">
                        <tr>
                          <th className="p-2">Recipient</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">In-App</th>
                          <th className="p-2">Email Delivery</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedAlert.recipients.map((rec, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium text-slate-900">{rec.full_name} ({rec.email})</td>
                            <td className="p-2 font-mono text-amber-700 font-semibold">{rec.role}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                                {rec.in_app_status}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                rec.email_delivery_status === 'SENT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : rec.email_delivery_status === 'FAILED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {rec.email_delivery_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                onClick={() => {
                  onSelectProject(selectedAlert.project_code);
                  setSelectedAlert(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
              >
                Inspect Project Risk Intelligence
              </button>

              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

