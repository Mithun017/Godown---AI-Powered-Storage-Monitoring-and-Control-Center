import React, { useEffect, useState } from 'react';
import type { Warehouse, PaginatedReadings } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { MapPin, ArrowLeft, Layers } from 'lucide-react';

interface WarehouseDetailProps {
  warehouseId: number;
  onBack: () => void;
}

export const WarehouseDetail: React.FC<WarehouseDetailProps> = ({ warehouseId, onBack }) => {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [readings, setReadings] = useState<PaginatedReadings | null>(null);
  const [activeZone, setActiveZone] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWarehouseDetail();
  }, [warehouseId]);

  useEffect(() => {
    if (warehouseId && activeZone) {
      fetchZoneReadings(warehouseId, activeZone);
    }
  }, [warehouseId, activeZone]);

  const fetchWarehouseDetail = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<Warehouse>(`/api/warehouses/${warehouseId}`);
      setWarehouse(res.data);
    } catch (e) {
      console.error("Failed to load warehouse detail", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchZoneReadings = async (wId: number, zId: number) => {
    try {
      const res = await apiClient.get<PaginatedReadings>(`/api/warehouses/${wId}/zones/${zId}/readings?page=1&limit=15`);
      setReadings(res.data);
    } catch (e) {
      console.error("Failed to load zone readings", e);
    }
  };

  if (isLoading || !warehouse) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-strong transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-strong tracking-tight">{warehouse.name}</h1>
            <StatusBadge status={warehouse.latest_status || 'Safe'} />
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
            <MapPin size={14} className="text-cyan-500" />
            <span>{warehouse.district} District • Lat: {warehouse.latitude}, Lon: {warehouse.longitude}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {warehouse.zones.map((z) => {
          const isActive = activeZone === z.zone_id;
          return (
            <button
              key={z.zone_id}
              onClick={() => setActiveZone(z.zone_id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-600 dark:text-cyan-300 shadow-md'
                  : 'glass-panel hover:border-gray-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-strong">Zone #{z.zone_id}</span>
                <Layers size={16} className={isActive ? 'text-cyan-500' : 'text-gray-400'} />
              </div>
              <div className="mt-2 space-y-0.5">
                <span className="text-xs font-medium block truncate">{z.commodity_type}</span>
                <span className="text-[11px] text-gray-500 block">Capacity: {z.capacity_sacks} Sacks</span>
              </div>
            </button>
          );
        })}
      </div>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-strong">Recent Sensor Readings — Zone {activeZone}</h3>
          <span className="text-xs text-gray-500">Showing latest {readings?.readings.length || 0} readings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-500/10 text-gray-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Temp (°C)</th>
                <th className="pb-3 font-semibold">Humidity (%)</th>
                <th className="pb-3 font-semibold">Smoke (PPM)</th>
                <th className="pb-3 font-semibold">Motion</th>
                <th className="pb-3 font-semibold">Sack Count</th>
                <th className="pb-3 font-semibold">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {readings?.readings.map((r, i) => (
                <tr key={i} className="hover:bg-gray-500/5 transition-colors">
                  <td className="py-3 font-mono text-gray-400">{r.Timestamp}</td>
                  <td className="py-3">
                    <StatusBadge status={r.Warehouse_Status} size="sm" />
                  </td>
                  <td className="py-3 font-semibold text-strong">{r.Temperature_C}°C</td>
                  <td className="py-3 font-semibold text-strong">{r['Humidity_%']}%</td>
                  <td className="py-3 font-mono">{r.Smoke_ppm}</td>
                  <td className="py-3 font-medium">{r.Motion ? 'Detected' : 'Clear'}</td>
                  <td className="py-3 font-semibold">{r.Number_of_Sacks} / {r.Zone_Capacity_Sacks}</td>
                  <td className="py-3 font-bold text-cyan-600 dark:text-cyan-400">{r.Occupancy_Pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
