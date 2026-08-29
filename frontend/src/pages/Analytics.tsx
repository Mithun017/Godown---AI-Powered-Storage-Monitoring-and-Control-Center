import React, { useEffect, useState } from 'react';
import type { ModelMetrics } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { 
  Info, Cpu, BarChart3, ShieldCheck, Zap, Sparkles, 
  Activity, TrendingUp, Grid, Target
} from 'lucide-react';
import { 
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Tooltip, Legend
} from 'recharts';

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | '3d-importance' | 'confusion-matrix'>('overview');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ModelMetrics>('/api/analytics/model-metrics');
      setMetrics(res.data);
    } catch (e) {
      console.error("Failed to load model metrics", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Feature Importance Data sorted descending
  const sortedFeatures = metrics.classifier.features
    .map((feat, idx) => ({
      name: feat.replace('_', ' '),
      rawName: feat,
      importance: metrics.classifier.feature_importances[idx] || 0,
    }))
    .sort((a, b) => b.importance - a.importance);

  const maxImportance = Math.max(...sortedFeatures.map(f => f.importance), 0.01);

  // Radar chart dataset across all classes for Precision, Recall, and F1
  const radarData = Object.entries(metrics.classifier.class_metrics).map(([clsName, m]) => ({
    class: clsName,
    Precision: Number((m.precision * 100).toFixed(1)),
    Recall: Number((m.recall * 100).toFixed(1)),
    F1: Number((m.f1 * 100).toFixed(1)),
  }));

  // Confusion matrix calculation totals
  const cm = metrics.classifier.confusion_matrix || [];
  const classes = metrics.classifier.classes || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-strong tracking-tight flex items-center gap-2">
            <Cpu className="text-cyan-500" size={24} />
            <span>Machine Learning Performance & 3D Analytics Hub</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time model validation metrics, SHAP feature attributions, and 3D matrix visualization
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-gray-500/10 border border-gray-500/15">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-gray-500 hover:text-strong'
            }`}
          >
            Performance Overview
          </button>

          <button
            onClick={() => setActiveTab('3d-importance')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === '3d-importance'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-gray-500 hover:text-strong'
            }`}
          >
            3D Feature Importance
          </button>

          <button
            onClick={() => setActiveTab('confusion-matrix')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'confusion-matrix'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-gray-500 hover:text-strong'
            }`}
          >
            3D Confusion Matrix
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between text-cyan-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">XGBoost Accuracy</span>
            <ShieldCheck size={20} />
          </div>
          <span className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 block">
            {(metrics.classifier.accuracy * 100).toFixed(2)}%
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">2026 Test Dataset Slice</span>
        </GlassCard>

        <GlassCard className="p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Model 1 Macro-F1</span>
            <Target size={20} />
          </div>
          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 block">
            {metrics.classifier.macro_f1.toFixed(4)}
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Target: &ge; 0.90 Macro-F1</span>
        </GlassCard>

        <GlassCard className="p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Model 2 MAE</span>
            <TrendingUp size={20} />
          </div>
          <span className="text-3xl font-extrabold text-amber-500 block">
            {metrics.forecaster.mae.toFixed(4)} pp
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Ridge Leave-One-Out CV</span>
        </GlassCard>

        <GlassCard className="p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between text-purple-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">SMOTE Balance</span>
            <Zap size={20} />
          </div>
          <span className="text-xl font-extrabold text-strong mt-1 block">
            {metrics.classifier.smote_applied ? 'Applied' : 'Not Required'}
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Balanced Class Weighting</span>
        </GlassCard>
      </div>

      {/* Forecaster Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold block text-sm">Model 2 Forecaster Note:</span>
          <span>{metrics.forecaster.forecaster_note}</span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Multi-Class Evaluation Radar Chart */}
            <div className="lg:col-span-7">
              <GlassCard className="h-full space-y-4">
                <div className="flex items-center justify-between border-b border-gray-500/10 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-strong flex items-center gap-2">
                      <Activity size={18} className="text-cyan-500" />
                      <span>Class Precision, Recall & F1 Spectrum</span>
                    </h3>
                    <p className="text-xs text-gray-500">Multivariate model evaluation across all 6 safety target classes</p>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid strokeDasharray="3 3" opacity={0.2} />
                      <PolarAngleAxis dataKey="class" tick={{ fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                      <Legend />
                      <Radar name="Precision %" dataKey="Precision" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.25} />
                      <Radar name="Recall %" dataKey="Recall" stroke="#10B981" fill="#10B981" fillOpacity={0.25} />
                      <Radar name="F1 Score %" dataKey="F1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            {/* Feature Pipeline & Engineered Metrics Overview */}
            <div className="lg:col-span-5 space-y-4">
              <GlassCard className="h-full flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-strong flex items-center gap-2 border-b border-gray-500/10 pb-3">
                    <Sparkles size={18} className="text-cyan-500" />
                    <span>ML Pipeline & Engineered Feature Weights</span>
                  </h3>

                  <div className="space-y-3 mt-3">
                    {sortedFeatures.slice(0, 5).map((f, idx) => {
                      const pct = Math.round((f.importance / maxImportance) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-extrabold text-strong">
                            <span className="capitalize">{f.name}</span>
                            <span className="font-mono text-cyan-600 dark:text-cyan-400">
                              {(f.importance * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-500/15 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-500"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-300 block">Custom Domain Feature Engineering:</span>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
                    Combines sensor metrics into <strong>Thermal-Moisture Index (TMI)</strong>, <strong>Combustion Risk Score (CRS)</strong>, and <strong>Capacity Pressure Index (CPI)</strong>.
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Per-Class Evaluation Breakdown Table */}
          <GlassCard className="space-y-4">
            <h3 className="font-extrabold text-sm text-strong">Model 1 Per-Class Evaluation Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-500/10 text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 font-extrabold">Condition Class</th>
                    <th className="pb-3 font-extrabold">Precision</th>
                    <th className="pb-3 font-extrabold">Recall</th>
                    <th className="pb-3 font-extrabold">F1-Score</th>
                    <th className="pb-3 font-extrabold">Status Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-500/10">
                  {Object.entries(metrics.classifier.class_metrics).map(([clsName, m]) => (
                    <tr key={clsName} className="hover:bg-gray-500/5 transition-colors">
                      <td className="py-3 font-extrabold text-strong">{clsName}</td>
                      <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">{m.precision.toFixed(4)}</td>
                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{m.recall.toFixed(4)}</td>
                      <td className="py-3 font-mono font-extrabold text-cyan-600 dark:text-cyan-400">{m.f1.toFixed(4)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          m.f1 >= 0.95
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {m.f1 >= 0.95 ? 'Optimal' : 'High Accuracy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: 3D ISOMETRIC FEATURE IMPORTANCE */}
      {activeTab === '3d-importance' && (
        <GlassCard className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-500/10 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-strong flex items-center gap-2">
                <BarChart3 size={20} className="text-cyan-500" />
                <span>3D Isometric Feature Importance Columns</span>
              </h3>
              <p className="text-xs text-gray-500">Visualizing XGBoost gain weights with 3D isometric column extrusion</p>
            </div>
            <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/20">
              Interactive 3D Extrusion View
            </span>
          </div>

          {/* 3D Isometric Columns SVG Visualization */}
          <div className="overflow-x-auto py-6">
            <div className="min-w-[650px] flex items-end justify-between gap-4 h-80 px-8 pt-12 pb-10 relative bg-slate-950/40 dark:bg-slate-900/60 rounded-2xl border border-gray-500/20">
              
              {/* Grid Background Lines */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-cyan-500 w-full" />
                <div className="border-b border-cyan-500 w-full" />
                <div className="border-b border-cyan-500 w-full" />
                <div className="border-b border-cyan-500 w-full" />
              </div>

              {sortedFeatures.map((f, idx) => {
                const heightPct = Math.max(8, Math.round((f.importance / maxImportance) * 100));
                const colColors = [
                  { top: '#38BDF8', front: '#0284C7', right: '#0369A1' },
                  { top: '#34D399', front: '#059669', right: '#047857' },
                  { top: '#FBBF24', front: '#D97706', right: '#B45309' },
                  { top: '#F472B6', front: '#DB2777', right: '#BE185D' },
                  { top: '#A78BFA', front: '#7C3AED', right: '#6D28D9' },
                ][idx % 5];

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative cursor-pointer z-10">
                    {/* Hover Value Badge */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all transform -translate-y-2 group-hover:-translate-y-4 absolute -top-10 bg-slate-900 text-white font-mono text-[10px] font-extrabold py-1 px-2 rounded-lg border border-cyan-500/40 shadow-xl whitespace-nowrap z-30">
                      {f.rawName}: {(f.importance * 100).toFixed(2)}%
                    </div>

                    {/* 3D Column Element */}
                    <div className="w-full flex justify-center items-end" style={{ height: `${heightPct}%` }}>
                      <svg width="44" height="100%" className="overflow-visible">
                        {/* Right Face (Depth) */}
                        <polygon
                          points="28,0 42,-8 42,100% 28,100%"
                          fill={colColors.right}
                          opacity="0.85"
                        />
                        {/* Top Face (Roof) */}
                        <polygon
                          points="0,0 14,-8 42,-8 28,0"
                          fill={colColors.top}
                        />
                        {/* Front Face */}
                        <rect
                          x="0"
                          y="0"
                          width="28"
                          height="100%"
                          fill={colColors.front}
                          rx="1"
                        />
                      </svg>
                    </div>

                    {/* Feature Label */}
                    <span className="text-[10px] font-extrabold text-strong mt-3 truncate max-w-[70px] text-center group-hover:text-cyan-400 transition-colors">
                      {f.rawName.split('_')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      )}

      {/* TAB 3: 3D CONFUSION MATRIX */}
      {activeTab === 'confusion-matrix' && (
        <GlassCard className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-500/10 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-strong flex items-center gap-2">
                <Grid size={20} className="text-cyan-500" />
                <span>3D Elevated Confusion Matrix Heatmap</span>
              </h3>
              <p className="text-xs text-gray-500">Actual vs Predicted classification counts with 3D elevation intensity</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Diagonal (Correct)</span>
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">Off-Diagonal (Misclassified)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px] space-y-2">
              {/* Header Row: Predicted Classes */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold">
                <div className="text-left text-gray-400 font-mono text-[10px] self-center">Actual \ Pred</div>
                {classes.map((c, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-gray-500/10 text-strong truncate font-extrabold text-[11px]">
                    {c}
                  </div>
                ))}
              </div>

              {/* Matrix Content */}
              {cm.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-7 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-500/10 text-left font-extrabold text-strong truncate flex items-center text-[11px]">
                    {classes[rIdx] || `Class ${rIdx}`}
                  </div>
                  {row.map((val, cIdx) => {
                    const isDiag = rIdx === cIdx;
                    const maxValInMatrix = Math.max(...cm.flat(), 1);
                    const intensityPct = Math.min(100, Math.round((val / maxValInMatrix) * 100));

                    return (
                      <div
                        key={cIdx}
                        className={`p-3.5 rounded-xl border text-xs font-extrabold transition-all hover:scale-105 cursor-pointer relative shadow-md ${
                          isDiag
                            ? 'bg-cyan-500/25 text-cyan-950 dark:text-cyan-200 border-cyan-500/40 shadow-cyan-500/10'
                            : val > 0
                            ? 'bg-rose-500/25 text-rose-950 dark:text-rose-200 border-rose-500/40'
                            : 'bg-gray-500/10 text-gray-500 border-gray-500/10'
                        }`}
                        title={`Actual: ${classes[rIdx]} -> Predicted: ${classes[cIdx]}: ${val} instances`}
                      >
                        <span className="relative z-10 text-xs font-extrabold">{val}</span>
                        {/* 3D Elevation Line Accent */}
                        {isDiag && val > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-400 rounded-b-xl"
                            style={{ opacity: Math.max(0.4, intensityPct / 100) }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
