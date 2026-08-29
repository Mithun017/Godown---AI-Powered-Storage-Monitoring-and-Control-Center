import React, { useEffect, useState } from 'react';
import type { Warehouse } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Warehouse as WarehouseIcon, MapPin, ChevronRight, PieChart } from 'lucide-react';

interface WarehousesProps {
  onSelectWarehouse: (id: number) => void;
}

export const Warehouses: React.FC<WarehousesProps> = ({ onSelectWarehouse }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<Warehouse[]>('/api/warehouses');
      setWarehouses(res.data);
    } catch (e) {
      console.error("Failed to load warehouses list", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-strong tracking-tight">Tamil Nadu Warehouse Network</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Detailed overview of all 10 central storage godowns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <GlassCard
            key={w.warehouse_id}
            onClick={() => onSelectWarehouse(w.warehouse_id)}
            className="flex flex-col justify-between space-y-4 hover:border-cyan-500/40 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                    <WarehouseIcon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-strong group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {w.name}
                    </h3>
                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} />
                      <span>{w.district}</span>
                    </span>
                  </div>
                </div>
                <StatusBadge status={w.latest_status || 'Safe'} size="sm" />
              </div>

              <div className="pt-2 border-t border-gray-500/10">
                <span className="text-[11px] text-gray-500 font-semibold block mb-1.5">Monitored Zones & Commodities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {w.zones.map((z) => (
                    <span
                      key={z.zone_id}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-extrabold text-slate-800 dark:text-slate-200"
                    >
                      Zone {z.zone_id}: {z.commodity_type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <PieChart size={16} className="text-cyan-500" />
                <span className="font-semibold text-strong">Occupancy: {w.current_occupancy_pct ?? 'N/A'}%</span>
              </div>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                <span>View Details</span>
                <ChevronRight size={14} />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
