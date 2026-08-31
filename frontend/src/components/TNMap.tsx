import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Warehouse } from '../types';
import { useThemeStore } from '../stores/themeStore';
import { Building2, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TNMapProps {
  warehouses: Warehouse[];
  selectedWarehouseId?: number;
}

// Custom Marker Generator function creating glowing HTML Leaflet markers
const createCustomMarkerIcon = (status?: string | null, isSelected?: boolean) => {
  const statusStr = status || '';
  const isCritical = statusStr.toLowerCase().includes('critical') || statusStr.toLowerCase().includes('risk') || statusStr.toLowerCase().includes('alarm');
  
  const markerColor = isCritical ? '#F97316' : '#0EA5E9';
  const pulseColor = isCritical ? 'rgba(249, 115, 22, 0.4)' : 'rgba(14, 165, 233, 0.4)';
  const scale = isSelected ? 'scale-125 z-50' : 'hover:scale-110';

  const html = `
    <div class="relative flex items-center justify-center transition-transform ${scale}">
      <span class="absolute inline-flex h-7 w-7 rounded-full animate-ping opacity-75" style="background-color: ${pulseColor}"></span>
      <div class="relative flex items-center justify-center w-6 h-6 rounded-full shadow-lg border-2 border-white dark:border-slate-900" style="background-color: ${markerColor}">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

export const TNMap: React.FC<TNMapProps> = ({ warehouses, selectedWarehouseId }) => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();

  // Tamil Nadu Central Geographical Coordinates
  const tnCenter: [number, number] = [10.8505, 78.6569];

  // Bounding box locking the map view strictly to Tamil Nadu State
  const tnBounds: L.LatLngBoundsExpression = [
    [7.8, 75.8],  // South-West (Kanyakumari / Western Ghats)
    [13.8, 80.8]   // North-East (Chennai / Pulicat Lake)
  ];

  // Enforced dark CartoDB tile layer
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="relative w-full h-[360px] sm:h-[400px] rounded-2xl overflow-hidden border border-gray-500/20 shadow-xl">
      <MapContainer
        center={tnCenter}
        zoom={7.2}
        minZoom={6.5}
        maxZoom={11}
        maxBounds={tnBounds}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={false}
        className="w-full h-full z-10"
        style={{ background: theme === 'dark' ? '#0F172A' : '#F1F5F9' }}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
          subdomains="abcd"
          maxZoom={19}
        />

        {warehouses.map((w) => {
          const isSelected = w.warehouse_id === selectedWarehouseId;
          const statusStr = w.latest_status || 'Safe';
          const isCritical = statusStr.toLowerCase().includes('critical') || statusStr.toLowerCase().includes('risk');
          const totalCapacity = w.zones ? w.zones.reduce((sum, z) => sum + z.capacity_sacks, 0) : 4000;
          const occupancy = w.current_occupancy_pct ?? 0;

          return (
            <Marker
              key={w.warehouse_id}
              position={[w.latitude, w.longitude]}
              icon={createCustomMarkerIcon(w.latest_status, isSelected)}
              eventHandlers={{
                click: () => {
                  navigate(`/warehouses/${w.warehouse_id}`);
                }
              }}
            >
              {/* Permanent tooltip on hover */}
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <div className="font-sans text-xs">
                  <span className="font-extrabold text-slate-900 block">{w.name}</span>
                  <span className="text-[10px] text-slate-600">{w.district} District</span>
                </div>
              </Tooltip>

              {/* Interactive Popup Card on click */}
              <Popup className="custom-leaflet-popup">
                <div className="p-3 max-w-[220px] font-sans">
                  <div className="flex items-center justify-between gap-2 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 size={15} className="text-cyan-500 shrink-0" />
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{w.name}</h4>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 mb-3">
                    <div className="flex justify-between">
                      <span>District:</span>
                      <strong className="text-slate-900 dark:text-white">{w.district}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Capacity:</span>
                      <strong className="text-slate-900 dark:text-white">{totalCapacity.toLocaleString()} Sacks</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Occupancy Rate:</span>
                      <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{occupancy}%</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                        isCritical ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'
                      }`}>
                        {isCritical ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                        <span>{statusStr}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/warehouses/${w.warehouse_id}`)}
                    className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <span>View Godown Control</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Tamil Nadu Boundary Watermark Overlay */}
      <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white flex items-center gap-2 pointer-events-none shadow-lg">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
        <span>TAMIL NADU GIS WAREHOUSE NETWORK</span>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-20 px-3.5 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/10 text-xs text-gray-200 flex items-center justify-around shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-500 border border-white/40 shadow-sm" />
          <span className="font-semibold text-[11px]">Safe Godown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-white/40 shadow-sm" />
          <span className="font-semibold text-[11px]">Critical / High Risk Flag</span>
        </div>
      </div>
    </div>
  );
};
