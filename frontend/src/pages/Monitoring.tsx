import React, { useEffect, useState } from 'react';
import type { Warehouse, PaginatedReadings, SensorReading } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Activity, Thermometer, Droplets, Flame, Package, RefreshCw, Move } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';

export const Monitoring: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(1);
  const [selectedZoneId, setSelectedZoneId] = useState<number>(1);
  const [readingsData, setReadingsData] = useState<PaginatedReadings | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId && selectedZoneId) {
      fetchReadings(selectedWarehouseId, selectedZoneId);
    }
  }, [selectedWarehouseId, selectedZoneId]);

  const fetchWarehouses = async () => {
    try {
      const res = await apiClient.get<Warehouse[]>('/api/warehouses');
      setWarehouses(res.data);
      if (res.data.length > 0) {
        setSelectedWarehouseId(res.data[0].warehouse_id);
      }
    } catch (e) {
      console.error("Failed to load warehouses", e);
    }
  };

  const fetchReadings = async (wId: number, zId: number) => {
    try {
      const res = await apiClient.get<PaginatedReadings>(`/api/warehouses/${wId}/zones/${zId}/readings?page=1&limit=30`);
      setReadingsData(res.data);
    } catch (e) {
      console.error("Failed to load readings", e);
    }
  };

  const currentReading: SensorReading | undefined = readingsData?.readings[0];
  const chartData = readingsData?.readings ? [...readingsData.readings].reverse() : [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-strong tracking-tight">Live Zone Telemetry Monitoring</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ESP32 sensor telemetry streams (DHT22, HC-SR04, PIR, MQ Gas)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(Number(e.target.value));
              setSelectedZoneId(1);
            }}
            className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
          >
            {warehouses.map((w) => (
              <option key={w.warehouse_id} value={w.warehouse_id}>
                {w.name} (#{w.warehouse_id})
              </option>
            ))}
          </select>

          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-semibold text-strong outline-none"
          >
            {[1, 2, 3, 4].map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchReadings(selectedWarehouseId, selectedZoneId)}
            className="p-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-strong transition-colors cursor-pointer"
            title="Refresh Live Reading"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {currentReading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <GlassCard className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-500">
              <Thermometer size={18} />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Temp</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Temperature_C}°C</span>
              <span className="text-[10px] text-gray-500 block truncate">{currentReading.Temp_Status}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-500">
              <Droplets size={18} />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Humidity</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading['Humidity_%']}%</span>
              <span className="text-[10px] text-gray-500 block truncate">Relative Humidity</span>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-orange-500">
              <Flame size={18} />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Smoke</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Smoke_ppm}</span>
              <span className="text-[10px] text-gray-500 block truncate">PPM Level</span>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-500">
              <Activity size={18} />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Motion</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Motion ? 'Detected' : 'Clear'}</span>
              <span className="text-[10px] text-gray-500 block truncate">PIR Infrared</span>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-500">
              <Package size={18} />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Sacks</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Number_of_Sacks}</span>
              <span className="text-[10px] text-gray-500 block truncate">Max: {currentReading.Zone_Capacity_Sacks}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-500">
              <Move size={18} />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Distance</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Distance_cm} cm</span>
              <span className="text-[10px] text-gray-500 block truncate">Ultrasonic Proximity</span>
            </div>
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-strong">Temperature & Humidity Trends</h3>
            <span className="text-xs text-gray-500">Last 30 Readings</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 10 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Temperature_C" name="Temp (°C)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Humidity_%" name="Humidity (%)" stroke="#38BDF8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-strong">Occupancy vs Vacant Space (%)</h3>
            <span className="text-xs text-gray-500">Zone Utilization</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-15)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 10 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="Occupancy_Pct" name="Occupancy %" fill="#219EBC" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vacant_Space_Pct" name="Vacant %" fill="#8ECAE6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
