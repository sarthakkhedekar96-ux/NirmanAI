import React, { useState, useEffect } from 'react';
import { Satellite, Calendar, Info, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import api from '../../services/apiClient';

interface SatelliteChangeCardProps {
  projectCode: string;
  onAskAssistant?: (sectionName: string, starterQuestions: string[]) => void;
}

export const SatelliteChangeCard: React.FC<SatelliteChangeCardProps> = ({ projectCode, onAskAssistant }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [satData, setSatData] = useState<any>(null);

  useEffect(() => {
    if (projectCode) {
      fetchSatelliteChangeData();
    }
  }, [projectCode]);

  const fetchSatelliteChangeData = async (skipCache: boolean = false) => {
    setLoading(true);
    try {
      const data = await api.getSatelliteChange(projectCode, skipCache);
      setSatData(data);
    } catch (err) {
      console.error('Error loading satellite change detection:', err);
      setSatData({
        status: 'UNAVAILABLE',
        processing_stage: 'SERVICE_ERROR',
        limitations: ['Satellite imagery service connection unverified.'],
        source: 'Sentinel-2 L2A Multispectral'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="enterprise-card animate-pulse flex items-center justify-center h-40">
        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin mr-2" />
        <span className="text-xs text-slate-500 font-medium">Loading Satellite Imagery Telemetry...</span>
      </div>
    );
  }

  if (!satData) {
    return null;
  }

  const isAvailable = satData.status === 'AVAILABLE';
  const isInsufficient = satData.status === 'INSUFFICIENT_DATA';
  const isUnavailable = satData.status === 'UNAVAILABLE';

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'NO_SIGNIFICANT_CHANGE': return 'NO SIGNIFICANT CHANGE';
      case 'LOW_CHANGE': return 'LOW CHANGE';
      case 'MODERATE_CHANGE': return 'MODERATE CHANGE';
      case 'HIGH_CHANGE': return 'HIGH CHANGE';
      case 'INSUFFICIENT_DATA': return 'INSUFFICIENT DATA';
      case 'UNAVAILABLE': return 'UNAVAILABLE';
      default: return cat || 'N/A';
    }
  };

  return (
    <div className="enterprise-card space-y-4">
      {/* Header */}
      <div className="enterprise-card-header">
        <div>
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-blue-600" />
            <h3 className="enterprise-title">Satellite Change Analysis</h3>
          </div>
          <p className="enterprise-subtitle">
            Sentinel-2 L2A Earth Observation surface activity check
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {isAvailable && (
            <span className="badge-risk-low flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SATELLITE ANALYSIS AVAILABLE
            </span>
          )}
          {isInsufficient && (
            <span className="badge-risk-moderate flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" /> INSUFFICIENT PROJECT LOCATION DATA
            </span>
          )}
          {isUnavailable && (
            <span className="badge-unavailable flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-500" /> SATELLITE ANALYSIS UNAVAILABLE
            </span>
          )}

          {(isUnavailable || isInsufficient) && (
            <button
              onClick={() => fetchSatelliteChangeData(true)}
              disabled={loading}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Retry Satellite Retrieval"
            >
              <RefreshCw className={`w-3 h-3 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Retry Analysis</span>
            </button>
          )}

          {onAskAssistant && (
            <button
              onClick={() => onAskAssistant('Satellite Change Analysis', [
                'What does the satellite change result indicate?',
                'What are the limitations of this assessment?',
                'Does this confirm construction progress?'
              ])}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded border border-slate-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Ask Assistant</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Metrics */}
      {isAvailable ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded p-2.5 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Observed Change</span>
              <span className="text-base font-bold font-mono text-blue-700">
                {satData.changed_area_percentage !== null ? `${satData.changed_area_percentage}%` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Observation Gap</span>
              <span className="text-sm font-semibold font-mono text-slate-800">
                {satData.time_difference_days ? `${satData.time_difference_days} days` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Quality</span>
              <span className="text-xs font-semibold text-emerald-700 block mt-0.5">
                {satData.quality_status || 'GOOD'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Location Precision</span>
              <span className="text-xs font-semibold text-slate-700 block mt-0.5">
                {satData.location_precision === 'HIGH' ? 'HIGH — Project Site' : satData.location_precision}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Change Category:</span>
              <span className="font-semibold text-slate-900">
                {categoryLabel(satData.change_category)}
              </span>
            </div>

            {satData.indices && (
              <div className="grid grid-cols-3 gap-2 py-1.5 border-t border-slate-200/80 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">ΔNDVI Vegetation</span>
                  <span className={satData.indices.ndvi_delta > 0 ? 'text-emerald-700 font-bold' : 'text-slate-800'}>
                    {satData.indices.ndvi_delta > 0 ? `+${satData.indices.ndvi_delta}` : satData.indices.ndvi_delta ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">ΔNDBI Built-Up</span>
                  <span className={satData.indices.ndbi_builtup_delta > 0 ? 'text-amber-700 font-bold' : 'text-slate-800'}>
                    {satData.indices.ndbi_builtup_delta > 0 ? `+${satData.indices.ndbi_builtup_delta}` : satData.indices.ndbi_builtup_delta ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">ΔNDWI Water</span>
                  <span className="text-slate-800">
                    {satData.indices.ndwi_water_delta ?? 'N/A'}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-[11px] text-slate-600">
              <div>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Before Observation:
                </span>
                <span className="font-mono text-slate-800">{satData.before_date || 'N/A'} ({satData.before_cloud_percentage}% cloud)</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> After Observation:
                </span>
                <span className="font-mono text-slate-800">{satData.after_date || 'N/A'} ({satData.after_cloud_percentage}% cloud)</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span>Satellite Imagery Status: {satData.status}</span>
            {satData.processing_stage && (
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                Stage: {satData.processing_stage}
              </span>
            )}
          </div>
          {satData.limitations && satData.limitations.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500 text-[11px]">
              {satData.limitations.map((lim: string, idx: number) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
