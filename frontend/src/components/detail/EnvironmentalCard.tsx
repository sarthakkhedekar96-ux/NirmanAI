import React from 'react';
import {
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  Info,
  MapPin,
  Clock,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { ProjectEnvironmentalReport } from '../../types/api';

interface EnvironmentalCardProps {
  report: ProjectEnvironmentalReport | null;
  loading?: boolean;
  onAskAssistant?: (sectionName: string, starterQuestions: string[]) => void;
}

export const EnvironmentalCard: React.FC<EnvironmentalCardProps> = ({ report, loading, onAskAssistant }) => {
  if (loading) {
    return (
      <div className="enterprise-card animate-pulse space-y-4">
        <div className="h-5 bg-slate-100 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!report || report.environmental_data_status !== 'AVAILABLE' || !report.weather) {
    return (
      <div className="enterprise-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-100 text-slate-500">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Environmental Data Unavailable</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Live meteorological telemetry could not be resolved for this location. Risk assessment remains active.
              </p>
            </div>
          </div>
          {onAskAssistant && (
            <button
              onClick={() => onAskAssistant('Environmental Conditions', [
                'Are current conditions likely to affect the project?',
                'What environmental conditions require attention?',
                'Explain the current environmental assessment.'
              ])}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0 ml-3"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const weather = report.weather;
  const loc = report.location;
  const assessment = report.environmental_assessment;
  const advice = report.physical_condition_advice;
  const disruptionWindows = report.disruption_windows || [];

  const getSeverityBadgeClass = (sev: string) => {
    switch ((sev || '').toUpperCase()) {
      case 'SEVERE':
      case 'CRITICAL':
        return 'badge-risk-critical';
      case 'HIGH':
        return 'badge-risk-high';
      case 'ELEVATED':
      case 'WATCH':
        return 'badge-risk-moderate';
      case 'NORMAL':
        return 'badge-risk-low';
      default:
        return 'badge-unavailable';
    }
  };

  const severityLevel = assessment?.overall_severity || 'NORMAL';
  const actions = advice?.recommended_actions || [];

  return (
    <div className="enterprise-card space-y-5">
      {/* Header */}
      <div className="enterprise-card-header">
        <div>
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <h3 className="enterprise-title">Environmental Conditions</h3>
            <span className={getSeverityBadgeClass(severityLevel)}>
              {severityLevel}
            </span>
          </div>
          <p className="enterprise-subtitle">
            Local weather observations and site risk exposure
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loc && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{loc.display_location}</span>
            </div>
          )}

          {onAskAssistant && (
            <button
              onClick={() => onAskAssistant('Environmental Conditions', [
                'Are current conditions likely to affect the project?',
                'What environmental conditions require attention?',
                'Explain the current environmental assessment.'
              ])}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-slate-400" />
            <span>Temperature</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {weather.temperature_c !== null ? `${weather.temperature_c.toFixed(1)}°C` : '—'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Droplets className="w-3.5 h-3.5 text-slate-400" />
            <span>Precipitation</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {weather.precipitation_mm !== null ? `${weather.precipitation_mm.toFixed(1)} mm` : '0 mm'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Wind className="w-3.5 h-3.5 text-slate-400" />
            <span>Wind Speed</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {weather.wind_speed_kmh !== null ? `${weather.wind_speed_kmh.toFixed(1)} km/h` : '—'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>Assessment</span>
          </div>
          <div className="text-xs font-bold uppercase text-slate-900 truncate">
            {assessment?.assessment_label || severityLevel}
          </div>
        </div>
      </div>

      {/* Physical Condition Advice */}
      {actions.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Environmental Impact & Guidance
          </h4>
          <ul className="space-y-1 text-xs text-slate-700">
            {actions.slice(0, 3).map((act: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disruption Windows */}
      {disruptionWindows.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Disruption Windows
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {disruptionWindows.map((dw: any, i: number) => (
              <div key={i} className="p-2 bg-amber-50/50 border border-amber-200/60 rounded text-xs">
                <div className="font-medium text-amber-900">{dw.hazard_type || 'Weather Hazard'}</div>
                <div className="text-slate-600 text-[11px]">{dw.advisory || dw.intensity}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
