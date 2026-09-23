import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Table,
  AlertTriangle,
  ShieldAlert,
  GitCompare,
  FileText,
  IndianRupee,
  Clock,
  BarChart3,
  SlidersHorizontal,
  Map,
  FileSearch,
  ShieldCheck,
  Settings,
  Bell,
  Mail,
  X,
  Network,
  Zap,
  ListOrdered
} from 'lucide-react';

export type NavTabType =
  | 'overview'
  | 'portfolio'
  | 'risk-monitor'
  | 'early-warnings'
  | 'alert-history'
  | 'delivery-history'
  | 'compare'
  | 'risk'
  | 'dependencies'
  | 'bottlenecks'
  | 'stress-test'
  | 'cost-analytics'
  | 'schedule-analytics'
  | 'benchmarking'
  | 'driver-analysis'
  | 'map'
  | 'copilot'
  | 'evidence'
  | 'health'
  | 'settings';

export interface NavSection {
  title: string;
  items: {
    id: NavTabType;
    label: string;
    icon: React.ElementType;
    badge?: string | number | null;
    adminOnly?: boolean;
  }[];
}

interface SidebarProps {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  activeProjectCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeProjectCode,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'PROJECTS',
      items: [
        { id: 'portfolio', label: 'All Projects', icon: Table },
        { id: 'risk-monitor', label: 'Risk Monitor', icon: AlertTriangle },
        { id: 'early-warnings', label: 'Early Warnings', icon: ShieldAlert },
        {
          id: 'risk',
          label: 'Project Detail',
          icon: FileText,
          badge: activeProjectCode || null
        },
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { id: 'cost-analytics', label: 'Portfolio Analysis', icon: IndianRupee },
        { id: 'driver-analysis', label: 'Risk Drivers', icon: SlidersHorizontal },
        { id: 'schedule-analytics', label: 'Cost & Schedule', icon: Clock },
        { id: 'map', label: 'Map Overview', icon: Map },
        { id: 'dependencies', label: 'Dependencies', icon: Network },
        { id: 'bottlenecks', label: 'Bottlenecks', icon: ListOrdered },
        { id: 'stress-test', label: 'What-If Analysis', icon: Zap },
        { id: 'benchmarking', label: 'Benchmarking', icon: BarChart3 },
        { id: 'compare', label: 'Project Comparison', icon: GitCompare },
      ]
    },
    {
      title: 'EVIDENCE',
      items: [
        { id: 'evidence', label: 'Documents', icon: FileSearch },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'delivery-history', label: 'Delivery Audit', icon: Mail, adminOnly: true },
        { id: 'health', label: 'System Health', icon: ShieldCheck },
        { id: 'alert-history', label: 'Alert History', icon: Bell },
      ]
    }
  ];

  const handleItemClick = (id: NavTabType) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Overlay Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col w-72 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Sidebar Drawer Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="bg-white p-0.5 rounded border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center h-8 w-auto">
              <img 
                src="/nirman-logo.jpeg" 
                alt="Nirman AI Logo" 
                className="h-7 w-auto object-contain" 
              />
            </div>
            <div className="truncate">
              <span className="font-bold text-white tracking-tight text-sm block leading-none">NIRMAN</span>
              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">InfraPredict</span>
            </div>
          </div>

          {/* Close Navigation Menu Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close navigation menu"
            title="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {sections.map((section, idx) => {
            const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {/* Section Header */}
                <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  {section.title}
                </div>

                {/* Items */}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all group relative ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'}`} />

                      <span className="truncate">
                        {item.label}
                      </span>

                      {/* Badge */}
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-800 truncate max-w-[70px]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-slate-400">Risk Platform Online</span>
          </div>
        </div>
      </aside>
    </>
  );
};

