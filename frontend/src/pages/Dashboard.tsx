import React, { useEffect, useState } from 'react';
import type { Warehouse, AnalyticsOverview } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Warehouse as WarehouseIcon, MapPin, ChevronDown, ChevronUp, Layers, Package, PieChart, RefreshCw } from 'lucide-react';

interface DashboardProps {
  onSelectWarehouse: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectWarehouse }) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ovRes, wRes] = await Promise.all([
        apiClient.get<AnalyticsOverview>('/api/analytics/overview'),
        apiClient.get<Warehouse[]>('/api/warehouses')
      ]);
      setOverview(ovRes.data);
      setWarehouses(wRes.data);
      if (wRes.data.length > 0) {
        setExpandedDistrict(wRes.data[0].district);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const districtGroups = warehouses.reduce((acc, w) => {
    if (!acc[w.district]) acc[w.district] = [];
    acc[w.district].push(w);
    return acc;
  }, {} as Record<string, Warehouse[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-500 font-medium">Loading Tamil Nadu Warehouse CRM Rollup...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-strong tracking-tight">Tamil Nadu Control Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time IoT state-wide rollup across 10 central godowns & 40 storage zones
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-xs font-semibold text-strong transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <PieChart size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">TN Occupancy</span>
              <span className="text-2xl font-extrabold text-strong">{overview.overall_occupancy_pct}%</span>
              <span className="text-[11px] text-gray-500 block mt-0.5">Capacity Utilization</span>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Package size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Total Stored Sacks</span>
              <span className="text-2xl font-extrabold text-strong">{overview.current_stored_sacks.toLocaleString()}</span>
              <span className="text-[11px] text-gray-500 block mt-0.5">Of {overview.total_capacity_sacks.toLocaleString()} Capacity</span>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400">
              <Layers size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Available Space</span>
              <span className="text-2xl font-extrabold text-strong">{overview.vacant_space_sacks.toLocaleString()}</span>
              <span className="text-[11px] text-gray-500 block mt-0.5">Vacant Sacks Capacity</span>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <WarehouseIcon size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Active Godowns</span>
              <span className="text-2xl font-extrabold text-strong">{overview.total_warehouses} Warehouses</span>
              <span className="text-[11px] text-gray-500 block mt-0.5">40 Zones Monitored</span>
            </div>
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-base font-bold text-strong flex items-center gap-2">
            <MapPin size={18} className="text-cyan-500" />
            <span>District Drill-Down (Place → Warehouse)</span>
          </h2>

          <div className="space-y-3">
            {Object.entries(districtGroups).map(([district, districtWarehouses]) => {
              const isOpen = expandedDistrict === district;
              return (
                <div key={district} className="glass-panel overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedDistrict(isOpen ? null : district)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-500/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-strong">{district} District</h3>
                        <span className="text-xs text-gray-500">{districtWarehouses.length} Warehouse(s)</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {isOpen && (
                    <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-500/10 mt-2">
                      {districtWarehouses.map((w) => (
                        <div
                          key={w.warehouse_id}
                          onClick={() => onSelectWarehouse(w.warehouse_id)}
                          className="p-4 rounded-xl bg-gray-500/5 hover:bg-gray-500/15 border border-gray-500/10 transition-all cursor-pointer space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-strong">{w.name}</h4>
                              <span className="text-[11px] text-gray-500">ID #{w.warehouse_id} • 4 Shed Zones</span>
                            </div>
                            <StatusBadge status={w.latest_status || 'Safe'} size="sm" />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-white/40 dark:bg-slate-900/40">
                              <span className="text-[10px] text-gray-500 block">Occupancy</span>
                              <span className="font-bold text-strong">{w.current_occupancy_pct ?? 'N/A'}%</span>
                            </div>

                            <div className="p-2 rounded-lg bg-white/40 dark:bg-slate-900/40">
                              <span className="text-[10px] text-gray-500 block">Vacant Space</span>
                              <span className="font-bold text-strong">{w.current_occupancy_pct ? (100 - w.current_occupancy_pct).toFixed(1) : 'N/A'}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4">
          <GlassCard className="h-full flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-strong flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-cyan-500" />
                <span>TN Network Map</span>
              </h2>

              <div className="relative w-full h-80 bg-slate-900/60 rounded-xl border border-gray-500/20 overflow-hidden flex items-center justify-center p-4">
                <svg viewBox="76 8 4 6" className="w-full h-full transform scale-y-[-1]">
                  {warehouses.map((w) => {
                    const isCritical = w.latest_status?.includes('Critical') || w.latest_status?.includes('Risk');
                    return (
                      <g key={w.warehouse_id} className="cursor-pointer" onClick={() => onSelectWarehouse(w.warehouse_id)}>
                        <circle
                          cx={w.longitude}
                          cy={w.latitude}
                          r="0.08"
                          fill={isCritical ? '#FB8500' : '#219EBC'}
                          className="animate-ping opacity-75"
                        />
                        <circle
                          cx={w.longitude}
                          cy={w.latitude}
                          r="0.06"
                          fill={isCritical ? '#FB8500' : '#219EBC'}
                        />
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-slate-900/90 text-[11px] text-gray-300 flex items-center justify-around border border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                    <span>Safe Godown</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>Critical Flag</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-500/10 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Total Warehouses Plotted:</span>
                <span className="font-semibold text-strong">{warehouses.length} / 10</span>
              </div>
              <div className="flex justify-between">
                <span>Districts Covered:</span>
                <span className="font-semibold text-strong">{Object.keys(districtGroups).length} Districts</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
