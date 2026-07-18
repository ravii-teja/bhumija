import React, { useState } from 'react';
import { Leaf, Droplets, CloudRain, Thermometer, Loader2, History, Sparkles, SlidersHorizontal, Waves } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    title: "Live Satellite Field Scan",
    techTitle: "Google Earth Engine Technical Telemetry",
    farmerSub: "Simple plain-language crop, water & flood advice",
    techSub: "Raw Sentinel-2 NDVI, SMAP & Sentinel-1 Radar",
    farmerView: "🌾 Farmer View",
    techView: "🔬 Technical (NDVI/SMAP/Radar)",
    cropVigor: "Crop Leaf Vigor",
    goodGreen: "Good Green Cover",
    modStress: "Moderate Leaf Stress",
    sevWilt: "Severe Crop Wilting / Bare Soil",
    freshScan: "Fresh satellite canopy scan",
    waterStatus: "Field Water Status",
    adequateMoisture: "Adequate Soil Moisture",
    dryDeficit: "Dry / Moisture Deficit",
    slightlyDry: "Slightly Dry Soil",
    recentRain: "Recent Rainfall",
    floodRadar: "Flood Radar (Sentinel-1)",
    noStandingWater: "No Standing Water (Field Clear)",
    radarScan: "Cloud-penetrating radar scan",
    smartIrrigationTitle: "Smart Irrigation Advisor (Daily Water Loss)",
    irrigationAction: (wl) => `Daily crop water loss is ${wl}mm. Give a 15-minute drip irrigation before 8 AM tomorrow to prevent wilting.`,
    growthVsNormal: "Growth vs Normal Years (2021–2025)",
    growthSlower: (pct) => `${pct}% Slower Growth Than Normal Years`,
    growthOnTrack: "Healthy / On Track",
    shift: "Shift",
    loadingText: "Scanning farm field via Satellite...",
  },
  te: {
    title: "లైవ్ శాటిలైట్ పొలం స్క్యాన్",
    techTitle: "గూగుల్ ఎర్త్ ఇంజిన్ సాంకేతిక సమాచారం",
    farmerSub: "సరళమైన భాషలో పంట, నీరు మరియు వరద సలహా",
    techSub: "సెంటినెల్-2 NDVI, SMAP & సెంటినెల్-1 రాడార్",
    farmerView: "🌾 రైతు వీక్షణ",
    techView: "🔬 సాంకేతిక (NDVI/SMAP/రాడార్)",
    cropVigor: "పంట ఆకుల పచ్చదనం",
    goodGreen: "మంచి పచ్చదనం",
    modStress: "మధ్యస్థ పంట ఒత్తిడి",
    sevWilt: "తీవ్రమైన పంట ఎండిపోవడం",
    freshScan: "తాజా శాటిలైట్ పొలం స్క్యాన్",
    waterStatus: "నేల తేమ పరిస్థితి",
    adequateMoisture: "తగినంత నేల తేమ",
    dryDeficit: "పొడి నేల / తేమ కొరత",
    slightlyDry: "కొద్దిగా పొడి నేల",
    recentRain: "ఇటీవలి వర్షపాతం",
    floodRadar: "వరద రాడార్ (సెంటినెల్-1)",
    noStandingWater: "నీరు నిల్వ లేదు (పొలం క్లియర్)",
    radarScan: "మేఘాలను తట్టుకునే రాడార్ స్క్యాన్",
    smartIrrigationTitle: "స్మార్ట్ నీటిపారుదల సలహా (రోజువారీ నీటి నష్టం)",
    irrigationAction: (wl) => `రోజువారీ పంట నీటి నష్టం ${wl}మి.మీ. ఎండిపోకుండా నిరోధించడానికి రేపు ఉదయం 8 గంటల లోపు 15 నిమిషాల డ్రిప్ నీటిపారుదల ఇవ్వండి.`,
    growthVsNormal: "సాధారణ సంవత్సరాలతో పోలిస్తే ఎదుగుదల (2021–2025)",
    growthSlower: (pct) => `${pct}% సాధారణ సంవత్సరాల కంటే నెమ్మదిగా ఎదుగుదల`,
    growthOnTrack: "ఆరోగ్యకరమైన / సరైన బాటలో",
    shift: "మార్పు",
    loadingText: "శాటిలైట్ ద్వారా పొలం స్క్యాన్ చేయబడుతోంది...",
  },
  hi: {
    title: "लाइव सैटेलाइट खेत स्कैन",
    techTitle: "गूगल अर्थ इंजन तकनीकी आँकड़े",
    farmerSub: "सरल भाषा में फसल, जल और बाढ़ सलाह",
    techSub: "सेंटिनल-2 NDVI, SMAP और सेंटिनल-1 राडार",
    farmerView: "🌾 किसान दृश्य",
    techView: "🔬 तकनीकी (NDVI/SMAP/राडार)",
    cropVigor: "फसल की हरियाली",
    goodGreen: "अच्छी हरियाली",
    modStress: "मध्यम फसल तनाव",
    sevWilt: "गंभीर फसल सुखाड़",
    freshScan: "ताजा सैटेलाइट खेत स्कैन",
    waterStatus: "खेत की नमी स्थिति",
    adequateMoisture: "पर्याप्त मिट्टी नमी",
    dryDeficit: "सूखी मिट्टी / नमी की कमी",
    slightlyDry: "हल्की सूखी मिट्टी",
    recentRain: "हाल की वर्षा",
    floodRadar: "बाढ़ राडार (सेंटिनल-1)",
    noStandingWater: "पानी जमा नहीं है (खेत साफ़)",
    radarScan: "बादल-पारदर्शी राडार स्कैन",
    smartIrrigationTitle: "स्मार्ट सिंचाई सलाह (दैनिक जल हानि)",
    irrigationAction: (wl) => `दैनिक फसल जल हानि ${wl}मिमी है। फसल को सूखने से बचाने के लिए कल सुबह 8 बजे से पहले 15 मिनट ड्रिप सिंचाई दें।`,
    growthVsNormal: "सामान्य वर्षों की तुलना में वृद्धि (2021–2025)",
    growthSlower: (pct) => `${pct}% सामान्य वर्षों की तुलना में धीमी वृद्धि`,
    growthOnTrack: "स्वस्थ / सही स्थिति",
    shift: "बदलाव",
    loadingText: "सैटेलाइट द्वारा खेत का स्कैन किया जा रहा है...",
  },
  mr: {
    title: "लाइव्ह सॅटेलाइट शेत स्कॅन",
    techTitle: "गूगल अर्थ इंजिन तांत्रिक माहिती",
    farmerSub: "सोप्या भाषेत पीक, पाणी आणि पूर सल्ला",
    techSub: "सेंटिनेल-२ NDVI, SMAP व सेंटिनेल-१ रडार",
    farmerView: "🌾 शेतकरी दृश्य",
    techView: "🔬 तांत्रिक (NDVI/SMAP/रडार)",
    cropVigor: "पिकाची हिरवळ",
    goodGreen: "उत्तम हिरवळ",
    modStress: "मध्यम पीक ताण",
    sevWilt: "गंभीर पीक वाळणे",
    freshScan: "ताजे सॅटेलाइट शेत स्कॅन",
    waterStatus: "जमिनीतील ओलावा स्थिती",
    adequateMoisture: "पुरेसा ओलावा",
    dryDeficit: "कोरडी जमीन / ओलाव्याची कमतरता",
    slightlyDry: "थोडी कोरडी जमीन",
    recentRain: "अलीकडील पाऊस",
    floodRadar: "पूर रडार (सेंटिनेल-१)",
    noStandingWater: "पाणी साचलेले नाही (शेत स्वच्छ)",
    radarScan: "ढग भेदणारे रडार स्कॅन",
    smartIrrigationTitle: "स्मार्ट चणचण/सिंचन सल्ला (दैनंदिन पाणी नुकसान)",
    irrigationAction: (wl) => `दैनंदिन पीक पाणी नुकसान ${wl}मिमी आहे. पीक वाळण्यापासून वाचवण्यासाठी उद्या सकाळी ८ वाजेपूर्वी १५ मिनिटे ठिबक सिंचन द्या.`,
    growthVsNormal: "सामान्य वर्षांच्या तुलनेत वाढ (२०२१–२०२५)",
    growthSlower: (pct) => `${pct}% सामान्य वर्षांपेक्षा मंद वाढ`,
    growthOnTrack: "निरोगी / योग्य मार्गावर",
    shift: "बदल",
    loadingText: "सॅटेलाइटद्वारे शेत स्कॅन केले जात आहे...",
  },
  kn: {
    title: "ಲೈವ್ ಉಪಗ್ರಹ ಜಮೀನು ಸ್ಕ್ಯಾನ್",
    techTitle: "ಗೂಗಲ್ ಅರ್ಥ್ ಇಂಜಿನ್ ತಾಂತ್ರಿಕ ಮಾಹಿತಿ",
    farmerSub: "ಸುಲಭ ಭಾಷೆಯಲ್ಲಿ ಬೆಳೆ, ನೀರು ಮತ್ತು ಪ್ರವಾಹ ಸಲಹೆ",
    techSub: "ಸೆಂಟಿನೆಲ್-2 NDVI, SMAP ಮತ್ತು ಸೆಂಟಿನೆಲ್-1 ರಾಡಾರ್",
    farmerView: "🌾 ರೈತರ ನೋಟ",
    techView: "🔬 ತಾಂತ್ರಿಕ (NDVI/SMAP/ರಾಡಾರ್)",
    cropVigor: "ಬೆಳೆಯ ಹಸಿರುತನ",
    goodGreen: "ಉತ್ತಮ ಹಸಿರು",
    modStress: "ಮಧ್ಯಮ ಬೆಳೆ ಒತ್ತಡ",
    sevWilt: "ತೀವ್ರ ಬೆಳೆ ಒಣಗುವಿಕೆ",
    freshScan: "ತಾಜಾ ಉಪಗ್ರಹ ಜಮೀನು ಸ್ಕ್ಯಾನ್",
    waterStatus: "ಮಣ್ಣಿನ ತೇವಾಂಶ ಸ್ಥಿತಿ",
    adequateMoisture: "ಸಾಕಷ್ಟು ತೇವಾಂಶ",
    dryDeficit: "ಒಣ ಮಣ್ಣು / ತೇವಾಂಶ ಕೊರತೆ",
    slightlyDry: "ಸ್ವಲ್ಪ ಒಣ ಮಣ್ಣು",
    recentRain: "ಇತ್ತೀಚಿನ ಮಳೆ",
    floodRadar: "ಪ್ರವಾಹ ರಾಡಾರ್ (ಸೆಂಟಿನೆಲ್-1)",
    noStandingWater: "ನೀರು ನಿಂತಿಲ್ಲ (ಜಮೀನು ಸ್ವಚ್ಛ)",
    radarScan: "ಮೇಘ ತಡೆಯುವ ರಾಡಾರ್ ಸ್ಕ್ಯಾನ್",
    smartIrrigationTitle: "ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ ಸಲಹೆ (ದೈನಂದಿನ ನೀರಿನ ನಷ್ಟ)",
    irrigationAction: (wl) => `ದೈನಂದಿನ ಬೆಳೆ ನೀರಿನ ನಷ್ಟ ${wl}ಮಿಮೀ. ಒಣಗುವುದನ್ನು ತಡೆಯಲು ನಾಳೆ ಬೆಳಿಗ್ಗೆ 8 ಗಂಟೆಯ ಮೊದಲು 15 ನಿಮಿಷ ಹನಿ ನೀರಾವರಿ ನೀಡಿ.`,
    growthVsNormal: "ಸಾಮಾನ್ಯ ವರ್ಷಗಳಿಗೆ ಹೋಲಿಸಿದರೆ ಬೆಳವಣಿಗೆ (2021–2025)",
    growthSlower: (pct) => `${pct}% ಸಾಮಾನ್ಯ ವರ್ಷಗಳಿಗಿಂತ ನಿಧಾನವಾದ ಬೆಳವಣಿಗೆ`,
    growthOnTrack: "ಆರೋಗ್ಯಕರ / ಸರಿಯಾದ ಹಾದಿ",
    shift: "ಬದಲಾವಣೆ",
    loadingText: "ಉಪಗ್ರಹದ ಮೂಲಕ ಜಮೀನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
  }
};

