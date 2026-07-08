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
} from 'lucide-react';
import { computeLocationRisk, riskToColor } from '../utils/riskScore';
import { useIsMobile } from '../hooks/useMediaQuery';

function MetricChip({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="rounded-2xl border bg-white px-3 py-2.5 shadow-sm"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-sm font-bold text-stone-900">{value}</div>
      {sub && <div className="mt-0.5 line-clamp-2 text-[11px] font-medium text-stone-500">{sub}</div>}
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
  const mobile = useIsMobile();
  const showMobile = isMobile || mobile;

  useEffect(() => {
    if (selectedLocation) setExpanded(true);
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
      />
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
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 hidden max-w-[560px] md:block">
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
          metricsGrid
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
