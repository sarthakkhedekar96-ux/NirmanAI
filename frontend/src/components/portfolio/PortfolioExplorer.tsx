import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  X,
  RotateCcw,
  GitCompare,
  Info,
  Building2,
  MapPin
} from 'lucide-react';
import api from '../../services/apiClient';
import { ProjectSummary } from '../../types/api';
import {
  formatIndianCr,
  formatIndianNumber,
  formatPercent,
  formatMonths
} from '../../utils/formatters';

interface PortfolioExplorerProps {
  onSelectProject: (code: string) => void;
  initialSearch?: string;
}

const SECTORS = [
  "All Sectors",
  "Roads & Highways",
  "Railways",
  "Power & Energy",
  "Petroleum & Natural Gas",
  "Coal & Mines",
  "Telecommunications",
  "Civil Aviation",
  "Urban Infrastructure & Housing",
  "Shipping & Ports",
  "Steel & Heavy Industry",
  "Infrastructure & Development"
];

const STATES = [
  "All States",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Multi-State"
];

const AGENCIES = [
  "All Agencies",
  "National Highways Authority of India (NHAI)",
  "Indian Railways",
  "NTPC Limited",
  "Oil and Natural Gas Corporation (ONGC)",
  "Power Grid Corporation of India",
  "Bharat Petroleum Corporation",
  "Indian Oil Corporation",
  "Coal India Limited",
  "NHPC Limited",
  "Gas Authority of India (GAIL)",
  "Dedicated Freight Corridor (DFCCIL)",
  "Delhi Metro Rail Corporation"
];

const RISK_CATEGORIES = ["All", "Critical", "High", "Moderate", "Low"];

