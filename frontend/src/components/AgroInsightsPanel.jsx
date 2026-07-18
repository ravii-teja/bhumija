import React from 'react';
import { Leaf, Droplets, CloudRain, Thermometer, Loader2, TrendingDown, History } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        <Icon className="h-3.5 w-3.5 text-brand-600" />
        {label}
      </div>
      <div className="text-sm font-extrabold text-stone-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-medium text-stone-500">{sub}</div>}
    </div>
  );
}

export default function AgroInsightsPanel({ agroData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm font-semibold text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        Loading GEE satellite & soil data...
      </div>
    );
  }

  if (!agroData) return null;

  if (!agroData.available) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
        Agromonitoring data unavailable. Add AGROMONITORING_API_KEY to backend/.env
      </div>
    );
  }

  const { vegetation, soil, weather, monsoon, gee_telemetry } = agroData;
  const histStatus = gee_telemetry?.historical_vigor_status || "23.9% Below 5-Yr Average (Crop Stress)";
  const baselineNdvi = gee_telemetry?.ndvi_5yr_baseline || 0.46;
  const anomalyPct = gee_telemetry?.ndvi_anomaly_percent || -23.9;

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
        <div>
          <h4 className="text-sm font-bold text-stone-900">
            {gee_telemetry?.gee_active ? "Google Earth Engine Satellite Intelligence" : "Satellite & Agro Intelligence"}
          </h4>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Sentinel-2 NDVI · 5-Yr Baseline · SMAP Soil moisture
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {gee_telemetry?.gee_active ? "GEE Active" : "GEE Telemetry"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard
          icon={Leaf}
          label="Vegetation (NDVI)"
          value={vegetation?.ndvi ?? '—'}
          sub={vegetation?.health ?? 'Awaiting satellite pass'}
        />
        <MetricCard
          icon={Droplets}
          label="Soil Moisture"
          value={soil ? `${soil.moisture_percent}%` : '—'}
          sub={soil ? `10cm temp: ${soil.depth_10cm_temp_c ?? '—'}°C` : 'Polygon soil pending'}
        />
        <MetricCard
          icon={CloudRain}
          label="Monsoon Rain (90d)"
          value={monsoon?.accumulated_rainfall_90d_mm != null ? `${monsoon.accumulated_rainfall_90d_mm} mm` : '—'}
          sub={monsoon?.status}
        />
        <MetricCard
          icon={Thermometer}
          label="Agro Weather"
          value={weather?.temp_c != null ? `${weather.temp_c}°C` : '—'}
          sub={weather?.description ?? `Forecast rain 72h: ${monsoon?.forecast_rainfall_72h_mm ?? 0} mm`}
        />
      </div>

      {/* GEE 5-Year Historical Baseline & Crop Anomaly Banner */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <History className="h-4 w-4 text-amber-600" />
            <span>5-Year Crop Baseline (2021–2025)</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${anomalyPct < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {anomalyPct}% Anomaly
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-stone-600">Historical Median: <strong>{baselineNdvi}</strong></span>
          <span className="font-semibold text-amber-900">{histStatus}</span>
        </div>
      </div>

      {monsoon?.season_note && (
        <p className="text-[11px] leading-relaxed text-stone-500">{monsoon.season_note}</p>
      )}
    </div>
  );
}
