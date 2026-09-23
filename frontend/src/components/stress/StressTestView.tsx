import React, { useState, useEffect } from 'react';
import { Sliders, Zap, AlertTriangle, CheckCircle2, RefreshCw, Layers, Clock, DollarSign, Activity, ShieldAlert } from 'lucide-react';
import api from '../../services/apiClient';

interface ScenarioChanges {
  additional_delay_months: number;
  cost_overrun_percent: number;
  rainfall_multiplier: number;
  wind_multiplier: number;
  temperature_delta_c: number;
  clearance_delay_months: number;
  dependency_disruption: boolean;
}

interface SimulationResponse {
  simulation: boolean;
  project_code: string;
  scenario_name: string;
  baseline: {
    risk_score: number;
    risk_category: string;
    predicted_severe_risk_prob: number;
    early_warning: boolean;
    cost_overrun_percent: number;
    delay_months: number;
    physical_progress: number;
    environmental_severity: string;
    contextual_priority: string;
    coordination_bottleneck_indicator: boolean;
  };
  scenario: {
    risk_score: number;
    risk_category: string;
    predicted_severe_risk_prob: number;
    scenario_early_warning: boolean;
    simulated_cost_overrun_percent: number;
    simulated_delay_months: number;
    environmental_severity: string;
    contextual_priority: string;
    coordination_bottleneck_indicator: boolean;
    weather_observation?: any;
    advice?: any;
    dependency_notes?: string[];
  };
  impact: {
    risk_score_delta: number;
    probability_delta: number;
    category_changed: boolean;
    early_warning_changed: boolean;
    severity_changed: boolean;
    summary_bullets: string[];
  };
  method: {
    risk: string;
    environment: string;
    dependencies: string;
  };
  disclaimer: string;
}

interface StressTestViewProps {
  onSelectProject?: (code: string) => void;
  initialProjectCode?: string | null;
  onOpenAssistant?: (query?: string) => void;
}

const SCENARIO_PRESETS: Record<string, { scenario_name: string; description: string; params: ScenarioChanges }> = {
  BASELINE: {
    scenario_name: 'Baseline',
    description: 'No changes — project current status.',
    params: { additional_delay_months: 0, cost_overrun_percent: 0, rainfall_multiplier: 1.0, wind_multiplier: 1.0, temperature_delta_c: 0, clearance_delay_months: 0, dependency_disruption: false }
  },
  COST_PRESSURE: {
    scenario_name: 'Cost Pressure (+10%)',
    description: '+10% cost overrun pressure.',
    params: { additional_delay_months: 0, cost_overrun_percent: 10.0, rainfall_multiplier: 1.0, wind_multiplier: 1.0, temperature_delta_c: 0, clearance_delay_months: 0, dependency_disruption: false }
  },
  SCHEDULE_SLIP: {
    scenario_name: 'Schedule Delay (+6 mo)',
    description: '+6 months execution delay.',
    params: { additional_delay_months: 6.0, cost_overrun_percent: 0, rainfall_multiplier: 1.0, wind_multiplier: 1.0, temperature_delta_c: 0, clearance_delay_months: 0, dependency_disruption: false }
  },
  EXTREME_WEATHER: {
    scenario_name: 'Weather Surge (2.5x rain)',
    description: '2.5x rainfall & +5°C surge.',
    params: { additional_delay_months: 0, cost_overrun_percent: 0, rainfall_multiplier: 2.5, wind_multiplier: 1.0, temperature_delta_c: 5.0, clearance_delay_months: 0, dependency_disruption: false }
  },
  COMBINED_STRESS: {
    scenario_name: 'Combined Stress Scenario',
    description: 'Compound financial, schedule, weather & clearance stress.',
    params: { additional_delay_months: 6.0, cost_overrun_percent: 10.0, rainfall_multiplier: 1.5, wind_multiplier: 1.0, temperature_delta_c: 0, clearance_delay_months: 3.0, dependency_disruption: true }
  }
};

