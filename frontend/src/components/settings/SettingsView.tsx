import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
  Key,
  Sliders,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Lock,
  Mail,
  UserCheck,
  UserX,
  ShieldCheck,
  Bell,
  Send,
  Zap,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';
import { UserProfile, UserRole } from '../../types/auth';
import { UserNotificationPreferences, NotificationInfrastructureHealth } from '../../types/api';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'preferences' | 'admin'>('account');

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Preferences State
  const [defaultLandingTab, setDefaultLandingTab] = useState<string>(
    localStorage.getItem('nirman_default_tab') || 'overview'
  );
  const [prefSaved, setPrefSaved] = useState(false);

  // Phase 8: Notification Preferences DB State
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSavedSuccess, setNotifSavedSuccess] = useState(false);

  // Admin Email Provider Health & Test Email State
  const [healthInfo, setHealthInfo] = useState<NotificationInfrastructureHealth | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<any | null>(null);

  // Admin User Management State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUname, setNewUname] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFname, setNewFname] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ANALYST');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Fetch preferences & admin data
  useEffect(() => {
    api.getNotificationPreferences()
      .then(data => setNotifPrefs(data))
      .catch(() => setNotifPrefs(null));

    api.getNotificationHealth()
      .then(data => setHealthInfo(data))
      .catch(() => setHealthInfo(null));

    if (user?.role === 'ADMIN' && activeTab === 'admin') {
      loadUsers();
    }
  }, [user, activeTab]);

  const loadUsers = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const data = await api.getUsers();
      setUsersList(data);
    } catch (err: any) {
      setAdminError(err?.response?.data?.detail || "Failed to load user directory.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess(null);
    setPwdError(null);

    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long.");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, confirmPassword);
      setPwdSuccess(res.message || "Password changed successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    if (!notifPrefs) return;
    setNotifSaving(true);
    setNotifSavedSuccess(false);
    try {
      const updated = await api.updateNotificationPreferences(notifPrefs);
      setNotifPrefs(updated);
      setNotifSavedSuccess(true);
      setTimeout(() => setNotifSavedSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save notification preferences.");
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) return;

    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await api.sendTestEmail(testEmailRecipient.trim());
      setTestEmailResult(res);
      api.getNotificationHealth().then(data => setHealthInfo(data)).catch(() => {});
    } catch (err: any) {
      setTestEmailResult({
        message: "Test email execution failed.",
        result: { status: "FAILED", error: err?.response?.data?.detail || "Request failed" }
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('nirman_default_tab', defaultLandingTab);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    if (!newUname.trim() || !newEmail.trim() || !newFname.trim() || !newPwd.trim()) {
      setCreateUserError("All fields are required.");
      return;
    }

    setCreateUserLoading(true);
    try {
      const newUser = await api.createUser({
        username: newUname.trim(),
        email: newEmail.trim(),
        full_name: newFname.trim(),
        password: newPwd,
        role: newRole
      });
      setUsersList([...usersList, newUser]);
      setIsAddUserOpen(false);
      setNewUname('');
      setNewEmail('');
      setNewFname('');
      setNewPwd('');
      setNewRole('ANALYST');
    } catch (err: any) {
      setCreateUserError(err?.response?.data?.detail || "Failed to create user.");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    try {
      const updated = await api.updateUser(targetUser.id, { is_active: !targetUser.is_active });
      setUsersList(usersList.map(u => u.id === targetUser.id ? updated : u));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update user status.");
    }
  };

  const handleRoleChange = async (targetUser: UserProfile, role: UserRole) => {
    try {
      const updated = await api.updateUser(targetUser.id, { role });
      setUsersList(usersList.map(u => u.id === targetUser.id ? updated : u));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update user role.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
              Institutional System &amp; Security Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Manage your authenticated account, change security credentials, configure platform notification preferences, and manage user authorizations.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div>
              <span className="font-bold text-slate-900 block">{user.full_name}</span>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.5 rounded font-mono uppercase">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TAB NAVIGATION BAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'account' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserIcon className="w-4 h-4" /> Account Profile
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'security' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4" /> Security &amp; Password
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'notifications' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-500" /> Notification Preferences
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'preferences' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4" /> Workspace Options
          </button>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition ${
                activeTab === 'admin' ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50' : 'border-transparent hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" /> Admin User Directory
            </button>
          )}
        </div>

        {/* TAB CONTENT BODY */}
        <div className="p-6">
          {/* TAB 1: ACCOUNT PROFILE */}
          {activeTab === 'account' && user && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Account Overview</h2>
                <p className="text-xs text-slate-500">Authenticated user identity parameters registered in PostgreSQL.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Full Name</span>
                  <span className="text-sm font-bold text-slate-900">{user.full_name}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Username</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{user.username}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Email Address</span>
                  <span className="text-sm font-mono font-semibold text-slate-900">{user.email}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Assigned Role</span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono uppercase inline-block">
                    {user.role}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Account Status</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono uppercase inline-block">
                    ACTIVE
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold block">Last Login Timestamp</span>
                  <span className="text-xs font-mono text-slate-700">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Current Session'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-xl">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  Change Account Password
                </h2>
                <p className="text-xs text-slate-500">
                  Backend-enforced password update. Current password verification is mandatory before updating bcrypt hash.
                </p>
              </div>

              {pwdSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              {pwdError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Password (Min 6 chars)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {pwdLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: PHASE 8 NOTIFICATION PREFERENCES & ADMIN DIAGNOSTICS */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 max-w-3xl">
              {/* Notification Preferences Section */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Notification Preferences (Database Persisted)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure alert delivery channels and severity filters for your account.
                  </p>
                </div>

                {notifSavedSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Notification preferences successfully updated and saved in database.</span>
                  </div>
                )}

                {notifPrefs && (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={notifPrefs.in_app_enabled}
                          onChange={e => setNotifPrefs({ ...notifPrefs, in_app_enabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">In-App Notifications</span>
                          <span className="text-[11px] text-slate-500">Show live alerts in Header bell popover</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={notifPrefs.email_enabled}
                          onChange={e => setNotifPrefs({ ...notifPrefs, email_enabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">Email Alerts</span>
                          <span className="text-[11px] text-slate-500">Receive formatted email notifications</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={notifPrefs.cost_alerts_enabled}
                          onChange={e => setNotifPrefs({ ...notifPrefs, cost_alerts_enabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">Cost Overrun Alerts</span>
                          <span className="text-[11px] text-slate-500">Notify on cost expansion ratio &gt;= 1.25x</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={notifPrefs.schedule_alerts_enabled}
                          onChange={e => setNotifPrefs({ ...notifPrefs, schedule_alerts_enabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">Schedule Delay Alerts</span>
                          <span className="text-[11px] text-slate-500">Notify on project delay &gt;= 6 months</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={notifPrefs.critical_alerts_only}
                          onChange={e => setNotifPrefs({ ...notifPrefs, critical_alerts_only: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">Filter Non-Critical Alerts</span>
                          <span className="text-[11px] text-slate-500">Only dispatch CRITICAL severity risk alerts</span>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={handleSaveNotificationPreferences}
                      disabled={notifSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {notifSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Save Notification Preferences
                    </button>
                  </div>
                )}
              </div>

              {/* ADMIN ONLY: Email Infrastructure Status & Controlled Test Email */}
              {user?.role === 'ADMIN' && (
                <div className="space-y-4 border-t border-slate-200 pt-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      Email Provider &amp; Infrastructure Health
                    </h3>
                    <p className="text-xs text-slate-500">
                      Operational SMTP status monitoring and controlled diagnostic email testing.
                    </p>
                  </div>

                  {healthInfo && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-mono block">Provider</span>
                          <span className="text-sm font-bold text-slate-900">{healthInfo.email_service.provider}</span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-mono block">Status</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono uppercase inline-block ${
                            healthInfo.email_service.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {healthInfo.email_service.configured ? 'CONFIGURED / READY' : 'NOT CONFIGURED'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-mono block">SMTP Host</span>
                          <span className="text-xs font-mono text-slate-800">{healthInfo.email_service.smtp_host}</span>
                        </div>
                      </div>

                      {!healthInfo.email_service.configured && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">SMTP Delivery Unconfigured</span>
                            <span className="text-[11px] text-amber-800">
                              SMTP email delivery is not configured. Configure the required SMTP environment variables on the backend.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Diagnostic Test Email Form */}
                  <form onSubmit={handleSendTestEmail} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                    <div className="font-bold text-slate-900">Send Diagnostic Test Email</div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={testEmailRecipient}
                        onChange={e => setTestEmailRecipient(e.target.value)}
                        placeholder="Recipient email address (e.g. admin@nirman.gov.in)..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={testEmailLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {testEmailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Send Test Email</span>
                      </button>
                    </div>

                    {testEmailResult && (
                      <div className={`p-3 rounded-lg border text-xs ${
                        testEmailResult.result?.status === 'SENT'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : testEmailResult.result?.status === 'NOT_CONFIGURED'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}>
                        <div className="font-bold">Provider Status: {testEmailResult.result?.status}</div>
                        <div className="text-[11px] font-mono mt-0.5">
                          {testEmailResult.result?.error || testEmailResult.result?.note || testEmailResult.message || "Message processed by provider."}
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WORKSPACE OPTIONS */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-xl">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">User Platform Preferences</h2>
                <p className="text-xs text-slate-500">Configure client landing tab and surveillance workspace options.</p>
              </div>

              {prefSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Preferences saved successfully.</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Workspace View on Sign In</label>
                  <select
                    value={defaultLandingTab}
                    onChange={(e) => setDefaultLandingTab(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="overview">Executive Overview</option>
                    <option value="portfolio">Portfolio Explorer</option>
                    <option value="risk-monitor">Risk Monitor</option>
                    <option value="early-warnings">Early Warnings Alert Stream</option>
                    <option value="alert-history">Institutional Alert History</option>
                    <option value="cost-analytics">Cost Overrun Analytics</option>
                    <option value="schedule-analytics">Schedule Analytics</option>
                    <option value="benchmarking">Institutional Benchmarking</option>
                    <option value="driver-analysis">TreeSHAP Driver Analysis</option>
                    <option value="map">Geographic GIS Risk Map</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ADMIN USER MANAGEMENT */}
          {activeTab === 'admin' && user?.role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Platform User Directory &amp; RBAC Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Admin control panel to view registered users, assign role permissions (ADMIN, DECISION_MAKER, ANALYST), or toggle active status.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add New User
                </button>
              </div>

              {adminError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              {/* Users Directory Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 font-semibold">
                      <th className="py-3 px-3 w-12">ID</th>
                      <th className="py-3 px-3">Username &amp; Email</th>
                      <th className="py-3 px-3">Full Name</th>
                      <th className="py-3 px-3">Role Permission</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin text-purple-600 inline mr-2" />
                          Loading platform users...
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500">#{u.id}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{u.username}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{u.full_name}</td>
                          <td className="py-2.5 px-3">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className="bg-slate-50 border border-slate-300 text-xs font-bold text-blue-700 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="DECISION_MAKER">DECISION_MAKER</option>
                              <option value="ANALYST">ANALYST</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={u.id === user.id} // Cannot deactivate self
                              className={`px-2.5 py-1 text-[11px] font-bold rounded transition ${
                                u.is_active
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-40'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                Register New User Account
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createUserError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUname}
                  onChange={(e) => setNewUname(e.target.value)}
                  placeholder="e.g. sarthak_analyst"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. sarthak@nirman.gov.in"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Display Name</label>
                <input
                  type="text"
                  required
                  value={newFname}
                  onChange={(e) => setNewFname(e.target.value)}
                  placeholder="e.g. Sarthak Khedekar"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-bold text-blue-700"
                >
                  <option value="ANALYST">ANALYST</option>
                  <option value="DECISION_MAKER">DECISION_MAKER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                >
                  {createUserLoading ? "Creating..." : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
