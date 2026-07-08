import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadMapplsSdk } from '../utils/mappls';

export default function MapComponent({
  mapKey,
  districts,
  selectedLocation,
  onSelectLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayLayersRef = useRef([]);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelectLocation);
  const [resolvedMapKey, setResolvedMapKey] = useState(mapKey || '');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

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
        if (config.mapmyindia_key) {
          setResolvedMapKey(config.mapmyindia_key);
        }
      } catch (error) {
        console.error('Failed to load map config:', error);
      }
    }

    loadConfig();
  }, [resolvedMapKey]);

  useEffect(() => {
    onSelectRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    if (!resolvedMapKey || !mapContainerRef.current) return;

    let cancelled = false;

    async function initMap() {
      try {
        const mappls = await loadMapplsSdk(resolvedMapKey);
        if (cancelled || !mapContainerRef.current) return;

        if (mapRef.current) {
          return;
        }

        const map = new mappls.Map(mapContainerRef.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 5,
          search: false,
          geolocation: false,
        });

        mapRef.current = map;

        map.addListener('click', (event) => {
          const lat = event?.latLng?.lat ?? event?.lat ?? event?.latitude;
          const lng = event?.latLng?.lng ?? event?.lng ?? event?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') {
            onSelectRef.current(lat, lng, null);
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
    if (!map || !mapReady || !districts?.length) return;

    overlayLayersRef.current.forEach((layer) => {
      try {
        window.mappls?.remove?.({ map, layer });
      } catch {
        // ignore cleanup errors
      }
    });
    overlayLayersRef.current = [];

    districts.forEach((district) => {
      const isHigh = district.risk_level === 'High';
      const color = isHigh ? '#ea580c' : '#f97316';

      try {
        const circle = new window.mappls.Circle({
          map,
          center: { lat: district.lat, lng: district.lon },
          radius: 35000,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 1.5,
          fillColor: color,
          fillOpacity: 0.28,
        });

        circle.addListener('click', (event) => {
          if (event?.stopPropagation) event.stopPropagation();
          onSelectRef.current(district.lat, district.lon, district);
        });

        overlayLayersRef.current.push(circle);
      } catch (error) {
        console.warn('Could not render district circle:', district.name, error);
      }
    });
  }, [districts, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedLocation) return;

    const { lat, lon, district } = selectedLocation;

    map.setCenter({ lat, lng: lon });
    map.setZoom(district ? 8 : 7);

    if (markerRef.current) {
      try {
        markerRef.current.remove?.();
      } catch {
        // ignore
      }
      markerRef.current = null;
    }

    markerRef.current = new window.mappls.Marker({
      map,
      position: { lat, lng: lon },
      popupHtml: district
        ? `<div style="font-family:Inter,sans-serif;padding:4px 6px;"><strong>${district.name}</strong><div style="font-size:11px;color:#ea580c;margin-top:2px;">Selected farm location</div></div>`
        : `<div style="font-family:Inter,sans-serif;padding:4px 6px;"><strong>Custom Location</strong><div style="font-size:11px;color:#57534e;margin-top:2px;">Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}</div></div>`,
      popupOptions: { openPopup: true },
    });
  }, [selectedLocation, mapReady]);

  return (
    <div className="relative h-full min-h-[380px] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" id="bhumija-map" />

      {!resolvedMapKey && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 p-6 text-center">
          <p className="text-sm font-medium text-stone-600">MapMyIndia API key is missing. Add it to backend/.env</p>
        </div>
      )}

      {resolvedMapKey && !mapReady && !mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Loading MapMyIndia map...
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 p-6 text-center">
          <p className="text-sm font-medium text-red-600">{mapError}</p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[240px] rounded-xl border border-stone-200/80 bg-white/95 px-3.5 py-2.5 text-xs font-semibold text-stone-800 shadow-sm backdrop-blur-md">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Vulnerability overlay</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-brand-700 bg-brand-600 opacity-70" />
            <span>High risk districts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-brand-500 bg-brand-400 opacity-70" />
            <span>Medium risk zones</span>
          </div>
        </div>
      </div>
    </div>
  );
}
