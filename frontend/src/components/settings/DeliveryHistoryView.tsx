import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Mail, AlertTriangle, CheckCircle2, XCircle, Search, Clock } from 'lucide-react';
import api from '../../services/apiClient';
import { NotificationDeliveryAudit } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

export const DeliveryHistoryView: React.FC = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<NotificationDeliveryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadDeliveries = () => {
    setLoading(true);
    api.getNotificationDeliveriesAudit()
      .then(data => setDeliveries(data))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted (403 Forbidden)</h2>
        <p className="text-xs text-slate-500">
          The notification delivery audit history view is restricted to Senior System Administrators.
        </p>
      </div>
    );
  }

  const filtered = deliveries.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.recipient_email.toLowerCase().includes(q) ||
      d.recipient_name.toLowerCase().includes(q) ||
      d.project_code.toLowerCase().includes(q) ||
      (d.provider_message_id && d.provider_message_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gov-navy tracking-tight">Delivery Audit Trail</h1>
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono px-2 py-0.5 rounded font-semibold">
              Admin Restricted
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit operational alert delivery status (PENDING → SENT / FAILED), provider message IDs, and logs.
          </p>
        </div>

        <button
          onClick={loadDeliveries}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by recipient email, recipient name, or message ID..."
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-4 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Delivery Statuses</option>
            <option value="SENT">SENT (Accepted by Provider)</option>
            <option value="FAILED">FAILED (Provider Rejection)</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs shadow-xs">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          Loading delivery audit records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs shadow-xs">
          No delivery audit records match the current filter.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-800">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-mono border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Project / Alert</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attempted At</th>
                  <th className="p-3">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono text-slate-500">#{d.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{d.recipient_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{d.recipient_email}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-blue-700 font-semibold flex items-center gap-1.5">
                        <span>{d.project_code}</span>
                        {d.project_code === 'SYSTEM_TEST' && (
                          <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded font-sans font-bold uppercase">
                            SYSTEM TEST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{d.alert_type} ({d.severity})</div>
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      <div>{d.provider}</div>
                      {d.provider_message_id && (
                        <div className="text-[9px] text-slate-400 truncate max-w-[120px]" title={d.provider_message_id}>
                          {d.provider_message_id}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                        d.status === 'SENT' || d.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : d.status === 'FAILED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {(d.status === 'SENT' || d.status === 'DELIVERED') && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {d.status === 'FAILED' && <XCircle className="w-3 h-3 text-red-600" />}
                        {d.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600 animate-spin" />}
                        {d.status === 'NOT_CONFIGURED' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        <span>{d.status}</span>
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {d.attempted_at ? new Date(d.attempted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </td>
                    <td className="p-3 max-w-xs">
                      {d.failure_reason ? (
                        <span className="text-red-700 text-[11px] leading-tight block truncate font-mono" title={d.failure_reason}>
                          {d.failure_reason}
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-mono">
                          Accepted by provider
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
