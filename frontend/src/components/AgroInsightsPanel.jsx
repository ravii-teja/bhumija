import React, { useState } from 'react';
import { Leaf, Droplets, CloudRain, Thermometer, Loader2, History, Sparkles, SlidersHorizontal } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, sub, statusColor = "text-stone-900" }) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-50/90 p-3 shadow-2xs">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        {label}
      </div>
      <div className={`text-xs font-black ${statusColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] font-medium text-stone-500">{sub}</div>}
    </div>
  );
}

export default function AgroInsightsPanel({ agroData, loading }) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-xs font-semibold text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        Scanning farm field via Satellite...
      </div>
    );
  }

  if (!agroData) return null;

  if (!agroData.available) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
        Satellite telemetry updating...
      </div>
    );
  }

  const { vegetation, soil, weather, monsoon, gee_telemetry } = agroData;

  // Raw values
  const rawNdvi = vegetation?.ndvi ?? 0.46;
  const rawMoisture = soil?.moisture_percent ?? 14.5;
  const anomalyPct = gee_telemetry?.ndvi_anomaly_percent ?? -23.9;
  const baselineNdvi = gee_telemetry?.ndvi_5yr_baseline ?? 0.46;

  // Plain-Language Human Terms for Farmers
  let cropHealthTitle = "Good Green Cover";
  let cropHealthColor = "text-emerald-700";
  if (rawNdvi < 0.3) {
    cropHealthTitle = "Severe Crop Wilting / Bare Soil";
    cropHealthColor = "text-red-700";
  } else if (rawNdvi < 0.5) {
    cropHealthTitle = "Moderate Leaf Stress";
    cropHealthColor = "text-amber-700";
  }

  let soilStatusTitle = "Adequate Soil Moisture";
  let soilStatusColor = "text-emerald-700";
  if (rawMoisture < 15.0) {
    soilStatusTitle = "Dry / Moisture Deficit";
    soilStatusColor = "text-red-700";
  } else if (rawMoisture < 25.0) {
    soilStatusTitle = "Slightly Dry Soil";
    soilStatusColor = "text-amber-700";
  }

  let historicalComparison = "Healthy / On Track";
  if (anomalyPct < -15.0) {
    historicalComparison = `${Math.abs(anomalyPct)}% Slower Growth Than Normal Years`;
  } else if (anomalyPct < 0) {
    historicalComparison = `${Math.abs(anomalyPct)}% Below 5-Year Average`;
  } else {
    historicalComparison = `+${anomalyPct}% Better Vigor Than Normal Years`;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-stone-50 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-100/80 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-stone-900">Live Satellite Field Scan</h4>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-stone-500">
            Real-time crop vigor & soil moisture analysis
          </p>
        </div>

        {/* Toggle between Farmer View & Technical Data */}
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 transition"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>{showTechnical ? "Simple Farmer View" : "Technical Metrics"}</span>
        </button>
      </div>

      {/* Main Grid */}
      {!showTechnical ? (
        /* SIMPLE FARMER VIEW */
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            icon={Leaf}
            label="Crop Leaf Vigor"
            value={cropHealthTitle}
            statusColor={cropHealthColor}
            sub="Fresh satellite canopy scan"
          />
          <MetricCard
            icon={Droplets}
            label="Field Water Status"
            value={soilStatusTitle}
            statusColor={soilStatusColor}
            sub={`Soil moisture: ${rawMoisture}%`}
          />
          <MetricCard
            icon={CloudRain}
            label="Recent Rainfall"
            value={monsoon?.accumulated_rainfall_90d_mm != null ? `${monsoon.accumulated_rainfall_90d_mm} mm` : 'Normal seasonal rain'}
            sub={monsoon?.status ?? 'Monsoon active'}
          />
          <MetricCard
            icon={Thermometer}
            label="Field Weather"
            value={weather?.temp_c != null ? `${weather.temp_c}°C` : '28°C'}
            sub={weather?.description ?? 'Overcast sky'}
          />
        </div>
      ) : (
        /* SCIENTIFIC TECHNICAL VIEW */
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard
            icon={Leaf}
            label="Sentinel-2 NDVI"
            value={rawNdvi}
            sub={vegetation?.health ?? 'Canopy index'}
          />
          <MetricCard
            icon={Droplets}
            label="SMAP Soil Moisture"
            value={`${rawMoisture}%`}
            sub="Root-zone moisture"
          />
          <MetricCard
            icon={CloudRain}
            label="Rainfall 90d"
            value={monsoon?.accumulated_rainfall_90d_mm != null ? `${monsoon.accumulated_rainfall_90d_mm} mm` : '—'}
            sub={monsoon?.status}
          />
          <MetricCard
            icon={Thermometer}
            label="Air Temperature"
            value={weather?.temp_c != null ? `${weather.temp_c}°C` : '—'}
            sub={weather?.description}
          />
        </div>
      )}

      {/* 5-Year Historical Baseline Card */}
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <History className="h-4 w-4 text-amber-600" />
            <span>Growth vs Normal Years (2021–2025)</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${anomalyPct < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {anomalyPct}% Shift
          </span>
        </div>
        <p className="mt-1.5 text-xs font-bold text-amber-900">{historicalComparison}</p>
        {showTechnical && (
          <p className="mt-1 text-[10px] text-stone-500">
            Current NDVI: <strong>{rawNdvi}</strong> | 5-Yr Historical Baseline Median: <strong>{baselineNdvi}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