export const StressTestView: React.FC<StressTestViewProps> = ({
  initialProjectCode
}) => {
  const [projectCode, setProjectCode] = useState<string>(initialProjectCode || '020100044');
  const [inputCode, setInputCode] = useState<string>(initialProjectCode || '020100044');
  const [selectedPreset, setSelectedPreset] = useState<string>('COMBINED_STRESS');
  const [loading, setLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);

  // Form parameters
  const [additionalDelay, setAdditionalDelay] = useState<number>(6.0);
  const [costOverrunPct, setCostOverrunPct] = useState<number>(10.0);
  const [rainfallMult, setRainfallMult] = useState<number>(1.5);
  const [tempDelta, setTempDelta] = useState<number>(0.0);
  const [clearanceDelay, setClearanceDelay] = useState<number>(3.0);
  const [dependencyDisruption, setDependencyDisruption] = useState<boolean>(true);

  useEffect(() => {
    if (projectCode) {
      runSimulationWithParams(projectCode, selectedPreset, {
        additional_delay_months: additionalDelay,
        cost_overrun_percent: costOverrunPct,
        rainfall_multiplier: rainfallMult,
        wind_multiplier: 1.0,
        temperature_delta_c: tempDelta,
        clearance_delay_months: clearanceDelay,
        dependency_disruption: dependencyDisruption
      });
    }
  }, [projectCode]);

  const runSimulationWithParams = async (targetProject: string, presetName: string, params: ScenarioChanges) => {
    setLoading(true);
    try {
      const payload = {
        scenario_name: presetName,
        changes: params
      };

      const data = await api.runStressTest(targetProject, payload);
      setSimResult(data);
    } catch (err) {
      console.error('Error running stress simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const targetParams = SCENARIO_PRESETS[presetKey]?.params || SCENARIO_PRESETS['COMBINED_STRESS'].params;

    setAdditionalDelay(targetParams.additional_delay_months);
    setCostOverrunPct(targetParams.cost_overrun_percent);
    setRainfallMult(targetParams.rainfall_multiplier);
    setTempDelta(targetParams.temperature_delta_c);
    setClearanceDelay(targetParams.clearance_delay_months);
    setDependencyDisruption(targetParams.dependency_disruption);

    runSimulationWithParams(projectCode, presetKey, targetParams);
  };

  const handleLoadProject = () => {
    const cleanCode = inputCode.trim();
    if (cleanCode) {
      setSimResult(null);
      setProjectCode(cleanCode);
    }
  };

  const getRiskBadgeClass = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'CRITICAL': return 'badge-risk-critical';
      case 'HIGH': return 'badge-risk-high';
      case 'MODERATE': return 'badge-risk-moderate';
      default: return 'badge-risk-low';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            What-If Scenario Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate hypothetical cost pressure, schedule delay, rainfall surge, and clearance disruptions
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold uppercase">Project Code:</span>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="e.g. 020100044"
            className="bg-slate-50 text-slate-900 border border-slate-300 rounded px-2.5 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
          />
          <button
            onClick={handleLoadProject}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
          >
            Load
          </button>
        </div>
      </div>

      {/* PROMINENT MANDATORY SIMULATION DISCLAIMER BANNER */}
      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-4 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-amber-900 block">SYNTHETIC SCENARIO — NOT ACTUAL PROJECT DATA</span>
          <p className="text-amber-800">
            This interactive simulator modifies project inputs in memory only for scenario analysis.
            Production database records, baseline ML risk scores, environmental observations, and dependency links remain 100% unaltered.
          </p>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="enterprise-card space-y-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Simulation Presets</span>
        <div className="flex flex-wrap gap-2">
          {Object.keys(SCENARIO_PRESETS).map((key) => {
            const preset = SCENARIO_PRESETS[key];
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title={preset.description}
              >
                {preset.scenario_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Controls & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel (5 cols) */}
        <div className="lg:col-span-5 enterprise-card space-y-4">
          <div className="enterprise-card-header">
            <h3 className="enterprise-title flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" /> Scenario Controls
            </h3>
            <button
              onClick={() => applyPreset('BASELINE')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Reset Baseline
            </button>
          </div>

          {/* Cost overrun slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700">Cost Overrun Pressure (+%)</span>
              <span className="font-mono text-red-700 font-bold">+{costOverrunPct}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="1"
              value={costOverrunPct}
              onChange={(e) => { setCostOverrunPct(Number(e.target.value)); setSelectedPreset('CUSTOM'); }}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Additional delay slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700">Additional Delay (+months)</span>
              <span className="font-mono text-amber-700 font-bold">+{additionalDelay} mo</span>
            </div>
            <input
              type="range" min="0" max="36" step="1"
              value={additionalDelay}
              onChange={(e) => { setAdditionalDelay(Number(e.target.value)); setSelectedPreset('CUSTOM'); }}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Rainfall multiplier */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700">Rainfall Multiplier (x)</span>
              <span className="font-mono text-blue-700 font-bold">{rainfallMult}×</span>
            </div>
            <input
              type="range" min="0.5" max="5.0" step="0.1"
              value={rainfallMult}
              onChange={(e) => { setRainfallMult(Number(e.target.value)); setSelectedPreset('CUSTOM'); }}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Temperature Delta */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700">Temperature Delta (°C)</span>
              <span className="font-mono text-slate-800 font-bold">{tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C</span>
            </div>
            <input
              type="range" min="-10" max="10" step="1"
              value={tempDelta}
              onChange={(e) => { setTempDelta(Number(e.target.value)); setSelectedPreset('CUSTOM'); }}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Clearance delay */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700">Clearance Delay (+months)</span>
              <span className="font-mono text-slate-800 font-bold">+{clearanceDelay} mo</span>
            </div>
            <input
              type="range" min="0" max="24" step="1"
              value={clearanceDelay}
              onChange={(e) => { setClearanceDelay(Number(e.target.value)); setSelectedPreset('CUSTOM'); }}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <button
            onClick={() => runSimulationWithParams(projectCode, selectedPreset, {
              additional_delay_months: additionalDelay,
              cost_overrun_percent: costOverrunPct,
              rainfall_multiplier: rainfallMult,
              wind_multiplier: 1.0,
              temperature_delta_c: tempDelta,
              clearance_delay_months: clearanceDelay,
              dependency_disruption: dependencyDisruption
            })}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Calculate Scenario Simulation
          </button>
        </div>

        {/* Results Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {simResult && simResult.baseline && simResult.scenario ? (
            <>
              {/* Baseline vs Scenario Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Risk Score</span>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    {simResult.scenario.risk_score.toFixed(1)}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Baseline: <span className="font-mono font-semibold">{simResult.baseline.risk_score.toFixed(1)}</span>
                  </div>
                  <div className={`text-[11px] font-bold font-mono mt-0.5 ${simResult.impact.risk_score_delta > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                    Delta: {simResult.impact.risk_score_delta > 0 ? '+' : ''}{simResult.impact.risk_score_delta.toFixed(1)}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Risk Category</span>
                  <div className="mt-2">
                    <span className={getRiskBadgeClass(simResult.scenario.risk_category)}>
                      {simResult.scenario.risk_category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-2">
                    Baseline: <span className="font-semibold">{simResult.baseline.risk_category}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Early Warning Status</span>
                  <div className="mt-2">
                    {simResult.scenario.scenario_early_warning ? (
                      <span className="badge-risk-critical">ACTIVE</span>
                    ) : (
                      <span className="badge-risk-low">CLEAR</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-2">
                    Baseline: <span className="font-semibold">{simResult.baseline.early_warning ? 'ACTIVE' : 'CLEAR'}</span>
                  </div>
                </div>

              </div>

              {/* Simulation Impact Summary */}
              <div className="enterprise-card space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Scenario Impact Summary
                </h4>
                <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                  {simResult.impact.summary_bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="enterprise-card p-12 text-center text-slate-500 space-y-2">
              <Zap className="w-8 h-8 text-blue-600 mx-auto" />
              <p className="text-xs font-semibold">Select a simulation preset or adjust controls on the left to calculate scenario impacts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
