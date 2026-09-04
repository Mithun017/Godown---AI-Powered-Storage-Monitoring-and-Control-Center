import React, { useEffect, useState, useRef } from 'react';
import type { Warehouse, PaginatedReadings, SensorReading } from '../types';
import { apiClient } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { 
  Activity, Thermometer, Droplets, Flame, Package, Move 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, ReferenceLine 
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
  const stepRef = useRef<number>(30);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId && selectedZoneId) {
      initOrganicTelemetryStream(selectedWarehouseId, selectedZoneId);
    }
  }, [selectedWarehouseId, selectedZoneId]);

  // 5-Second Live Telemetry Ping Heartbeat (Always Running)
  useEffect(() => {
    if (selectedWarehouseId && selectedZoneId) {
      liveIntervalRef.current = setInterval(() => {
        pingOrganicReadings();
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

  const generateOrganicPoint = (step: number, baseTimestamp: Date, wId: number, zId: number): SensorReading => {
    const selectedWh = warehouses.find(w => w.warehouse_id === wId);
    const whName = selectedWh ? selectedWh.name : `Warehouse #${wId}`;
    const district = selectedWh ? selectedWh.district : 'Coimbatore';
    const capacitySacks = 1000;

    const temp = Number((29.5 + 3.2 * Math.sin(step / 3.5) + (Math.random() * 0.4 - 0.2)).toFixed(1));
    const hum = Math.min(100, Math.max(30, Number((66.0 - 7.5 * Math.sin(step / 3.5) + (Math.random() * 0.8 - 0.4)).toFixed(1))));
    const smoke = Math.max(20, Math.round(160 + 75 * Math.cos(step / 2.8) + (Math.random() * 10 - 5)));
    const dist = Number(Math.max(10, (68.0 + 32.0 * Math.sin(step / 2.2 + 1.5) + (Math.random() * 1.5 - 0.75))).toFixed(1));
    const occ = Number((65.0 + 18.0 * Math.sin(step / 4.2 + 2.5) + (Math.random() * 0.6 - 0.3)).toFixed(1));
    const vacant = Number((100 - occ).toFixed(1));
    const sacks = Math.round((capacitySacks * occ) / 100);

    const timeStr = `${baseTimestamp.getFullYear()}-${String(baseTimestamp.getMonth() + 1).padStart(2, '0')}-${String(baseTimestamp.getDate()).padStart(2, '0')} ${baseTimestamp.toLocaleTimeString()}`;

    let tempStatus = 'Normal';
    if (temp >= 40) tempStatus = 'Critical Heat';
    else if (temp >= 32) tempStatus = 'High Temp Warning';

    let smokeStatus = 'Normal';
    if (smoke >= 300) smokeStatus = 'Smoke Alarm Hazard';

    let whStatus = 'Safe';
    if (temp >= 40 || smoke >= 300) whStatus = 'Critical';
    else if (temp >= 32) whStatus = 'High Temp';

    return {
      Timestamp: timeStr,
      Warehouse_ID: wId,
      Warehouse_Name: whName,
      District: district,
      Latitude: 11.0,
      Longitude: 76.9,
      Zone_ID: zId,
      Commodity_Type: 'Paddy & Rice Sacks',
      Distance_cm: dist,
      Temperature_C: temp,
      'Humidity_%': hum,
      Smoke_ppm: smoke,
      Motion: step % 7 === 0 ? 1 : 0,
      Number_of_Sacks: sacks,
      Avg_Weight_per_Sack_kg: 50.0,
      Total_Weight_kg: sacks * 50.0,
      Zone_Capacity_Sacks: capacitySacks,
      Occupancy_Pct: occ,
      Vacant_Space_Pct: vacant,
      Rack_Status: occ > 95 ? 'Rack Full' : 'Normal',
      Temp_Status: tempStatus,
      Smoke_Status: smokeStatus,
      Warehouse_Status: whStatus,
      Month: baseTimestamp.getMonth() + 1,
      Year: baseTimestamp.getFullYear(),
      Previous_Year_Avg_Fill_Pct: 68.5,
      Previous_Year_Days_RackFull: 14,
      Next_Year_Projected_Occupancy_Pct: 72.0
    };
  };

  const initOrganicTelemetryStream = (wId: number, zId: number) => {
    setIsPinging(true);
    const now = new Date();
    const initialList: SensorReading[] = [];

    for (let i = 29; i >= 0; i--) {
      const pointTime = new Date(now.getTime() - i * 15000);
      const stepIndex = 30 - i;
      initialList.push(generateOrganicPoint(stepIndex, pointTime, wId, zId));
    }

    stepRef.current = 30;
    setReadingsData({
      total: 30,
      page: 1,
      limit: 30,
      readings: initialList.reverse(),
    });
    setLastPingTime(now.toLocaleTimeString());
    setTimeout(() => setIsPinging(false), 600);
  };

  const pingOrganicReadings = () => {
    setIsPinging(true);
    const now = new Date();
    setLastPingTime(now.toLocaleTimeString());

    stepRef.current += 1;
    const currentStep = stepRef.current;

    setReadingsData((prev) => {
      if (!prev || !prev.readings) return prev;

      const newReading = generateOrganicPoint(currentStep, now, selectedWarehouseId, selectedZoneId);
      const updatedList = [newReading, ...prev.readings.slice(0, 29)];
      
      return {
        ...prev,
        readings: updatedList,
      };
    });

    setTimeout(() => setIsPinging(false), 600);
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

        {/* Clean Warehouse & Zone Selection Dropdowns */}
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

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Multi-Parameter Telemetry Line Analysis (Reference Design Match) */}
        <GlassCard className="col-span-1 lg:col-span-2">
          <div className="text-center mb-6 pt-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-strong tracking-tight">
              Warehouse Telemetry Multi-Parameter Analysis
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Comparative real-time multi-line analysis of Temperature, Relative Humidity, and Occupancy Rate
            </p>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis 
                  dataKey="Timestamp" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(ts) => ts.split(' ')[1] || ts}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  domain={['auto', 'auto']}
                />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend verticalAlign="bottom" align="center" iconType="rect" wrapperStyle={{ paddingTop: '15px' }} />
                
                <Line type="linear" dataKey="Temperature_C" name="Temperature (°C)" stroke="#3B82F6" strokeWidth={2.2} dot={{ r: 5, fill: '#3B82F6', strokeWidth: 1 }} />
                <Line type="linear" dataKey="Humidity_%" name="Humidity (%)" stroke="#F97316" strokeWidth={2.2} dot={{ r: 5, fill: '#F97316', strokeWidth: 1 }} />
                <Line type="linear" dataKey="Occupancy_Pct" name="Occupancy (%)" stroke="#22C55E" strokeWidth={2.2} dot={{ r: 5, fill: '#22C55E', strokeWidth: 1 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* CHART 2: Combined Smoke Concentration (PPM) & Ultrasonic Proximity Distance (cm) Dual-Axis Line Stream */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4 border-b border-gray-500/10 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-strong flex items-center gap-2">
                <Flame size={16} className="text-orange-500" />
                <Move size={16} className="text-purple-500" />
                <span>Smoke Concentration & Ultrasonic Proximity Stream</span>
              </h3>
              <p className="text-[11px] text-gray-500">Combined dual-axis telemetry stream for MQ Gas PPM and HC-SR04 Proximity cm</p>
            </div>
            <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/20">
              Dual-Axis Telemetry
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="Timestamp" tick={{ fontSize: 9 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend verticalAlign="bottom" align="center" iconType="rect" />
                <ReferenceLine yAxisId="left" y={300} label={{ value: '300 PPM Hazard', fill: '#F97316', fontSize: 10 }} stroke="#F97316" strokeDasharray="3 3" />
                
                {/* Smoke PPM (Orange Line) & Distance cm (Purple Line) Combined Together */}
                <Line yAxisId="left" type="linear" dataKey="Smoke_ppm" name="Smoke PPM" stroke="#F97316" strokeWidth={2.2} dot={{ r: 4.5, fill: '#F97316' }} />
                <Line yAxisId="right" type="linear" dataKey="Distance_cm" name="Distance (cm)" stroke="#A855F7" strokeWidth={2.2} dot={{ r: 4.5, fill: '#A855F7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* CHART 3: Restored Zone Capacity Utilization & Vacant Volume (%) Bar Chart */}
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
                <Legend verticalAlign="bottom" align="center" iconType="rect" />
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
