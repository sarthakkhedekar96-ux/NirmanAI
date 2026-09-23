import React, { useState, useEffect } from 'react';
import { Search, FileSearch, Filter, BookOpen, Layers, RefreshCcw, AlertTriangle, XCircle } from 'lucide-react';
import api from '../../services/apiClient';
import { DocumentChunk } from '../../types/api';

interface EvidenceSearchProps {
  onSelectProject: (code: string) => void;
  onOpenAssistant: (query: string) => void;
}

export const EvidenceSearch: React.FC<EvidenceSearchProps> = ({
  onSelectProject,
  onOpenAssistant
}) => {
  const [query, setQuery] = useState('cost overrun reasons in railway projects');
  const [sector, setSector] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [results, setResults] = useState<DocumentChunk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isNotFound404, setIsNotFound404] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && !projectCode.trim()) return;

    setLoading(true);
    setIsNotFound404(false);
    setErrorMessage(null);
    try {
      const res = await api.searchDocuments({
        query: query.trim() || "project evidence",
        sector: sector || undefined,
        project_code: projectCode.trim() || undefined,
        top_k: 12
      });
      const chunks = res.results || [];
      setResults(chunks);
      setTotal(res.total_results || 0);

      if (chunks.length === 0 && projectCode.trim()) {
        setIsNotFound404(true);
      }
    } catch (err: any) {
      console.error("Document search error:", err);
      setResults([]);
      setTotal(0);
      if (err?.response?.status === 404 || err?.status === 404) {
        setIsNotFound404(true);
      } else {
        setErrorMessage(err?.response?.data?.detail || err?.message || "Document search engine encountered an error.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Search Form Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gov-navy tracking-tight flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-blue-600" />
            Project Evidence Search
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search across verified project reports, audit documents, and official filings
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter search terms (e.g., land acquisition delays, contractor default, cost escalation)..."
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-10 pr-4 py-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search Evidence</span>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </div>
            <input
              type="text"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="Filter by Project Code..."
              className="bg-slate-50 text-slate-800 text-xs rounded px-3 py-1.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
            {projectCode && (
              <button
                type="button"
                onClick={() => { setProjectCode(''); setIsNotFound404(false); }}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Clear Project Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => { setQuery('contractor dispute litigation delay'); handleSearch(); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
            >
              Preset: Contractor Disputes
            </button>
            <button
              type="button"
              onClick={() => { setQuery('environmental forest clearance delay'); handleSearch(); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
            >
              Preset: Forest Clearances
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span>Found <strong className="font-mono text-slate-900">{total}</strong> relevant evidence matches</span>
        <span className="text-[11px] text-slate-400">Indexed Document Repository</span>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-xs flex flex-col items-center shadow-xs">
          <RefreshCcw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span>Searching project evidence database...</span>
        </div>
      ) : isNotFound404 ? (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <FileSearch className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">
            No document evidence was found for project {projectCode ? `'${projectCode}'` : ''}.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No official report excerpts reference this specific project code in the current database.
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              onClick={() => { setProjectCode(''); setIsNotFound404(false); }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Clear Project Filter &amp; Search All Evidence
            </button>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-xs shadow-xs">
          <p className="font-semibold text-sm mb-1">No Evidence Matches Found</p>
          <p>Try modifying your query terms or clearing the project code filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-gov-navy block text-sm leading-tight">
                      {item.doc_name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Sector: <strong className="text-slate-700">{item.sector}</strong> | Date: {item.report_date}
                    </span>
                  </div>
                  <span className="bg-slate-100 text-slate-700 font-mono font-medium text-[10px] px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                    Score: {item.rrf_score ? item.rrf_score.toFixed(3) : '0.850'}
                  </span>
                </div>

                {item.project_code && (
                  <button
                    onClick={() => onSelectProject(item.project_code!)}
                    className="inline-block text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline cursor-pointer"
                  >
                    Project Code: {item.project_code}
                  </button>
                )}

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80 line-clamp-4 font-sans">
                  "{item.chunk_text}"
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setSelectedChunk(item)}
                  className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Read Full Excerpt
                </button>
                <button
                  onClick={() => onOpenAssistant(`Summarize evidence for ${item.doc_name} regarding: ${query}`)}
                  className="text-slate-600 hover:text-blue-700 text-[11px] font-medium cursor-pointer"
                >
                  Ask Assistant
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Reader for Full Chunk Content */}
      {selectedChunk && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-gov-navy text-base">{selectedChunk.doc_name}</h3>
                <span className="text-xs text-slate-500">Sector: {selectedChunk.sector} | Date: {selectedChunk.report_date}</span>
              </div>
              <button
                onClick={() => setSelectedChunk(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
              {selectedChunk.chunk_text}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setSelectedChunk(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
