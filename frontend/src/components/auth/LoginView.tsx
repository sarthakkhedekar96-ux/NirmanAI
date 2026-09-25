import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, RefreshCw, AlertTriangle, Shield, Activity, CheckCircle2, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onNavigateLanding?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigateLanding }) => {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError("Please enter both username/email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(usernameOrEmail.trim(), password);
    } catch (err: any) {
      console.error("Login failed:", err);
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err?.message === 'Network Error' || !err?.response) {
        setError("Unable to connect to the authentication service. Please check your backend connection.");
      } else {
        setError("Invalid username or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (uname: string, pwd: string, roleTitle: string) => {
    setUsernameOrEmail(uname);
    setPassword(pwd);
    setActiveDemoRole(roleTitle);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* =================================================== */}
      {/* LEFT SIDE — NIRMAN AI BRAND & VISUAL INTELLIGENCE PANEL */}
      {/* =================================================== */}
      <div className="w-full lg:w-1/2 bg-[#F8FAFC] border-b lg:border-b-0 lg:border-r border-slate-200/80 p-6 sm:p-10 lg:p-12 flex flex-col justify-between min-h-[520px] lg:min-h-screen relative overflow-hidden">
        
        {/* Subtle Background Mesh Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        {/* Top Brand Header */}
        <div className="z-10 space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src="/nirman-logo.jpeg" 
              alt="NIRMAN AI Logo" 
              className="h-16 sm:h-20 w-auto object-contain rounded-lg shadow-xs" 
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              NIRMAN AI
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-blue-700 uppercase tracking-wider font-mono">
              Infrastructure Risk Intelligence &amp; Decision Support
            </p>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed pt-1">
              AI-powered infrastructure monitoring, risk intelligence and decision support across monitored capital project portfolios.
            </p>
          </div>
        </div>

        {/* Center Interactive Hero Animation Layer */}
        <div className="z-10 my-4 py-2 flex flex-col items-center justify-center w-full">
          <style>{`
            @keyframes pulseGlow {
              0%, 100% { transform: scale(1); opacity: 0.85; filter: drop-shadow(0 0 16px rgba(6, 182, 212, 0.45)); }
              50% { transform: scale(1.04); opacity: 1; filter: drop-shadow(0 0 28px rgba(29, 78, 216, 0.7)); }
            }
            @keyframes radarSweep {
              0% { transform: scale(0.6); opacity: 0.9; }
              100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes dashFlowForward {
              to { stroke-dashoffset: -120; }
            }
            @keyframes dashFlowReverse {
              to { stroke-dashoffset: 120; }
            }
            @keyframes orbitSlow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes blinkAlert {
              0%, 100% { opacity: 0.35; transform: scale(0.95); }
              50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8)); }
            }
            @keyframes pingAmber {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.75)); }
            }
            @keyframes floatSubtle {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
            }

            .animate-core {
              animation: pulseGlow 3.5s ease-in-out infinite;
              transform-origin: 50% 50%;
            }
            .flow-line {
              stroke-dasharray: 6 10;
              animation: dashFlowForward 2.4s linear infinite;
            }
            .flow-line-fast {
              stroke-dasharray: 4 8;
              animation: dashFlowForward 1.6s linear infinite;
            }
            .flow-line-reverse {
              stroke-dasharray: 5 9;
              animation: dashFlowReverse 2s linear infinite;
            }
            .radar-ring {
              animation: radarSweep 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
              transform-origin: center;
            }
            .radar-ring-delay-1 {
              animation: radarSweep 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 0.9s;
              transform-origin: center;
            }
            .radar-ring-delay-2 {
              animation: radarSweep 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 1.8s;
              transform-origin: center;
            }
            .alert-beacon {
              animation: blinkAlert 1.6s ease-in-out infinite;
              transform-origin: center;
            }
            .amber-beacon {
              animation: pingAmber 2.2s ease-in-out infinite;
              transform-origin: center;
            }
            .orbiting {
              animation: orbitSlow 14s linear infinite;
              transform-origin: center;
            }
            .floating-hud {
              animation: floatSubtle 4s ease-in-out infinite;
            }
          `}</style>

          <div className="relative w-full max-w-4xl bg-[#F8FAFC] overflow-hidden shadow-lg rounded-2xl border border-slate-200 aspect-[16/9] flex items-center justify-center">
            {/* Base High-Resolution Illustration */}
            <img 
              src="/infrastructure-hero.png" 
              alt="NIRMAN AI Central Infrastructure Intelligence" 
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
              onError={(e) => {
                // Fallback to Google CDN URL if local asset missing
                (e.target as HTMLImageElement).src = "https://lh3.googleusercontent.com/aida/AEtjO1VoMtdpA9Cxzby8zQ5-m5Y1_Oy7A-Ew7bfRm8aADD8PuN29c3imwTORgGiTuDbGsh_ZlcrO2vkz9s2ICKHN3NBSGNc8DdzOxOzYA9078Pc9j-rajBDaTWvxN8W6MYRsZdhtb_AEB14r_dHIdUtM9lrJ3GrraRO_0ScrvqAnOvSGihLyzI69953qNXIuQA2mhib3AvrbQXEzFGnCW6z8vU36g4FdwZoqyrd27emkSobiK_0n1nVRJKmVdA";
              }}
            />

            {/* Subtle Enterprise Grid Ambient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-slate-900/5 pointer-events-none" />

            {/* Scaled SVG Animation Layer mapped 1:1 on 1376 x 768 coordinate space */}
            <svg viewBox="0 0 1376 768" className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="cyanCoreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9"/>
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.2"/>
                </linearGradient>

                <linearGradient id="railBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0"/>
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.95"/>
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0"/>
                </linearGradient>

                <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* ================= 1. CENTRAL AI INTELLIGENCE HUB PULSES ================= */}
              <g transform="translate(688, 396)">
                <circle cx="0" cy="0" r="42" fill="none" stroke="#06B6D4" strokeWidth="2" className="radar-ring" opacity="0.8"/>
                <circle cx="0" cy="0" r="42" fill="none" stroke="#2563EB" strokeWidth="1.8" className="radar-ring-delay-1" opacity="0.7"/>
                <circle cx="0" cy="0" r="42" fill="none" stroke="#0D9488" strokeWidth="1.5" className="radar-ring-delay-2" opacity="0.5"/>

                <ellipse cx="0" cy="-3" rx="55" ry="32" fill="url(#cyanCoreGlow)" className="animate-core" opacity="0.35"/>
                <circle cx="0" cy="-6" r="28" fill="#0EA5E9" opacity="0.2" className="animate-core" filter="url(#intenseGlow)"/>

                <g className="orbiting" style={{ animationDuration: '22s' }}>
                  <ellipse cx="0" cy="-6" rx="88" ry="46" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="8 14" opacity="0.6"/>
                  <circle cx="88" cy="-6" r="3.5" fill="#38BDF8" filter="url(#softGlow)"/>
                  <circle cx="-88" cy="-6" r="2.5" fill="#06B6D4" opacity="0.8"/>
                </g>
              </g>

              {/* ================= 2. DYNAMIC TELEMETRY & DATA CIRCUIT FLOW LINES ================= */}
              <path d="M 640 380 C 560 360, 480 340, 390 310 L 290 280" fill="none" stroke="#06B6D4" strokeWidth="2.5" className="flow-line" filter="url(#softGlow)"/>
              <circle cx="510" cy="348" r="3" fill="#38BDF8" className="alert-beacon"/>

              <path d="M 645 420 C 550 440, 430 460, 340 520 L 190 610" fill="none" stroke="#0D9488" strokeWidth="2" className="flow-line-reverse"/>
              <circle cx="430" cy="460" r="2.5" fill="#2DD4BF"/>

              <path d="M 670 445 C 640 490, 580 540, 485 580" fill="none" stroke="#2563EB" strokeWidth="2.2" className="flow-line-fast"/>
              <circle cx="580" cy="540" r="3" fill="#60A5FA"/>

              <path d="M 740 375 C 820 330, 890 280, 970 230" fill="none" stroke="#0EA5E9" strokeWidth="2" className="flow-line"/>

              <path d="M 750 405 C 850 420, 950 460, 1080 520 L 1220 590" fill="none" stroke="#0284C7" strokeWidth="2.4" className="flow-line-fast" filter="url(#softGlow)"/>

              <path d="M 720 440 C 780 490, 890 560, 960 620 L 1050 670" fill="none" stroke="#0D9488" strokeWidth="2" className="flow-line-reverse"/>

              <path d="M 688 340 L 688 240 L 670 200" fill="none" stroke="#06B6D4" strokeWidth="2" className="flow-line"/>

              {/* ================= 3. TRANSIT & INFRASTRUCTURE DATA PACKET COMMUTES ================= */}
              <circle r="4.5" fill="#38BDF8" filter="url(#intenseGlow)">
                <animateMotion path="M 120 150 L 520 380" dur="4.2s" repeatCount="indefinite" />
              </circle>
              <circle r="3.5" fill="#FFFFFF">
                <animateMotion path="M 520 380 L 120 150" dur="4.8s" repeatCount="indefinite" />
              </circle>

              <g filter="url(#softGlow)">
                <rect width="18" height="5" rx="2.5" fill="#38BDF8">
                  <animateMotion path="M 850 250 L 1320 470" dur="3.6s" repeatCount="indefinite" rotate="auto" />
                </rect>
              </g>
              <g filter="url(#softGlow)">
                <rect width="18" height="5" rx="2.5" fill="#0D9488">
                  <animateMotion path="M 1320 620 L 780 390" dur="4.4s" repeatCount="indefinite" rotate="auto" />
                </rect>
              </g>

              <circle r="4" fill="#06B6D4" filter="url(#softGlow)">
                <animateMotion path="M 850 590 L 1240 760" dur="3.2s" repeatCount="indefinite" />
              </circle>

              {/* ================= 4. PRECISION RISK RADARS & TELEMETRY BEACONS ================= */}
              <g transform="translate(245, 435)">
                <circle cx="0" cy="0" r="14" fill="none" stroke="#F59E0B" strokeWidth="1.8" className="radar-ring" opacity="0.8"/>
                <circle cx="0" cy="0" r="4.5" fill="#F59E0B" className="amber-beacon"/>
              </g>

              <g transform="translate(680, 642)">
                <circle cx="0" cy="0" r="16" fill="none" stroke="#EF4444" strokeWidth="2" className="radar-ring" opacity="0.85"/>
                <circle cx="0" cy="0" r="16" fill="none" stroke="#EF4444" strokeWidth="1.5" className="radar-ring-delay-1" opacity="0.6"/>
                <circle cx="0" cy="0" r="5" fill="#EF4444" className="alert-beacon"/>
              </g>

              <g transform="translate(1088, 108)">
                <circle cx="0" cy="0" r="15" fill="none" stroke="#F59E0B" strokeWidth="1.8" className="radar-ring-delay-2" opacity="0.8"/>
                <circle cx="0" cy="0" r="4.5" fill="#F59E0B" className="amber-beacon"/>
              </g>

              <g transform="translate(422, 608)">
                <circle cx="0" cy="0" r="12" fill="none" stroke="#0D9488" strokeWidth="1.5" className="radar-ring"/>
                <circle cx="0" cy="0" r="3.5" fill="#14B8A6"/>
              </g>

              <g transform="translate(306, 172)">
                <circle cx="0" cy="0" r="14" fill="none" stroke="#38BDF8" strokeWidth="1.6" className="radar-ring-delay-1"/>
                <circle cx="0" cy="0" r="4" fill="#38BDF8" filter="url(#softGlow)"/>
              </g>

              {/* ================= 5. FLOATING HUD MICRO-METRICS & SATELLITE BEAMS ================= */}
              <g transform="translate(922, 85)" className="floating-hud">
                <path d="M 0 0 L 25 35" stroke="#0EA5E9" strokeWidth="1.5" strokeDasharray="3 3" className="flow-line"/>
                <circle cx="0" cy="0" r="3" fill="#0EA5E9" filter="url(#softGlow)"/>
                <path d="M -15 -10 A 24 24 0 0 1 20 15" fill="none" stroke="#38BDF8" strokeWidth="1.5" opacity="0.7"/>
              </g>

              <g transform="translate(230, 88)" className="floating-hud">
                <circle cx="0" cy="0" r="22" fill="none" stroke="#E2E8F0" strokeWidth="3" opacity="0.7"/>
                <circle cx="0" cy="0" r="22" fill="none" stroke="#06B6D4" strokeWidth="3.2" strokeDasharray="138" strokeDashoffset="40" strokeLinecap="round" className="orbiting" style={{ animationDuration: '9s', transformOrigin: '0px 0px' }}/>
                <circle cx="0" cy="0" r="2" fill="#0284C7"/>
              </g>

              <g transform="translate(1088, 396)" className="floating-hud" style={{ animationDelay: '1.5s' }}>
                <g>
                  <line x1="0" y1="0" x2="16" y2="-12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" values="-20 0 0; 30 0 0; 5 0 0; -20 0 0" dur="4s" repeatCount="indefinite" />
                  </line>
                  <circle cx="0" cy="0" r="3" fill="#0F172A"/>
                </g>
              </g>
            </svg>

            {/* Top Badge - Enterprise HUD Status Indicator */}
            <div className="absolute top-3 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-xs z-20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-600"></span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-slate-700">Live Infrastructure Risk Telemetry</span>
              <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded border border-slate-200">ACTIVE</span>
            </div>

            {/* Bottom Metrics Pill */}
            <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs z-20">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-slate-600">Grid: <strong className="text-slate-900 font-semibold">99.4%</strong></span>
              </div>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-600">Corridor Risk: <strong className="text-amber-700 font-semibold">Low-Mod</strong></span>
              </div>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-[11px] font-medium text-slate-600">AI Latency: <strong className="text-slate-900 font-semibold font-mono">14ms</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators & Left Footer */}
        <div className="z-10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 text-xs">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-800 text-[11px]">PROJECT INTELLIGENCE</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 text-xs">
              <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-800 text-[11px]">RISK MONITORING</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="font-semibold text-slate-800 text-[11px]">DECISION SUPPORT</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>NIRMAN AI • Infrastructure Risk Platform</span>
            <span>v2.0 Enterprise</span>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* RIGHT SIDE — SECURE LOGIN FORM PANEL */}
      {/* =================================================== */}
      <div className="w-full lg:w-1/2 bg-white p-6 sm:p-12 lg:p-16 flex flex-col justify-between min-h-[500px] lg:min-h-screen">
        
        {/* Empty Spacer Top for Vertical Balance on Desktop */}
        <div className="hidden lg:block" />

        <div className="w-full max-w-[440px] mx-auto space-y-6 my-auto">
          
          {/* Header & Subtitle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Secure Access
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Authorized users only. Sign in to access infrastructure risk intelligence and decision-support tools.
            </p>

            {/* Security Status Chips */}
            <div className="flex items-center gap-2 pt-2">
              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" /> SECURE CONNECTION
              </span>
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> SESSION PROTECTED
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeDemoRole && !error && (
              <div className="p-3 bg-cyan-50 border border-cyan-300 rounded-lg text-cyan-950 text-xs flex items-center gap-2.5 animate-in fade-in shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="font-semibold">
                  Demo credentials loaded for <strong className="text-slate-950 font-bold">{activeDemoRole}</strong>. Click <span className="underline decoration-cyan-400 font-bold">SIGN IN</span> below to continue.
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Username / Email Input */}
            <div>
              <label htmlFor="username-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="username-input"
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => {
                    setUsernameOrEmail(e.target.value);
                  }}
                  placeholder="admin@nirman.gov.in or admin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium transition placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 text-slate-900 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium transition placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gov-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Identity...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>SIGN IN TO SURVEILLANCE PORTAL</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Institutional Demo Role Shortcuts */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 tracking-wide font-mono uppercase">
                Demo Role Quick Shortcuts:
              </span>
              <span className="text-[9px] text-cyan-800 font-bold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded font-mono">
                ONE-CLICK AUTOFILL
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Select a demo role to automatically load the corresponding credentials.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin', 'NirmanAdmin@2026', 'Administrator')}
                className={`p-2.5 border rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-1 shadow-2xs group ${
                  activeDemoRole === 'Administrator'
                    ? 'bg-cyan-50/90 border-cyan-500 ring-2 ring-cyan-400/20'
                    : 'bg-slate-50/80 hover:bg-cyan-50/40 border-slate-200 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 group-hover:text-cyan-700 transition">ADMIN</span>
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">DEMO</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800">Administrator Demo</div>
                <div className="text-[10px] text-slate-500 group-hover:text-cyan-700 transition pt-0.5">
                  Click to load demo credentials
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('analyst', 'NirmanAnalyst@2026', 'Analyst')}
                className={`p-2.5 border rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-1 shadow-2xs group ${
                  activeDemoRole === 'Analyst'
                    ? 'bg-cyan-50/90 border-cyan-500 ring-2 ring-cyan-400/20'
                    : 'bg-slate-50/80 hover:bg-cyan-50/40 border-slate-200 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-900 group-hover:text-cyan-700 transition">ANALYST</span>
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">DEMO</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800">Analyst Demo</div>
                <div className="text-[10px] text-slate-500 group-hover:text-cyan-700 transition pt-0.5">
                  Click to load demo credentials
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('decision_maker', 'NirmanDecision@2026', 'Decision Maker')}
                className={`p-2.5 border rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-1 shadow-2xs group ${
                  activeDemoRole === 'Decision Maker'
                    ? 'bg-cyan-50/90 border-cyan-500 ring-2 ring-cyan-400/20'
                    : 'bg-slate-50/80 hover:bg-cyan-50/40 border-slate-200 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-900 group-hover:text-cyan-700 transition">DECISION</span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">DEMO</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800">Decision Maker Demo</div>
                <div className="text-[10px] text-slate-500 group-hover:text-cyan-700 transition pt-0.5">
                  Click to load demo credentials
                </div>
              </button>
            </div>
          </div>

          {onNavigateLanding && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={onNavigateLanding}
                className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs w-full justify-center"
              >
                <Globe className="w-4 h-4 text-cyan-600" />
                <span>Explore Public Project Monitoring Portal</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Footer Notice */}
        <div className="pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            AUTHORIZED ACCESS IS RESTRICTED AND MONITORED.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
