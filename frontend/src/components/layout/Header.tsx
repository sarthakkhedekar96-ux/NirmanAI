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
    <header className="bg-gradient-to-r from-[#e5f4fd] via-[#f0f8fd] to-[#e7f4fd] text-slate-900 border-b-2 border-cyan-300/80 shadow-md sticky top-0 z-30 backdrop-blur-md">
      {/* Top Govt Bar (Kept Dark Navy) */}
      <div className="bg-[#041321] text-cyan-200/90 text-xs py-1 px-4 flex justify-between items-center border-b border-cyan-900/80">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-2xs"></span>
          <span className="hidden sm:inline font-extrabold tracking-wider text-cyan-100">GOVERNMENT OF INDIA — </span>
          <span className="font-semibold">MINISTRY OF STATISTICS &amp; PROGRAMME IMPLEMENTATION</span>
        </div>
        <div className="flex items-center gap-4 text-cyan-200">
          <span className="hidden md:flex items-center gap-1 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
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

      {/* Main Header Container (Brighter Light Cyan Prototype Theme) */}
      <div className="max-w-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-700 hover:text-cyan-950 hover:bg-cyan-100/70 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectProject('')}>
            <div className="bg-white p-1 rounded-lg border border-cyan-300/90 shadow-2xs shrink-0 flex items-center justify-center h-10 w-auto">
              <img 
                src="/nirman-logo.jpeg" 
                alt="Nirman AI Logo" 
                className="h-8 w-auto object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-[#071D2F] leading-none">
                  NIRMAN AI
                </h1>
                <span className="bg-cyan-100/90 text-cyan-900 border border-cyan-300 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  InfraPredict v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-normal hidden sm:block">
                Infrastructure Risk Intelligence &amp; Decision Support
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
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-16 py-1.5 border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-white transition"
            />
            <Search className="w-3.5 h-3.5 text-cyan-600 absolute left-3 top-2.5" />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-[11px] font-medium rounded-md transition flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              Inspect
            </button>
          </div>
        </form>

        {/* Right: Active Context, Notifications, Copilot & User Profile */}
        <div className="flex items-center gap-2.5">
          {activeProjectCode && (
            <div className="hidden xl:flex items-center gap-2 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-md text-xs">
              <span className="text-slate-500 text-[11px]">Context:</span>
              <span className="font-mono text-cyan-800 font-semibold text-xs">{activeProjectCode}</span>
            </div>
          )}

          {/* Notification Bell & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-1.5 relative rounded-lg bg-slate-50 hover:bg-cyan-50 text-slate-700 border border-cyan-200 transition cursor-pointer"
              title="Risk Alerts & Notifications"
            >
              <Bell className="w-4 h-4 text-cyan-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-cyan-100 rounded-xl shadow-2xl z-50 text-slate-900 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 bg-gradient-to-r from-cyan-600 to-blue-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-300" />
                    <span className="font-bold text-xs text-white">Alert Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-white/20 text-white border border-white/30 text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-cyan-100 hover:text-white flex items-center gap-1 font-medium transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setIsNotifOpen(false)} className="text-cyan-100 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-cyan-50 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No notifications recorded.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition hover:bg-cyan-50/50 ${
                          n.status === 'UNREAD' ? 'bg-cyan-50/30 border-l-2 border-amber-500' : 'opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            n.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : n.severity === 'HIGH'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                          }`}>
                            {n.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-900 text-xs mb-0.5">{n.title}</div>
                        <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 mb-2">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-cyan-50">
                          <button
                            onClick={() => {
                              onSelectProject(n.project_code);
                              setIsNotifOpen(false);
                            }}
                            className="text-cyan-700 hover:text-cyan-900 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Inspect {n.project_code}
                          </button>

                          {n.status === 'UNREAD' && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-slate-400 hover:text-emerald-600 text-[10px] cursor-pointer"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-xs cursor-pointer ${
              isAssistantOpen
                ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-cyan-500/20'
                : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Assistant</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>

          {/* User Profile Badge & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-cyan-100">
              <div className="hidden lg:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                  {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[110px]" title={user.full_name}>
                    {user.full_name}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-cyan-700 uppercase">
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
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
