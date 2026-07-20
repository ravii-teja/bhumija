import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Layers, Loader2, MapPin, Navigation } from 'lucide-react';
import { loadMapplsSdk } from '../utils/mappls';
import { computeLocationRisk, districtRiskColor, riskToColor } from '../utils/riskScore';
import MapLocationMetrics from './MapLocationMetrics';
import { useIsMobile } from '../hooks/useMediaQuery';

const OVERLAY_MODES = [
  { id: 'vulnerability', label: 'Risk', short: 'Risk' },
  { id: 'monsoon', label: 'Monsoon', short: 'Rain' },
  { id: 'soil', label: 'Soil', short: 'Soil' },
  { id: 'composite', label: 'All layers', short: 'All' },
  { id: 'statewise', label: 'State Repository', short: 'State Repo' },
];

const STATE_COORDINATES = {
  'Maharashtra': { lat: 19.7515, lon: 75.7139 },
  'Andhra Pradesh': { lat: 15.9129, lon: 79.7400 },
  'Karnataka': { lat: 15.3173, lon: 75.7139 },
  'Rajasthan': { lat: 27.0238, lon: 74.2179 },
  'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
  'Madhya Pradesh': { lat: 22.9734, lon: 78.6569 },
  'Gujarat': { lat: 22.2587, lon: 71.1924 },
  'Tamil Nadu': { lat: 11.1271, lon: 78.6569 },
  'Telangana': { lat: 18.1124, lon: 79.0193 },
  'Punjab': { lat: 31.1471, lon: 75.3412 },
  'Haryana': { lat: 29.0588, lon: 76.0856 },
  'Bihar': { lat: 25.0961, lon: 85.3131 },
  'West Bengal': { lat: 22.9868, lon: 87.8550 },
  'Odisha': { lat: 20.9517, lon: 85.0985 },
};

function districtColor(district) {
  return districtRiskColor(district.risk_level);
}

