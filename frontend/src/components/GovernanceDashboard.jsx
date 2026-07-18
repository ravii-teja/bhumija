import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CloudRain,
  Droplets,
  Loader2,
  Printer,
  ShieldAlert,
  TrendingUp,
  Users,
  Waves,
  Calendar,
} from 'lucide-react';

export default function GovernanceDashboard({
  selectedLocation,
  weather,
  agroData,
}) {
  const [data, setData] = useState(null);
  const [geeDamage, setGeeDamage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});

  useEffect(() => {
    if (!selectedLocation) return;

    const fetchGovernanceInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const { lat, lon, district } = selectedLocation;
        const distName = district?.name || 'District';
        const [govRes, geeRes] = await Promise.all([
          fetch(`/api/governance/insights?lat=${lat}&lon=${lon}`),
          fetch(`/api/gee/damage-quantification?district=${encodeURIComponent(distName)}&lat=${lat}&lon=${lon}`)
        ]);
        
        if (!govRes.ok) {
          throw new Error('Failed to load governance insights');
        }
        setData(await govRes.json());

        if (geeRes.ok) {
          setGeeDamage(await geeRes.json());
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGovernanceInsights();
  }, [selectedLocation?.lat, selectedLocation?.lon]);

  const handleExportReport = () => {
    window.print();
  };

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
    <div className="flex h-full flex-col bg-stone-50 overflow-y-auto print:bg-white print:p-6">
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800 print:hidden"
              title="Print / Export Contingency & Loss Report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                data.risk_level === 'High' ? 'bg-red-600' : data.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-blue-600'
              }`}
            >
              {data.risk_level} Risk
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4 pb-20">
        {/* Gov Feature 2A: GEE Crop Damage & PMFBY Quantifier Banner */}
        {geeDamage && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/70 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-red-100 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">GEE Crop Damage & PMFBY Quantifier</h3>
                    <p className="text-[10px] font-semibold text-red-700">2A. Satellite-Verified Disaster Assessment</p>
                  </div>
                </div>
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                  {geeDamage.damage_percentage}% Acreage Affected
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-stone-200 bg-white p-2.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Estimated Loss Acreage</span>
                  <p className="text-base font-black text-stone-900">{geeDamage.affected_acreage_acres?.toLocaleString()} <span className="text-xs font-semibold text-stone-500">Acres</span></p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-2.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Impacted Smallholders</span>
                  <p className="text-base font-black text-stone-900">{geeDamage.estimated_farmers_impacted?.toLocaleString()} <span className="text-xs font-semibold text-stone-500">Farmers</span></p>
                </div>
              </div>

              <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-semibold text-red-900">
                {geeDamage.pmfby_severity_level}
              </div>
            </div>

            {/* Gov Features 2B & 2C Grid */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {/* Gov Feature 2B: Surface Water & Farm Pond Stress Tracker */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Waves className="h-4 w-4 text-blue-600" />
                    <span>2B. Surface Water & Pond Stress</span>
                  </div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                    {geeDamage.surface_water_depletion_pct}% Depleted
                  </span>
                </div>
                <p className="mt-2 font-semibold text-blue-950">{geeDamage.reservoir_status}</p>
              </div>

              {/* Gov Feature 2C: Monsoon Onset & Sowing Contingency Tracker */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span>2C. Monsoon Delay & Sowing Shift</span>
                  </div>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                    {geeDamage.monsoon_delay_days} Days Delay
                  </span>
                </div>
                <p className="mt-2 font-semibold text-amber-950">{geeDamage.sowing_contingency_status}</p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="group relative rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-sm transition hover:shadow-md cursor-help">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Est. Savings
            </div>
            <div className="mt-2.5 text-xl font-black text-emerald-700">
              ₹{data.potential_savings_crores} <span className="text-[11px] font-bold text-stone-500">Cr</span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-stone-500">With timely crop shifting</p>
          </div>

          <div className="group relative rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-sm transition hover:shadow-md cursor-help">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              <Users className="h-4 w-4 text-blue-600" />
              Impacted Farmers
            </div>
            <div className="mt-2.5 text-xl font-black text-stone-900">
              {data.impacted_farmers_count?.toLocaleString()}
            </div>
            <p className="mt-1 text-[10px] font-medium text-stone-500">Smallholders in vulnerability zone</p>
          </div>
        </div>

        {/* First Action Steps */}
        {data.first_action_steps && data.first_action_steps.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-xs font-bold text-stone-900">First Action Directives</h3>
              <span className="text-[10px] font-bold text-stone-400">{firstActionProgress}% Done</span>
            </div>
            <div className="mt-3 space-y-2">
              {data.first_action_steps.map((step, idx) => {
                const isDone = completedSteps[`first-${idx}`];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep('first', idx)}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition ${
                      isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isDone ? 'text-emerald-600' : 'text-stone-300'}`} />
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
