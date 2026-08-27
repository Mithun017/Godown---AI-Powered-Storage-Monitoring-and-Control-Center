import React, { useEffect, useState } from 'react';
import type { ModelMetrics } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const featureChartData = metrics.classifier.features.map((feat, idx) => ({
    name: feat,
    importance: metrics.classifier.feature_importances[idx] || 0,
  }));

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-strong tracking-tight">Machine Learning Model Performance & Analytics</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Live verification of model validation metrics, class precision/recall, and feature importances
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Model 1 Accuracy</span>
          <span className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-1 block">
            {(metrics.classifier.accuracy * 100).toFixed(2)}%
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Test Split (2026 Slice)</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Model 1 Macro-F1</span>
          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {metrics.classifier.macro_f1.toFixed(4)}
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Target: &ge; 0.90 Macro-F1</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Model 2 MAE</span>
          <span className="text-3xl font-extrabold text-amber-500 mt-1 block">
            {metrics.forecaster.mae.toFixed(4)} pp
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Ridge Leave-One-Out CV</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">SMOTE Oversampling</span>
          <span className="text-xl font-bold text-strong mt-2 block">
            {metrics.classifier.smote_applied ? 'Applied' : 'Not Required'}
          </span>
          <span className="text-[11px] text-gray-500 block mt-1">Class Weighting Sufficient</span>
        </GlassCard>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm">Model 2 Forecaster Note (Amendment #5):</span>
          <span>{metrics.forecaster.forecaster_note}</span>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-strong">XGBoost Classifier Feature Importance Weights</h3>
          <span className="text-xs text-gray-500">9 Sensor Telemetry Inputs</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={featureChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="importance" name="Importance Score" fill="#219EBC" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-bold text-sm text-strong mb-4">Model 1 Per-Class Evaluation Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-500/10 text-gray-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Condition Class</th>
                <th className="pb-3 font-semibold">Precision</th>
                <th className="pb-3 font-semibold">Recall</th>
                <th className="pb-3 font-semibold">F1-Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {Object.entries(metrics.classifier.class_metrics).map(([clsName, m]) => (
                <tr key={clsName} className="hover:bg-gray-500/5">
                  <td className="py-3 font-bold text-strong">{clsName}</td>
                  <td className="py-3 font-mono font-semibold">{m.precision}</td>
                  <td className="py-3 font-mono font-semibold text-emerald-500">{m.recall}</td>
                  <td className="py-3 font-mono font-bold text-cyan-500">{m.f1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
