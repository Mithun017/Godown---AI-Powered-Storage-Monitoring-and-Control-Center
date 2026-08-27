import React, { useState } from 'react';
import type { PredictStatusResponse, PredictYearlyResponse } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Sparkles, AlertCircle, ArrowRight, TrendingUp, Info } from 'lucide-react';
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

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-strong tracking-tight">Predictive Machine Learning Hub</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Gradient-boosted zone condition classifier & yearly capacity regression models
        </p>
      </div>

      <div className="flex border-b border-gray-500/10 gap-4">
        <button
          onClick={() => setActiveTab('classifier')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'classifier'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          Model 1 — Real-time Zone Condition Classifier
        </button>

        <button
          onClick={() => setActiveTab('forecaster')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'forecaster'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <GlassCard>
              <h3 className="font-bold text-sm text-strong mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-500" />
                <span>Simulate Sensor Telemetry Inputs</span>
              </h3>

              <form onSubmit={handlePredictStatus} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={statusForm.Temperature_C}
                      onChange={(e) => setStatusForm({ ...statusForm, Temperature_C: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Humidity (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={statusForm['Humidity_%']}
                      onChange={(e) => setStatusForm({ ...statusForm, 'Humidity_%': Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Smoke (PPM)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={statusForm.Smoke_ppm}
                      onChange={(e) => setStatusForm({ ...statusForm, Smoke_ppm: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Ultrasonic Dist (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={statusForm.Distance_cm}
                      onChange={(e) => setStatusForm({ ...statusForm, Distance_cm: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">PIR Motion (0/1)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      value={statusForm.Motion}
                      onChange={(e) => setStatusForm({ ...statusForm, Motion: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Occupancy %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={statusForm.Occupancy_Pct}
                      onChange={(e) => setStatusForm({ ...statusForm, Occupancy_Pct: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isStatusLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isStatusLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Run XGBoost Zone Status Inference</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </GlassCard>
          </div>

          <div className="lg:col-span-5">
            <GlassCard className="h-full flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-strong mb-4">Inference Output & SHAP Feature Attribution</h3>

                {statusResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20 space-y-2">
                      <span className="text-xs text-gray-500 block">Classified Condition:</span>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={statusResult.status} size="lg" />
                        <span className="text-xs font-bold text-strong">
                          {(statusResult.confidence * 100).toFixed(1)}% Confidence
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-strong block mb-2">
                        Top 3 Contributing SHAP Features ("Why" Flagged):
                      </span>
                      <div className="space-y-2">
                        {statusResult.top_features.map((feat, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-gray-500/10 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-strong block">{feat.feature}</span>
                              <span className="text-[11px] text-gray-500">Value: {feat.value}</span>
                            </div>
                            <span className={`font-mono font-bold ${feat.importance > 0 ? 'text-amber-500' : 'text-cyan-500'}`}>
                              {feat.importance > 0 ? `+${feat.importance}` : feat.importance}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-500/20 rounded-xl">
                    Run inference on the left form to view live status classification and SHAP explanations.
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
