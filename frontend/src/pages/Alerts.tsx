import React, { useEffect, useState } from 'react';
import type { Alert } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, acknowledgedFilter]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      let url = '/api/alerts?';
      if (severityFilter !== 'all') url += `severity=${encodeURIComponent(severityFilter)}&`;
      if (acknowledgedFilter !== 'all') url += `acknowledged=${acknowledgedFilter === 'true'}`;

      const res = await apiClient.get<Alert[]>(url);
      setAlerts(res.data);
    } catch (e) {
      console.error("Failed to load alerts feed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await apiClient.post(`/api/alerts/${id}/acknowledge`);
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    } catch (e) {
      console.error("Failed to acknowledge alert", e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-strong tracking-tight">Active & Historical Safety Alerts</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time IoT threshold breaches with Groq LLM plain-language narration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
          >
            <option value="all">All Severities</option>
            <option value="Fire Risk - Critical">Fire Risk - Critical</option>
            <option value="Critical">Critical</option>
            <option value="High Temp">High Temp</option>
            <option value="Rack Full">Rack Full</option>
          </select>

          <select
            value={acknowledgedFilter}
            onChange={(e) => setAcknowledgedFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
          >
            <option value="all">All Status</option>
            <option value="false">Unacknowledged</option>
            <option value="true">Acknowledged</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="p-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-strong transition-colors cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <GlassCard className="p-12 text-center text-gray-500 space-y-3">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/15 text-emerald-500">
            <ShieldCheck size={32} />
          </div>
          <h3 className="font-bold text-strong text-sm">No Active Safety Alerts Found</h3>
          <p className="text-xs max-w-sm mx-auto">All 10 Tamil Nadu warehouses and 40 zones are currently operating within safe operational parameters.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <GlassCard key={a.id} className={`transition-all ${a.acknowledged ? 'opacity-70' : 'border-amber-500/30'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={a.severity} />
                    <span className="font-bold text-sm text-strong">{a.warehouse_name} (Zone {a.zone_id})</span>
                    <span className="text-xs text-gray-400 font-mono">{a.created_at}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-500/10 border border-gray-500/15 text-xs text-strong leading-relaxed">
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 block mb-1 uppercase tracking-wider">
                      Groq LLM Incident Narration:
                    </span>
                    {a.narration}
                  </div>
                </div>

                <div className="shrink-0">
                  {a.acknowledged ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 size={14} />
                      <span>Acknowledged</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      Acknowledge Alert
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