export default function MapComponent({
  mapKey,
  districts,
  selectedLocation,
  onSelectLocation,
  agroMetrics,
  weather,
  agroData,
  loadingWeather,
  loadingAgro,
  statewiseRepo,
  searchBar,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayLayersRef = useRef([]);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelectLocation);
  const pinModeRef = useRef(false);
  const isMobile = useIsMobile();
  const [resolvedMapKey, setResolvedMapKey] = useState(mapKey || '');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    setResolvedMapKey(mapKey || '');
  }, [mapKey]);

  useEffect(() => {
    if (resolvedMapKey) return;
    async function loadConfig() {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) return;
        const config = await response.json();
        if (config.mapmyindia_key) setResolvedMapKey(config.mapmyindia_key);
      } catch (error) {
        console.error('Failed to load map config:', error);
      }
    }
    loadConfig();
  }, [resolvedMapKey]);

  useEffect(() => {
    pinModeRef.current = pinMode;
  }, [pinMode]);

  useEffect(() => {
    onSelectRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    if (!resolvedMapKey || !mapContainerRef.current) return;
    let cancelled = false;

    async function initMap() {
      try {
        await loadMapplsSdk(resolvedMapKey);
        if (cancelled || !mapContainerRef.current || mapRef.current) return;

        const map = new window.mappls.Map(mapContainerRef.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 5,
          search: false,
          geolocation: false,
        });

        mapRef.current = map;

        map.addListener('click', (event) => {
          if (!pinModeRef.current) return;
          const lat = event?.latLng?.lat ?? event?.lat ?? event?.latitude;
          const lng = event?.latLng?.lng ?? event?.lng ?? event?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') {
            onSelectRef.current(lat, lng, null);
            pinModeRef.current = false;
            setPinMode(false);
          }
        });

        setMapReady(true);
        setMapError(null);
      } catch (error) {
        console.error('Map initialization failed:', error);
        setMapError('Unable to load MapMyIndia map. Check API key and network.');
      }
    }

    initMap();
    return () => {
      cancelled = true;
    };
  }, [resolvedMapKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;

    const handleResize = () => {
      try {
        map.invalidateSize?.();
      } catch {
        // ignore
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const timer = setTimeout(handleResize, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timer);
    };
  }, [mapReady, isMobile]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous overlays
    overlayLayersRef.current.forEach((layer) => {
      try {
        window.mappls?.remove?.({ map, layer });
      } catch {
        // ignore
      }
    });
    overlayLayersRef.current = [];

    // Remove heatmap layer and source if they exist
    try {
      if (map.getLayer('risk-heatmap')) map.removeLayer('risk-heatmap');
      if (map.getSource('districts-risk')) map.removeSource('districts-risk');
    } catch (e) {
      // ignore
    }

    if (!districts?.length) return;

    if (!selectedLocation) {
      // Render density heatmap of the 315 El Niño risk districts on initial load
      try {
        map.addSource('districts-risk', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: districts.map((d) => ({
              type: 'Feature',
              properties: {
                risk_value: d.risk_level === 'High' ? 1.0 : d.risk_level === 'Medium' ? 0.6 : 0.2,
              },
              geometry: {
                type: 'Point',
                coordinates: [d.lon, d.lat],
              },
            })),
          },
        });

        map.addLayer({
          id: 'risk-heatmap',
          type: 'heatmap',
          source: 'districts-risk',
          maxzoom: 9,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'risk_value'],
              0, 0,
              1, 1
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              9, 3
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(37, 99, 235, 0)',
              0.2, 'rgba(59, 130, 246, 0.5)',
              0.5, 'rgba(245, 158, 11, 0.75)',
              1, 'rgba(239, 68, 68, 0.85)'
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 15,
              9, 45
            ],
            'heatmap-opacity': 0.8,
          },
        });
      } catch (err) {
        console.warn('Error rendering heatmap:', err);
      }
    } else {
      // Render a clean location circle overlay after location selection
      const { lat, lon, district } = selectedLocation;
      const targetDistrict = district || districts.find((d) => d.id === selectedLocation.district_id);
      
      if (targetDistrict) {
        const colors = districtColor(targetDistrict);
        try {
          const circle = new window.mappls.Circle({
            map,
            center: { lat, lng: lon },
            radius: 42000,
            strokeColor: colors.stroke,
            strokeOpacity: 0.95,
            strokeWeight: 1.5,
            fillColor: colors.fill,
            fillOpacity: 0.32,
          });

          circle.bindPopup?.(
            `<div style="font-family:Roboto,Inter,sans-serif;padding:4px;">
              <strong>${targetDistrict.name}</strong>
              <div style="font-size:11px;color:#57534e;">${targetDistrict.region} · ${targetDistrict.risk_level} risk</div>
            </div>`
          );

          circle.addListener('click', (event) => {
            if (event?.stopPropagation) event.stopPropagation();
            onSelectRef.current(targetDistrict.lat, targetDistrict.lon, targetDistrict);
          });

          overlayLayersRef.current.push(circle);
        } catch (error) {
          console.warn('Could not render district circle:', targetDistrict.name, error);
        }
      } else {
        // Fallback for custom search / click coordinates
        try {
          const circle = new window.mappls.Circle({
            map,
            center: { lat, lng: lon },
            radius: 42000,
            strokeColor: '#f97316',
            strokeOpacity: 0.95,
            strokeWeight: 1.5,
            fillColor: '#fdba74',
            fillOpacity: 0.32,
          });
          overlayLayersRef.current.push(circle);
        } catch (error) {
          console.warn('Could not render pinned coordinate circle:', error);
        }
      }
    }
  }, [districts, mapReady, selectedLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedLocation) return;

    const { lat, lon, district, placeName } = selectedLocation;
    map.setCenter({ lat, lng: lon });
    map.setZoom(isMobile ? (district ? 8 : 9) : district ? 9 : 10);

    if (markerRef.current) {
      try {
        markerRef.current.remove?.();
      } catch {
        // ignore
      }
      markerRef.current = null;
    }
    const riskScore = computeLocationRisk({ district, weather, agroData });
    const risk = riskToColor(riskScore);

    markerRef.current = new window.mappls.Marker({
      map,
      position: { lat, lng: lon },
      popupHtml: `<div style="font-family:Roboto,Inter,sans-serif;padding:4px 6px;">
        <strong>${placeName ?? district?.name ?? 'Farm location'}</strong>
        <div style="font-size:11px;color:${risk.fill};margin-top:2px;">${risk.label}</div>
      </div>`,
      popupOptions: { openPopup: !isMobile },
    });
  }, [selectedLocation, mapReady, weather, agroData, isMobile]);

  const handleGps = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelectRef.current(pos.coords.latitude, pos.coords.longitude, null);
        setGpsLoading(false);
        setPinMode(false);
      },
      (err) => {
        setGpsError(err.message || 'Could not get location');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div
      className={`relative h-full w-full touch-manipulation overflow-hidden bg-stone-200 ${
        pinMode ? 'cursor-crosshair' : ''
      }`}
    >
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" id="bhumija-map" />

      {/* Search — Material elevated surface */}
      {searchBar && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-30 px-3 md:left-4 md:max-w-[420px] md:px-0"
          style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="pointer-events-auto">{searchBar}</div>
        </div>
      )}


      {/* Map FABs — Material 48dp touch targets, right side above bottom nav */}
      <div
        className="absolute z-30 flex flex-col gap-3 md:left-4 md:right-auto md:top-auto md:bottom-auto"
        style={{
          left: isMobile ? 'auto' : '1rem',
          right: isMobile ? '0.75rem' : 'auto',
          bottom: isMobile
            ? selectedLocation
              ? 'calc(8.5rem + env(safe-area-inset-bottom, 0px))'
              : 'calc(5rem + env(safe-area-inset-bottom, 0px))'
            : '1.25rem',
        }}
      >
        <button
          type="button"
          title="Drop pin"
          aria-label="Drop pin on map"
          aria-pressed={pinMode}
          onClick={() => setPinMode((v) => !v)}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition active:scale-95 ${
            pinMode
              ? 'bg-brand-600 text-white'
              : 'bg-white text-stone-700'
          }`}
        >
          <MapPin className="h-6 w-6" />
        </button>
        <button
          type="button"
          title="My location"
          aria-label="Use GPS location"
          onClick={handleGps}
          disabled={gpsLoading}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition active:scale-95 disabled:opacity-60"
        >
          {gpsLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Navigation className="h-6 w-6" />
          )}
        </button>
      </div>

      {pinMode && (
        <div
          className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-lg"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <Crosshair className="h-4 w-4" />
          Tap map to place pin
        </div>
      )}

      {gpsError && (
        <div className="absolute left-3 right-3 z-30 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shadow-md md:left-auto md:right-20 md:max-w-xs">
          {gpsError}
        </div>
      )}

      <MapLocationMetrics
        selectedLocation={selectedLocation}
        weather={weather}
        agroData={agroData}
        loadingWeather={loadingWeather}
        loadingAgro={loadingAgro}
        isMobile={isMobile}
      />

      {(showLegend || !isMobile) && (
        <div
          className={`pointer-events-auto absolute z-20 rounded-2xl border border-stone-200/80 bg-white/95 px-3 py-2.5 text-xs font-semibold text-stone-800 shadow-md backdrop-blur-md ${
            isMobile
              ? 'left-3 right-3'
              : 'md:left-5 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:right-auto hidden max-w-[200px] md:block'
          }`}
          style={
            isMobile
              ? { bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }
              : undefined
          }
        >
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
            <span>El Nino Risk Categories</span>
            {isMobile && (
              <button type="button" onClick={() => setShowLegend(false)} className="text-stone-500">
                Close
              </button>
            )}
          </div>
          <div className="flex gap-4 md:flex-col md:gap-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-red-600" />
              <span>High risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-yellow-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-blue-600" />
              <span>Favorable</span>
            </div>
          </div>
        </div>
      )}

      {!resolvedMapKey && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/90 p-6 text-center">
          <p className="text-sm font-medium text-stone-600">MapMyIndia API key missing</p>
        </div>
      )}

      {resolvedMapKey && !mapReady && !mapError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/90 p-6 text-center">
          <p className="text-sm font-medium text-red-600">{mapError}</p>
        </div>
      )}
    </div>
  );
}
