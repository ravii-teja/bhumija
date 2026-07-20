import React, { useState, useEffect } from 'react';
import { ChevronRight, PanelRight, Sparkles, Sprout } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import SearchBar from './components/SearchBar';
import MapComponent from './components/MapComponent';
import BhumijaAssistant from './components/BhumijaAssistant';
import GovernanceDashboard from './components/GovernanceDashboard';
import MobileNavBar from './components/MobileNavBar';
import BottomSheet from './components/BottomSheet';
import { findDistrictByCoords } from './utils/mappls';
import { useIsMobile } from './hooks/useMediaQuery';
import { supabase } from './utils/supabase';

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
  const [activeTab, setActiveTab] = useState('farmer');
  const [statewiseRepo, setStatewiseRepo] = useState([]);


  const fetchStatewiseRepo = async () => {
    try {
      const res = await fetch('/api/statewise-repository');
      if (res.ok) {
        setStatewiseRepo(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch statewise repository:', error);
    }
  };

  useEffect(() => {
    setPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const handleQueryEvent = () => {
      setActiveTab('farmer');
      setMobileTab('assistant');
      setPanelOpen(true);
    };
    window.addEventListener('bhumija-query-assistant', handleQueryEvent);
    return () => {
      window.removeEventListener('bhumija-query-assistant', handleQueryEvent);
    };
  }, []);

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

        fetchStatewiseRepo();
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

    // Switch to Governance tab immediately
    setActiveTab('governance');
    setPanelOpen(true);

    if (isMobile) {
      setMobileTab('governance');
    }

    // Save query/location to Supabase
    try {
      supabase.from('queries').insert([{
        lat,
        lon,
        district: matchedDistrict?.name || null,
        place_name: placeMeta?.name || null,
        place_address: placeMeta?.address || null,
        created_at: new Date().toISOString()
      }]).then(({ error }) => {
        if (error) console.error('Error saving query to Supabase:', error);
      });
    } catch (e) {
      console.error('Supabase logging error:', e);
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
      // Re-fetch statewise repository to show the updated data
      fetchStatewiseRepo();
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

  const governancePanel = (
    <GovernanceDashboard
      selectedLocation={selectedLocation}
      weather={weather}
      agroData={agroData}
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
          weather={weather}
          agroData={agroData}
          loadingWeather={loadingWeather}
          loadingAgro={loadingAgro}
          statewiseRepo={statewiseRepo}
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
                right: panelOpen ? 'calc(min(100%, 560px) + 0.75rem)' : '0.75rem',
              }}
              aria-label={panelOpen ? 'Hide assistant' : 'Show assistant'}
            >
              {panelOpen ? <ChevronRight className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
            </button>

            <aside
              className={`absolute bottom-0 right-0 top-0 z-30 flex w-[min(100%,560px)] flex-col border-l border-stone-200/90 bg-white shadow-2xl transition-transform duration-300 ease-out ${
                panelOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="shrink-0 border-b border-stone-200 bg-white p-2">
                <div className="flex rounded-lg bg-stone-100 p-1">
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('governance')}
                      className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition ${
                        activeTab === 'governance' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-950'
                      }`}
                    >
                      Governance
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('farmer')}
                    className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition ${
                      activeTab === 'farmer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-950'
                    }`}
                  >
                    Farmer Advisory
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === 'governance' ? governancePanel : assistantPanel}
              </div>
            </aside>
          </>
        )}
      </main>

      {isMobile && (
        <>
          <MobileNavBar active={mobileTab} onChange={setMobileTab} showGovernance={!!selectedLocation} />
          <BottomSheet
            open={mobileTab === 'assistant'}
            onClose={() => setMobileTab('map')}
            title="Bhumija Assistant"
            subtitle="Voice · SMS alerts · Crop & rain insights"
            tall
          >
            {assistantPanel}
          </BottomSheet>
          <BottomSheet
            open={mobileTab === 'governance'}
            onClose={() => setMobileTab('map')}
            title="Governance Dashboard"
            subtitle="Monsoon forecasts & water contingency steps"
            tall
          >
            {governancePanel}
          </BottomSheet>
        </>
      )}
      {/* Global Centered Footer Credits */}
      {(!isMobile || !selectedLocation) && (
        <div
          className="pointer-events-auto fixed -translate-x-1/2 rounded-full border border-stone-200/80 bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-stone-600 shadow-md backdrop-blur-md"
          style={{
            left: isMobile ? '50%' : panelOpen ? 'calc(50% - 280px)' : '50%',
            bottom: isMobile ? 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' : '0.5rem',
            zIndex: 9999,
          }}
        >
          <span>Made with ❤️ by </span>
          <a
            href="https://www.linkedin.com/in/raviiteja/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Ravi Teja
          </a>
          <span> & </span>
          <a
            href="https://www.linkedin.com/in/karunakarreddyk/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Karunakara Reddy
          </a>
        </div>
      )}
    </div>
  );
}
