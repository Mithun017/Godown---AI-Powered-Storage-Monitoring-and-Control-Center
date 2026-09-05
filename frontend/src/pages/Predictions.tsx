import React, { useState } from 'react';
import type { PredictStatusResponse, PredictYearlyResponse } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  evaluateTemperature, evaluateHumidity, evaluateSmoke, evaluateCombustibleGas
} from '../utils/thresholds';
import {
  Sparkles, AlertCircle, ArrowRight, TrendingUp, Info,
  Grid, Cpu, Activity, Thermometer, Droplets, Wind, Flame, Package
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export const Predictions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'classifier' | 'forecaster'>('classifier');

  // Input Form matching user's exact telemetry sensor data format
  const [statusForm, setStatusForm] = useState({
    Warehouse_ID_Code: 'TNWC-001',
    Temperature_C: 27.4,
    'Humidity_%': 68.2,
    Smoke_Status: 'NORMAL',
    Smoke_ppm: 85.0,
    Combustible_Gas_LEL: 2.3,
    Stock_Tonnes: 8420,
    Time_Str: '17:30',
    Distance_cm: 35.0,
    Motion: 0,
    Number_of_Sacks: 168400, // 8420 tonnes * 20 sacks/tonne
    Zone_Capacity_Sacks: 200000,
    Occupancy_Pct: 84.2,
    Month: 9,
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

  // Parameter Correlation Matrix Data
  const correlationParams = ['Temp (°C)', 'Humidity (%)', 'Smoke (PPM)', 'Gas (%LEL)', 'Stock (%)'];
  const correlationMatrix = [
    [1.00, 0.78, 0.85, 0.72, 0.62],
    [0.78, 1.00, 0.45, 0.54, 0.58],
    [0.85, 0.45, 1.00, 0.88, 0.52],
    [0.72, 0.54, 0.88, 1.00, 0.48],
    [0.62, 0.58, 0.52, 0.48, 1.00],
  ];

  // Presets matching user's exact normal/warning/critical threshold rules
  const presets = [
    {
      name: '🟡 Warning Scenario (User Telemetry)',
      data: {
        Warehouse_ID_Code: 'TNWC-001',
        Temperature_C: 27.4,
        'Humidity_%': 68.2,
        Smoke_Status: 'NORMAL',
        Smoke_ppm: 85.0,
        Combustible_Gas_LEL: 2.3,
        Stock_Tonnes: 8420,
        Time_Str: '17:30',
        Distance_cm: 35.0,
        Motion: 0,
        Number_of_Sacks: 168400,
        Zone_Capacity_Sacks: 200000,
        Occupancy_Pct: 84.2,
        Month: 9
      }
    },
    {
      name: '🟢 Safe Normal',
      data: {
        Warehouse_ID_Code: 'TNWC-001',
        Temperature_C: 22.5,
        'Humidity_%': 58.0,
        Smoke_Status: 'NORMAL',
        Smoke_ppm: 45.0,
        Combustible_Gas_LEL: 1.8,
        Stock_Tonnes: 4500,
        Time_Str: '10:15',
        Distance_cm: 110.0,
        Motion: 0,
        Number_of_Sacks: 90000,
        Zone_Capacity_Sacks: 200000,
        Occupancy_Pct: 45.0,
        Month: 6
      }
    },
    {
      name: '🟠 Gas Hazard Warning',
      data: {
        Warehouse_ID_Code: 'TNWC-002',
        Temperature_C: 24.5,
        'Humidity_%': 64.0,
        Smoke_Status: 'NORMAL',
        Smoke_ppm: 140.0,
        Combustible_Gas_LEL: 7.8,
        Stock_Tonnes: 7200,
        Time_Str: '18:15',
        Distance_cm: 45.0,
        Motion: 0,
        Number_of_Sacks: 144000,
        Zone_Capacity_Sacks: 200000,
        Occupancy_Pct: 72.0,
        Month: 8
      }
    },
    {
      name: '🔴 Critical Heat & Smoke Alert',
      data: {
        Warehouse_ID_Code: 'TNWC-003',
        Temperature_C: 34.2,
        'Humidity_%': 76.5,
        Smoke_Status: 'DETECTED',
        Smoke_ppm: 680.0,
        Combustible_Gas_LEL: 12.4,
        Stock_Tonnes: 9100,
        Time_Str: '19:00',
        Distance_cm: 15.0,
        Motion: 1,
        Number_of_Sacks: 182000,
        Zone_Capacity_Sacks: 200000,
        Occupancy_Pct: 91.0,
        Month: 8
      }
    }
  ];

  // Helper evaluating real-time thresholds for current inputs
  const tempEval = evaluateTemperature(statusForm.Temperature_C);
  const humEval = evaluateHumidity(statusForm['Humidity_%']);
  const smokeEval = evaluateSmoke(statusForm.Smoke_Status);
  const gasEval = evaluateCombustibleGas(statusForm.Combustible_Gas_LEL);

  const handlePredictStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStatusLoading(true);
    setRateLimitError(null);

    const payload = {
      Distance_cm: statusForm.Distance_cm,
      Temperature_C: statusForm.Temperature_C,
      'Humidity_%': statusForm['Humidity_%'],
      Smoke_ppm: statusForm.Smoke_Status === 'DETECTED' ? 650.0 : statusForm.Smoke_ppm,
      Motion: statusForm.Motion,
      Number_of_Sacks: statusForm.Number_of_Sacks,
      Zone_Capacity_Sacks: statusForm.Zone_Capacity_Sacks,
      Occupancy_Pct: statusForm.Occupancy_Pct,
      Month: statusForm.Month,
      Combustible_Gas_LEL: statusForm.Combustible_Gas_LEL,
      Stock_Tonnes: statusForm.Stock_Tonnes,
      Warehouse_ID_Code: statusForm.Warehouse_ID_Code,
    };

    try {
      const res = await apiClient.post<PredictStatusResponse>('/api/predict/status', payload);
      
      // Override status label if threshold critical rules are breached
      let finalStatus = res.data.status;
      if (statusForm.Temperature_C > 30.0 || statusForm['Humidity_%'] > 70.0 || statusForm.Smoke_Status === 'DETECTED' || statusForm.Combustible_Gas_LEL >= 10.0) {
        finalStatus = statusForm.Smoke_Status === 'DETECTED' || statusForm.Combustible_Gas_LEL >= 10.0 ? 'Smoke Ignition Hazard' : 'High Temp Warning';
      }

      setStatusResult({
        ...res.data,
        status: finalStatus
      });
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

  // Calculated live domain engineered metrics
  const liveTMI = (statusForm.Temperature_C * (statusForm['Humidity_%'] / 100.0)).toFixed(2);
  const liveCRS = ((statusForm.Smoke_ppm / 1000.0) * (statusForm.Temperature_C / 50.0) * (1 + statusForm.Combustible_Gas_LEL / 10.0)).toFixed(3);
  const liveCPI = (statusForm.Occupancy_Pct * (100.0 / (statusForm.Distance_cm + 1.0))).toFixed(2);

  // Helper for correlation matrix cell styling
  const getCellBg = (val: number, isDiag: boolean) => {
    if (isDiag) return 'bg-cyan-500/20 dark:bg-cyan-500/30 text-cyan-400 border-cyan-500/40 font-extrabold shadow-sm';
    if (val >= 0.8) return 'bg-rose-500/20 dark:bg-rose-500/30 text-rose-400 border-rose-500/40 font-extrabold shadow-sm';
    if (val >= 0.7) return 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-400 border-amber-500/40 font-extrabold shadow-sm';
    if (val >= 0.5) return 'bg-sky-500/20 dark:bg-sky-500/30 text-sky-400 border-sky-500/40 font-extrabold shadow-sm';
    return 'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-400 border-emerald-500/40 font-extrabold shadow-sm';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-strong tracking-tight">Predictive Machine Learning & Health Hub</h1>
        <p className="text-xs text-gray-400 mt-1">
          Real-time IoT telemetry classifier & multi-parameter threshold evaluation engine
        </p>
      </div>

      {/* Model Mode Navigation Tabs */}
      <div className="flex flex-wrap border-b border-gray-500/10 gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab('classifier')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'classifier'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-strong'
          }`}
        >
          Model 1 — Real-Time Telemetry & Hazard Classifier
        </button>
        <button
          onClick={() => setActiveTab('forecaster')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'forecaster'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-strong'
          }`}
        >
          Model 2 — Yearly Capacity & Stock Forecast
        </button>
      </div>

      {rateLimitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{rateLimitError}</span>
        </div>
      )}

      {activeTab === 'classifier' && (
        <div className="space-y-6">
          {/* Simulation Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mr-1">
              <Sparkles size={14} className="text-cyan-400" />
              <span>Simulation Presets:</span>
            </span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setStatusForm(p.data)}
                className="px-3 py-1.5 rounded-xl bg-gray-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/35 border border-gray-500/20 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form & Custom Domain Features */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-strong flex items-center gap-2">
                    <Activity size={16} className="text-cyan-400" />
                    <span>Simulate Telemetry Sensor Data Inputs</span>
                  </h3>
                  <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                    {statusForm.Warehouse_ID_Code} • {statusForm.Time_Str}
                  </span>
                </div>

                <form onSubmit={handlePredictStatus} className="space-y-4">
                  {/* Row 1: Warehouse ID & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">Warehouse ID</label>
                      <select
                        value={statusForm.Warehouse_ID_Code}
                        onChange={(e) => setStatusForm({ ...statusForm, Warehouse_ID_Code: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-gray-500/20 text-xs font-bold text-white outline-none"
                      >
                        <option value="TNWC-001">TNWC-001 (Coimbatore)</option>
                        <option value="TNWC-002">TNWC-002 (Madurai)</option>
                        <option value="TNWC-003">TNWC-003 (Trichy)</option>
                        <option value="TNWC-004">TNWC-004 (Salem)</option>
                        <option value="TNWC-005">TNWC-005 (Tirunelveli)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">Telemetry Time</label>
                      <input
                        type="text"
                        value={statusForm.Time_Str}
                        onChange={(e) => setStatusForm({ ...statusForm, Time_Str: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-gray-500/20 text-xs font-bold text-white outline-none"
                        placeholder="17:30"
                      />
                    </div>
                  </div>

                  {/* Row 2: Temp, Humidity, Smoke */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Temperature Input with Real-time Threshold Badge */}
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-gray-300">Temp (°C)</label>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${tempEval.badgeBgClass}`}>
                          {tempEval.label}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm.Temperature_C}
                        onChange={(e) => setStatusForm({ ...statusForm, Temperature_C: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-gray-500/20 text-xs font-extrabold text-white outline-none"
                      />
                    </div>

                    {/* Humidity Input with Real-time Threshold Badge */}
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-gray-300">Humidity (%RH)</label>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${humEval.badgeBgClass}`}>
                          {humEval.label}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm['Humidity_%']}
                        onChange={(e) => setStatusForm({ ...statusForm, 'Humidity_%': Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-gray-500/20 text-xs font-extrabold text-white outline-none"
                      />
                    </div>

                    {/* Smoke Status Select with Real-time Threshold Badge */}
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-gray-300">Smoke</label>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${smokeEval.badgeBgClass}`}>
                          {smokeEval.severity === 'normal' ? 'NORMAL' : 'DETECTED'}
                        </span>
                      </div>
                      <select
                        value={statusForm.Smoke_Status}
                        onChange={(e) => setStatusForm({ ...statusForm, Smoke_Status: e.target.value, Smoke_ppm: e.target.value === 'DETECTED' ? 650 : 85 })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-gray-500/20 text-xs font-extrabold text-white outline-none"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="DETECTED">DETECTED</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Combustible Gas & Stock Tonnes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Combustible Gas (%LEL) */}
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-gray-300">Combustible Gas (%LEL)</label>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${gasEval.badgeBgClass}`}>
                          {gasEval.label}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={statusForm.Combustible_Gas_LEL}
                        onChange={(e) => setStatusForm({ ...statusForm, Combustible_Gas_LEL: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-gray-500/20 text-xs font-extrabold text-white outline-none"
                      />
                    </div>

                    {/* Stock Stored (Tonnes) */}
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-gray-300">Stock Stored (Tonnes)</label>
                        <span className="text-[9px] font-mono font-extrabold text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded">
                          {statusForm.Occupancy_Pct.toFixed(1)}% Capacity
                        </span>
                      </div>
                      <input
                        type="number"
                        value={statusForm.Stock_Tonnes}
                        onChange={(e) => {
                          const tonnes = Number(e.target.value);
                          const sacks = tonnes * 20;
                          const occ = Number(((sacks / statusForm.Zone_Capacity_Sacks) * 100).toFixed(1));
                          setStatusForm({
                            ...statusForm,
                            Stock_Tonnes: tonnes,
                            Number_of_Sacks: sacks,
                            Occupancy_Pct: Math.min(100, occ)
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-gray-500/20 text-xs font-extrabold text-white outline-none"
                      />
                      <span className="text-[9px] text-gray-500 block font-mono">
                        ≈ {(statusForm.Number_of_Sacks).toLocaleString()} Sacks Stored
                      </span>
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
                        <span>Run AI Telemetry Prediction</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </GlassCard>

              {/* Unified Real-Time Engineered Feature Metrics & Safety KPIs Card */}
              <GlassCard className="flex-1 flex flex-col justify-between space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-500/10 pb-2.5">
                  <h3 className="font-extrabold text-xs text-strong flex items-center gap-2">
                    <Cpu size={16} className="text-cyan-400" />
                    <span>Real-Time Sensor Parameter Status & Domain KPIs</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                    LIVE SPEC EVALUATION
                  </span>
                </div>

                {/* Symmetrical 4x2 Grid of Metric & Index Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* Card 1: Temp */}
                  <div className={`p-3 rounded-xl border transition-all space-y-1.5 bg-slate-900/60 ${tempEval.borderClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Temperature</span>
                      <Thermometer size={14} className={tempEval.textClass} />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-white">{statusForm.Temperature_C} °C</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${tempEval.badgeBgClass}`}>
                        {tempEval.severity === 'normal' ? 'NORMAL' : tempEval.severity === 'warning' ? 'WARNING' : 'CRITICAL'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono">Spec ≤ 25.0 °C</span>
                  </div>

                  {/* Card 2: Humidity */}
                  <div className={`p-3 rounded-xl border transition-all space-y-1.5 bg-slate-900/60 ${humEval.borderClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Humidity</span>
                      <Droplets size={14} className={humEval.textClass} />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-white">{statusForm['Humidity_%']} %RH</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${humEval.badgeBgClass}`}>
                        {humEval.severity === 'normal' ? 'NORMAL' : humEval.severity === 'warning' ? 'WARNING' : 'CRITICAL'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono">Spec ≤ 65.0 %RH</span>
                  </div>

                  {/* Card 3: Smoke */}
                  <div className={`p-3 rounded-xl border transition-all space-y-1.5 bg-slate-900/60 ${smokeEval.borderClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Smoke Sensor</span>
                      <Flame size={14} className={smokeEval.textClass} />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-white">{statusForm.Smoke_Status}</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${smokeEval.badgeBgClass}`}>
                        {smokeEval.severity === 'normal' ? 'NORMAL' : 'HAZARD'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono">Zero Smoke Spec</span>
                  </div>

                  {/* Card 4: Combustible Gas */}
                  <div className={`p-3 rounded-xl border transition-all space-y-1.5 bg-slate-900/60 ${gasEval.borderClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Combustible Gas</span>
                      <Wind size={14} className={gasEval.textClass} />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-white">{statusForm.Combustible_Gas_LEL} %LEL</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${gasEval.badgeBgClass}`}>
                        {gasEval.severity === 'normal' ? 'NORMAL' : gasEval.severity === 'warning' ? 'WARNING' : 'CRITICAL'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono">Spec &lt; 5.0 %LEL</span>
                  </div>

                  {/* Card 5: TMI */}
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">Thermal-Moisture (TMI)</span>
                      <Activity size={14} className="text-amber-400" />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-amber-400">{liveTMI}</span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        SPOILAGE INDEX
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block">Grain Spoilage Risk</span>
                  </div>

                  {/* Card 6: CRS */}
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300/80">Combustion Risk (CRS)</span>
                      <Flame size={14} className="text-rose-400" />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-rose-400">{liveCRS}</span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        HAZARD INDEX
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block">Gas & Smoke Hazard</span>
                  </div>

                  {/* Card 7: CPI */}
                  <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">Capacity Pressure (CPI)</span>
                      <Grid size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-cyan-400">{liveCPI}</span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        LOAD INDEX
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block">Stock Tonnes Load</span>
                  </div>

                  {/* Card 8: Stock Volume Load */}
                  <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300/80">Stock Volume Load</span>
                      <Package size={14} className="text-sky-400" />
                    </div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-sky-400">{(statusForm.Stock_Tonnes).toLocaleString()} T</span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        {statusForm.Occupancy_Pct.toFixed(1)}% OCC
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block">{(statusForm.Number_of_Sacks).toLocaleString()} Sacks Stored</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Inference Results & SHAP Feature Attribution Terminal Window */}
            <div className="lg:col-span-6 space-y-4">
              <GlassCard className="h-full flex flex-col justify-between border-2 border-cyan-500/30 bg-slate-950/80 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-500/20 pb-3 mb-4">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-cyan-400" />
                      <span>AI Inference & Hazard Prediction Terminal</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      ID: {statusForm.Warehouse_ID_Code}
                    </span>
                  </div>

                  {statusResult ? (
                    <div className="space-y-4">
                      {/* Live Inference Output Banner */}
                      <div className={`p-4 rounded-2xl border space-y-2.5 ${
                        statusResult.status.toLowerCase().includes('critical') || statusResult.status.toLowerCase().includes('hazard') || statusResult.status.toLowerCase().includes('warning')
                          ? 'bg-rose-950/40 border-rose-500/50'
                          : 'bg-emerald-950/40 border-emerald-500/50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300 font-bold">Classified Zone Condition:</span>
                          <span className="text-[10px] font-mono font-extrabold text-cyan-300">
                            Time: {statusForm.Time_Str}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge status={statusResult.status} size="lg" />
                          <span className="text-sm font-extrabold text-white bg-slate-900/80 px-3 py-1 rounded-xl border border-white/10">
                            {(statusResult.confidence * 100).toFixed(1)}% Confidence
                          </span>
                        </div>
                      </div>

                      {/* SHAP Feature Contributions */}
                      <div>
                        <span className="text-xs font-bold text-white block mb-2">
                          Top 3 Contributing SHAP Features ("Why" Flagged):
                        </span>
                        <div className="space-y-2">
                          {statusResult.top_features.map((feat, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between shadow-sm">
                              <div>
                                <span className="font-extrabold text-white block">{feat.feature}</span>
                                <span className="text-[11px] text-gray-400 font-semibold">Value: {feat.value}</span>
                              </div>
                              <span className={`font-mono font-bold ${feat.importance > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                                {feat.importance > 0 ? `+${feat.importance}` : feat.importance}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Class Probability Distribution Breakdown */}
                      {statusResult.class_probabilities && (
                        <div className="pt-3 border-t border-gray-500/10 space-y-2">
                          <span className="text-xs font-bold text-white block">
                            All 6 Class Probability Spectrum:
                          </span>
                          <div className="space-y-1.5">
                            {Object.entries(statusResult.class_probabilities).map(([cls, prob]) => (
                              <div key={cls} className="space-y-0.5">
                                <div className="flex justify-between text-[11px] font-semibold text-gray-200">
                                  <span>{cls}</span>
                                  <span className="font-mono font-bold">{(prob * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      cls === statusResult.status ? 'bg-cyan-400' : 'bg-gray-600/40'
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
                      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300 font-semibold block">Model Status:</span>
                          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/40 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                            <span>READY FOR INFERENCE</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge status="Safe" size="lg" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">Baseline Health Status</span>
                              <span className="text-[11px] text-gray-400">Click <strong className="text-cyan-400 font-bold">Run AI Telemetry Prediction</strong> above</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-cyan-300">{statusForm.Time_Str}</span>
                        </div>
                      </div>

                      {/* SHAP Feature Importance Placeholder */}
                      <div>
                        <span className="text-xs font-bold text-white block mb-2">
                          Expected Top SHAP Contributing Features:
                        </span>
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-white block">Temperature_C</span>
                              <span className="text-[11px] text-gray-400 font-semibold">Current Value: {statusForm.Temperature_C} °C ({tempEval.label})</span>
                            </div>
                            <span className="font-mono font-bold text-cyan-400">+0.420</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-white block">Combustible_Gas_LEL</span>
                              <span className="text-[11px] text-gray-400 font-semibold">Current Value: {statusForm.Combustible_Gas_LEL} %LEL ({gasEval.label})</span>
                            </div>
                            <span className="font-mono font-bold text-amber-400">+0.315</span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-white block">Humidity_Pct</span>
                              <span className="text-[11px] text-gray-400 font-semibold">Current Value: {statusForm['Humidity_%']} %RH ({humEval.label})</span>
                            </div>
                            <span className="font-mono font-bold text-cyan-400">+0.180</span>
                          </div>
                        </div>
                      </div>

                      {/* Class Probability Spectrum Baseline Preview */}
                      <div className="pt-3 border-t border-gray-500/10 space-y-2">
                        <span className="text-xs font-bold text-white block">
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
                              <div className="flex justify-between text-[11px] font-semibold text-gray-200">
                                <span>{item.cls}</span>
                                <span className="font-mono font-bold">{(item.prob * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${item.active ? 'bg-cyan-400' : 'bg-gray-600/40'}`} 
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

                <div className="mt-4 pt-3 border-t border-gray-500/10 text-[11px] text-gray-400 flex items-center gap-1.5">
                  <Info size={14} className="shrink-0 text-cyan-400" />
                  <span>Rate limited to 30 requests / minute per client IP</span>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Sensor Correlation Matrix Heatmap */}
          <GlassCard className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-500/10 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-strong flex items-center gap-2">
                  <Grid size={18} className="text-cyan-400" />
                  <span>Sensor Matrix & Parameter Cross-Correlation</span>
                </h3>
                <p className="text-xs text-gray-400">Pairwise Pearson correlation coefficients across environmental parameters</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Normal (0.0–0.5)</span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">Moderate (0.5–0.7)</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">High (0.7–0.8)</span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">Risk (&gt;0.8)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Header Row */}
                <div className="grid grid-cols-6 gap-2 text-center text-xs font-bold mb-2">
                  <div className="text-left text-gray-400 font-mono text-[11px]">Param</div>
                  {correlationParams.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-gray-500/10 text-strong truncate font-extrabold">{p}</div>
                  ))}
                </div>

                {/* Matrix Rows */}
                {correlationMatrix.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-6 gap-2 text-center text-xs mb-2">
                    <div className="p-2.5 rounded-xl bg-gray-500/10 text-left font-extrabold text-strong truncate flex items-center">
                      {correlationParams[rIdx]}
                    </div>
                    {row.map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      return (
                        <div
                          key={cIdx}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold matrix-cell transition-all hover:scale-105 cursor-pointer ${getCellBg(val, isDiag)}`}
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
                  <TrendingUp size={16} className="text-cyan-400" />
                  <span>Ridge Capacity Regressor Input</span>
                </h3>

                <form onSubmit={handlePredictYearly} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Previous Year Average Fill %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={yearlyForm.Previous_Year_Avg_Fill_Pct}
                      onChange={(e) => setYearlyForm({ ...yearlyForm, Previous_Year_Avg_Fill_Pct: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Previous Year Days Rack Full
                    </label>
                    <input
                      type="number"
                      value={yearlyForm.Previous_Year_Days_RackFull}
                      onChange={(e) => setYearlyForm({ ...yearlyForm, Previous_Year_Days_RackFull: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
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
                    <span className="text-xs text-gray-400 block">Projected Occupancy:</span>
                    <span className="text-2xl font-extrabold text-strong block">{yearlyResult.projected_occupancy_pct}%</span>
                    <span className="text-[11px] text-gray-400 block">
                      95% Confidence Interval: [{yearlyResult.confidence_interval.lower_bound}% – {yearlyResult.confidence_interval.upper_bound}%]
                    </span>
                  </div>
                )}
              </GlassCard>
            </div>

            <div className="lg:col-span-7">
              <GlassCard>
                <h3 className="font-bold text-sm text-strong mb-4">Sample District Capacity Forecast Comparison</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Coimbatore', previous: 64.5, projected: 68.2 },
                      { name: 'Madurai', previous: 72.0, projected: 75.8 },
                      { name: 'Trichy', previous: 58.4, projected: 61.0 },
                      { name: 'Salem', previous: 81.2, projected: 84.5 },
                      { name: 'Tirunelveli', previous: 55.0, projected: 57.6 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="previous" fill="#94A3B8" name="Previous Year Fill %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projected" fill="#38BDF8" name="Projected Occupancy %" radius={[4, 4, 0, 0]} />
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
