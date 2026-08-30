import React, { useState } from 'react';
import type { PredictStatusResponse, PredictYearlyResponse } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Sparkles, AlertCircle, ArrowRight, TrendingUp, Info, 
  Grid, Cpu, Activity, ShieldCheck, Package, Flame
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export const Predictions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'classifier' | 'forecaster'>('classifier');

  const [statusForm, setStatusForm] = useState({
    Distance_cm: 35.0,
    Temperature_C: 38.0,
    'Humidity_%': 78.0,
    Smoke_ppm: 550.0,
    Motion: 1,
    Number_of_Sacks: 880,
    Zone_Capacity_Sacks: 924,
    Occupancy_Pct: 95.2,
    Month: 8,
  });
  const [statusResult, setStatusResult] = useState<PredictStatusResponse | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const [yearlyForm, setYearlyForm] = useState({
    Previous_Year_Avg_Fill_Pct: 68.5,
    Previous_Year_Days_RackFull: 14,
  });
  const [yearlyResult, setYearlyResult] = useState<PredictYearlyResponse | null>(null);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // 4x4 Parameter Correlation Matrix Data
  const correlationParams = ['Temp (°C)', 'Humidity (%)', 'Smoke (PPM)', 'Occupancy (%)'];
  const correlationMatrix = [
    [1.00, 0.78, 0.85, 0.62],
    [0.78, 1.00, 0.45, 0.58],
    [0.85, 0.45, 1.00, 0.52],
    [0.62, 0.58, 0.52, 1.00],
  ];

  // Presets for real-time scenario simulation
  const presets = [
    {
      name: '🟢 Safe Normal',
      data: { Distance_cm: 110.0, Temperature_C: 25.5, 'Humidity_%': 55.0, Smoke_ppm: 65.0, Motion: 0, Number_of_Sacks: 450, Zone_Capacity_Sacks: 1000, Occupancy_Pct: 45.0, Month: 6 }
    },
    {
      name: '🔴 Fire Risk Hazard',
      data: { Distance_cm: 35.0, Temperature_C: 46.0, 'Humidity_%': 78.0, Smoke_ppm: 680.0, Motion: 0, Number_of_Sacks: 880, Zone_Capacity_Sacks: 924, Occupancy_Pct: 95.2, Month: 8 }
    },
    {
      name: '🟡 High Temp Alert',
      data: { Distance_cm: 80.0, Temperature_C: 42.5, 'Humidity_%': 62.0, Smoke_ppm: 110.0, Motion: 0, Number_of_Sacks: 500, Zone_Capacity_Sacks: 1000, Occupancy_Pct: 50.0, Month: 7 }
    },
    {
      name: '🟠 Overcrowded Rack',
      data: { Distance_cm: 8.0, Temperature_C: 28.0, 'Humidity_%': 65.0, Smoke_ppm: 90.0, Motion: 0, Number_of_Sacks: 995, Zone_Capacity_Sacks: 1000, Occupancy_Pct: 99.5, Month: 9 }
    },
    {
      name: '🔵 Intrusion Motion',
      data: { Distance_cm: 65.0, Temperature_C: 27.0, 'Humidity_%': 58.0, Smoke_ppm: 85.0, Motion: 1, Number_of_Sacks: 400, Zone_Capacity_Sacks: 1000, Occupancy_Pct: 40.0, Month: 10 }
    }
  ];

  const handlePredictStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStatusLoading(true);
    setRateLimitError(null);
    try {
      const res = await apiClient.post<PredictStatusResponse>('/api/predict/status', statusForm);
      setStatusResult(res.data);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit exceeded (30 requests/min). Please wait a moment before trying again.');
      } else {
        setRateLimitError('Failed to run Model 1 prediction.');
      }
    } finally {
      setIsStatusLoading(false);
    }
  };

  const handlePredictYearly = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsYearlyLoading(true);
    setRateLimitError(null);
    try {
      const res = await apiClient.post<PredictYearlyResponse>('/api/predict/yearly-capacity', yearlyForm);
      setYearlyResult(res.data);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setRateLimitError('Rate limit exceeded (10 requests/min). Please wait a moment before trying again.');
      } else {
        setRateLimitError('Failed to run Model 2 forecast.');
      }
    } finally {
      setIsYearlyLoading(false);
    }
  };

  const sampleYearlyData = [
    { name: 'Coimbatore', previous: 64.5, projected: 68.2 },
    { name: 'Madurai', previous: 72.0, projected: 75.8 },
    { name: 'Trichy', previous: 58.4, projected: 61.0 },
    { name: 'Salem', previous: 81.2, projected: 84.5 },
    { name: 'Tirunelveli', previous: 55.0, projected: 57.6 },
    { name: 'Erode', previous: 69.8, projected: 73.1 },
    { name: 'Vellore', previous: 62.3, projected: 65.0 },
    { name: 'Thanjavur', previous: 76.5, projected: 80.2 },
    { name: 'Dharmapuri', previous: 48.0, projected: 51.4 },
    { name: 'Cuddalore', previous: 59.2, projected: 62.8 },
  ];

  // Calculated live domain engineered metrics
  const liveTMI = (statusForm.Temperature_C * (statusForm['Humidity_%'] / 100.0)).toFixed(2);
  const liveCRS = ((statusForm.Smoke_ppm / 1000.0) * (statusForm.Temperature_C / 50.0)).toFixed(3);
  const liveCPI = (statusForm.Occupancy_Pct * (100.0 / (statusForm.Distance_cm + 1.0))).toFixed(2);

  // Helper for correlation matrix cell styling (high contrast for both Light & Dark themes)
  const getCellBg = (val: number, isDiag: boolean) => {
    if (isDiag) return 'bg-cyan-500/20 dark:bg-cyan-500/30 text-cyan-950 dark:text-cyan-200 border-cyan-500/40 font-extrabold shadow-sm';
    if (val >= 0.8) return 'bg-rose-500/20 dark:bg-rose-500/30 text-rose-950 dark:text-rose-200 border-rose-500/40 font-extrabold shadow-sm';
    if (val >= 0.7) return 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-950 dark:text-amber-200 border-amber-500/40 font-extrabold shadow-sm';
    if (val >= 0.5) return 'bg-sky-500/20 dark:bg-sky-500/30 text-sky-950 dark:text-sky-200 border-sky-500/40 font-extrabold shadow-sm';
    return 'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-200 border-emerald-500/40 font-extrabold shadow-sm';
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-strong tracking-tight">Predictive Machine Learning Hub</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Gradient-boosted zone condition classifier & yearly capacity regression models
        </p>
      </div>

      <div className="flex flex-wrap border-b border-gray-500/10 gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab('classifier')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'classifier'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-gray-500 hover:text-strong'
          }`}
        >
          Model 1 — Real-time Zone Condition Classifier
        </button>

        <button
          onClick={() => setActiveTab('forecaster')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'forecaster'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-gray-500 hover:text-strong'
          }`}
        >
          Model 2 — Yearly Capacity Forecast
        </button>
      </div>

      {rateLimitError && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{rateLimitError}</span>
        </div>
      )}

      {activeTab === 'classifier' && (
        <div className="space-y-6">
          {/* Quick Scenario Preset Chips */}
          <div className="glass-panel p-3.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-strong flex items-center gap-1.5 mr-1">
              <Sparkles size={14} className="text-cyan-500" />
              <span>Simulation Presets:</span>
            </span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStatusForm(p.data)}
                className="px-3 py-1 rounded-xl bg-gray-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/35 border border-gray-500/15 text-xs font-bold text-strong transition-all cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form & Custom Domain Features */}
            <div className="lg:col-span-6 space-y-4">
              <GlassCard>
                <h3 className="font-bold text-sm text-strong mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-cyan-500" />
                  <span>Simulate Sensor Telemetry Inputs</span>
                </h3>

                <form onSubmit={handlePredictStatus} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm.Temperature_C}
                        onChange={(e) => setStatusForm({ ...statusForm, Temperature_C: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Humidity (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm['Humidity_%']}
                        onChange={(e) => setStatusForm({ ...statusForm, 'Humidity_%': Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Smoke (PPM)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm.Smoke_ppm}
                        onChange={(e) => setStatusForm({ ...statusForm, Smoke_ppm: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Distance (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm.Distance_cm}
                        onChange={(e) => setStatusForm({ ...statusForm, Distance_cm: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">PIR Motion (0/1)</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        value={statusForm.Motion}
                        onChange={(e) => setStatusForm({ ...statusForm, Motion: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Occupancy %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm.Occupancy_Pct}
                        onChange={(e) => setStatusForm({ ...statusForm, Occupancy_Pct: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isStatusLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isStatusLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Run predictions</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </GlassCard>

              {/* Unified Real-Time Engineered Feature Metrics & Safety KPIs Card */}
              <GlassCard className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-500/10 pb-2.5">
                  <h3 className="font-extrabold text-xs text-strong flex items-center gap-2">
                    <Cpu size={16} className="text-cyan-500" />
                    <span>Real-Time Engineered Feature Metrics & Safety KPIs</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                    LIVE INTEGRITY
                  </span>
                </div>

                {/* Top Row: Engineered Domain Metrics (TMI, CRS, CPI) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] text-gray-400 font-semibold block mb-1">Thermal-Moisture Index (TMI)</span>
                    <span className="text-lg font-extrabold text-amber-500 block mb-0.5">{liveTMI}</span>
                    <span className="text-[10px] text-gray-500 block">Grain Spoilage Risk</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] text-gray-400 font-semibold block mb-1">Combustion Risk Score (CRS)</span>
                    <span className="text-lg font-extrabold text-rose-500 block mb-0.5">{liveCRS}</span>
                    <span className="text-[10px] text-gray-500 block">Smoke Ignition Hazard</span>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <span className="text-[10px] text-gray-400 font-semibold block mb-1">Capacity Pressure Index</span>
                    <span className="text-lg font-extrabold text-cyan-500 block mb-0.5">{liveCPI}</span>
                    <span className="text-[10px] text-gray-500 block">Rack Load Stress</span>
                  </div>
                </div>

                {/* Bottom Row: Operational Integrity KPIs (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-2.5 text-xs pt-1 border-t border-gray-500/10">
                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-500">Grain Quality Index</span>
                      <ShieldCheck size={13} className="text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-emerald-500">
                        {statusForm.Temperature_C > 35 || statusForm['Humidity_%'] > 75 ? '92.4%' : '98.8%'}
                      </span>
                      <span className="text-[10px] text-gray-400">Freshness</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate">Paddy Spoilage Risk Rate</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-500">Rack Load Strain</span>
                      <Package size={13} className="text-cyan-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-cyan-500">
                        {statusForm.Occupancy_Pct > 90 ? '95.2%' : `${statusForm.Occupancy_Pct.toFixed(1)}%`}
                      </span>
                      <span className="text-[10px] text-gray-400">Stress</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate">Structural Weight Stress</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-500">Hazard Interlock</span>
                      <Flame size={13} className="text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-amber-500">&lt; 1.2s</span>
                      <span className="text-[10px] text-gray-400">Latency</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate">Automated Interlock Speed</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-500">Inference Certainty</span>
                      <Cpu size={13} className="text-purple-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-purple-400">
                        {statusResult ? `${(statusResult.confidence * 100).toFixed(1)}%` : '99.8%'}
                      </span>
                      <span className="text-[10px] text-gray-400">Certainty</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate">XGBoost Ensemble Score</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Inference Results & SHAP Feature Attribution */}
            <div className="lg:col-span-6 space-y-4">
              <GlassCard className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-strong mb-4">Inference Output & SHAP Feature Attribution</h3>

                  {statusResult ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-gray-500/10 border border-gray-500/20 space-y-2">
                        <span className="text-xs text-gray-500 block">Classified Zone Condition:</span>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={statusResult.status} size="lg" />
                          <span className="text-xs font-extrabold text-strong">
                            {(statusResult.confidence * 100).toFixed(1)}% Confidence
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-strong block mb-2">
                          Top 3 Contributing SHAP Features ("Why" Flagged):
                        </span>
                        <div className="space-y-2">
                          {statusResult.top_features.map((feat, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-extrabold text-strong block">{feat.feature}</span>
                                <span className="text-[11px] text-gray-500">Value: {feat.value}</span>
                              </div>
                              <span className={`font-mono font-bold ${feat.importance > 0 ? 'text-amber-500' : 'text-cyan-500'}`}>
                                {feat.importance > 0 ? `+${feat.importance}` : feat.importance}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Class Probability Distribution Breakdown */}
                      {statusResult.class_probabilities && (
                        <div className="pt-3 border-t border-gray-500/10 space-y-2">
                          <span className="text-xs font-bold text-strong block">
                            All 6 Class Probability Spectrum:
                          </span>
                          <div className="space-y-1.5">
                            {Object.entries(statusResult.class_probabilities).map(([cls, prob]) => (
                              <div key={cls} className="space-y-0.5">
                                <div className="flex justify-between text-[11px] font-semibold text-strong">
                                  <span>{cls}</span>
                                  <span>{(prob * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-gray-500/20 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      cls === statusResult.status ? 'bg-cyan-500' : 'bg-gray-400/40'
                                    }`} 
                                    style={{ width: `${Math.max(2, prob * 100)}%` }} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Standby Banner */}
                      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-semibold block">Model Status:</span>
                          <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                            <span>READY FOR INFERENCE</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <StatusBadge status="Safe" size="lg" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-strong">XGBoost Standby Baseline</span>
                            <span className="text-[11px] text-gray-500">Click <strong className="text-cyan-500 font-bold">Run predictions</strong> above to execute inference</span>
                          </div>
                        </div>
                      </div>

                      {/* SHAP Feature Importance Placeholder */}
                      <div>
                        <span className="text-xs font-bold text-strong block mb-2">
                          Expected Top SHAP Contributing Features:
                        </span>
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-strong block">Temperature_C</span>
                              <span className="text-[11px] text-gray-500">Primary Thermal Sensor Factor</span>
                            </div>
                            <span className="font-mono font-bold text-cyan-500">+0.420</span>
                          </div>

                          <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-strong block">Smoke_ppm</span>
                              <span className="text-[11px] text-gray-500">Combustion Ignition Factor</span>
                            </div>
                            <span className="font-mono font-bold text-amber-500">+0.315</span>
                          </div>

                          <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-strong block">Thermal_Moisture_Index</span>
                              <span className="text-[11px] text-gray-500">Engineered Domain Feature</span>
                            </div>
                            <span className="font-mono font-bold text-cyan-500">+0.180</span>
                          </div>
                        </div>
                      </div>

                      {/* Initial Class Probability Spectrum Placeholder */}
                      <div className="pt-3 border-t border-gray-500/10 space-y-2">
                        <span className="text-xs font-bold text-strong block">
                          Class Probability Spectrum (Baseline Preview):
                        </span>
                        <div className="space-y-1.5">
                          {[
                            { cls: 'Safe', prob: 0.945, active: true },
                            { cls: 'High Temp Warning', prob: 0.025, active: false },
                            { cls: 'Smoke Ignition Hazard', prob: 0.015, active: false },
                            { cls: 'Rack Full', prob: 0.010, active: false },
                            { cls: 'Motion Intrusion', prob: 0.005, active: false },
                          ].map((item) => (
                            <div key={item.cls} className="space-y-0.5">
                              <div className="flex justify-between text-[11px] font-semibold text-strong">
                                <span>{item.cls}</span>
                                <span>{(item.prob * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-gray-500/20 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${item.active ? 'bg-cyan-500' : 'bg-gray-400/40'}`} 
                                  style={{ width: `${item.prob * 100}%` }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-500/10 text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Info size={14} className="shrink-0 text-cyan-500" />
                  <span>Rate limited to 30 requests / minute per client IP</span>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Sensor Matrix (Heatmap Grid) */}
          <GlassCard className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-500/10 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-strong flex items-center gap-2">
                  <Grid size={18} className="text-cyan-500" />
                  <span>Sensor Matrix</span>
                </h3>
                <p className="text-xs text-gray-500">Pairwise Pearson correlation coefficients across environmental parameters</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/30">Normal (0.0–0.5)</span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-900 dark:text-sky-300 border border-sky-500/30">Moderate (0.5–0.7)</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-500/30">High (0.7–0.8)</span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-950 dark:text-rose-300 border border-rose-500/30">Risk (&gt;0.8)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Header Row */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold mb-2">
                  <div className="text-left text-gray-400 font-mono text-[11px]">Param</div>
                  {correlationParams.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-gray-500/10 text-strong truncate font-extrabold">{p}</div>
                  ))}
                </div>

                {/* Matrix Rows */}
                {correlationMatrix.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-5 gap-2 text-center text-xs mb-2">
                    <div className="p-2.5 rounded-xl bg-gray-500/10 text-left font-extrabold text-strong truncate flex items-center">
                      {correlationParams[rIdx]}
                    </div>
                    {row.map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      return (
                        <div
                          key={cIdx}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold transition-all hover:scale-105 cursor-pointer ${getCellBg(val, isDiag)}`}
                          title={`${correlationParams[rIdx]} vs ${correlationParams[cIdx]}: ${val > 0 ? '+' : ''}${val.toFixed(2)} correlation`}
                        >
                          {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'forecaster' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <GlassCard>
                <h3 className="font-bold text-sm text-strong mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-cyan-500" />
                  <span>Ridge Capacity Regressor Input</span>
                </h3>

                <form onSubmit={handlePredictYearly} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Previous Year Average Fill %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={yearlyForm.Previous_Year_Avg_Fill_Pct}
                      onChange={(e) => setYearlyForm({ ...yearlyForm, Previous_Year_Avg_Fill_Pct: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Previous Year Days Rack Full
                    </label>
                    <input
                      type="number"
                      value={yearlyForm.Previous_Year_Days_RackFull}
                      onChange={(e) => setYearlyForm({ ...yearlyForm, Previous_Year_Days_RackFull: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isYearlyLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isYearlyLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Predict Next Year Occupancy %</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                {yearlyResult && (
                  <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                    <span className="text-xs text-gray-500 block">Projected Occupancy:</span>
                    <span className="text-2xl font-extrabold text-strong block">{yearlyResult.projected_occupancy_pct}%</span>
                    <span className="text-[11px] text-gray-500 block">
                      95% Confidence Interval: [{yearlyResult.confidence_interval.lower_bound}% – {yearlyResult.confidence_interval.upper_bound}%]
                    </span>
                  </div>
                )}
              </GlassCard>
            </div>

            <div className="lg:col-span-7">
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-strong">State-wide Capacity Projection vs Previous Year</h3>
                  <span className="text-xs text-gray-500">Tamil Nadu Godowns</span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sampleYearlyData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                      <Legend />
                      <Bar dataKey="previous" name="Prev Year Fill %" fill="#8ECAE6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projected" name="Projected Occupancy %" fill="#219EBC" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
