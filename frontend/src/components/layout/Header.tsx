import React, { useState, useEffect } from 'react';
import { Menu, Search, Bot, ShieldCheck, RefreshCw, LogOut, Bell, CheckCheck, ExternalLink, X } from 'lucide-react';
import api from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { InAppNotification } from '../../types/api';

interface HeaderProps {
  onSelectProject: (code: string) => void;
  onToggleAssistant: () => void;
  isAssistantOpen: boolean;
  activeProjectCode: string | null;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectProject,
  onToggleAssistant,
  isAssistantOpen,
  activeProjectCode,
  isSidebarOpen = false,
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<{ status: string; database_status: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchNotifications = () => {
    if (!user) return;
    api.getUnreadNotificationCount()
      .then(count => setUnreadCount(count))
      .catch(() => setUnreadCount(0));

    api.getNotifications()
      .then(data => setNotifications(data))
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    api.getHealth()
      .then((data: any) => setHealth(data))
      .catch(() => setHealth(null));

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [user]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onSelectProject(searchQuery.trim());
    setSearchQuery('');
  };

  const handleMarkAsRead = (id: number) => {
    api.markNotificationAsRead(id).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllRead = () => {
    api.markAllNotificationsAsRead().then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    });
  };

  return (
    <header className="bg-gov-navy text-white border-b border-slate-700 shadow-sm sticky top-0 z-30">
      {/* Top Govt Bar */}
      <div className="bg-slate-950 text-slate-400 text-xs py-1 px-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gov-amber"></span>
          <span className="hidden sm:inline">GOVERNMENT OF INDIA — </span>
          <span>MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION</span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <span className="hidden md:flex items-center gap-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Official Monitoring Portal
          </span>
          {health ? (
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              API Online ({health.database_status})
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Connecting...
            </span>
          )}
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectProject('')}>
            <div className="bg-white p-1 rounded-md border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center h-10 w-auto">
              <img 
                src="/nirman-logo.jpeg" 
                alt="Nirman AI Logo" 
                className="h-8 w-auto object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white leading-none">
                  NIRMAN AI
                </h1>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  InfraPredict v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-normal hidden sm:block">
                Infrastructure Risk Intelligence & Decision Support
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Quick Search */}
        <form onSubmit={handleQuickSearch} className="flex-1 max-w-md mx-2 relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick Jump by Project Code or Name (e.g. 020100044)..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs rounded-md pl-9 pr-16 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded transition flex items-center gap-1"
            >
              Inspect
            </button>
          </div>
        </form>

        {/* Right: Active Context, Notifications, Copilot & User Profile */}
        <div className="flex items-center gap-2.5">
          {activeProjectCode && (
            <div className="hidden xl:flex items-center gap-2 bg-blue-950/80 border border-blue-700/50 px-2.5 py-1 rounded-md text-xs">
              <span className="text-slate-400 text-[11px]">Context:</span>
              <span className="font-mono text-blue-300 font-semibold text-xs">{activeProjectCode}</span>
            </div>
          )}

          {/* Phase 8: Notification Bell & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-1.5 relative rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Risk Alerts & Notifications"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-white">Alert Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No notifications recorded.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition hover:bg-slate-800/50 ${
                          n.status === 'UNREAD' ? 'bg-slate-850 border-l-2 border-amber-500' : 'opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            n.severity === 'CRITICAL'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : n.severity === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {n.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <div className="font-semibold text-white text-xs mb-0.5">{n.title}</div>
                        <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2 mb-2">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                          <button
                            onClick={() => {
                              onSelectProject(n.project_code);
                              setIsNotifOpen(false);
                            }}
                            className="text-blue-400 hover:text-blue-300 font-medium text-[11px] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Inspect {n.project_code}
                          </button>

                          {n.status === 'UNREAD' && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-slate-400 hover:text-emerald-400 text-[10px]"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleAssistant}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition shadow-xs ${
              isAssistantOpen
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Assistant</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>

          {/* User Profile Badge & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow border border-blue-400/40">
                  {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <div className="text-xs font-bold text-slate-100 truncate max-w-[110px]" title={user.full_name}>
                    {user.full_name}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-gov-amber uppercase">
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition"
                title="Sign Out of Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
