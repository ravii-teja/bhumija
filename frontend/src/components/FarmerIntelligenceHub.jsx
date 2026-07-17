import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Droplets,
  Leaf,
  Loader2,
  Mic,
  MicOff,
  Phone,
  Sprout,
  Volume2,
  Building2,
  MessageSquare,
} from 'lucide-react';

const SPEECH_LANG = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
};

const UI_LABELS = {
  en: {
    title: 'Farmer Intelligence Hub',
    subtitle: 'Voice · SMS · Crop advice in your language',
    crops: 'Crop Recommendations',
    alerts: 'Alerts & Guidance',
    health: 'Crop Health Log',
    voice: 'Voice & SMS',
    loading: 'Loading farm intelligence...',
    noLocation: 'Select a farm location on the map to get personalized advice.',
    speak: 'Speak',
    stop: 'Stop',
    listen: 'Listen to advisory',
    notes: 'Describe crop problem (voice or text)',
    photo: 'Add field photo',
    submitHealth: 'Submit health log',
    phone: 'Mobile number (10 digits)',
    subscribe: 'Subscribe to SMS alerts',
    subscribed: 'Subscribed! Sample SMS:',
    referral: 'Rythu Seva Kendra Referral',
    visit: 'Visit within 7 days with referral ID',
    irrigation: 'Irrigation',
    fertilization: 'Fertilization',
    sensors: 'Ground sensors',
    score: 'Suitability',
    days: 'days',
  },
  hi: {
    title: 'किसान बुद्धिमत्ता केंद्र',
    subtitle: 'आवाज · SMS · आपकी भाषा में सलाह',
    crops: 'फसल सिफारिश',
    alerts: 'चेतावनी और मार्गदर्शन',
    health: 'फसल स्वास्थ्य लॉग',
    voice: 'आवाज और SMS',
    loading: 'जानकारी लोड हो रही है...',
    noLocation: 'नक्शे पर अपना खेत चुनें।',
    speak: 'बोलें',
    stop: 'रोकें',
    listen: 'सलाह सुनें',
    notes: 'फसल की समस्या बताएं',
    photo: 'फोटो जोड़ें',
    submitHealth: 'लॉग भेजें',
    phone: 'मोबाइल नंबर',
    subscribe: 'SMS अलर्ट सब्सक्राइब करें',
    subscribed: 'सब्सक्राइब हो गया! नमूना SMS:',
    referral: 'रैथु सेवा केंद्र रेफरल',
    visit: '7 दिन में रेफरल ID के साथ जाएं',
    irrigation: 'सिंचाई',
    fertilization: 'खाद',
    sensors: 'ग्राउंड सेंसर',
    score: 'उपयुक्तता',
    days: 'दिन',
  },
  te: {
    title: 'రైతు ఇంటెలిజెన్స్ హబ్',
    subtitle: 'వాయిస్ · SMS · మీ భాషలో సలహా',
    crops: 'పంట సిఫార్సులు',
    alerts: 'హెచ్చరికలు',
    health: 'పంట ఆరోగ్య లాగ్',
    voice: 'వాయిస్ & SMS',
    loading: 'లోడ్ అవుతోంది...',
    noLocation: 'మ్యాప్‌లో స్థానం ఎంచుకోండి.',
    speak: 'మాట్లాడండి',
    stop: 'ఆపండి',
    listen: 'సలహా వినండి',
    notes: 'సమస్య వివరించండి',
    photo: 'ఫోటో జోడించండి',
    submitHealth: 'లాగ్ పంపండి',
    phone: 'మొబైల్ నంబర్',
    subscribe: 'SMS అలర్ట్‌లు',
    subscribed: 'సబ్‌స్క్రైబ్ అయ్యింది!',
    referral: 'రైతు సేవా కendra రెఫరల్',
    visit: '7 రోజుల్లో రెఫరల్ ID తో వెళ్లండి',
    irrigation: 'నీటిపారుదల',
    fertilization: 'ఎరువులు',
    sensors: 'గ్రౌండ్ సెన్సార్లు',
    score: 'సూచన',
    days: 'రోజులు',
  },
  mr: {
    title: 'शेतकरी बुद्धिमत्ता केंद्र',
    subtitle: 'आवाज · SMS · तुमच्या भाषेत सल्ला',
    crops: 'पीक शिफारस',
    alerts: 'इशारे',
    health: 'पिकाचे आरोग्य लॉग',
    voice: 'आवाज आणि SMS',
    loading: 'लोड होत आहे...',
    noLocation: 'नकाशावर शेत निवडा.',
    speak: 'बोला',
    stop: 'थांबा',
    listen: 'सल्ला ऐका',
    notes: 'समस्या सांगा',
    photo: 'फोटो जोडा',
    submitHealth: 'लॉग पाठवा',
    phone: 'मोबाइल नंबर',
    subscribe: 'SMS अलर्ट',
    subscribed: 'सबस्क्राइब झाले!',
    referral: 'रैथु सेवा केंद्र रेफरल',
    visit: '7 दिवसात रेफरल ID सह भेट द्या',
    irrigation: 'सिंचन',
    fertilization: 'खत',
    sensors: 'ग्राउंड सेन्सर',
    score: 'योग्यता',
    days: 'दिवस',
  },
  kn: {
    title: 'ರೈತ ಬುದ್ಧಿಮತ್ತೆ ಕೇಂದ್ರ',
    subtitle: 'ಧ್ವನಿ · SMS · ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸಲಹೆ',
    crops: 'ಬೆಳೆ ಶಿಫಾರಸು',
    alerts: 'ಎಚ್ಚರಿಕೆಗಳು',
    health: 'ಬೆಳೆ ಆರೋಗ್ಯ ಲಾಗ್',
    voice: 'ಧ್ವನಿ & SMS',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    noLocation: 'ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ.',
    speak: 'ಮಾತನಾಡಿ',
    stop: 'ನಿಲ್ಲಿಸಿ',
    listen: 'ಸಲಹೆ ಕೇಳಿ',
    notes: 'ಸಮಸ್ಯೆ ವಿವರಿಸಿ',
    photo: 'ಫೋಟೋ ಸೇರಿಸಿ',
    submitHealth: 'ಲಾಗ್ ಕಳುಹಿಸಿ',
    phone: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    subscribe: 'SMS ಅಲರ್ಟ್‌ಗಳು',
    subscribed: 'ಚಂದಾದಾರರಾಗಿದ್ದೀರಿ!',
    referral: 'ರೈತು ಸೇವಾ ಕendra ರೆಫರಲ್',
    visit: '7 ದಿನಗಳಲ್ಲಿ ರೆಫರಲ್ ID ಜೊತೆ ಭೇಟಿ',
    irrigation: 'ನೀರಾವರಿ',
    fertilization: 'ರಸಗೊಬ್ಬರ',
    sensors: 'ಗ್ರೌಂಡ್ ಸೆನ್ಸಾರ್',
    score: 'ಸೂಚನೆ',
    days: 'ದಿನಗಳು',
  },
};

