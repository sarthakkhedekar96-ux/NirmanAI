import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavTabType } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { PortfolioExplorer } from './components/portfolio/PortfolioExplorer';
import { ProjectDetailView } from './components/detail/ProjectDetailView';
import { EvidenceSearch } from './components/rag/EvidenceSearch';
import { GeographicRiskMap } from './components/analytics/GeographicRiskMap';
import { ProjectComparison } from './components/portfolio/ProjectComparison';
import { SystemHealth } from './components/health/SystemHealth';
import { AIAssistantDrawer } from './components/assistant/AIAssistantDrawer';
import { SettingsView } from './components/settings/SettingsView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RiskMonitorView } from './components/risk/RiskMonitorView';
import { EarlyWarningsView } from './components/risk/EarlyWarningsView';
import { CostAnalyticsView } from './components/analytics/CostAnalyticsView';
import { ScheduleAnalyticsView } from './components/analytics/ScheduleAnalyticsView';
import { BenchmarkingView } from './components/analytics/BenchmarkingView';
import { DriverAnalysisView } from './components/analytics/DriverAnalysisView';
import { AlertHistoryView } from './components/risk/AlertHistoryView';
import { DeliveryHistoryView } from './components/settings/DeliveryHistoryView';
import { DependencyIntelligenceView } from './components/dependencies/DependencyIntelligenceView';
import { BottleneckLeaderboardView } from './components/dependencies/BottleneckLeaderboardView';
import { StressTestView } from './components/stress/StressTestView';
import { LoginView } from './components/auth/LoginView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshCw, AlertTriangle, ShieldAlert, X } from 'lucide-react';

