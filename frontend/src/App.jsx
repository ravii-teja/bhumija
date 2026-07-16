import React, { useState, useEffect } from 'react';
import { ChevronRight, PanelRight, Sparkles, Sprout } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import SearchBar from './components/SearchBar';
import MapComponent from './components/MapComponent';
import BhumijaAssistant from './components/BhumijaAssistant';
import MobileNavBar from './components/MobileNavBar';
import BottomSheet from './components/BottomSheet';
import { findDistrictByCoords } from './utils/mappls';
import { useIsMobile } from './hooks/useMediaQuery';

export default function App() {
  const isMobile = useIsMobile();
  const [districts, setDistricts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [mapKey, setMapKey] = useState('');
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [agroMetrics, setAgroMetrics] = useState([]);
  const [agroData, setAgroData] = useState(null);
  const [loadingAgro, setLoadingAgro] = useState(false);
  const [overlayMode, setOverlayMode] = useState('composite');
  const [farmerLang, setFarmerLang] = useState('hi');
  const [supportedLanguages, setSupportedLanguages] = useState({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState('map');

  useEffect(() => {
    setPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [districtRes, configRes, agroOverlayRes] = await Promise.all([
          fetch('/api/districts'),
          fetch('/api/config'),
          fetch('/api/agro/district-overlay'),
        ]);

        if (districtRes.ok) {
          setDistricts(await districtRes.json());
        }

        if (configRes.ok) {
          const config = await configRes.json();
          setMapKey(config.mapmyindia_key || '');
          setGeminiConfigured(Boolean(config.gemini_configured));
          setSupportedLanguages(config.supported_languages || {});
        }

        if (agroOverlayRes.ok) {
          const overlay = await agroOverlayRes.json();
          if (overlay.available) {
            setAgroMetrics(overlay.metrics || []);
          }
        }
      } catch (error) {
        console.error('Failed to bootstrap app:', error);
      }
    }

    bootstrap();
  }, []);

  const handleSelectLocation = async (lat, lon, district = null, placeMeta = null) => {
    const matchedDistrict = district || findDistrictByCoords(districts, lat, lon);
    setSelectedLocation({
      lat,
      lon,
      district: matchedDistrict,
      placeName: placeMeta?.name ?? null,
      placeAddress: placeMeta?.address ?? null,
    });
    setWeather(null);
    setAgroData(null);
    setLoadingWeather(true);
    setLoadingAgro(true);

    if (isMobile) {
      setMobileTab('map');
    }

    try {
      const [weatherRes, agroRes] = await Promise.all([
        fetch(`/api/weather?lat=${lat}&lon=${lon}`),
        fetch(`/api/agro/insights?lat=${lat}&lon=${lon}`),
      ]);
      if (weatherRes.ok) {
        setWeather(await weatherRes.json());
      }
      if (agroRes.ok) {
        setAgroData(await agroRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch location data:', error);
    } finally {
      setLoadingWeather(false);
      setLoadingAgro(false);
    }
  };

  const assistantPanel = (
    <BhumijaAssistant
      selectedLocation={selectedLocation}
      geminiConfigured={geminiConfigured}
      supportedLanguages={supportedLanguages}
      language={farmerLang}
      onLanguageChange={setFarmerLang}
      agroData={agroData}
      weather={weather}
    />
  );

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-stone-900 font-sans text-stone-900 antialiased">
      <Analytics />
      <main className="relative min-h-0 flex-1">
        <MapComponent
          mapKey={mapKey}
          districts={districts}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          agroMetrics={agroMetrics}
          overlayMode={overlayMode}
          onOverlayModeChange={setOverlayMode}
          weather={weather}
          agroData={agroData}
          loadingWeather={loadingWeather}
          loadingAgro={loadingAgro}
          searchBar={
            <SearchBar
              districts={districts}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
            />
          }
        />

        {!isMobile && !panelOpen && (
          <div
            className="pointer-events-none absolute right-14 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-stone-900/75 px-3 py-2 shadow-lg backdrop-blur-md"
            style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
          >
            <div className="rounded-xl bg-brand-600 p-1.5 text-white">
              <Sprout className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">Bhumija</span>
              <div className="flex items-center gap-1 text-[10px] font-medium text-stone-400">
                <Sparkles className="h-3 w-3 text-brand-400" />
                {geminiConfigured ? 'Gemini AI' : 'Expert mode'}
              </div>
            </div>
          </div>
        )}

        {!isMobile && (
          <>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className="absolute z-40 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white shadow-lg transition hover:bg-stone-50"
              style={{
                top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
                right: panelOpen ? 'calc(min(100%, 380px) + 0.75rem)' : '0.75rem',
              }}
              aria-label={panelOpen ? 'Hide assistant' : 'Show assistant'}
            >
              {panelOpen ? <ChevronRight className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
            </button>

            <aside
              className={`absolute bottom-0 right-0 top-0 z-30 flex w-[min(100%,380px)] flex-col border-l border-stone-200/90 bg-white shadow-2xl transition-transform duration-300 ease-out ${
                panelOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="shrink-0 border-b border-stone-100 px-4 py-3">
                <h2 className="text-sm font-bold text-stone-900">Bhumija Assistant</h2>
                <p className="text-[11px] text-stone-500">Voice · Alerts · Crops · Forecast</p>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">{assistantPanel}</div>
            </aside>
          </>
        )}
      </main>

      {isMobile && (
        <>
          <MobileNavBar active={mobileTab} onChange={setMobileTab} />
          <BottomSheet
            open={mobileTab === 'assistant'}
            onClose={() => setMobileTab('map')}
            title="Bhumija Assistant"
            subtitle="Voice · SMS alerts · Crop & rain insights"
            tall
          >
            {assistantPanel}
          </BottomSheet>
        </>
      )}
    </div>
  );
}