function t(lang, key) {
  return UI_LABELS[lang]?.[key] ?? UI_LABELS.en[key];
}

export default function FarmerIntelligenceHub({
  selectedLocation,
  supportedLanguages = {},
  language,
  onLanguageChange,
  embedded = false,
}) {
  const [tab, setTab] = useState('crops');
  const [crops, setCrops] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [healthResult, setHealthResult] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [smsResult, setSmsResult] = useState(null);
  const [voiceResponse, setVoiceResponse] = useState(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileRef = useRef(null);

  const langEntries = Object.entries(supportedLanguages).length
    ? Object.entries(supportedLanguages)
    : [
        ['en', 'English'],
        ['hi', 'Hindi'],
        ['te', 'Telugu'],
        ['mr', 'Marathi'],
        ['kn', 'Kannada'],
      ];

  const fetchIntelligence = useCallback(async () => {
    if (!selectedLocation) return;
    setLoading(true);
    const { lat, lon } = selectedLocation;
    try {
      const [cropRes, alertRes] = await Promise.all([
        fetch(`/api/farmer/crop-recommend?lat=${lat}&lon=${lon}&lang=${language}`),
        fetch(`/api/farmer/alerts?lat=${lat}&lon=${lon}&lang=${language}`),
      ]);
      if (cropRes.ok) setCrops(await cropRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
    } catch (err) {
      console.error('Farmer intelligence fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, language]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  const speakText = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[language] || 'en-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Type your query instead.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG[language] || 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNotes(transcript);
      handleVoiceAdvisory(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleVoiceAdvisory = async (text) => {
    if (!selectedLocation || !text.trim()) return;
    const form = new FormData();
    form.append('text', text);
    form.append('lat', selectedLocation.lat);
    form.append('lon', selectedLocation.lon);
    form.append('lang', language);
    try {
      const res = await fetch('/api/farmer/voice-advisory', { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        setVoiceResponse(data);
        speakText(data.response);
      }
    } catch (err) {
      console.error('Voice advisory failed:', err);
    }
  };

  const handleHealthSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;
    setHealthLoading(true);
    setHealthResult(null);
    const form = new FormData();
    form.append('lat', selectedLocation.lat);
    form.append('lon', selectedLocation.lon);
    form.append('notes', notes);
    form.append('lang', language);
    form.append('input_type', listening ? 'voice' : notes ? 'text' : 'photo');
    if (photo) form.append('image', photo);
    try {
      const res = await fetch('/api/farmer/health-log', { method: 'POST', body: form });
      if (res.ok) {
        setHealthResult(await res.json());
        setNotes('');
        setPhoto(null);
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch (err) {
      console.error('Health log failed:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleSmsSubscribe = async (e) => {
    e.preventDefault();
    if (!selectedLocation || !phone.trim()) return;
    const form = new FormData();
    form.append('phone', phone);
    form.append('lat', selectedLocation.lat);
    form.append('lon', selectedLocation.lon);
    form.append('lang', language);
    try {
      const res = await fetch('/api/farmer/sms-subscribe', { method: 'POST', body: form });
      if (res.ok) {
        setSmsResult(await res.json());
      } else {
        const errorData = await res.json().catch(() => ({}));
        setSmsResult({
          delivery: 'failed',
          error: errorData.detail || `Server error: ${res.status}`
        });
      }
    } catch (err) {
      console.error('SMS subscribe failed:', err);
      setSmsResult({
        delivery: 'failed',
        error: 'Network connection failed.'
      });
    }
  };

  const tabs = [
    { id: 'crops', icon: Sprout, label: t(language, 'crops') },
    { id: 'alerts', icon: AlertTriangle, label: t(language, 'alerts') },
    { id: 'health', icon: Camera, label: t(language, 'health') },
    { id: 'voice', icon: MessageSquare, label: t(language, 'voice') },
  ];

  if (!selectedLocation) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center p-6 text-center ${
          embedded ? '' : 'rounded-2xl border border-stone-200 bg-white'
        }`}
      >
        <Leaf className="mb-3 h-10 w-10 text-brand-600" />
        <h3 className="text-sm font-bold text-stone-800">{t(language, 'title')}</h3>
        <p className="mt-2 max-w-xs text-sm font-medium text-stone-500">{t(language, 'noLocation')}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-white ${
        embedded ? '' : 'rounded-2xl border border-stone-200 shadow-sm'
      }`}
    >
      <div className="shrink-0 border-b border-stone-100 bg-gradient-to-r from-brand-50 to-white px-3 py-3 md:px-4">
        <div className="flex items-start justify-between gap-2">
          {!embedded && (
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">{t(language, 'title')}</h3>
              <p className="text-[10px] font-semibold text-stone-500">{t(language, 'subtitle')}</p>
            </div>
          )}
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className={`min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700 ${
              embedded ? 'ml-auto' : ''
            }`}
          >
            {langEntries.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex min-h-[40px] shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
                tab === id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {loading && (
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            {t(language, 'loading')}
          </div>
        )}

        {tab === 'crops' && crops && (
          <div className="space-y-3">
            <p className="text-xs font-medium leading-relaxed text-stone-600">{crops.summary}</p>
            {crops.recommendations?.map((rec) => (
              <div
                key={rec.crop}
                className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{rec.crop}</h4>
                    <p className="mt-1 text-[11px] font-medium text-stone-600">{rec.reason}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {rec.suitability_score}%
                  </span>
                </div>
                <div className="mt-2 flex gap-2 text-[10px] font-semibold text-stone-500">
                  <span>
                    {rec.duration_days} {t(language, 'days')}
                  </span>
                  <span>·</span>
                  <span>{rec.water_requirement}</span>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-stone-400">
              Sources: {crops.data_sources?.join(' · ')}
            </p>
          </div>
        )}

        {tab === 'alerts' && alerts && (
          <div className="space-y-3">
            {alerts.alerts?.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                No critical dry-spell alerts. Continue monitoring.
              </div>
            ) : (
              alerts.alerts.map((alert) => (
                <div
                  key={alert.title}
                  className={`rounded-xl border p-3 ${
                    alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <h4 className="text-xs font-bold text-stone-900">{alert.title}</h4>
                  <p className="mt-1 text-[11px] font-medium text-stone-700">{alert.message}</p>
                </div>
              ))
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-stone-500">
                  <Droplets className="h-3.5 w-3.5 text-brand-600" />
                  {t(language, 'irrigation')}
                </div>
                <p className="text-[11px] font-medium text-stone-700">
                  {alerts.irrigation_guidance?.action}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-stone-500">
                  <Leaf className="h-3.5 w-3.5 text-brand-600" />
                  {t(language, 'fertilization')}
                </div>
                <p className="text-[11px] font-medium text-stone-700">
                  {alerts.fertilization_guidance?.action}
                </p>
              </div>
            </div>

            {alerts.ground_sensors && (
              <div className="rounded-xl border border-stone-200 p-3">
                <div className="text-[10px] font-bold uppercase text-stone-400">
                  {t(language, 'sensors')}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-stone-700">
                  <span>Moisture: {alerts.ground_sensors.soil_moisture_percent}%</span>
                  <span>Temp: {alerts.ground_sensors.soil_temperature_c}°C</span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'health' && (
          <form onSubmit={handleHealthSubmit} className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(language, 'notes')}
              rows={3}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 outline-none focus:border-brand-400"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  listening
                    ? 'bg-red-100 text-red-700'
                    : 'bg-brand-100 text-brand-800 hover:bg-brand-200'
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? t(language, 'stop') : t(language, 'speak')}
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200">
                <Camera className="h-4 w-4" />
                {t(language, 'photo')}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {photo && (
              <p className="text-[10px] font-semibold text-stone-500">Photo: {photo.name}</p>
            )}
            <button
              type="submit"
              disabled={healthLoading}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {healthLoading ? '...' : t(language, 'submitHealth')}
            </button>

            {healthResult && (
              <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <p className="text-xs font-medium leading-relaxed text-stone-700">
                  {healthResult.diagnosis_localized || healthResult.ai_diagnosis}
                </p>
                <div className="rounded-lg border border-stone-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-800">
                    <Building2 className="h-4 w-4" />
                    {t(language, 'referral')}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-stone-800">
                    {healthResult.rsk_referral?.kendra_name}
                  </p>
                  <p className="text-[10px] text-stone-500">{healthResult.rsk_referral?.address}</p>
                  <p className="mt-1 text-[10px] font-bold text-brand-700">
                    ID: {healthResult.referral_id} · {healthResult.rsk_referral?.phone}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-500">{t(language, 'visit')}</p>
                </div>
              </div>
            )}
          </form>
        )}

        {tab === 'voice' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold ${
                  listening
                    ? 'bg-red-100 text-red-700'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {listening ? t(language, 'stop') : t(language, 'speak')}
              </button>
              {voiceResponse?.response && (
                <button
                  type="button"
                  onClick={() => speakText(voiceResponse.response)}
                  className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-700"
                >
                  <Volume2 className="h-4 w-4" />
                  {t(language, 'listen')}
                </button>
              )}
            </div>

            {voiceResponse && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs font-medium leading-relaxed text-stone-700">
                {voiceResponse.response}
              </div>
            )}

            <form onSubmit={handleSmsSubscribe} className="space-y-2 border-t border-stone-100 pt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <Phone className="h-4 w-4 text-brand-600" />
                SMS Alerts
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t(language, 'phone')}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                className="w-full rounded-xl border border-brand-200 bg-brand-50 py-2 text-xs font-bold text-brand-800 hover:bg-brand-100"
              >
                {t(language, 'subscribe')}
              </button>
              {smsResult && smsResult.delivery === 'sent' && (
                <div className="rounded-lg bg-emerald-50 p-2 text-[11px] font-medium text-emerald-800">
                  {t(language, 'subscribed')} {smsResult.sample_sms}
                </div>
              )}
              {smsResult && smsResult.delivery !== 'sent' && (
                <div className="rounded-lg bg-rose-50 p-2 text-[11px] font-medium text-rose-800">
                  Subscription logged, but SMS delivery failed: {smsResult.error || 'Check Twilio credentials.'}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
