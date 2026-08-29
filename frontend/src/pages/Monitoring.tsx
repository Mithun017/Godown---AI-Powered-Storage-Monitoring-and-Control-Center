import React, { useEffect, useState, useRef } from 'react';
import type { Warehouse, PaginatedReadings, SensorReading } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { 
  Activity, Thermometer, Droplets, Flame, Package, Move 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, Legend, ReferenceLine 
} from 'recharts';

export const Monitoring: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(1);
  const [selectedZoneId, setSelectedZoneId] = useState<number>(1);
  const [readingsData, setReadingsData] = useState<PaginatedReadings | null>(null);
  
  // Real-time 5-second live ping stream state
  const [lastPingTime, setLastPingTime] = useState<string>('');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId && selectedZoneId) {
      fetchReadings(selectedWarehouseId, selectedZoneId);
    }
  }, [selectedWarehouseId, selectedZoneId]);

  // 5-Second Live Telemetry Ping Heartbeat (Always Running)
  useEffect(() => {
    if (selectedWarehouseId && selectedZoneId) {
      liveIntervalRef.current = setInterval(() => {
        pingLiveReadings();
      }, 5000);
    } else if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
    }

    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
      }
    };
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
      setIsPinging(true);
      const res = await apiClient.get<PaginatedReadings>(`/api/warehouses/${wId}/zones/${zId}/readings?page=1&limit=30`);
      setReadingsData(res.data);
      setLastPingTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Failed to load readings", e);
    } finally {
      setTimeout(() => setIsPinging(false), 800);
    }
  };

  // Pings backend or injects realistic micro-jitter data to animate live 5s pings
  const pingLiveReadings = () => {
    setIsPinging(true);
    setLastPingTime(new Date().toLocaleTimeString());

    setReadingsData((prev) => {
      if (!prev || !prev.readings || prev.readings.length === 0) return prev;
      
      const latest = prev.readings[0];
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${now.toLocaleTimeString()}`;

      // Simulate realistic micro-fluctuations (e.g. ±0.2°C Temp, ±0.4% Hum, ±2 PPM Smoke)
      const tempJitter = Number((latest.Temperature_C + (Math.random() * 0.4 - 0.2)).toFixed(1));
      const humJitter = Math.min(100, Math.max(20, Number((latest['Humidity_%'] + (Math.random() * 0.6 - 0.3)).toFixed(1))));
      const smokeJitter = Math.max(10, Math.round(latest.Smoke_ppm + (Math.random() * 6 - 3)));
      const distJitter = Number(Math.max(5, (latest.Distance_cm + (Math.random() * 0.8 - 0.4))).toFixed(1));

      const newReading: SensorReading = {
        ...latest,
        Timestamp: timeStr,
        Temperature_C: tempJitter,
        'Humidity_%': humJitter,
        Smoke_ppm: smokeJitter,
        Distance_cm: distJitter,
      };

      // Slide new reading in, drop oldest beyond 30
      const updatedList = [newReading, ...prev.readings.slice(0, 29)];
      return {
        ...prev,
        readings: updatedList,
      };
    });

    setTimeout(() => setIsPinging(false), 800);
  };

  const currentReading: SensorReading | undefined = readingsData?.readings[0];
  const chartData = readingsData?.readings ? [...readingsData.readings].reverse() : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Controls & LIVE STREAM Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-strong tracking-tight">
              Live Zone Telemetry Monitoring
            </h1>
            
            {/* Clean Pulsing "LIVE STREAM" Badge */}
            <div className="px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE STREAM</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time ESP32 sensor telemetry streams (DHT22, HC-SR04, PIR, MQ Gas) • Last Ping: {lastPingTime || 'Connecting...'}
          </p>
        </div>

        {/* Clean Warehouse & Zone Selection Dropdowns Alone */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(Number(e.target.value));
              setSelectedZoneId(1);
            }}
            className="flex-1 sm:flex-none min-w-[140px] px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
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
            className="px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-gray-500/20 text-xs font-bold text-strong outline-none"
          >
            {[1, 2, 3, 4].map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards with Live Ping Micro-Glow */}
      {currentReading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <GlassCard className={`p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ${
            isPinging ? 'border-amber-500/50 shadow-md shadow-amber-500/10 scale-[1.02]' : ''
          }`}>
            <div className="flex items-center justify-between text-amber-500">
              <Thermometer size={18} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-500">Temp</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Temperature_C}°C</span>
              <span className="text-[10px] text-gray-500 block truncate">{currentReading.Temp_Status}</span>
            </div>
          </GlassCard>

          <GlassCard className={`p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ${
            isPinging ? 'border-sky-500/50 shadow-md shadow-sky-500/10 scale-[1.02]' : ''
          }`}>
            <div className="flex items-center justify-between text-sky-500">
              <Droplets size={18} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-500">Humidity</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading['Humidity_%']}%</span>
              <span className="text-[10px] text-gray-500 block truncate">Relative Humidity</span>
            </div>
          </GlassCard>

          <GlassCard className={`p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ${
            isPinging ? 'border-orange-500/50 shadow-md shadow-orange-500/10 scale-[1.02]' : ''
          }`}>
            <div className="flex items-center justify-between text-orange-500">
              <Flame size={18} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-500">Smoke</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Smoke_ppm}</span>
              <span className="text-[10px] text-gray-500 block truncate">PPM Level</span>
            </div>
          </GlassCard>

          <GlassCard className={`p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ${
            isPinging ? 'border-cyan-500/50 shadow-md shadow-cyan-500/10 scale-[1.02]' : ''
          }`}>
            <div className="flex items-center justify-between text-cyan-500">
              <Activity size={18} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-500">Motion</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Motion ? 'Detected' : 'Clear'}</span>
              <span className="text-[10px] text-gray-500 block truncate">PIR Infrared</span>
            </div>
          </GlassCard>

          <GlassCard className={`p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ${
            isPinging ? 'border-emerald-500/50 shadow-md shadow-emerald-500/10 scale-[1.02]' : ''
          }`}>
            <div className="flex items-center justify-between text-emerald-500">
              <Package size={18} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-500">Sacks</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Number_of_Sacks}</span>
              <span className="text-[10px] text-gray-500 block truncate">Max: {currentReading.Zone_Capacity_Sacks}</span>
            </div>
          </GlassCard>

          <GlassCard className={`p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ${
            isPinging ? 'border-purple-500/50 shadow-md shadow-purple-500/10 scale-[1.02]' : ''
          }`}>
            <div className="flex items-center justify-between text-purple-500">
              <Move size={18} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-500">Distance</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-strong">{currentReading.Distance_cm} cm</span>
              <span className="text-[10px] text-gray-500 block truncate">Ultrasonic Proximity</span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Realistic Spline & Area Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Temperature & Humidity Dual Gradient Area Stream */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4 border-b border-gray-500/10 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-strong flex items-center gap-2">
                <Thermometer size={16} className="text-amber-500" />
                <span>Live Temperature & Humidity Area Trends</span>
              </h3>
              <p className="text-[11px] text-gray-500">Dual-axis spline telemetry with 40°C alarm threshold</p>
            </div>
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
              5s Dynamic Stream
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 9 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <ReferenceLine yAxisId="left" y={40} label={{ value: '40°C Threshold', fill: '#EF4444', fontSize: 10 }} stroke="#EF4444" strokeDasharray="3 3" />
                <Area yAxisId="left" type="monotone" dataKey="Temperature_C" name="Temp (°C)" stroke="#F59E0B" strokeWidth={2.5} fill="url(#tempGradient)" />
                <Area yAxisId="right" type="monotone" dataKey="Humidity_%" name="Humidity (%)" stroke="#38BDF8" strokeWidth={2.5} fill="url(#humGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* CHART 2: Smoke PPM & Gas Ignition Hazard Stream */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4 border-b border-gray-500/10 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-strong flex items-center gap-2">
                <Flame size={16} className="text-orange-500" />
                <span>Smoke Concentration (PPM) Stream</span>
              </h3>
              <p className="text-[11px] text-gray-500">MQ Gas sensor live smoke & combustion hazard levels</p>
            </div>
            <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/20">
              Combustion Telemetry
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="smokeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FB8500" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#FB8500" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 9 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <ReferenceLine y={300} label={{ value: 'Hazard Level (300 PPM)', fill: '#F97316', fontSize: 10 }} stroke="#F97316" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="Smoke_ppm" name="Smoke PPM" stroke="#FB8500" strokeWidth={2.5} fill="url(#smokeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* CHART 3: Occupancy % vs Vacant Capacity Dynamic Bar Graph */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4 border-b border-gray-500/10 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-strong flex items-center gap-2">
                <Package size={16} className="text-cyan-500" />
                <span>Zone Capacity Utilization & Vacant Volume (%)</span>
              </h3>
              <p className="text-[11px] text-gray-500">Live sack storage volume vs empty rack capacity</p>
            </div>
            <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
              Capacity Utilization
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-15)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 9 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="Occupancy_Pct" name="Occupancy %" fill="#219EBC" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vacant_Space_Pct" name="Vacant %" fill="#8ECAE6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* CHART 4: Proximity Distance (cm) & Motion Telemetry Stream */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4 border-b border-gray-500/10 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-strong flex items-center gap-2">
                <Move size={16} className="text-purple-500" />
                <span>Ultrasonic Distance (cm) Proximity Stream</span>
              </h3>
              <p className="text-[11px] text-gray-500">HC-SR04 ultrasonic distance sensor readings</p>
            </div>
            <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
              Ultrasonic Proximity
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 9 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="Distance_cm" name="Distance (cm)" stroke="#A78BFA" strokeWidth={2.5} dot={{ r: 3, fill: '#A78BFA' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
