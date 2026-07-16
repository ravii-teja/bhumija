import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CloudRain,
  Loader2,
  Mic,
  MicOff,
  Phone,
  Send,
  Square,
  Sprout,
  Volume2,
  X,
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const SPEECH_LANG = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
};

function formatMessage(text) {
  if (!text) return '';
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-*]\s+(.*?)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/((?:<li.*?<\/li>\s*)+)/g, '<ul class="my-1 space-y-0.5">$1</ul>')
    .replace(/\n/g, '<br />');
  return (
    <div
      className="text-sm leading-relaxed text-stone-700"
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}

function buildLocationBriefing(location, weather, agroData, crops, alerts) {
  const name = location.district?.name ?? 'Your farm';
  const region = location.district?.region ?? '';
  const top = crops?.recommendations?.[0];
  const rain =
    alerts?.forecast_rain_72h_mm ?? agroData?.monsoon?.forecast_rainfall_72h_mm;
  const alertCount = alerts?.alerts?.length ?? 0;

  let text = `**${name}**${region ? ` (${region})` : ''} is loaded.\n\n`;
  if (weather) {
    text += `- Weather: ${weather.temperature}°C, ${weather.description}\n`;
  }
  if (top) {
    text += `- Top crop pick: **${top.crop}** (${top.suitability_score}% match)\n`;
  }
  if (rain != null) {
    text += `- Rain forecast (72h): ${rain} mm\n`;
  }
  text += alertCount > 0
    ? `- **${alertCount} active alert(s)** — ask me about irrigation or dry spell\n`
    : `- No critical alerts right now\n`;
  text += '\nAsk by **voice**, **text**, or **upload a field photo** for irrigation or crop advice.';
  return text;
}