function AppWorkspace() {
  const { isAuthenticated, loading, sessionExpired, dismissSessionExpired, forbiddenToast, dismissForbiddenToast } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTabType>('overview');
  const [activeProjectCode, setActiveProjectCode] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState<string | undefined>(undefined);

  // Sidebar Overlay Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [assistantSectionContext, setAssistantSectionContext] = useState<{ sectionName: string; starterQuestions?: string[] } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wide">Verifying Institutional Session Identity...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleSelectProject = (code: string) => {
    if (!code) {
      setActiveProjectCode(null);
      setActiveTab('portfolio');
    } else {
      setActiveProjectCode(code);
      setActiveTab('risk');
    }
  };

  const handleOpenAssistant = (
    queryOrOptions?: string | { initialQuery?: string; sectionName?: string; starterQuestions?: string[] },
    sectionContext?: { sectionName: string; starterQuestions?: string[] }
  ) => {
    if (typeof queryOrOptions === 'object' && queryOrOptions !== null) {
      setAssistantQuery(queryOrOptions.initialQuery || undefined);
      setAssistantSectionContext(
        queryOrOptions.sectionName
          ? { sectionName: queryOrOptions.sectionName, starterQuestions: queryOrOptions.starterQuestions }
          : null
      );
    } else {
      setAssistantQuery(queryOrOptions);
      setAssistantSectionContext(sectionContext || null);
    }
    setIsAssistantOpen(true);
  };

  const handleTabChange = (tab: NavTabType) => {
    console.log(`[PERF] navigation:start ${tab}`);
    if (tab === 'copilot') {
      setIsAssistantOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#e6f7fc] via-[#eaf8ff] to-[#f0faef] text-slate-900 font-sans antialiased">
      {/* 401 Session Expired Banner */}
      {sessionExpired && (
        <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="font-bold">Your session has expired. Please sign in again.</span>
          </div>
          <button onClick={dismissSessionExpired} className="p-1 hover:bg-amber-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 403 Forbidden Toast */}
      {forbiddenToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-900 text-white text-xs p-3.5 rounded-xl shadow-2xl border border-red-700 max-w-md flex items-start gap-2.5 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-200">Access Restricted (403 Forbidden)</span>
            <span>{forbiddenToast}</span>
          </div>
          <button onClick={dismissForbiddenToast} className="text-red-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Main Header */}
      <Header
        onSelectProject={handleSelectProject}
        onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
        isAssistantOpen={isAssistantOpen}
        activeProjectCode={activeProjectCode}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Body with Overlay Drawer Sidebar + Workspace Container */}
      <div className="flex-1 flex relative">
        {/* Overlay Drawer Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          activeProjectCode={activeProjectCode}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Workspace (Full Width Canvas) */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <main className="flex-1">
            <ErrorBoundary fallbackTitle="Nirman Module Render Error">
              {/* Executive Overview */}
              {activeTab === 'overview' && (
                <OverviewDashboard
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Portfolio Explorer */}
              {activeTab === 'portfolio' && (
                <PortfolioExplorer
                  onSelectProject={handleSelectProject}
                />
              )}

              {/* Risk Monitor */}
              {activeTab === 'risk-monitor' && (
                <RiskMonitorView
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Early Warnings */}
              {activeTab === 'early-warnings' && (
                <EarlyWarningsView
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Alert History */}
              {activeTab === 'alert-history' && (
                <AlertHistoryView
                  onSelectProject={handleSelectProject}
                />
              )}

              {/* Delivery Audit History */}
              {activeTab === 'delivery-history' && (
                <DeliveryHistoryView />
              )}

              {/* Dependency Intelligence Graph */}
              {activeTab === 'dependencies' && (
                <DependencyIntelligenceView
                  onSelectProject={handleSelectProject}
                  initialProjectCode={activeProjectCode}
                />
              )}

              {/* Bottleneck Leaderboard */}
              {activeTab === 'bottlenecks' && (
                <BottleneckLeaderboardView
                  onSelectProject={handleSelectProject}
                  onNavigateToGraph={() => setActiveTab('dependencies')}
                />
              )}

              {/* Stress Test Simulation Mode */}
              {activeTab === 'stress-test' && (
                <StressTestView
                  onSelectProject={handleSelectProject}
                  initialProjectCode={activeProjectCode}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Project Details */}
              {activeTab === 'risk' && (
                activeProjectCode ? (
                  <ProjectDetailView
                    projectCode={activeProjectCode}
                    onBack={() => handleSelectProject('')}
                    onOpenAssistant={handleOpenAssistant}
                  />
                ) : (
                  <PortfolioExplorer
                    onSelectProject={handleSelectProject}
                  />
                )
              )}

              {/* Cost Analytics */}
              {activeTab === 'cost-analytics' && (
                <CostAnalyticsView
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Schedule Analytics */}
              {activeTab === 'schedule-analytics' && (
                <ScheduleAnalyticsView
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Benchmarking */}
              {activeTab === 'benchmarking' && (
                <BenchmarkingView
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Driver Analysis */}
              {activeTab === 'driver-analysis' && (
                <DriverAnalysisView
                  projectCode={activeProjectCode}
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Audit Evidence (RAG Search) */}
              {activeTab === 'evidence' && (
                <EvidenceSearch
                  onSelectProject={handleSelectProject}
                  onOpenAssistant={handleOpenAssistant}
                />
              )}

              {/* Geographic GIS Map */}
              {activeTab === 'map' && (
                <GeographicRiskMap
                  onSelectProject={handleSelectProject}
                />
              )}

              {/* Project Comparison */}
              {activeTab === 'compare' && (
                <ProjectComparison
                  onSelectProject={handleSelectProject}
                />
              )}

              {/* System Health */}
              {activeTab === 'health' && (
                <SystemHealth />
              )}

              {/* Settings View */}
              {activeTab === 'settings' && (
                <SettingsView />
              )}
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>

      {/* AI Copilot Drawer */}
      <AIAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        activeProjectCode={activeProjectCode}
        initialQuery={assistantQuery}
        sectionContext={assistantSectionContext}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppWorkspace />
    </AuthProvider>
  );
}

export default App;
