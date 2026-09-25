import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Coins,
  Cpu,
  Search,
  MapPin,
  GitMerge,
  Flame,
  CloudSun,
  Satellite,
  Sliders,
  FileText,
  Bot,
  ArrowRight,
  CheckCircle2,
  LogIn,
  ChevronRight,
  BarChart3,
  Layers,
  Database,
  Activity,
  RefreshCw,
  Info,
  Shield,
  Landmark,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import {
  fetchLandingStats,
  fetchAgencyStats,
  fetchSectorStats,
  fetchStateStats,
  fetchGeographicRiskData,
  fetchHighValueProjects,
  fetchProjectSpotlight,
  LandingStats,
  AgencyStat,
  SectorStat,
  StateStat,
  HighValueProject,
  ProjectPreview
} from '../../services/landingService';
import { GeographicRiskItem } from '../../types/api';
import { IndiaMapSvg, MetricType } from '../analytics/IndiaMapSvg';
import { findStateFeature } from '../analytics/indiaMapData';

interface LandingPageProps {
  onLogin: () => void;
  onExploreApp?: () => void;
  isAuthenticated?: boolean;
}

/**
 * Strict numeric formatting helper with complete NaN/Infinity protection.
 * Returns 'N/A' for null, undefined, or non-finite inputs without inventing numbers.
 */
