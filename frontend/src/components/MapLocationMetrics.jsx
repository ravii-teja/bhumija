import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CloudRain,
  Droplets,
  Leaf,
  Loader2,
  ShieldAlert,
  Sprout,
  Thermometer,
  Wind,
  X,
  Sparkles,
} from 'lucide-react';
import { computeLocationRisk, riskToColor } from '../utils/riskScore';
import { useIsMobile } from '../hooks/useMediaQuery';

const METRIC_DETAILS = {
  'Monsoon': {
    source: 'Open-Meteo Historical Weather API',
    formula: 'Sum of daily precipitation over the past 90/365 days, compared with baseline climate normals since 1990.',
    actionable: (val, sub) => {
      const status = String(sub || '').toLowerCase();
      if (status.includes('deficit') || status.includes('dry') || status.includes('delay')) {
        return 'Critical monsoon rain deficit detected. Avoid planting water-intensive crops (e.g. sugarcane, paddy). Switch to drought-hardy short-duration varieties (Bajra, Tur, Moong). Set up contour bunding.';
      }
      return 'Monsoon rainfall is within normal seasonal bounds. Ensure proper field drainage to prevent localized flooding and soil erosion.';
    },
    query: (val, sub) => `My farm has a monsoon status of "${sub || 'Unknown'}" with rainfall at ${val || '0 mm'}. What drought-resilient crops should I sow and how do I manage my water?`
  },
  'Soil': {
    source: 'Open-Meteo Land Surface Models (LSM)',
    formula: 'Simulated volumetric water content in the topsoil layer (0-10cm depth) calibrated via satellite soil moisture passes.',
    actionable: (val, sub) => {
      const pct = parseFloat(val);
      if (isNaN(pct) || pct < 30) {
        return 'Soil moisture is critically low (below 30%). Apply organic mulching (straw/leaves) to reduce evaporation, irrigate early in the morning (5:00-8:00 AM), and delay major fertilizer inputs.';
      }
      return 'Soil moisture is at optimal levels (30%+). Ideal condition for sowing and balanced fertilizer application. Continue normal irrigation cycle.';
    },
    query: (val, sub) => `My soil moisture is currently at ${val || 'low levels'} (${sub || 'dry'}). What soil moisture conservation steps (like mulching or hydrogels) should I implement?`
  },
  'Weather': {
    source: 'Open-Meteo Current Conditions API',
    formula: 'Real-time temperature and relative humidity metrics measured by the nearest validated meteorological station.',
    actionable: (val, sub) => {
      const temp = parseFloat(val);
      if (!isNaN(temp) && temp > 32) {
        return 'High heat stress detected. Postpone foliar spraying to prevent leaf scorch. Focus on early morning or late evening watering to minimize transpiration losses.';
      }
      return 'Weather parameters are favorable. Safe to proceed with pesticide/nutrient spraying and general field maintenance.';
    },
    query: (val, sub) => `The temperature is ${val || 'high'} (${sub || 'dry weather'}). What precautions should I take to protect my crops from heat stress?`
  },
  'Vegetation': {
    source: 'Sentinel-2 Satellite Pass',
    formula: 'Normalized Difference Vegetation Index (NDVI) calculated as (NIR - Red) / (NIR + Red) from the latest cloud-free satellite imagery.',
    actionable: (val, sub) => {
      const ndvi = parseFloat(val);
      if (!isNaN(ndvi) && ndvi < 0.4) {
        return 'Low NDVI detected. This points to crop health stress, poor canopy growth, or potential pest attack. Proactively upload a photo in the "Crop Health Log" tab for AI diagnosis.';
      }
      return 'Healthy green vegetation index (NDVI >= 0.4). Maintain current irrigation cycles and pest control measures.';
    },
    query: (val, sub) => `My vegetation index (NDVI) is ${val || 'low'} (${sub || 'stressed'}). How do I diagnose crop health stress, and what fertilizers or pest controls should I use?`
  },
  'Forecast': {
    source: 'Open-Meteo GFS Predictive Model',
    formula: 'Calculated by aggregating 3-day meteorological forecasting models for your specific coordinates.',
    actionable: (val, sub) => {
      const rain = parseFloat(val);
      if (!isNaN(rain) && rain > 10) {
        return 'Significant rain expected within 72 hours. Hold off on planned irrigation and pesticide applications to prevent chemical run-off and save water resources. Inspect field drainage.';
      }
      return 'Dry weather forecast for the next 72 hours. Continue planned drip or flood irrigation schedule as required by your crop type.';
    },
    query: (val, sub) => `The weather forecast predicts ${val || 'minimal'} rainfall over the next 72 hours. How should I adjust my irrigation schedule?`
  },
  'Crops': {
    source: 'Supabase Historical Crops DB',
    formula: 'Queried historical database records of district agricultural production, acreage, and yield averages since 2010.',
    actionable: (val, sub) => {
      return 'Historically proven to have the highest yield-to-area performance in your specific soil and climatic zone. Switch to the "Farmer Advisory" tab to check recommended sowing dates and seed varieties.';
    },
    query: (val, sub) => `What are the recommended sowing dates, seed varieties, and agricultural management practices for ${val || 'crops'} in my district?`
  }
};

