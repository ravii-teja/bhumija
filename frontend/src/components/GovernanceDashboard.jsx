import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CloudRain,
  Droplets,
  Loader2,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';

export default function GovernanceDashboard({
  selectedLocation,
  weather,
  agroData,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});

  useEffect(() => {
    if (!selectedLocation) return;

    const fetchGovernanceInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const { lat, lon } = selectedLocation;
        const res = await fetch(`/api/governance/insights?lat=${lat}&lon=${lon}`);
        if (!res.ok) {
          throw new Error('Failed to load governance insights');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGovernanceInsights();
  }, [selectedLocation?.lat, selectedLocation?.lon]);

  if (!selectedLocation) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Building2 className="h-12 w-12 text-stone-300" />
        <h3 className="mt-4 text-sm font-bold text-stone-900">Governance Portal</h3>
        <p className="mt-2 max-w-xs text-xs text-stone-500">
          Select a district or zone on the map to display administrative metrics, forecasted impacts, and contingency checklists.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-xs font-semibold text-stone-500">Retrieving administrative data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="mt-2 text-xs font-semibold text-stone-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const toggleStep = (type, index) => {
    const key = `${type}-${index}`;
    setCompletedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getProgress = (steps, type) => {
    if (!steps || steps.length === 0) return 0;
    const completed = steps.filter((_, idx) => completedSteps[`${type}-${idx}`]).length;
    return Math.round((completed / steps.length) * 100);
  };

  const govProgress = getProgress(data.gov_steps, 'gov');
  const firstActionProgress = getProgress(data.first_action_steps, 'first');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="flex h-full flex-col bg-stone-50 overflow-y-auto">
      {/* Dashboard Header */}
      <div className="border-b border-stone-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                <Activity className="h-3 w-3" />
                Administrative Level
              </span>
              <span className="text-[10px] font-semibold text-stone-400">
                {today}
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-stone-900">{data.district_name}</h2>
            <p className="text-[11px] text-stone-500">{data.state_name} · El Niño {data.risk_level} Risk</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
              data.risk_level === 'High' ? 'bg-red-600' : data.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-blue-600'
            }`}
          >
            {data.risk_level} Risk
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4 pb-20">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Potential Savings KPI */}
          <div className="group relative rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-sm transition hover:shadow-md cursor-help">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Est. Savings
            </div>
            <div className="mt-2.5 text-xl font-black text-emerald-700">
              ₹{data.potential_savings_crores} <span className="text-[11px] font-bold text-stone-500">Cr</span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-stone-500">With timely crop shifting</p>

            {/* Hover Tooltip */}
            <div className="hidden md:block absolute top-full left-0 z-50 mt-1 w-[190%] rounded-xl border border-stone-800 bg-stone-950 p-3 text-[10px] text-white opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 shadow-xl">
              <div className="font-bold text-emerald-400">Calculation Logic:</div>
              <div className="mt-0.5 leading-relaxed text-stone-300">
                Impacted Farmers ({data.impacted_farmers.toLocaleString()}) × Avg. savings per farmer (₹{data.risk_level === 'High' ? '18,000' : data.risk_level === 'Medium' ? '15,000' : '10,000'} base adjusted for rainfall deficit).
              </div>
              <div className="mt-2 border-t border-white/10 pt-1.5 font-bold text-emerald-400">References:</div>
              <div className="mt-0.5 leading-relaxed text-stone-400">
                CRIDA guidelines: early crop-switching to short-duration pulses avoids up to ₹25,000/ha in absolute crop failure costs.
              </div>
            </div>
          </div>

          {/* Impacted Farmers KPI */}
          <div className="group relative rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-sm transition hover:shadow-md cursor-help">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              <Users className="h-4 w-4 text-blue-600" />
              Impacted Farmers
            </div>
            <div className="mt-2.5 text-xl font-black text-blue-900">
              {data.impacted_farmers.toLocaleString()}
            </div>
            <p className="mt-1 text-[10px] font-medium text-stone-500">Estimated vulnerable family units</p>

            {/* Hover Tooltip */}
            <div className="hidden md:block absolute top-full right-0 z-50 mt-1 w-[190%] rounded-xl border border-stone-800 bg-stone-950 p-3 text-[10px] text-white opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 shadow-xl">
              <div className="font-bold text-blue-400">Calculation Logic:</div>
              <div className="mt-0.5 leading-relaxed text-stone-300">
                District Farmer Base × Vulnerability Risk Factor ({data.risk_level === 'High' ? '35-55%' : data.risk_level === 'Medium' ? '15-35%' : '5-15%'}) × Rain Deficit Multiplier.
              </div>
              <div className="mt-2 border-t border-white/10 pt-1.5 font-bold text-blue-400">References:</div>
              <div className="mt-0.5 leading-relaxed text-stone-400">
                Ministry of Agriculture & Farmers Welfare assessments of Marathwada & Rayalaseema rainfed smallholder vulnerability under El Niño conditions.
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Forecast & Water Impact Status */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Environmental Risk Indicators</h3>
          
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 shrink-0">
              <CloudRain className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900">Monsoon Forecast</div>
              <p className="mt-0.5 text-xs text-stone-600 font-medium">{data.monsoon_forecast}</p>
            </div>
          </div>

          <div className="border-t border-stone-100 my-2"></div>

          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900">Water & Irrigation Impact</div>
              <p className="mt-0.5 text-xs text-stone-600 font-medium">{data.water_impact}</p>
            </div>
          </div>

          {data.water_levels && (
            <>
              <div className="border-t border-stone-100 my-2"></div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                  <span>Reservoir Storage Levels</span>
                  <span className="text-[10px] text-stone-500 font-medium">Cap. vs Projected Outlook</span>
                </div>
                
                <div className="space-y-2">
                  {/* Previous Year */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-stone-500">
                      <span>Previous Year Level</span>
                      <span>{data.water_levels.previous_pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-stone-400" style={{ width: `${data.water_levels.previous_pct}%` }}></div>
                    </div>
                  </div>

                  {/* Current Year */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-stone-700">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        Current Level
                      </span>
                      <span>{data.water_levels.current_pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${data.water_levels.current_pct}%` }}></div>
                    </div>
                  </div>

                  {/* Projected (El Nino Forecast) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-red-700">
                      <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                        Projected (3-Month Outlook under El Niño)
                      </span>
                      <span>{data.water_levels.projected_pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${data.water_levels.projected_pct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Government Action Plan */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">District Admin Directives</h3>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              {govProgress}% Done
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${govProgress}%` }}
            ></div>
          </div>

          <div className="mt-3.5 space-y-2">
            {data.gov_steps.map((step, idx) => {
              const isDone = completedSteps[`gov-${idx}`];
              return (
                <button
                  key={idx}
                  onClick={() => toggleStep('gov', idx)}
                  className="flex w-full items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-2.5 text-left transition hover:bg-stone-50 active:bg-stone-100"
                >
                  <span className={`mt-0.5 shrink-0 rounded-full ${isDone ? 'text-emerald-600' : 'text-stone-400'}`}>
                    <CheckCircle2 className="h-4 w-4 fill-current text-white border border-stone-300 rounded-full" />
                  </span>
                  <span className={`text-[11px] font-medium leading-relaxed ${isDone ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* First Action Bodies Directive */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">First Action Field Guidelines</h3>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              {firstActionProgress}% Done
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${firstActionProgress}%` }}
            ></div>
          </div>

          <div className="mt-3.5 space-y-2">
            {data.first_action_steps.map((step, idx) => {
              const isDone = completedSteps[`first-${idx}`];
              return (
                <button
                  key={idx}
                  onClick={() => toggleStep('first', idx)}
                  className="flex w-full items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-2.5 text-left transition hover:bg-stone-50 active:bg-stone-100"
                >
                  <span className={`mt-0.5 shrink-0 rounded-full ${isDone ? 'text-blue-600' : 'text-stone-400'}`}>
                    <CheckCircle2 className="h-4 w-4 fill-current text-white border border-stone-300 rounded-full" />
                  </span>
                  <span className={`text-[11px] font-medium leading-relaxed ${isDone ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