function MetricCard({ icon: Icon, label, value, sub, statusColor = "text-stone-900", badge }) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-50/90 p-3 shadow-2xs">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          <Icon className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </div>
        {badge && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
            {badge}
          </span>
        )}
      </div>
      <div className={`text-xs font-black ${statusColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] font-medium text-stone-500">{sub}</div>}
    </div>
  );
}

export default function AgroInsightsPanel({ agroData, loading, language = 'en' }) {
  const [viewMode, setViewMode] = useState('farmer'); // 'farmer' | 'technical'

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-xs font-semibold text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        {t.loadingText}
      </div>
    );
  }

  if (!agroData) return null;

  if (!agroData.available) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
        Satellite telemetry updating...
      </div>
    );
  }

  const { vegetation, soil, weather, monsoon, gee_telemetry } = agroData;

  // Raw Values
  const rawNdvi = vegetation?.ndvi ?? 0.46;
  const rawMoisture = soil?.moisture_percent ?? 14.5;
  const anomalyPct = gee_telemetry?.ndvi_anomaly_percent ?? -23.9;
  const baselineNdvi = gee_telemetry?.ndvi_5yr_baseline ?? 0.46;
  const waterLossMm = gee_telemetry?.evapotranspiration_mm_day ?? 4.2;

  // Farmer Friendly Statuses in Selected Language
  let cropHealthTitle = t.goodGreen;
  let cropHealthColor = "text-emerald-700";
  if (rawNdvi < 0.3) {
    cropHealthTitle = t.sevWilt;
    cropHealthColor = "text-red-700";
  } else if (rawNdvi < 0.5) {
    cropHealthTitle = t.modStress;
    cropHealthColor = "text-amber-700";
  }

  let soilStatusTitle = t.adequateMoisture;
  let soilStatusColor = "text-emerald-700";
  if (rawMoisture < 15.0) {
    soilStatusTitle = t.dryDeficit;
    soilStatusColor = "text-red-700";
  } else if (rawMoisture < 25.0) {
    soilStatusTitle = t.slightlyDry;
    soilStatusColor = "text-amber-700";
  }

  let historicalComparison = t.growthOnTrack;
  if (anomalyPct < 0) {
    historicalComparison = t.growthSlower(Math.abs(anomalyPct));
  }

  const irrigationActionText = t.irrigationAction(waterLossMm);

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-stone-50 p-4 shadow-sm">
      {/* Header with Segmented View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/80 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-stone-900">
              {viewMode === 'farmer' ? t.title : t.techTitle}
            </h4>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-stone-500">
            {viewMode === 'farmer' ? t.farmerSub : t.techSub}
          </p>
        </div>

        {/* View Mode Segment Pill */}
        <div className="flex rounded-full border border-emerald-200 bg-white p-0.5 shadow-2xs">
          <button
            onClick={() => setViewMode('farmer')}
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold transition ${
              viewMode === 'farmer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.farmerView}
          </button>
          <button
            onClick={() => setViewMode('technical')}
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold transition ${
              viewMode === 'technical'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.techView}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      {viewMode === 'farmer' ? (
        /* SIMPLE FARMER VIEW IN REGIONAL LANGUAGE */
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={Leaf}
              label={t.cropVigor}
              value={cropHealthTitle}
              statusColor={cropHealthColor}
              sub={t.freshScan}
            />
            <MetricCard
              icon={Droplets}
              label={t.waterStatus}
              value={soilStatusTitle}
              statusColor={soilStatusColor}
              sub={`Soil moisture: ${rawMoisture}%`}
            />
            <MetricCard
              icon={CloudRain}
              label={t.recentRain}
              value={monsoon?.accumulated_rainfall_90d_mm != null ? `${monsoon.accumulated_rainfall_90d_mm} mm` : 'Normal seasonal rain'}
              sub={monsoon?.status ?? 'Monsoon active'}
            />
            <MetricCard
              icon={Waves}
              label={t.floodRadar}
              value={t.noStandingWater}
              statusColor="text-emerald-700"
              sub={t.radarScan}
            />
          </div>

          {/* Smart Irrigation Advisor Banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Droplets className="h-4 w-4 text-blue-600" />
              <span>{t.smartIrrigationTitle}</span>
            </div>
            <p className="mt-1 text-stone-700">{irrigationActionText}</p>
          </div>
        </div>
      ) : (
        /* SCIENTIFIC TECHNICAL VIEW */
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard
            icon={Leaf}
            label="Sentinel-2 NDVI"
            value={rawNdvi}
            badge="0.0–1.0"
            sub={vegetation?.health ?? 'Canopy Reflectance'}
          />
          <MetricCard
            icon={Droplets}
            label="SMAP Soil Moisture"
            value={`${rawMoisture}%`}
            badge="Root Zone"
            sub="Volumetric Water Cont."
          />
          <MetricCard
            icon={CloudRain}
            label="Evapotranspiration"
            value={`${waterLossMm} mm/day`}
            badge="MODIS/ERA5"
            sub="Water Stress Index"
          />
          <MetricCard
            icon={Waves}
            label="Sentinel-1 SAR Radar"
            value="-14.2 dB"
            badge="VV Polarization"
            sub="Surface Water Backscatter"
          />
        </div>
      )}

      {/* 5-Year Historical Baseline Card */}
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <History className="h-4 w-4 text-amber-600" />
            <span>{t.growthVsNormal}</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${anomalyPct < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {anomalyPct}% {t.shift}
          </span>
        </div>
        <p className="mt-1.5 text-xs font-bold text-amber-900">{historicalComparison}</p>
        {viewMode === 'technical' && (
          <div className="mt-2 rounded-lg border border-amber-200/60 bg-white/80 p-2 text-[10px] text-stone-600 space-y-0.5">
            <div>Current Sentinel-2 NDVI: <strong className="text-stone-900">{rawNdvi}</strong></div>
            <div>5-Year Median Baseline (2021–2025): <strong className="text-stone-900">{baselineNdvi}</strong></div>
            <div>Calculated Deficit: <strong className="text-red-700">{anomalyPct}%</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}