function MetricChip({ icon: Icon, label, value, sub, color, onClick, isActive, tooltipText }) {
  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:border-brand-500 hover:shadow-md ${
        isActive ? 'ring-2 ring-brand-500 border-brand-500 scale-[1.02]' : ''
      }`}
      style={{ borderColor: isActive ? undefined : `${color}30` }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-sm font-bold text-stone-900">{value}</div>
      {sub && <div className="mt-0.5 line-clamp-2 text-[11px] font-medium text-stone-500">{sub}</div>}

      {/* Hover Tooltip for Calculation Reference */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-stone-800 bg-stone-950 p-2.5 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-xl">
        <div className="font-bold text-brand-400">Calculation Reference:</div>
        <p className="mt-1 leading-relaxed text-stone-300">{tooltipText}</p>
        <div className="mt-1.5 text-[9px] text-stone-400 font-medium">Click to view Actionable Insights</div>
        <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 bg-stone-950 rotate-45 border-r border-b border-stone-800"></div>
      </div>
    </div>
  );
}

export default function MapLocationMetrics({
  selectedLocation,
  weather,
  agroData,
  loadingWeather,
  loadingAgro,
  isMobile = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  const mobile = useIsMobile();
  const showMobile = isMobile || mobile;

  useEffect(() => {
    if (selectedLocation) {
      setExpanded(true);
      setActiveMetric(null);
    }
  }, [selectedLocation?.lat, selectedLocation?.lon]);

  if (!selectedLocation) return null;

  const { district, placeName, placeAddress } = selectedLocation;
  const displayName = placeName || district?.name || 'Selected farm';
  const displaySubtitle =
    placeAddress ||
    (district
      ? `${district.region}, ${district.state}${district.approximateMatch ? ' (nearest zone)' : ''}`
      : `Lat ${selectedLocation.lat.toFixed(4)}, Lon ${selectedLocation.lon.toFixed(4)}`);
  const riskScore = computeLocationRisk({ district, weather, agroData });
  const risk = riskToColor(riskScore);
  const monsoon = agroData?.monsoon;
  const soil = agroData?.soil;
  const vegetation = agroData?.vegetation;
  const loading = loadingWeather || loadingAgro;
  const estSuffix = (flag) => (flag ? ' (est.)' : '');

  const handleAskAI = (metricName, val, sub) => {
    const detail = METRIC_DETAILS[metricName];
    if (!detail) return;
    const queryText = detail.query(val, sub);
    window.dispatchEvent(
      new CustomEvent('bhumija-query-assistant', {
        detail: { query: queryText }
      })
    );
  };

  const metricsGrid = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <MetricChip
        icon={CloudRain}
        label="Monsoon"
        value={
          monsoon?.accumulated_rainfall_365d_mm != null
            ? `${monsoon.accumulated_rainfall_365d_mm} mm/yr`
            : monsoon?.accumulated_rainfall_90d_mm != null
              ? `${monsoon.accumulated_rainfall_90d_mm} mm (90d)`
              : '—'
        }
        sub={monsoon?.yearly_status ?? monsoon?.status}
        color={risk.fill}
        onClick={() => setActiveMetric(activeMetric === 'Monsoon' ? null : 'Monsoon')}
        isActive={activeMetric === 'Monsoon'}
        tooltipText={METRIC_DETAILS.Monsoon.formula}
      />
      <MetricChip
        icon={Droplets}
        label="Soil"
        value={
          soil?.moisture_percent != null
            ? `${soil.moisture_percent}%${estSuffix(soil?.estimated)}`
            : '—'
        }
        sub={district?.soil_type?.split('(')[0]?.trim() ?? soil?.source ?? 'Moisture'}
        color="#2563eb"
        onClick={() => setActiveMetric(activeMetric === 'Soil' ? null : 'Soil')}
        isActive={activeMetric === 'Soil'}
        tooltipText={METRIC_DETAILS.Soil.formula}
      />
      <MetricChip
        icon={Thermometer}
        label="Weather"
        value={weather?.temperature != null ? `${weather.temperature}°C` : '—'}
        sub={
          weather
            ? `${weather.description} · ${weather.relative_humidity ?? '—'}% RH`
            : agroData?.weather?.description
        }
        color="#eab308"
        onClick={() => setActiveMetric(activeMetric === 'Weather' ? null : 'Weather')}
        isActive={activeMetric === 'Weather'}
        tooltipText={METRIC_DETAILS.Weather.formula}
      />
      <MetricChip
        icon={Leaf}
        label="Vegetation"
        value={
          vegetation?.ndvi != null
            ? `${vegetation.ndvi}${estSuffix(vegetation?.estimated)}`
            : '—'
        }
        sub={vegetation?.health ?? 'NDVI satellite'}
        color="#16a34a"
        onClick={() => setActiveMetric(activeMetric === 'Vegetation' ? null : 'Vegetation')}
        isActive={activeMetric === 'Vegetation'}
        tooltipText={METRIC_DETAILS.Vegetation.formula}
      />
      <MetricChip
        icon={Wind}
        label="Forecast"
        value={
          monsoon?.forecast_rainfall_72h_mm != null
            ? `${monsoon.forecast_rainfall_72h_mm} mm`
            : '—'
        }
        sub="Next 72 hours"
        color="#6366f1"
        onClick={() => setActiveMetric(activeMetric === 'Forecast' ? null : 'Forecast')}
        isActive={activeMetric === 'Forecast'}
        tooltipText={METRIC_DETAILS.Forecast.formula}
      />
      <MetricChip
        icon={Sprout}
        label="Crops"
        value={district?.primary_crops?.[0] ?? '—'}
        sub={
          district?.approximateMatch
            ? `Nearest: ${district.name}`
            : district?.primary_crops?.length > 1
              ? `+${district.primary_crops.length - 1} more`
              : 'Primary crop'
        }
        color="#ea580c"
        onClick={() => setActiveMetric(activeMetric === 'Crops' ? null : 'Crops')}
        isActive={activeMetric === 'Crops'}
        tooltipText={METRIC_DETAILS.Crops.formula}
      />
    </div>
  );

  const detailPanel = activeMetric && METRIC_DETAILS[activeMetric] && (
    <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-3 shadow-sm text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h5 className="text-[10px] font-bold text-brand-800 uppercase tracking-wider">
            {activeMetric} Insights & Actions
          </h5>
          <div className="mt-0.5 text-xs font-bold text-stone-900">
            Current Value: {
              activeMetric === 'Monsoon' ? (monsoon?.accumulated_rainfall_365d_mm != null ? `${monsoon.accumulated_rainfall_365d_mm} mm/yr` : monsoon?.accumulated_rainfall_90d_mm != null ? `${monsoon.accumulated_rainfall_90d_mm} mm` : '—') :
              activeMetric === 'Soil' ? (soil?.moisture_percent != null ? `${soil.moisture_percent}%` : '—') :
              activeMetric === 'Weather' ? (weather?.temperature != null ? `${weather.temperature}°C` : '—') :
              activeMetric === 'Vegetation' ? (vegetation?.ndvi != null ? `${vegetation.ndvi}` : '—') :
              activeMetric === 'Forecast' ? (monsoon?.forecast_rainfall_72h_mm != null ? `${monsoon.forecast_rainfall_72h_mm} mm` : '—') :
              activeMetric === 'Crops' ? (district?.primary_crops?.[0] ?? '—') : '—'
            }
          </div>
        </div>
        <button
          onClick={() => setActiveMetric(null)}
          className="text-stone-400 hover:text-stone-600 transition"
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 space-y-2">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-stone-400 block">
            Data Source & Formula
          </span>
          <p className="text-[11px] font-medium text-stone-600 leading-relaxed">
            <strong className="text-stone-700">{METRIC_DETAILS[activeMetric].source}:</strong> {METRIC_DETAILS[activeMetric].formula}
          </p>
        </div>

        <div className="border-t border-brand-100/50 pt-1.5">
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-brand-700 block">
            Actionable Recommendation
          </span>
          <p className="text-[11px] font-semibold text-stone-850 leading-relaxed mt-0.5">
            {METRIC_DETAILS[activeMetric].actionable(
              activeMetric === 'Monsoon' ? (monsoon?.accumulated_rainfall_365d_mm ?? monsoon?.accumulated_rainfall_90d_mm) :
              activeMetric === 'Soil' ? soil?.moisture_percent :
              activeMetric === 'Weather' ? weather?.temperature :
              activeMetric === 'Vegetation' ? vegetation?.ndvi :
              activeMetric === 'Forecast' ? monsoon?.forecast_rainfall_72h_mm :
              activeMetric === 'Crops' ? district?.primary_crops?.[0] : '',
              activeMetric === 'Monsoon' ? (monsoon?.yearly_status ?? monsoon?.status) :
              activeMetric === 'Soil' ? (district?.soil_type ?? soil?.source) :
              activeMetric === 'Weather' ? weather?.description :
              activeMetric === 'Vegetation' ? vegetation?.health :
              activeMetric === 'Forecast' ? 'Next 72 hours' :
              activeMetric === 'Crops' ? 'Primary crop' : ''
            )}
          </p>
        </div>
      </div>


    </div>
  );

  if (showMobile) {
    return (
      <div
        className="pointer-events-auto fixed left-3 right-3 z-30 md:hidden"
        style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="overflow-hidden rounded-[20px] border border-stone-200/90 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full min-h-[48px] items-center justify-between gap-2 px-4 py-3 text-left"
            aria-expanded={expanded}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-stone-900">{displayName}</div>
              <div className="truncate text-[11px] font-medium text-stone-500">
                {loading
                  ? 'Loading metrics…'
                  : weather
                    ? `${weather.temperature}°C · ${risk.label}`
                    : risk.label}
              </div>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: risk.fill }}
            >
              {risk.label}
            </span>
            {expanded ? (
              <ChevronDown className="h-5 w-5 shrink-0 text-stone-400" />
            ) : (
              <ChevronUp className="h-5 w-5 shrink-0 text-stone-400" />
            )}
          </button>

          {expanded && (
            <div className="max-h-[38dvh] overflow-y-auto border-t border-stone-100 px-3 pb-3 pt-2">
              {loading ? (
                <div className="flex items-center gap-2 py-3 text-xs font-semibold text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  Loading yearly metrics…
                </div>
              ) : (
                <>
                  {metricsGrid}
                  {detailPanel}
                  {district && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-stone-500">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                      {district.approximateMatch ? 'Nearest advisory zone' : 'El Niño zone'}:{' '}
                      {district.risk_level} · {district.region}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 left-20 z-20 hidden max-w-[560px] md:block">
      <div className="rounded-[20px] border border-stone-200/90 bg-white/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.1)] backdrop-blur-md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-stone-900">{displayName}</h4>
            <p className="truncate text-[11px] font-medium text-stone-500">{displaySubtitle}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: risk.fill }}
          >
            {risk.label}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-2 text-xs font-semibold text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Loading yearly metrics…
          </div>
        ) : (
          <>
            {metricsGrid}
            {detailPanel}
          </>
        )}

        {district && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-stone-500">
            <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            {district.approximateMatch ? 'Nearest advisory zone' : 'El Niño risk'}:{' '}
            {district.risk_level} · {district.region}
          </div>
        )}
      </div>
    </div>
  );
}