export const PortfolioExplorer: React.FC<PortfolioExplorerProps> = ({
  onSelectProject,
  initialSearch = ''
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedAgency, setSelectedAgency] = useState("All Agencies");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [minCost, setMinCost] = useState<string>("");
  const [maxCost, setMaxCost] = useState<string>("");

  // Sort State
  const [sortBy, setSortBy] = useState("cost_overrun_cr");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search input (300ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchProjects = async (isRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const stateParam = selectedState === "All States" ? undefined : selectedState;
      const agencyParam = selectedAgency === "All Agencies" ? undefined : selectedAgency;
      const sectorParam = selectedSector === "All Sectors" ? undefined : selectedSector;
      const riskParam = selectedRisk === "All" ? undefined : selectedRisk;
      const minCostVal = minCost.trim() !== "" ? parseFloat(minCost) : undefined;
      const maxCostVal = maxCost.trim() !== "" ? parseFloat(maxCost) : undefined;

      const res = await api.getProjects({
        search: debouncedSearch.trim() || undefined,
        state: stateParam,
        agency: agencyParam,
        sector: sectorParam,
        risk_category: riskParam,
        min_cost: minCostVal,
        max_cost: maxCostVal,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        order: sortOrder
      }, isRefresh);

      setProjects(res.projects || []);
      setTotal(res.total || 0);
      console.log(`[PERF] feature:primary-ready portfolio ${Math.round(performance.now() - startTime)}ms`);
    } catch (err: any) {
      console.error("Failed to fetch project portfolio:", err);
      setError("Unable to connect to backend analytics server. Ensure FastAPI is running.");
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when query dependencies change
  useEffect(() => {
    console.log('[PERF] feature:shell portfolio 0ms');
    fetchProjects();
  }, [page, pageSize, debouncedSearch, selectedState, selectedAgency, selectedSector, selectedRisk, minCost, maxCost, sortBy, sortOrder]);

  // Handle Search Form Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  // Reset page to 1 when filters change
  const handleFilterChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setPage(1);
  };

  // Toggle Sorting Column
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Clear All Filters Handler
  const handleClearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedState("All States");
    setSelectedAgency("All Agencies");
    setSelectedSector("All Sectors");
    setSelectedRisk("All");
    setMinCost('');
    setMaxCost('');
    setSortBy("cost_overrun_cr");
    setSortOrder('desc');
    setPage(1);
  };

  // Active Filter Chips Identification
  const activeFilters = [
    debouncedSearch.trim() ? { label: `Search: "${debouncedSearch.trim()}"`, clear: () => { setSearchInput(''); setDebouncedSearch(''); } } : null,
    selectedState !== "All States" ? { label: `State: ${selectedState}`, clear: () => setSelectedState("All States") } : null,
    selectedAgency !== "All Agencies" ? { label: `Agency: ${selectedAgency}`, clear: () => setSelectedAgency("All Agencies") } : null,
    selectedSector !== "All Sectors" ? { label: `Sector: ${selectedSector}`, clear: () => setSelectedSector("All Sectors") } : null,
    selectedRisk !== "All" ? { label: `Risk: ${selectedRisk.toUpperCase()}`, clear: () => setSelectedRisk("All") } : null,
    minCost.trim() !== "" ? { label: `Min Cost: ₹${minCost} Cr`, clear: () => setMinCost('') } : null,
    maxCost.trim() !== "" ? { label: `Max Cost: ₹${maxCost} Cr`, clear: () => setMaxCost('') } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Semantic Risk Level Badges
  const getRiskBadge = (category: string, score: number) => {
    const scoreVal = typeof score === 'number' ? (score <= 1 ? score * 100 : score) : 0;
    const scoreStr = scoreVal.toFixed(1);
    const catUpper = (category || '').toUpperCase();
    switch (catUpper) {
      case 'CRITICAL':
        return (
          <div className="inline-flex flex-col items-center">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 border border-red-200 uppercase">
              CRITICAL
            </span>
            <span className="font-mono text-[10px] text-red-600 font-semibold mt-0.5">{scoreStr}</span>
          </div>
        );
      case 'HIGH':
        return (
          <div className="inline-flex flex-col items-center">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 border border-orange-200 uppercase">
              HIGH
            </span>
            <span className="font-mono text-[10px] text-orange-600 font-semibold mt-0.5">{scoreStr}</span>
          </div>
        );
      case 'MODERATE':
      case 'WATCHLIST':
        return (
          <div className="inline-flex flex-col items-center">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 border border-amber-200 uppercase">
              MODERATE
            </span>
            <span className="font-mono text-[10px] text-amber-600 font-semibold mt-0.5">{scoreStr}</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex flex-col items-center">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">
              LOW
            </span>
            <span className="font-mono text-[10px] text-emerald-600 font-semibold mt-0.5">{scoreStr}</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

      {/* SECTION 1: PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            Portfolio Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span>Search, filter and investigate central sector infrastructure projects (&gt; ₹150 Cr Baseline)</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline font-mono text-slate-400">3,589 Database Cohort</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-xs font-bold text-slate-900 block">{formatIndianNumber(total)} Projects Found</span>
            <span className="text-[10px] text-slate-500">Matching Current Filters</span>
          </div>
          <button
            onClick={() => fetchProjects(true)}
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
            title="Reload Portfolio Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION 2: SEARCH & FILTER TOOLBAR */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search project name, code, agency, state or sector..."
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-16 py-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            
            {loading && (
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-10 top-3" />
            )}

            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setDebouncedSearch(''); setPage(1); }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-sm font-bold"
                title="Clear Search"
              >
                ×
              </button>
            )}
          </div>
        </form>

        {/* Filter Toolbar Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Sector Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sector</label>
            <select
              value={selectedSector}
              onChange={(e) => handleFilterChange(setSelectedSector, e.target.value)}
              className="bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SECTORS.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* State Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">State</label>
            <select
              value={selectedState}
              onChange={(e) => handleFilterChange(setSelectedState, e.target.value)}
              className="bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Agency Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agency / Ministry</label>
            <select
              value={selectedAgency}
              onChange={(e) => handleFilterChange(setSelectedAgency, e.target.value)}
              className="bg-slate-50 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AGENCIES.map((ag) => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>

          {/* Cost Range Bounds */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Min / Max Cost (₹ Cr)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={minCost}
                onChange={(e) => handleFilterChange(setMinCost, e.target.value)}
                placeholder="Min ₹ Cr"
                className="w-1/2 bg-slate-50 text-slate-900 text-xs rounded-lg px-2 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="number"
                value={maxCost}
                onChange={(e) => handleFilterChange(setMaxCost, e.target.value)}
                placeholder="Max ₹ Cr"
                className="w-1/2 bg-slate-50 text-slate-900 text-xs rounded-lg px-2 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Risk Category Pills */}
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Level</label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {RISK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleFilterChange(setSelectedRisk, cat)}
                  className={`flex-1 text-[10px] font-semibold py-1 rounded transition ${
                    selectedRisk === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFilters.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>
            {activeFilters.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
              >
                <span>{chip.label}</span>
                <button onClick={chip.clear} className="hover:text-blue-900 font-bold">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-slate-600 hover:text-red-600 transition flex items-center gap-1 ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: HIGH-DENSITY DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* ERROR STATE */}
        {error ? (
          <div className="p-8 text-center text-red-600 text-xs bg-red-50/50">
            <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="font-bold text-sm text-red-800 mb-1">Failed to Load Projects</p>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => fetchProjects(true)}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
            >
              Retry Connection
            </button>
          </div>
        ) : loading ? (
          /* SKELETON LOADING STATE */
          <div className="p-4 space-y-3">
            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-50 rounded animate-pulse"></div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">No Matching Projects Found</h3>
            <p className="text-slate-500 mb-4">No projects match the current search query or active filter selections.</p>
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* FULL HIGH-DENSITY DATA TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800 select-none">
                  {/* Project Details Header */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                    onClick={() => toggleSort('project_name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Project Details</span>
                      {sortBy === 'project_name' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                  </th>

                  {/* State & Agency Header */}
                  <th className="py-3 px-4">State & Agency</th>

                  {/* Sector Header */}
                  <th className="py-3 px-4">Sector</th>

                  {/* Original Cost Header */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition text-right"
                    onClick={() => toggleSort('original_cost')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Original Outlay</span>
                      {sortBy === 'original_cost' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                  </th>

                  {/* Cost Overrun Header */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition text-right"
                    onClick={() => toggleSort('cost_overrun_cr')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Cost Overrun</span>
                      {sortBy === 'cost_overrun_cr' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                  </th>

                  {/* Delay Months Header */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition text-right"
                    onClick={() => toggleSort('delay_months')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Schedule Delay</span>
                      {sortBy === 'delay_months' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                  </th>

                  {/* Risk Score Header */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition text-center"
                    onClick={() => toggleSort('risk_score')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Risk Level</span>
                      {sortBy === 'risk_score' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                  </th>

                  {/* Actions Header */}
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {projects.map((proj) => (
                  <tr
                    key={proj.project_code}
                    onClick={() => onSelectProject(proj.project_code)}
                    className="hover:bg-blue-50/50 transition cursor-pointer group h-[58px]"
                  >
                    {/* Project Name & Code */}
                    <td className="py-2.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition line-clamp-1" title={proj.project_name}>
                        {proj.project_name}
                      </div>
                      <div className="font-mono text-[11px] font-bold text-blue-600 mt-0.5">
                        {proj.project_code}
                      </div>
                    </td>

                    {/* State & Agency */}
                    <td className="py-2.5 px-4 max-w-[180px]">
                      <div className="text-slate-800 font-medium truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{proj.state || "Multi-State"}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{proj.ministry || "Nodal Agency"}</span>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-2.5 px-4">
                      <span className="inline-block text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[140px]">
                        {proj.sector}
                      </span>
                    </td>

                    {/* Original Outlay */}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      <span className="font-semibold">{formatIndianCr(proj.original_cost_cr)}</span>
                    </td>

                    {/* Cost Overrun */}
                    <td className="py-2.5 px-4 text-right font-mono">
                      <span className={`font-bold block ${proj.cost_overrun_cr > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {proj.cost_overrun_cr > 0 ? `+${formatIndianCr(proj.cost_overrun_cr)}` : 'Nil'}
                      </span>
                      {proj.cost_overrun_pct > 0 && (
                        <span className="text-[10px] text-red-500 font-semibold block">
                          (+{formatPercent(proj.cost_overrun_pct)})
                        </span>
                      )}
                    </td>

                    {/* Schedule Delay */}
                    <td className="py-2.5 px-4 text-right font-mono">
                      <span className={`font-semibold ${ (proj.delay_months || 0) > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                        {formatMonths(proj.delay_months || proj.original_delay_months || 0)}
                      </span>
                    </td>

                    {/* Risk Badge & Score */}
                    <td className="py-2.5 px-4 text-center">
                      {getRiskBadge(proj.risk_category, proj.risk_score)}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(proj.project_code);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[11px] font-semibold rounded border border-slate-200 transition flex items-center gap-1 shadow-xs"
                          title="Inspect Project Details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 4: TABLE PAGINATION & PAGE SIZE FOOTER */}
        {!loading && projects.length > 0 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            {/* Left: Result Count & Range */}
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="font-mono text-slate-900">{((page - 1) * pageSize) + 1}</strong> – <strong className="font-mono text-slate-900">{Math.min(page * pageSize, total)}</strong> of <strong className="font-mono text-slate-900">{formatIndianNumber(total)}</strong> projects
              </span>

              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white text-slate-900 font-mono text-xs rounded border border-slate-300 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Controls */}
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100 font-medium transition flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <span className="px-3 text-xs font-mono font-bold text-slate-700">
                {page} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100 font-medium transition flex items-center gap-1 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