function safeFormatNumber(
  val: any,
  decimals: number = 0,
  prefix: string = '',
  suffix: string = ''
): string {
  if (val === null || val === undefined) return 'N/A';
  const num = Number(val);
  if (!Number.isFinite(num)) return 'N/A';
  return `${prefix}${num.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  })}${suffix}`;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // PAIMANA Monitoring Section State
  const [monitoringTab, setMonitoringTab] = useState<'ministry' | 'sector'>('ministry');
  const [agencies, setAgencies] = useState<AgencyStat[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState<boolean>(true);
  const [selectedAgencyName, setSelectedAgencyName] = useState<string | null>(null);

  const [sectors, setSectors] = useState<SectorStat[]>([]);
  const [loadingSectors, setLoadingSectors] = useState<boolean>(true);
  const [selectedSectorName, setSelectedSectorName] = useState<string | null>(null);

  // State Map Section State
  const [states, setStates] = useState<StateStat[]>([]);
  const [loadingStates, setLoadingStates] = useState<boolean>(true);
  const [geoStates, setGeoStates] = useState<GeographicRiskItem[]>([]);
  const [loadingGeoStates, setLoadingGeoStates] = useState<boolean>(true);
  const [selectedMapState, setSelectedMapState] = useState<string | null>('Maharashtra');
  const [mapMetric, setMapMetric] = useState<MetricType>('projects');

  // Major Projects & Spotlight
  const [highValueProjects, setHighValueProjects] = useState<HighValueProject[]>([]);
  const [loadingHighValue, setLoadingHighValue] = useState<boolean>(true);

  const [spotlight, setSpotlight] = useState<ProjectPreview | null>(null);
  const [loadingSpotlight, setLoadingSpotlight] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    fetchLandingStats().then(data => {
      if (isMounted) {
        setStats(data);
        setLoadingStats(false);
      }
    });

    fetchAgencyStats().then(data => {
      if (isMounted) {
        setAgencies(data);
        setLoadingAgencies(false);
        if (data.length > 0) {
          setSelectedAgencyName(data[0].agency);
        }
      }
    });

    fetchSectorStats().then(data => {
      if (isMounted) {
        setSectors(data);
        setLoadingSectors(false);
        if (data.length > 0) {
          setSelectedSectorName(data[0].sector);
        }
      }
    });

    fetchStateStats().then(data => {
      if (isMounted) {
        setStates(data);
        setLoadingStates(false);
      }
    });

    fetchGeographicRiskData().then(data => {
      if (isMounted) {
        setGeoStates(data);
        setLoadingGeoStates(false);
        if (data.length > 0) {
          const firstPhys = data.find(s => findStateFeature(s.state) !== undefined);
          if (firstPhys) {
            setSelectedMapState(firstPhys.state);
          }
        }
      }
    });

    fetchHighValueProjects().then(data => {
      if (isMounted) {
        setHighValueProjects(data);
        setLoadingHighValue(false);
      }
    });

    fetchProjectSpotlight('020100044').then(proj => {
      if (isMounted) {
        setSpotlight(proj);
        setLoadingSpotlight(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const selectedGeoItem = geoStates.find(
    s => s.state.toLowerCase().trim() === (selectedMapState || '').toLowerCase().trim()
  );

  // Selected Ministry/Agency for PAIMANA Panel
  const currentAgency = agencies.find(
    a => (a.agency || '').toLowerCase().trim() === (selectedAgencyName || '').toLowerCase().trim()
  ) || agencies[0];

  // Selected Sector for PAIMANA Panel
  const currentSector = sectors.find(
    s => (s.sector || '').toLowerCase().trim() === (selectedSectorName || '').toLowerCase().trim()
  ) || sectors[0];

  return (
    <div className="min-h-screen bg-[#edf8fd] text-slate-900 font-sans antialiased selection:bg-cyan-600 selection:text-white">

      {/* =================================================== */}
      {/* 1. GOVERNMENT TOP HEADER BAR                        */}
      {/* =================================================== */}
      <div className="bg-gradient-to-r from-[#0B2847] via-[#11385B] to-[#0B2847] text-cyan-100 text-xs py-2 px-4 sm:px-8 border-b border-cyan-400/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-xs animate-pulse"></span>
            <span className="font-extrabold tracking-wider text-cyan-100 text-[11px] sm:text-xs">
              GOVERNMENT OF INDIA
            </span>
            <span className="text-cyan-400/60 hidden sm:inline">|</span>
            <span className="truncate text-cyan-200/90 text-[11px] font-normal">
              MINISTRY OF STATISTICS &amp; PROGRAMME IMPLEMENTATION
            </span>
          </div>

          <div className="flex items-center gap-4 text-cyan-200 text-[11px] shrink-0 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              NIRMAN AI • Infrastructure Risk Intelligence &amp; Decision Support
            </span>
            <button
              onClick={onLogin}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-0.5 rounded text-[11px] transition cursor-pointer flex items-center gap-1 ml-2 shadow-xs"
            >
              <LogIn className="w-3 h-3" />
              LOGIN
            </button>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* 2. TOP NAVIGATION BAR                               */}
      {/* =================================================== */}
      <nav className="bg-gradient-to-r from-[#0E2F52] via-[#144272] to-[#0E2F52] text-white border-b-2 border-cyan-400/40 sticky top-[33px] z-40 px-4 sm:px-8 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Brand Logo & Institutional Title */}
          <div
            className="flex items-center gap-3.5 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="bg-white p-1 rounded-lg border border-cyan-300/90 shadow-xs shrink-0 flex items-center justify-center h-10 w-auto">
              <img
                src="/nirman-logo.jpeg"
                alt="NIRMAN AI Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">
                  NIRMAN AI
                </h1>
                <span className="bg-[#071D2F] text-cyan-300 border border-cyan-400/50 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase font-mono shadow-xs">
                  MoSPI Monitoring
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/90 font-normal hidden sm:block pt-0.5">
                Central Sector Infrastructure Risk Intelligence &amp; Decision Support
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold tracking-wide text-cyan-100/90 uppercase font-mono">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-cyan-300 transition cursor-pointer py-1"
            >
              HOME
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-cyan-300 transition cursor-pointer py-1"
            >
              ABOUT
            </button>
            <button
              onClick={() => scrollToSection('monitoring')}
              className="hover:text-cyan-300 transition cursor-pointer py-1"
            >
              INFRASTRUCTURE PROJECT MONITORING
            </button>
            <button
              onClick={() => scrollToSection('intelligence')}
              className="hover:text-cyan-300 transition cursor-pointer py-1"
            >
              AI-POWERED DECISION SUPPORT
            </button>
          </div>

          {/* Primary Public Login Link (Authoritative Nirman AI Cyan Button) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-5 py-2 rounded-lg text-xs sm:text-sm transition shadow-md hover:shadow-cyan-400/20 flex items-center gap-2 cursor-pointer font-mono tracking-wider"
            >
              <LogIn className="w-4 h-4" />
              LOGIN
            </button>
          </div>

        </div>
      </nav>

      {/* =================================================== */}
      {/* 3. HERO SECTION (NAVY PROTOTYPE BACKDROP)            */}
      {/* =================================================== */}
      <section id="home" className="relative overflow-hidden pt-12 pb-14 px-4 sm:px-8 border-b border-cyan-900/60 bg-gradient-to-br from-[#041321] via-[#071D2F] to-[#0A2A43] text-white">

        {/* Subtle Infrastructure Backdrop */}
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none mix-blend-luminosity">
          <img
            src="/infrastructure-hero.png"
            alt="Infrastructure Monitoring Background"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#041321] via-[#041321]/80 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl space-y-5">

            <div className="inline-flex items-center gap-2 bg-[#041321] border border-cyan-800/80 text-cyan-200 text-xs font-mono font-semibold px-3 py-1 rounded shadow-2xs">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              <span>CENTRAL SECTOR INFRASTRUCTURE MONITORING ENGINE</span>
            </div>

            {/* Primary Hero Message */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                NIRMAN AI
              </h1>
              <h2 className="text-xl sm:text-3xl font-bold text-cyan-200 tracking-tight">
                AI-Powered Decision Support for Infrastructure Projects
              </h2>
            </div>

            {/* Supporting Explanation */}
            <p className="text-sm sm:text-base text-cyan-100/90 leading-relaxed font-normal max-w-3xl">
              Nirman AI extends traditional infrastructure project monitoring with predictive risk intelligence, early warnings, explainable AI, environmental conditions, dependency graphs, and document-grounded decision support across Central Sector capital portfolios.
            </p>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => scrollToSection('monitoring')}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-lg text-xs sm:text-sm transition shadow-md flex items-center gap-2 cursor-pointer font-mono"
              >
                <BarChart3 className="w-4 h-4" />
                EXPLORE INFRASTRUCTURE MONITORING
              </button>

              <button
                onClick={onLogin}
                className="bg-[#041321] hover:bg-[#0b2942] text-cyan-200 border border-cyan-700/80 font-semibold px-6 py-2.5 rounded-lg text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer font-mono"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                LOGIN TO PORTAL
              </button>
            </div>

            {/* Factual Highlights Bar */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-cyan-900/60 text-xs text-cyan-200/90 font-mono">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Risk Intelligence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Early Warnings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>TreeSHAP Drivers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>RAG Evidence</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =================================================== */}
      {/* 4. INFRASTRUCTURE PROJECT MONITORING (CYAN/NAVY THEME)*/}
      {/* =================================================== */}
      <section id="monitoring" className="py-14 px-4 sm:px-8 border-b border-cyan-200/80 bg-white">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Section Header */}
          <div className="bg-[#071D2F] text-white p-4 sm:p-5 rounded-t-xl border border-cyan-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider block">
                SURVEILLANCE &amp; PORTFOLIO METRICS
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Infrastructure Project Monitoring
              </h2>
            </div>

            {/* Ministry-Wise vs Sector-Wise Top Tabs (Cyan Theme) */}
            <div className="flex items-center gap-2 bg-[#041321] p-1 rounded-lg border border-cyan-800 text-xs font-mono">
              <button
                onClick={() => setMonitoringTab('ministry')}
                className={`px-4 py-1.5 rounded font-extrabold transition cursor-pointer ${
                  monitoringTab === 'ministry'
                    ? 'bg-cyan-400 text-slate-950 shadow-xs'
                    : 'text-cyan-200 hover:text-white hover:bg-cyan-950/40'
                }`}
              >
                Ministry-Wise
              </button>
              <button
                onClick={() => setMonitoringTab('sector')}
                className={`px-4 py-1.5 rounded font-extrabold transition cursor-pointer ${
                  monitoringTab === 'sector'
                    ? 'bg-cyan-400 text-slate-950 shadow-xs'
                    : 'text-cyan-200 hover:text-white hover:bg-cyan-950/40'
                }`}
              >
                Sector-Wise
              </button>
            </div>
          </div>

          {/* Main Information Hierarchy Container */}
          <div className="bg-[#f0f9ff] border border-cyan-200/80 rounded-b-xl shadow-xs p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* LEFT SIDE: Vertical Selectable List of Ministries or Sectors */}
              <div className="lg:col-span-4 bg-white rounded-xl border border-cyan-200 p-3 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-cyan-100 pb-2 px-1">
                  <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                    {monitoringTab === 'ministry' ? 'Nodal Ministry / Agency' : 'Infrastructure Sector'}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-800 font-semibold">
                    {monitoringTab === 'ministry' ? `${agencies.length} Listed` : `${sectors.length} Listed`}
                  </span>
                </div>

                <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {monitoringTab === 'ministry' ? (
                    loadingAgencies ? (
                      <div className="p-4 text-center text-slate-500">Loading ministries...</div>
                    ) : agencies.length > 0 ? (
                      agencies.map((ag, idx) => {
                        const isSelected = (selectedAgencyName || '').toLowerCase().trim() === ag.agency.toLowerCase().trim();
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedAgencyName(ag.agency)}
                            className={`p-2.5 rounded-lg cursor-pointer transition flex justify-between items-center ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950 font-black border-l-4 border-l-cyan-700 shadow-2xs'
                                : 'hover:bg-cyan-50/60 text-slate-800 font-medium'
                            }`}
                          >
                            <span className="truncate pr-2">{ag.agency}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              isSelected ? 'bg-[#041321] text-cyan-300 font-bold' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ag.project_count}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-500">No agency data available.</div>
                    )
                  ) : (
                    loadingSectors ? (
                      <div className="p-4 text-center text-slate-500">Loading sectors...</div>
                    ) : sectors.length > 0 ? (
                      sectors.map((sec, idx) => {
                        const isSelected = (selectedSectorName || '').toLowerCase().trim() === sec.sector.toLowerCase().trim();
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedSectorName(sec.sector)}
                            className={`p-2.5 rounded-lg cursor-pointer transition flex justify-between items-center ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950 font-black border-l-4 border-l-cyan-700 shadow-2xs'
                                : 'hover:bg-cyan-50/60 text-slate-800 font-medium'
                            }`}
                          >
                            <span className="truncate pr-2">{sec.sector}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              isSelected ? 'bg-[#041321] text-cyan-300 font-bold' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {sec.project_count}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-500">No sector data available.</div>
                    )
                  )}
                </div>
              </div>

              {/* MAIN PANEL: Large Selected Heading & 6 Metric Blocks */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-cyan-200 p-5 shadow-2xs space-y-5">

                <div className="border-b border-cyan-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-700 font-bold uppercase tracking-wider block">
                      {monitoringTab === 'ministry' ? 'SELECTED NODAL MINISTRY / AGENCY' : 'SELECTED INFRASTRUCTURE SECTOR'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-0.5">
                      {monitoringTab === 'ministry'
                        ? (currentAgency?.agency || 'Select Ministry')
                        : (currentSector?.sector || 'Select Sector')}
                    </h3>
                  </div>
                  <span className="bg-cyan-50 border border-cyan-200 text-cyan-900 text-[10px] font-mono font-bold px-2.5 py-1 rounded self-start sm:self-auto">
                    GENUINE DATABASE TELEMETRY
                  </span>
                </div>

                {/* 6 Metric Blocks Grid */}
                {monitoringTab === 'ministry' ? (
                  currentAgency ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
                      {/* Block 1: Project Count */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">PROJECT COUNT</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                          {safeFormatNumber(currentAgency.project_count)}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Monitored Portfolio</span>
                      </div>

                      {/* Block 2: Original Cost */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">ORIGINAL COST (₹ CR)</span>
                        <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
                          {safeFormatNumber(currentAgency.total_original_cost_crore, 2, '₹ ')}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Approved Sanctioned Outlay</span>
                      </div>

                      {/* Block 3: Latest Revised / Anticipated Cost */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">LATEST ANTICIPATED COST</span>
                        <div className="text-lg sm:text-xl font-black text-cyan-950 mt-1 truncate">
                          {safeFormatNumber(currentAgency.total_anticipated_cost_crore, 2, '₹ ')}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Updated Project Estimate</span>
                      </div>

                      {/* Block 4: Cumulative Expenditure */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">CUMULATIVE EXPENDITURE</span>
                        <div className="text-lg sm:text-xl font-black text-blue-900 mt-1 truncate">
                          {safeFormatNumber(currentAgency.cumulative_expenditure_crore, 2, '₹ ')}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Financial Disbursement</span>
                      </div>

                      {/* Block 5: Completed During Month */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">COMPLETED DURING MONTH</span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                          {safeFormatNumber(currentAgency.completed_during_month)}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Commissioned Units</span>
                      </div>

                      {/* Block 6: Newly Added */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">NEWLY ADDED</span>
                        <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                          {safeFormatNumber(currentAgency.newly_added)}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">New Project Ingests</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 font-mono text-xs">
                      No ministry telemetry available.
                    </div>
                  )
                ) : (
                  currentSector ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
                      {/* Block 1: Project Count */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">PROJECT COUNT</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                          {safeFormatNumber(currentSector.project_count)}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Sector Portfolio</span>
                      </div>

                      {/* Block 2: Original Cost */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">ORIGINAL COST (₹ CR)</span>
                        <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
                          {safeFormatNumber(currentSector.total_original_cost_crore, 2, '₹ ')}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Sanctioned Outlay</span>
                      </div>

                      {/* Block 3: Latest Revised / Anticipated Cost */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">LATEST ANTICIPATED COST</span>
                        <div className="text-lg sm:text-xl font-black text-cyan-950 mt-1 truncate">
                          {safeFormatNumber(currentSector.total_anticipated_cost_crore, 2, '₹ ')}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Updated Sector Estimate</span>
                      </div>

                      {/* Block 4: Cumulative Expenditure */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">CUMULATIVE EXPENDITURE</span>
                        <div className="text-lg sm:text-xl font-black text-blue-900 mt-1 truncate">
                          {safeFormatNumber(currentSector.cumulative_expenditure_crore, 2, '₹ ')}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Financial Disbursement</span>
                      </div>

                      {/* Block 5: Completed During Month */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">COMPLETED DURING MONTH</span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                          {safeFormatNumber(currentSector.completed_during_month)}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">Commissioned Units</span>
                      </div>

                      {/* Block 6: Newly Added */}
                      <div className="bg-[#f0f9ff] p-4 rounded-xl border border-cyan-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">NEWLY ADDED</span>
                        <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                          {safeFormatNumber(currentSector.newly_added)}
                        </div>
                        <span className="text-[10px] text-cyan-700 block mt-0.5 font-medium">New Ingests</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 font-mono text-xs">
                      No sector telemetry available.
                    </div>
                  )
                )}

              </div>

            </div>
          </div>

          {/* Major Monitored Capital Projects Cards */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-t border-cyan-100 pt-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Major Monitored Capital Projects
                </h3>
                <p className="text-xs text-slate-600 font-normal">
                  Central Sector projects retrieved directly from backend database with verified complete records
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-800 font-medium">
                Validated complete records
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingHighValue ? (
                <div className="col-span-full py-8 text-center text-slate-500 font-mono">
                  Loading verified major capital projects...
                </div>
              ) : highValueProjects.length > 0 ? (
                highValueProjects.map((p, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-cyan-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        CODE: {p.project_code}
                      </span>
                      {p.risk_category ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          p.risk_category === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {p.risk_category} RISK {p.risk_score !== undefined ? `(${safeFormatNumber(p.risk_score, 1)})` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Risk Score: N/A</span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                      {p.project_name}
                    </h4>

                    <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                      <div>Agency: <span className="text-slate-900 font-semibold">{p.agency || "N/A"}</span></div>
                      <div>State: <span className="text-slate-900 font-semibold">{p.state || "N/A"}</span></div>
                    </div>

                    <div className="pt-2 border-t border-cyan-100 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase">Original Cost</span>
                        <span className="text-slate-900 font-bold">
                          {safeFormatNumber(p.original_cost_crore, 2, '₹ ', ' Cr')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase">Cost Overrun</span>
                        <span className="text-amber-800 font-bold">
                          {safeFormatNumber(p.cost_overrun_crore, 2, '+₹ ', ' Cr')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-between items-center text-xs font-mono border-t border-cyan-100">
                      <span className="text-slate-600">
                        Delay: <strong className="text-slate-900">{safeFormatNumber(p.delay_months, 1, '', ' Mo')}</strong>
                      </span>
                      <span className="text-slate-600">
                        Progress: <strong className="text-slate-900">{safeFormatNumber(p.physical_progress_pct, 1, '', '%')}</strong>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-slate-500 font-mono">
                  Major project telemetry unavailable.
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* =================================================== */}
      {/* 5. STATE-WISE INFRASTRUCTURE PROJECTS (INDIA MAP)   */}
      {/* =================================================== */}
      <section id="states" className="py-14 px-4 sm:px-8 border-b border-cyan-200/80 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="border-b border-cyan-200/80 pb-3">
            <span className="text-[11px] font-mono font-bold text-cyan-700 uppercase tracking-wider block">
              Spatial Exposure &amp; Geographic Distribution
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              State-wise Infrastructure Projects
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Select any state or union territory on the official India map to inspect genuine state-level infrastructure telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column — India Map SVG Visualization */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-cyan-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                    Interactive India Infrastructure Map
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => setMapMetric('projects')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      mapMetric === 'projects' ? 'bg-[#071D2F] text-white' : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100'
                    }`}
                  >
                    Projects
                  </button>
                  <button
                    onClick={() => setMapMetric('risk')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      mapMetric === 'risk' ? 'bg-[#071D2F] text-white' : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100'
                    }`}
                  >
                    Risk
                  </button>
                  <button
                    onClick={() => setMapMetric('cost')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      mapMetric === 'cost' ? 'bg-[#071D2F] text-white' : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100'
                    }`}
                  >
                    Cost
                  </button>
                </div>
              </div>

              {/* Render Existing India Map SVG Component */}
              <div className="min-h-[420px] flex items-center justify-center relative bg-[#f0f9ff] rounded-lg p-2 border border-cyan-200/80">
                {loadingGeoStates ? (
                  <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading spatial map data...</span>
                  </div>
                ) : (
                  <IndiaMapSvg
                    statesData={geoStates}
                    selectedState={selectedMapState}
                    onSelectState={(stateName) => {
                      const feat = findStateFeature(stateName);
                      if (feat) {
                        setSelectedMapState(feat.name);
                      } else {
                        setSelectedMapState(stateName);
                      }
                    }}
                    activeMetric={mapMetric}
                  />
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-cyan-100 pt-2">
                <span>Click state boundary to select</span>
                <span>Data source: /api/public/landing/geographic-risk</span>
              </div>
            </div>

            {/* Right Column — State Selected Telemetry Inspector */}
            <div className="lg:col-span-5 space-y-4">

              <div className="bg-[#071D2F] text-white p-5 rounded-xl border border-cyan-800 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-cyan-900 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                      STATE TELEMETRY INSPECTOR
                    </span>
                    <h3 className="text-xl font-extrabold text-white pt-0.5">
                      {selectedMapState || "Select a State"}
                    </h3>
                  </div>
                  <span className="bg-[#041321] text-cyan-300 border border-cyan-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                    LIVE STATE DATA
                  </span>
                </div>

                {selectedGeoItem ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-[#041321] p-3 rounded-lg border border-cyan-900/80 flex justify-between items-center">
                      <span className="text-slate-400">Total Projects:</span>
                      <span className="text-white font-bold text-base">
                        {safeFormatNumber(selectedGeoItem.total_projects)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#041321] p-3 rounded-lg border border-red-900/60">
                        <span className="text-red-300 text-[10px] block font-bold">CRITICAL RISK</span>
                        <span className="text-red-400 font-bold text-base">
                          {safeFormatNumber(selectedGeoItem.critical_risk_projects)}
                        </span>
                      </div>

                      <div className="bg-[#041321] p-3 rounded-lg border border-amber-900/60">
                        <span className="text-amber-300 text-[10px] block font-bold">HIGH RISK</span>
                        <span className="text-amber-400 font-bold text-base">
                          {safeFormatNumber(selectedGeoItem.high_risk_projects)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#041321] p-3 rounded-lg border border-cyan-900/80 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Cost Overrun:</span>
                        <span className="text-amber-300 font-bold">
                          {safeFormatNumber(selectedGeoItem.total_cost_overrun_cr, 2, '₹ ', ' Cr')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-cyan-900/60 pt-2">
                        <span className="text-slate-400">Average Schedule Delay:</span>
                        <span className="text-white font-bold">
                          {safeFormatNumber(selectedGeoItem.avg_delay_months, 1, '', ' Months')}
                        </span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-6 bg-[#041321] rounded-lg border border-cyan-900 text-center text-xs font-mono text-cyan-200/70">
                    No data available.
                  </div>
                )}
              </div>

              {/* State Selection Selector List */}
              <div className="bg-white p-4 rounded-xl border border-cyan-200/90 shadow-2xs space-y-3">
                <span className="text-xs font-mono font-bold text-slate-800 uppercase block border-b border-cyan-100 pb-2">
                  Top Monitored States Overview
                </span>

                <div className="max-h-[220px] overflow-y-auto divide-y divide-cyan-50 text-xs">
                  {loadingStates ? (
                    <div className="p-4 text-center text-slate-500 font-mono">Loading state list...</div>
                  ) : states.length > 0 ? (
                    states.slice(0, 10).map((st, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const feat = findStateFeature(st.state);
                          setSelectedMapState(feat ? feat.name : st.state);
                        }}
                        className={`p-2.5 flex items-center justify-between cursor-pointer rounded transition ${
                          (selectedMapState || '').toLowerCase() === st.state.toLowerCase() ? 'bg-cyan-500 text-slate-950 font-black border-l-4 border-l-cyan-700' : 'hover:bg-cyan-50/50 text-slate-800'
                        }`}
                      >
                        <span className="truncate">{st.state}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                          <span className="text-blue-900 font-bold">{st.project_count} Proj</span>
                          <span className="text-amber-800 font-semibold">
                            {safeFormatNumber(st.total_cost_overrun_crore, 0, '₹ ', ' Cr')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 font-mono font-medium">No state statistics available.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* =================================================== */}
      {/* 6. AI-POWERED DECISION SUPPORT                      */}
      {/* =================================================== */}
      <section id="intelligence" className="py-14 px-4 sm:px-8 border-b border-cyan-900/60 bg-[#071D2F] text-white">
        <div className="max-w-7xl mx-auto space-y-8">

          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-cyan-300 font-mono text-xs font-bold uppercase tracking-widest bg-[#041321] px-3 py-1 rounded border border-cyan-800">
              NEXT-GENERATION DECISION SUPPORT LAYER
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
              AI-Powered Decision Support Capabilities
            </h2>
            <p className="text-cyan-100/90 text-xs sm:text-sm leading-relaxed">
              Nirman AI builds intelligence on top of traditional project monitoring data using verified machine learning models, explainability tools, spatial mapping, satellite change detection, and vector RAG document search.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 1 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">AI Risk Assessment</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                XGBoost severe risk scoring model trained on longitudinal project execution patterns to calculate severe risk probabilities.
              </p>
            </div>

            {/* 2 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Early Warning Intelligence</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Priority-ranked warning alerts identifying high-risk schedule and financial anomalies prior to critical commissioning milestones.
              </p>
            </div>

            {/* 3 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">TreeSHAP Risk Drivers</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Quantitative feature attributions detailing exact factors contributing to individual project risk scores.
              </p>
            </div>

            {/* 4 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Cost &amp; Schedule Analytics</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Cost expansion ratios, delay trajectories, and sector-level outlay performance analytics.
              </p>
            </div>

            {/* 5 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-sky-300 font-bold">
                <MapPin className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Geographic Risk Intelligence</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Interactive choropleth spatial mapping identifying regional risk concentrations across states and union territories.
              </p>
            </div>

            {/* 6 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <CloudSun className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Environmental Intelligence</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Project site weather telemetry, precipitation anomaly tracking, and environmental clearance monitoring.
              </p>
            </div>

            {/* 7 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-purple-300 font-bold">
                <GitMerge className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Dependency Intelligence</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Interactive dependency graphs mapping inter-departmental clearances, land acquisition, and funding dependencies.
              </p>
            </div>

            {/* 8 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Bottleneck Leaderboard</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Systemic blockage ranking identifying top delay-inducing agencies and clearance bottlenecks across portfolios.
              </p>
            </div>

            {/* 9 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-blue-300 font-bold">
                <Satellite className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Satellite Change Detection</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Sentinel-2 bi-temporal satellite earth observation change detection for independent physical progress verification.
              </p>
            </div>

            {/* 10 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Synthetic Stress Testing</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                What-if scenario stress testing evaluating financial and schedule perturbation impacts under hypothetical shocks.
              </p>
            </div>

            {/* 11 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-teal-300 font-bold">
                <FileText className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Document RAG Search</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Neural vector search across official DPRs, flash reports, and audit documents with exact text citation snippets.
              </p>
            </div>

            {/* 12 */}
            <div className="bg-[#041321] p-5 rounded-xl border border-cyan-800/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Bot className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Nirman AI Assistant</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed font-normal">
                Context-aware conversational copilot grounded in database telemetry and retrieved document evidence.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =================================================== */}
      {/* 7. REAL PROJECT SPOTLIGHT (Project 020100044)       */}
      {/* =================================================== */}
      <section id="spotlight" className="py-14 px-4 sm:px-8 border-b border-cyan-200/80 bg-white">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="border-b border-cyan-100 pb-3">
            <span className="text-[11px] font-mono font-bold text-cyan-700 uppercase tracking-wider block">
              Surveillance Spotlight
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Real Project Monitoring Spotlight
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Live telemetry retrieved from backend API for reference project 020100044.
            </p>
          </div>

          <div className="bg-[#f0f9ff] rounded-xl border border-cyan-200/90 p-6 shadow-2xs max-w-4xl mx-auto space-y-5 text-slate-900">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-200/80 pb-3">
              <div>
                <span className="text-xs font-mono text-blue-800 uppercase font-bold">
                  PROJECT CODE: {spotlight?.project_code || '020100044'}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 pt-0.5">
                  {spotlight?.project_name || 'Project 020100044'}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1 font-medium">
                  <span>Sector: <strong>{spotlight?.sector || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>State: <strong>{spotlight?.state || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Agency: <strong>{spotlight?.agency || 'N/A'}</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-start sm:items-end">
                {spotlight?.risk_category ? (
                  <span className={`px-3 py-1 rounded text-xs font-bold font-mono border ${
                    spotlight.risk_category === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {spotlight.risk_category} RISK {spotlight.risk_score !== undefined ? `(${safeFormatNumber(spotlight.risk_score, 1)}/100)` : ''}
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-500">Risk Category: N/A</span>
                )}
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">API Risk Engine Output</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-cyan-200/80 text-xs font-mono">
              <div>
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Original Cost</span>
                <span className="text-slate-900 font-bold text-sm">
                  {safeFormatNumber(spotlight?.original_cost_cr, 2, '₹ ', ' Cr')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Anticipated Cost</span>
                <span className="text-slate-900 font-bold text-sm">
                  {safeFormatNumber(spotlight?.latest_cost_cr, 2, '₹ ', ' Cr')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Cost Overrun</span>
                <span className="text-amber-800 font-bold text-sm">
                  {safeFormatNumber(spotlight?.cost_overrun_cr, 2, '+₹ ', ' Cr')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Timeline Delay</span>
                <span className="text-slate-900 font-bold text-sm">
                  {safeFormatNumber(spotlight?.delay_months, 1, '', ' Months')}
                </span>
              </div>
            </div>

            {/* TreeSHAP Drivers */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                Top Returned SHAP Risk Drivers (Explainable AI Attribution)
              </h4>

              {spotlight?.top_drivers && spotlight.top_drivers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  {spotlight.top_drivers.map((drv, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-cyan-200/80">
                      <span className="text-slate-900 font-bold block truncate font-sans">{drv.feature}</span>
                      <div className="flex justify-between items-center text-[11px] mt-1">
                        <span className="text-amber-800 font-semibold">{drv.impact}</span>
                        <span className="font-bold text-blue-700">{drv.value || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-cyan-200/80 text-xs font-mono text-slate-500">
                  No SHAP risk driver data returned for this project.
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* =================================================== */}
      {/* 8. ABOUT NIRMAN AI — PROPER 4-STEP PROGRESSION FLOW  */}
      {/* =================================================== */}
      <section id="about" className="py-14 px-4 sm:px-8 border-b border-cyan-200/80 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto space-y-8">

          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold text-cyan-700 uppercase tracking-wider block">
              CONCEPTUAL ARCHITECTURE &amp; VALUE PROGRESSION
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              About Nirman AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Nirman AI builds on structured infrastructure project monitoring by adding predictive risk assessment, early warnings, explainable risk drivers, environmental conditions, dependency intelligence, document-grounded evidence, and scenario analysis.
            </p>
          </div>

          {/* Nirman AI 4-Step Horizontal / Vertical Responsive Progression Flow */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">

            {/* Step 1 */}
            <div className="bg-white p-5 rounded-xl border border-cyan-200 shadow-2xs relative flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-[#071D2F] text-cyan-300 font-black flex items-center justify-center text-xs">
                  01
                </span>
                <BarChart3 className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-sm font-sans uppercase">
                  PROJECT MONITORING
                </h3>
                <p className="text-[11px] text-slate-600 font-sans leading-snug">
                  Cost outlays • Physical progress • Schedule slippage tracking across ministries.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-cyan-800 font-bold border-t border-cyan-100 flex items-center justify-between">
                <span>MONITORING BASELINE</span>
                <ChevronRight className="w-4 h-4 hidden md:block text-cyan-500" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-5 rounded-xl border border-cyan-300 shadow-2xs relative flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-[#071D2F] text-cyan-300 font-black flex items-center justify-center text-xs">
                  02
                </span>
                <Cpu className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-sm font-sans uppercase">
                  AI RISK INTELLIGENCE
                </h3>
                <p className="text-[11px] text-slate-600 font-sans leading-snug">
                  XGBoost severe risk scoring • Early warning priority streams.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-cyan-800 font-bold border-t border-cyan-100 flex items-center justify-between">
                <span>PREDICTIVE ENGINE</span>
                <ChevronRight className="w-4 h-4 hidden md:block text-cyan-500" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-5 rounded-xl border border-cyan-300 shadow-2xs relative flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-[#071D2F] text-cyan-300 font-black flex items-center justify-center text-xs">
                  03
                </span>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-sm font-sans uppercase">
                  EVIDENCE &amp; CONTEXT
                </h3>
                <p className="text-[11px] text-slate-600 font-sans leading-snug">
                  TreeSHAP attributions • RAG document search • Site weather &amp; GIS context.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-cyan-800 font-bold border-t border-cyan-100 flex items-center justify-between">
                <span>VERIFIED CONTEXT</span>
                <ChevronRight className="w-4 h-4 hidden md:block text-cyan-500" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#071D2F] text-white p-5 rounded-xl border border-cyan-700 shadow-md relative flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-xs">
                  04
                </span>
                <CheckSquare className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-white text-sm font-sans uppercase">
                  DECISION SUPPORT
                </h3>
                <p className="text-[11px] text-cyan-100/90 font-sans leading-snug">
                  Prescriptive recommendations • Prioritization • Executive copilot.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-cyan-300 font-bold border-t border-cyan-800 flex items-center justify-between">
                <span>ACTIONABLE GOVERNANCE</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =================================================== */}
      {/* INSTITUTIONAL FOOTER                                */}
      {/* =================================================== */}
      <footer className="bg-[#041321] text-slate-400 border-t border-cyan-900/80 py-8 px-4 sm:px-8 text-xs font-mono">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="font-extrabold text-white text-sm">NIRMAN AI</span>
              <span className="text-cyan-400 text-[11px] block font-normal">
                Government Infrastructure Risk Intelligence &amp; Decision Support Portal
              </span>
            </div>

            <div className="flex items-center gap-4 text-cyan-200 text-xs font-semibold">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition cursor-pointer">
                HOME
              </button>
              <button onClick={() => scrollToSection('about')} className="hover:text-white transition cursor-pointer">
                ABOUT
              </button>
              <button onClick={() => scrollToSection('monitoring')} className="hover:text-white transition cursor-pointer">
                MONITORING
              </button>
              <button onClick={() => scrollToSection('intelligence')} className="hover:text-white transition cursor-pointer">
                DECISION SUPPORT
              </button>
              <button onClick={onLogin} className="text-cyan-400 font-bold hover:underline cursor-pointer">
                LOGIN
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-cyan-900/60 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-500">
            <span>© 2026 NIRMAN AI • Ministry of Statistics &amp; Programme Implementation Baseline</span>
            <span>Official Surveillance Intelligence Portal</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
