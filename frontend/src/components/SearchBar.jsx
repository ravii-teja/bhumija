import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { findDistrictByCoords } from '../utils/mappls';

export default function SearchBar({ districts, onSelectLocation, selectedLocation }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      const localMatches = districts
        .filter(
          (district) =>
            district.name.toLowerCase().includes(query.toLowerCase()) ||
            district.state.toLowerCase().includes(query.toLowerCase()) ||
            district.region.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 4)
        .map((district) => ({
          id: district.id,
          name: district.name,
          subtitle: `${district.region}, ${district.state}`,
          lat: district.lat,
          lon: district.lon,
          district,
          source: 'district',
          risk_level: district.risk_level,
        }));

      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (selectedLocation?.lat && selectedLocation?.lon) {
          params.set('lat', String(selectedLocation.lat));
          params.set('lon', String(selectedLocation.lon));
        }

        const response = await fetch(`/api/search?${params.toString()}`);
        let remoteMatches = [];

        if (response.ok) {
          const data = await response.json();
          remoteMatches = (data.results || []).map((result, index) => ({
            id: `mappls-${index}-${result.lat}-${result.lon}`,
            name: result.name,
            subtitle: result.address,
            lat: result.lat,
            lon: result.lon,
            district:
              districts.find((d) => d.id === result.district_id) ||
              findDistrictByCoords(districts, result.lat, result.lon),
            source: 'mapmyindia',
          }));
        }

        const merged = [...localMatches];
        remoteMatches.forEach((remote) => {
          const duplicate = merged.some(
            (item) =>
              Math.abs(item.lat - remote.lat) < 0.05 && Math.abs(item.lon - remote.lon) < 0.05
          );
          if (!duplicate) merged.push(remote);
        });

        setSuggestions(merged.slice(0, 8));
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions(localMatches);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, districts, selectedLocation]);

  const handleSelect = (item) => {
    onSelectLocation(item.lat, item.lon, item.district || null);
    setQuery(item.name);
    setSuggestions([]);
    setIsFocused(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className="relative z-30 w-full">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-full border border-stone-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 focus-within:border-brand-500 focus-within:shadow-md"
      >
        <Search className="mr-3 h-5 w-5 flex-shrink-0 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search location in India (MapMyIndia powered)..."
          className="w-full bg-transparent text-sm font-medium text-stone-800 placeholder-stone-400 focus:outline-none md:text-base"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
            }}
            className="px-2 text-sm font-medium text-stone-400 hover:text-stone-600"
          >
            Clear
          </button>
        )}
      </form>

      {isFocused && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl divide-y divide-stone-100">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-stone-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-800">{item.name}</div>
                  <div className="truncate text-xs text-stone-500">{item.subtitle}</div>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0">
                {item.risk_level ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      item.risk_level === 'High'
                        ? 'border-red-100 bg-red-50 text-red-700'
                        : 'border-orange-100 bg-orange-50 text-brand-700'
                    }`}
                  >
                    {item.risk_level} Risk
                  </span>
                ) : (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                    MapMyIndia
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
