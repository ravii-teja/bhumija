import React, { useState, useEffect } from 'react';
import {
  Sprout,
  CloudSun,
  Compass,
  ShieldAlert,
  MapPin,
  Wind,
  Thermometer,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import SearchBar from './components/SearchBar';
import MapComponent from './components/MapComponent';
import ChatComponent from './components/ChatComponent';
import { findDistrictByCoords } from './utils/mappls';

export default function App() {
  const [districts, setDistricts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [mapKey, setMapKey] = useState('');
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [districtRes, configRes] = await Promise.all([
          fetch('/api/districts'),
          fetch('/api/config'),
        ]);

        if (districtRes.ok) {
          setDistricts(await districtRes.json());
        }

        if (configRes.ok) {
          const config = await configRes.json();
          setMapKey(config.mapmyindia_key || '');
          setGeminiConfigured(Boolean(config.gemini_configured));
        }
      } catch (error) {
        console.error('Failed to bootstrap app:', error);
      }
    }

    bootstrap();
  }, []);

  const handleSelectLocation = async (lat, lon, district = null) => {
    const matchedDistrict = district || findDistrictByCoords(districts, lat, lon);
    setSelectedLocation({ lat, lon, district: matchedDistrict });
    setWeather(null);
    setLoadingWeather(true);

    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        setWeather(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stone-50 font-sans text-stone-900 antialiased">
      <header className="z-50 shrink-0 border-b border-stone-200 bg-white px-4 py-3 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-600 p-2 text-white shadow-sm shadow-brand-500/20">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-stone-900">Bhumija</h1>
                <span className="rounded-full border border-brand-200 bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                  El Niño Shield
                </span>
              </div>
              <p className="text-xs font-medium text-stone-500">
                AI-powered drought resilience for Indian farmers
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 md:flex">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <span>{geminiConfigured ? 'Gemini AI active' : 'Expert advisory mode'}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:p-6 lg:grid-cols-12 lg:gap-6 lg:p-8">
        <section className="flex min-h-0 flex-col gap-4 overflow-hidden lg:col-span-7">
          <SearchBar
            districts={districts}
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
          />

          <div className="h-[340px] shrink-0 md:h-[420px]">
            <MapComponent
              mapKey={mapKey}
              districts={districts}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {!selectedLocation ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center space-y-3 p-4 text-center">
                <div className="rounded-full border border-stone-100 bg-stone-50 p-3 text-stone-400">
                  <Compass className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">Select your farm location</h4>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-stone-400">
                    Search with MapMyIndia or click a vulnerable district overlay on the map to load weather and El Niño advisories.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col justify-between gap-3 border-b border-stone-100 pb-4 md:flex-row md:items-center">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-brand-100 bg-brand-50 p-2 text-brand-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-stone-900">
                        {selectedLocation.district ? selectedLocation.district.name : 'Custom Location'}
                      </h4>
                      <p className="text-xs font-medium text-stone-500">
                        {selectedLocation.district
                          ? `${selectedLocation.district.region}, ${selectedLocation.district.state}`
                          : `Lat ${selectedLocation.lat.toFixed(4)}, Lon ${selectedLocation.lon.toFixed(4)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200/60 bg-stone-50 px-4 py-2">
                    {loadingWeather ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-400">
                        <CloudSun className="h-4 w-4 animate-spin" />
                        <span>Loading weather...</span>
                      </div>
                    ) : weather ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="h-4 w-4 text-brand-600" />
                          <span className="text-sm font-bold text-stone-800">{weather.temperature}°C</span>
                        </div>
                        <div className="hidden h-4 w-px bg-stone-200 sm:block" />
                        <div className="flex items-center gap-1.5">
                          <Wind className="h-4 w-4 text-brand-600" />
                          <span className="text-xs font-semibold text-stone-600">{weather.windspeed} km/h</span>
                        </div>
                        <div className="hidden h-4 w-px bg-stone-200 sm:block" />
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                          {weather.description}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-stone-400">Weather unavailable</span>
                    )}
                  </div>
                </div>

                {selectedLocation.district ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                    <div className="space-y-3.5 md:col-span-5">
                      <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                          <ShieldAlert className="h-4 w-4" />
                          <span>El Niño Risk Level</span>
                        </div>
                        <p className="text-sm font-extrabold text-red-800">
                          {selectedLocation.district.risk_level} Vulnerability
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Soil Type</div>
                        <p className="mt-1 rounded-lg border border-stone-200/50 bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-800">
                          {selectedLocation.district.soil_type}
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Primary Crops</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {selectedLocation.district.primary_crops.map((crop) => (
                            <span
                              key={crop}
                              className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800"
                            >
                              {crop}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-stone-200/60 bg-stone-50/50 p-4 md:col-span-7">
                      <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                        <BookOpen className="h-4 w-4 text-brand-600" />
                        <span>Quick Mitigation Advisories</span>
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <strong className="mb-0.5 block font-bold text-stone-800">Crop Switching</strong>
                          <span className="font-medium leading-relaxed text-stone-600">
                            {selectedLocation.district.mitigation_advisories.crop_switching}
                          </span>
                        </div>
                        <div>
                          <strong className="mb-0.5 block font-bold text-stone-800">Moisture Conservation</strong>
                          <span className="font-medium leading-relaxed text-stone-600">
                            {selectedLocation.district.mitigation_advisories.moisture_conservation}
                          </span>
                        </div>
                        <div>
                          <strong className="mb-0.5 block font-bold text-stone-800">Water Harvesting</strong>
                          <span className="font-medium leading-relaxed text-stone-600">
                            {selectedLocation.district.mitigation_advisories.water_harvesting}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-200/60 bg-stone-50 p-4 text-xs font-semibold leading-relaxed text-stone-500">
                    Custom location selected. Ask Bhumija AI on the right for a tailored drought-resilience plan for these coordinates.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="min-h-[420px] overflow-hidden lg:col-span-5 lg:min-h-0">
          <ChatComponent selectedLocation={selectedLocation} geminiConfigured={geminiConfigured} />
        </section>
      </main>
    </div>
  );
}