export default function BhumijaAssistant({
  selectedLocation,
  geminiConfigured,
  supportedLanguages = {},
  language,
  onLanguageChange,
  agroData,
  weather,
}) {
  const [phone, setPhone] = useState('');
  const [smsStatus, setSmsStatus] = useState(null);
  const [crops, setCrops] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Select your farm on the map or search. I will load crop, rain, and soil data — then you can talk, type, or send photos.',
    },
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages);
  const sendingRef = useRef(false);
  const lastBriefedLocationRef = useRef(null);

  const langEntries = Object.entries(supportedLanguages).length
    ? Object.entries(supportedLanguages)
    : [
        ['en', 'EN'],
        ['hi', 'HI'],
        ['te', 'TE'],
        ['mr', 'MR'],
        ['kn', 'KN'],
      ];

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchInsights = useCallback(async () => {
    if (!selectedLocation) return;
    setInsightsLoading(true);
    const { lat, lon } = selectedLocation;
    try {
      const [cropRes, alertRes] = await Promise.all([
        fetch(`/api/farmer/crop-recommend?lat=${lat}&lon=${lon}&lang=${language}`),
        fetch(`/api/farmer/alerts?lat=${lat}&lon=${lon}&lang=${language}`),
      ]);
      if (cropRes.ok) setCrops(await cropRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
    } catch (err) {
      console.error('Insights fetch failed:', err);
    } finally {
      setInsightsLoading(false);
    }
  }, [selectedLocation, language]);

  useEffect(() => {
    lastBriefedLocationRef.current = null;
  }, [selectedLocation?.lat, selectedLocation?.lon]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    if (!selectedLocation || insightsLoading) return;
    const key = `${selectedLocation.lat.toFixed(4)},${selectedLocation.lon.toFixed(4)}`;
    if (lastBriefedLocationRef.current === key) return;
    lastBriefedLocationRef.current = key;

    const briefing = buildLocationBriefing(
      selectedLocation,
      weather,
      agroData,
      crops,
      alerts
    );
    setMessages((prev) => [...prev, { role: 'assistant', content: briefing }]);
  }, [selectedLocation, weather, agroData, crops, alerts, insightsLoading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text) => {
      if (!text || !window.speechSynthesis) return;
      const plain = text.replace(/[#*_\[\]]/g, '').replace(/<[^>]+>/g, '');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain.slice(0, 800));
      u.lang = SPEECH_LANG[language] || 'en-IN';
      u.rate = 0.92;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [language]
  );

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = useCallback(
    async (text, imageFile = null, options = {}) => {
      const trimmed = (text || '').trim();
      const hasImage = Boolean(imageFile);
      if (!trimmed && !hasImage) return;
      if (sendingRef.current) return;

      sendingRef.current = true;
      setChatLoading(true);
      setVoiceError(null);

      const userContent = trimmed || '(Photo of my field / irrigation)';
      const preview = imageFile ? URL.createObjectURL(imageFile) : null;

      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: userContent,
          image: preview || undefined,
        },
      ]);
      setInput('');
      if (hasImage) clearImage();

      try {
        const formData = new FormData();
        formData.append('message', trimmed || 'Analyze this field photo and advise on irrigation and crop health.');
        formData.append('lang', language);
        if (selectedLocation) {
          formData.append('lat', String(selectedLocation.lat));
          formData.append('lon', String(selectedLocation.lon));
        }
        const prior = messagesRef.current.filter((m) => m.role === 'user' || m.role === 'assistant');
        formData.append('conversation', JSON.stringify(prior.slice(-8)));
        if (imageFile) {
          formData.append('image', imageFile);
        }

        const res = await fetch('/api/chat', { method: 'POST', body: formData });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(errBody || 'Chat failed');
        }
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
        if (options.speak !== false && (options.fromVoice || autoSpeak)) {
          speakText(data.response);
        }
      } catch (err) {
        console.error('Chat error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Sorry, I could not respond. Check that the backend is running and try again. For voice, use Chrome and allow microphone access.',
          },
        ]);
      } finally {
        setChatLoading(false);
        sendingRef.current = false;
      }
    },
    [language, selectedLocation, autoSpeak, speakText]
  );

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input, image);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const startListening = async () => {
    setVoiceError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice needs Chrome or Edge. You can type or upload a photo instead.');
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      setVoiceError('Microphone blocked. Allow mic access in browser settings.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalSent = false;

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      setInput(finalText || interim);
      if (finalText.trim() && !finalSent) {
        finalSent = true;
        sendMessageRef.current(finalText.trim(), null, { fromVoice: true });
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === 'not-allowed') {
        setVoiceError('Microphone permission denied.');
      } else if (code === 'no-speech') {
        setVoiceError('No speech detected. Tap mic and speak clearly.');
      } else if (code !== 'aborted') {
        setVoiceError(`Voice error: ${code}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      setVoiceError('Could not start voice. Try again.');
      console.error(err);
    }
  };

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const stopVoice = useCallback(() => {
    stopListening();
    stopSpeaking();
    setVoiceError(null);
  }, [stopListening, stopSpeaking]);

  useEffect(
    () => () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  const handleSmsSubscribe = async (e) => {
    e.preventDefault();
    if (!selectedLocation || phone.replace(/\D/g, '').length < 10) return;
    const form = new FormData();
    form.append('phone', phone);
    form.append('lat', selectedLocation.lat);
    form.append('lon', selectedLocation.lon);
    form.append('lang', language);
    if (selectedLocation.placeName) {
      form.append('place_name', selectedLocation.placeName);
    }
    try {
      const res = await fetch('/api/farmer/sms-subscribe', { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.delivery === 'sent') {
          setSmsStatus(`SMS sent! ${data.sample_sms || 'Subscribed.'}`);
        } else if (data.note_en) {
          setSmsStatus(`Subscribed locally. ${data.note_en}`);
        } else {
          setSmsStatus(data.sample_sms || 'Subscribed to dry-spell alerts');
        }
        // Save success to Supabase
        supabase.from('subscriptions').insert([{
          phone,
          lat: selectedLocation.lat,
          lon: selectedLocation.lon,
          language,
          status: data.delivery || 'subscribed',
          created_at: new Date().toISOString()
        }]).then(({ error }) => {
          if (error) console.error('Error saving subscription to Supabase:', error);
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setSmsStatus(err.detail || 'Subscription failed');
        // Save failed subscription to Supabase
        supabase.from('subscriptions').insert([{
          phone,
          lat: selectedLocation.lat,
          lon: selectedLocation.lon,
          language,
          status: 'failed',
          created_at: new Date().toISOString()
        }]).then(({ error }) => {
          if (error) console.error('Error saving subscription to Supabase:', error);
        });
      }
    } catch {
      setSmsStatus('Could not subscribe. Try again.');
    }
  };

  const topCrop = crops?.recommendations?.[0];
  const forecastRain = alerts?.forecast_rain_72h_mm ?? agroData?.monsoon?.forecast_rainfall_72h_mm;
  const activeAlerts = alerts?.alerts?.length ?? 0;
  const lastReply = [...messages].reverse().find((m) => m.role === 'assistant')?.content;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 space-y-2 border-b border-stone-100 px-3 py-3">
        <form onSubmit={handleSmsSubscribe} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile for SMS alerts"
              className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm font-medium text-stone-800 placeholder-stone-400 focus:border-brand-400 focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!selectedLocation}
            className="shrink-0 rounded-full bg-stone-900 px-4 text-xs font-bold text-white disabled:opacity-40"
          >
            Alerts
          </button>
        </form>
        {smsStatus && <p className="text-[11px] font-medium text-emerald-700">{smsStatus}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-stone-500">
            {selectedLocation?.district?.name ?? 'Select location on map'}
          </span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700"
          >
            {langEntries.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-b border-stone-100 px-3 py-3">
        {insightsLoading ? (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            Loading farm data…
          </div>
        ) : selectedLocation ? (
          <>
            {topCrop && (
              <div className="flex items-start gap-2 rounded-2xl bg-brand-50/80 px-3 py-2.5">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Top crop</p>
                  <p className="text-sm font-bold text-stone-900">{topCrop.crop}</p>
                  <p className="line-clamp-2 text-[11px] text-stone-600">{topCrop.reason}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {topCrop.suitability_score}%
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
                <CloudRain className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-stone-400">Rain 72h</p>
                  <p className="text-sm font-bold text-stone-900">
                    {forecastRain != null ? `${forecastRain} mm` : weather?.description ?? '—'}
                  </p>
                </div>
              </div>
              <div
                className={`flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  activeAlerts > 0 ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-stone-50'
                }`}
              >
                <AlertTriangle className={`h-4 w-4 ${activeAlerts > 0 ? 'text-amber-600' : 'text-stone-400'}`} />
                <div>
                  <p className="text-[10px] font-bold uppercase text-stone-400">Alerts</p>
                  <p className="text-sm font-bold text-stone-900">
                    {activeAlerts > 0 ? `${activeAlerts} active` : 'All clear'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs font-medium text-stone-500">
            Pick a location to load crop, rain, and soil context for conversation.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : 'border border-stone-200 bg-stone-50 text-stone-800'
              }`}
            >
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Field upload"
                  className="mb-2 max-h-32 rounded-lg object-cover"
                />
              )}
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                formatMessage(msg.content)
              )}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Bhumija is thinking…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div
        className="shrink-0 border-t border-stone-100 px-3 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {listening && (
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Listening… speak now
          </p>
        )}
        {speaking && !listening && (
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
            <Volume2 className="h-3.5 w-3.5" />
            Speaking reply…
          </p>
        )}
        {(listening || speaking) && (
          <button
            type="button"
            onClick={stopVoice}
            className="mb-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition active:scale-[0.98]"
            aria-label="Stop voice"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop voice
          </button>
        )}
        {voiceError && (
          <p className="mb-2 text-xs font-medium text-red-600">{voiceError}</p>
        )}

        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-1 -top-1 rounded-full bg-stone-800 p-0.5 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          {lastReply && (
            <button
              type="button"
              onClick={() => (speaking ? stopSpeaking() : speakText(lastReply))}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-700"
            >
              {speaking ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  Listen
                </>
              )}
            </button>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-stone-500">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded"
            />
            Auto-speak replies
          </label>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
              imagePreview
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-stone-200 bg-white text-stone-600'
            }`}
            title="Upload field or irrigation photo"
          >
            <Camera className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            aria-label={listening ? 'Stop listening' : 'Voice input'}
            aria-pressed={listening}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
              listening ? 'bg-red-500 text-white' : 'bg-brand-100 text-brand-700'
            }`}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedLocation
                ? 'Ask about irrigation, crops…'
                : 'Select location first…'
            }
            className="h-12 min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 text-base text-stone-800 placeholder-stone-400 focus:border-brand-400 focus:bg-white focus:outline-none md:text-sm"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !image) || chatLoading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-stone-400">
          {geminiConfigured ? 'Voice · Photo · Gemini AI' : 'Voice · Photo · Expert mode'}
        </p>
      </div>
    </div>
  );
}
