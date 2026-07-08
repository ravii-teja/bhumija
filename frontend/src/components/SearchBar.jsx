import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { findDistrictByCoords } from '../utils/mappls';

function resolveDistrict(districts, result) {
  if (result.district_id) {
    const exact = districts.find((d) => d.id === result.district_id);
    if (exact) return exact;
  }
  return findDistrictByCoords(districts, result.lat, result.lon);
}

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
        .slice(0, 3)
        .map((district) => ({
          id: district.id,
          name: district.name,
          subtitle: `${district.region}, ${district.state} · El Niño advisory zone`,
          lat: district.lat,
          lon: district.lon,
          district,
          source: 'advisory_zone',
          risk_level: district.risk_level,
          isCity: false,
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
          remoteMatches = (data.results || []).map((result, index) => {
            const district = resolveDistrict(districts, result);
            let subtitle = result.address || result.name;
            if (result.approximate_district && result.district_name) {
              subtitle = `${subtitle} · Near ${result.district_name}`;
            } else if (district && !result.approximate_district) {
              subtitle = `${subtitle} · ${district.region}`;
            }

            return {
              id: `mappls-${index}-${result.lat}-${result.lon}`,
              name: result.name,
              subtitle,
              lat: result.lat,
              lon: result.lon,
              district,
              source: result.source || 'mapmyindia',
              isCity: true,
            };
          });
        }

        // Cities/places first; curated advisory zones after (no duplicates)
        const merged = [...remoteMatches];
        localMatches.forEach((local) => {
          const duplicate = merged.some(
            (item) =>
              Math.abs(item.lat - local.lat) < 0.08 && Math.abs(item.lon - local.lon) < 0.08
          );
          if (!duplicate) merged.push(local);
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
    onSelectLocation(item.lat, item.lon, item.district || null, {
      name: item.name,
      address: item.subtitle,
    });
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
        className="relative flex min-h-[48px] items-center rounded-[28px] border border-stone-200/80 bg-white px-4 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.12)] transition-shadow focus-within:border-brand-400 focus-within:shadow-[0_4px_20px_rgba(234,88,12,0.15)]"
      >
        <Search className="mr-2.5 h-5 w-5 flex-shrink-0 text-stone-400" />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search any city or village…"
          className="w-full bg-transparent text-base font-medium text-stone-800 placeholder-stone-400 focus:outline-none md:text-sm"
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
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(50dvh,320px)] overflow-y-auto rounded-[20px] border border-stone-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] divide-y divide-stone-100">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex min-h-[52px] w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-stone-100"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-800">{item.name}</div>
                  <div className="truncate text-xs text-stone-500">{item.subtitle}</div>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0">
                {item.isCity ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    City
                  </span>
                ) : item.risk_level ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      item.risk_level === 'High'
                        ? 'border-red-100 bg-red-50 text-red-700'
                        : 'border-orange-100 bg-orange-50 text-brand-700'
                    }`}
                  >
                    Advisory · {item.risk_level}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
