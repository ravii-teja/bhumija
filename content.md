# Bhumija — Project Content, Chat History & Action Log

This document records the product evolution, user requests, actions taken, and technical context from building **Bhumija** (El Niño Resilience Engine for Indian farmers).

---

## 1. Product Vision

**Bhumija** ("Born of the Earth") is a free, AI-powered agricultural intelligence platform for small and marginal farmers in India, focused on Super El Niño drought resilience.

**Core goals:**
- Hyper-local farm advice using map, satellite, soil, and weather data
- Voice-and-SMS access in Indic languages
- Smart crop recommendations and dry-spell alerts
- Conversational AI with photo upload for irrigation/crop diagnosis
- Connection to Rythu Seva Kendras (RSK) for expert follow-up

---

## 2. Conversation & Request Timeline

### Phase 1 — Foundation (Hackathon MVP)

| User request | Actions taken |
|--------------|---------------|
| Save product spec to `product_plan.md` | Created product plan with decoupled FastAPI + React architecture |
| 1-hour executable hackathon plan | Implemented full stack: map, search, chat, district overlays |
| Matte orange/white minimal UI | Tailwind theme with `brand-600` orange palette |
| MapMyIndia map overlay + search | `MapComponent.jsx`, `SearchBar.jsx`, backend `/api/search` proxy |
| Gemini chat | `/api/chat` with Gemini 2.5 Flash + rule-based fallback |

**Context:** Initial architecture uses Vite frontend on `:3000`, FastAPI on `:8000`, Vercel serverless for production.

---

### Phase 2 — API Integration & Deploy

| User request | Actions taken |
|--------------|---------------|
| Run app locally | Fixed deps (`google-genai`, `pillow`, Tailwind/PostCSS), added `start.sh` |
| MapMyIndia + Gemini keys in `.env` | Integrated Mappls Web SDK, autosuggest geocoding fallback |
| Git + Vercel deploy | `vercel.json`, `api/index.py`, root `requirements.txt`, `README.md`, `.gitignore` |
| `deployment.md` | Full ops reference for URLs, keys, Vercel steps |
| Agromonitoring API | `agro_client.py`, `/api/agro/insights`, `/api/agro/district-overlay`, map overlay toggles |

**Context:** Git push to GitHub blocked by Enterprise Managed User policy — user must push manually.

---

### Phase 3 — Farmer Intelligence Platform

| User request | Actions taken |
|--------------|---------------|
| Voice-and-SMS platform in Indic languages | `farmer_intelligence.py`, Indic phrase map, 5 languages (en, hi, te, mr, kn) |
| Smart crop recommendation (satellite + soil) | `GET /api/farmer/crop-recommend` — NDVI, soil, monsoon, district profile |
| Real-time advisory & dry-spell alerts | `GET /api/farmer/alerts` — irrigation/fertilization guidance, simulated ground sensors |
| Crop health logging + RSK referral | `POST /api/farmer/health-log`, `backend/data/rythu_seva_kendras.json` (9 kendras) |
| SMS subscribe | `POST /api/farmer/sms-subscribe`, `sms_subscribers.json` persistence |
| Voice advisory | `POST /api/farmer/voice-advisory` with Gemini Indic responses |

**Frontend (initial):** `FarmerIntelligenceHub.jsx` with tabs for crops, alerts, health, voice/SMS.

---

### Phase 4 — Map-First UX

| User request | Actions taken |
|--------------|---------------|
| Maximum map area in UI | Full-viewport map layout; side panel as collapsible overlay |
| Pin button + GPS on map | Pin mode (tap to drop) + `navigator.geolocation` GPS FAB |
| Location metrics on map | `MapLocationMetrics.jsx` — monsoon, soil, weather, NDVI, crops, risk badge |
| Risk coloring red / yellow / blue | `riskScore.js`, updated `agro_client._score_color`, composite overlay mode |
| Yearly monsoon metrics | `accumulated_rainfall_365d_mm` in `agro_client.get_location_insights` |

**Context:** Overlay modes — Risk zones, Monsoon, Soil/Water, All layers (composite).

---

### Phase 5 — Mobile & Material Design

| User request | Actions taken |
|--------------|---------------|
| Mobile-friendly, map at center | `100dvh` layout, safe-area insets, Roboto typography |
| Google UI principles | Material bottom nav, bottom sheets, 48px touch targets, elevated surfaces |
| Dynamic responsive layout | `useMediaQuery` hook, `MobileNavBar.jsx`, `BottomSheet.jsx` |

**Mobile nav:** Map | Assistant (2 tabs). Desktop: collapsible 380px side panel.

---

### Phase 6 — Unified Assistant

| User request | Actions taken |
|--------------|---------------|
| Combine AI Chat + Farmer Hub | Single `BhumijaAssistant.jsx` panel |
| Voice icon for voice interaction | Web Speech API mic with interim/final results, auto-speak replies |
| Alerts phone number at top | SMS subscribe form with Twilio delivery |
| Minimal UI — crops + forecast | Compact top crop card, 72h rain, alert status chips |
| Conversational chat with full context | Enhanced `/api/chat` with `lang`, `conversation` history, crop/alert injection |

**Context:** Removed dual Chat/Farmer tabs; legacy components (`ChatComponent.jsx`, `FarmerIntelligenceHub.jsx`) remain in repo but App uses `BhumijaAssistant` only.

---

### Phase 7 — Voice, Photo & Conversational Fixes

| User request | Actions taken |
|--------------|---------------|
| Voice inputs not working | Fixed SpeechRecognition (final results only, mic permission, error messages) |
| Conversational with location context | Auto location briefing on select; conversation history sent to backend |
| Upload irrigation/crop photos | Camera button → multipart `/api/chat` with Gemini vision |
| All details fed when location selected | Backend injects district, weather, agro, crops, alerts, irrigation into Gemini prompt |

---

### Phase 8 — Twilio SMS (Live)

| User request | Actions taken |
|--------------|---------------|
| Make SMS functional with Twilio credentials | `twilio_sms.py`, `twilio` SDK in requirements |
| API Key auth (SK + secret) | `Client(api_key_sid, api_key_secret, account_sid)` |
| Account SID + Messaging Service | `TWILIO_ACCOUNT_SID`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_SMS_FROM` in `.env` |
| Welcome SMS on subscribe | `subscribe_sms()` sends localized dry-spell alert via Twilio on signup |

**Twilio config (names only — secrets in `backend/.env`, never commit):**
- Account SID: `AC439d1a53…`
- Messaging Service: `MG4676d817…`
- From number: `+18777804236`
- API Key SID: `SK4dc99314…`

---

### Phase 10 — Holistic SMS Advisory

| User request | Actions taken |
|--------------|---------------|
| SMS should include location, rainfall, best crop, weekly plan | `build_holistic_sms_body()` + `build_weekly_plan()` in `farmer_intelligence.py` |
| Welcome SMS was generic one-liner | Subscribe flow now gathers full farm context before Twilio send |

**Holistic SMS includes (single 160-char message, one SMS segment):**
- Location, 90d + 72h rainfall, soil %, best crop + score, weekly action hint, RSK phone
- GSM-safe romanized text (no emojis/line breaks) to avoid 4-part split messages
- Indic languages: hi, te, mr, kn (+ en)

**Search bar:** MapMyIndia cities shown first with "City" badge; any city geocoded gets full metrics + nearest advisory district for crops.

**API response** adds `holistic_summary` object for frontend preview/debug.

---

### Phase 11 — Single SMS + Any-City Search

| User request | Actions taken |
|--------------|---------------|
| SMS arriving as 4 parts | Rewrote `build_holistic_sms_body()` → ≤160 chars, GSM-safe, one segment |
| Search only showed risk districts | MapMyIndia **City** results first; advisory zones labeled separately |
| City search wrong coords (e.g. Pune → Aurangabad) | Fixed `_match_local_district()` — no longer matches state name alone |
| Geocode failures returned empty search | Added `_geocode_place()` chain: Mappls → Open-Meteo geocoding API |
| Metrics showed district name not searched city | `placeName` / `placeAddress` passed from SearchBar → metrics card + SMS |

**Single SMS example (Hindi, ~144 chars):**
```
Bhumija Pune: Barish 399mm/90din, 10.7mm/72ghante. Mitti 47%. Fasal Bajra 92%. Saptah: dekhte rahein; drip; Bajra bovai. RSK 2442256789 Alert ON
```

**Search flow:** Autosuggest → `_resolve_search_coordinates()` → geocode for CITY types → attach nearest advisory district → full agro/weather on select.

**Docs added:** `ppt.md` — 10-slide deck for PDF export (problem, solution, impact, usage, tech stack, flow).

---

### Phase 12 — Voice Stop + Final Verification

| User request | Actions taken |
|--------------|---------------|
| Voice chat could not be stopped mid-listen or mid-speak | Added `stopVoice()`, `stopSpeaking()`, `stopListening()` in `BhumijaAssistant.jsx` |
| No visible stop control during voice | Full-width **Stop voice** bar when listening or speaking; MicOff stops mic; Listen/Stop toggles TTS |
| Ensure everything works locally | Smoke-tested config, districts, weather, agro, search Pune, SMS, frontend build |
| Document all changes | Synced `deployment.md` (E2E flows, voice pipeline, smoke tests, changelog); updated `api_contract.md` |

**Voice UX:** `speechSynthesis.cancel()` on stop; `SpeechRecognition.abort()` for immediate mic stop; cleanup on component unmount.

---

### Phase 9 — Map Data Fix (Agromonitoring Limits + Open-Meteo Fallbacks)

| User request | Actions taken |
|--------------|---------------|
| Monsoon, soil, vegetation, crops not showing on map | Diagnosed Agromonitoring free-tier failures; added Open-Meteo fallbacks |
| Map metrics show `—` for rain/soil/NDVI | `agro_client.py` now falls back when Agro history/polygons unavailable |
| Crops missing on GPS/pin locations | `findDistrictByCoords()` soft-matches nearest vulnerable district |
| Mobile metrics hidden by default | `MapLocationMetrics.jsx` auto-expands when a farm is selected |

**Root cause (debugged July 2026):**

| Data | Agromonitoring response | Why map showed `—` |
|------|-------------------------|-------------------|
| 90d / 365d monsoon rain | `401` on `accumulated_precipitation` | Historical rainfall not included on free plan |
| Soil moisture / NDVI | `413` on `POST /polygons` | Polygon quota exhausted (“You can not create polygons anymore”) |
| Crops | N/A (district dataset) | GPS/pin outside 1.5° district radius → no district match |
| Mobile metrics | UI only | Collapsed card hid the metric grid |

**Fallback strategy (implemented in `agro_client.py`):**

| Field | Primary source | Fallback when Agro fails |
|-------|----------------|---------------------------|
| 90d / 365d rainfall | Agromonitoring accumulated precipitation | Open-Meteo forecast (`past_days=92`) + archive API |
| 72h forecast rain | Agromonitoring forecast | Open-Meteo hourly precipitation |
| Soil moisture | Agromonitoring `/soil?polyid=` | Open-Meteo `soil_moisture_0_to_7cm` (marked `estimated: true`) |
| Vegetation (NDVI) | Agromonitoring `/ndvi/history?polyid=` | Model estimate from rain + soil + humidity (marked `estimated: true`) |
| District overlay colors | Agromonitoring rain + humidity | Same Open-Meteo rainfall fallback per district centroid |
| Crops | `districts.json` `primary_crops` | Nearest district soft-match in `mappls.js` |

**Example verified output (Aurangabad 19.8762, 75.3433):**
- Monsoon: 226 mm (90d), 948 mm (365d) — source: Open-Meteo
- Soil: 47.9% — source: Open-Meteo model
- Vegetation: 0.72 (est.) — rainfall + soil proxy
- UI shows `(est.)` suffix for model-based soil/vegetation

**To restore real satellite NDVI/soil:** delete unused polygons at [home.agromonitoring.com](https://home.agromonitoring.com) (account had 12 polygons, mostly outside India) or upgrade Agromonitoring plan.

---

## 3. Current Feature Set

### Map (center stage)
- Full-screen Mappls map with 16 vulnerable district overlays
- Overlay modes: Risk · Monsoon · Soil · All layers
- Pin drop + GPS location selection
- **Search any city/village** (MapMyIndia autosuggest + Open-Meteo geocode fallback)
- City results show **City** badge; advisory districts show **Advisory · High/Medium**
- Selected location halo (red/yellow/blue risk) + auto-expanded metrics card
- Metrics show **searched place name** when available, not only district name

### Bhumija Assistant (unified panel)
- **Top:** Mobile number + Alerts subscribe (Twilio SMS — **single 160-char message**)
- **Language:** EN, HI, TE, MR, KN
- **Insights:** Top crop recommendation, 72h rain forecast, active alerts
- **Chat:** Multi-turn conversational AI (Gemini 2.5 Flash)
- **Voice:** Mic → speech-to-text → chat/voice-advisory → TTS reply
- **Photo:** Camera/upload → Gemini multimodal analysis
- **Auto-briefing:** Location summary posted when farm is selected

### Backend intelligence
- 16 curated El Niño-vulnerable districts (`districts.json`)
- Agromonitoring: live weather + forecast when key configured
- **Open-Meteo fallbacks:** 90d/365d rainfall, soil moisture, NDVI estimate when Agro history/polygons unavailable
- Open-Meteo weather proxy (`/api/weather`)
- Crop recommendation engine (region-aware drought crops)
- Dry-spell alerts + irrigation/fertilization guidance
- Health logs + RSK referrals (`health_logs.json`, `rythu_seva_kendras.json`)
- SMS subscribers (`sms_subscribers.json`)

---

## 4. API Endpoints Summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/config` | Public config (map key, feature flags, languages, Twilio status) |
| GET | `/api/districts` | Vulnerable district dataset |
| GET | `/api/search` | MapMyIndia autosuggest + geocode |
| GET | `/api/weather` | Open-Meteo proxy |
| GET | `/api/agro/insights` | NDVI, soil, monsoon, forecast for a farm point |
| GET | `/api/agro/district-overlay` | District metrics for map coloring |
| POST | `/api/chat` | **Conversational AI** — message, lat, lon, lang, conversation, optional image |
| GET | `/api/farmer/crop-recommend` | Smart crop picks |
| GET | `/api/farmer/alerts` | Dry-spell alerts + guidance |
| POST | `/api/farmer/health-log` | Photo/voice health log + RSK referral |
| GET | `/api/farmer/health-logs` | Recent health logs |
| POST | `/api/farmer/sms-subscribe` | **Twilio SMS** — holistic single-segment advisory (`place_name` optional) |
| POST | `/api/farmer/voice-advisory` | Indic voice transcript → advisory |

Full contract: [`apis/api_contract.md`](apis/api_contract.md)

---

## 5. Key Files & Ownership

```
bhumija/
├── content.md                    ← this file (chat + action log)
├── deployment.md                 ← ops & deploy reference
├── ppt.md                        ← 10-slide deck (export to PDF/PPTX)
├── product_plan.md               ← original product spec
│
├── backend/
│   ├── main.py                   ← FastAPI app, all routes
│   ├── agro_client.py            ← Agromonitoring integration
│   ├── farmer_intelligence.py    ← crops, alerts, health, SMS, RSK
│   ├── twilio_sms.py             ← Twilio Messaging Service send
│   └── data/
│       ├── districts.json
│       ├── rythu_seva_kendras.json
│       ├── health_logs.json      ← runtime
│       └── sms_subscribers.json  ← runtime
│
└── frontend/src/
    ├── App.jsx                   ← map-first layout, assistant panel
    ├── components/
    │   ├── BhumijaAssistant.jsx  ← unified chat + voice + SMS + insights
    │   ├── MapComponent.jsx      ← map, pin, GPS, overlays
    │   ├── MapLocationMetrics.jsx
    │   ├── MobileNavBar.jsx
    │   ├── BottomSheet.jsx
    │   └── SearchBar.jsx
    ├── hooks/useMediaQuery.js
    └── utils/riskScore.js
```

---

## 6. Environment Variables (All Services)

| Variable | Service | Required |
|----------|---------|----------|
| `MAPMYINDIA_API_KEY` | Mappls map + search | Yes |
| `GEMINI_API_KEY` | AI chat, voice, health diagnosis | Yes |
| `AGROMONITORING_API_KEY` | Agro weather/forecast; satellite NDVI/soil when polygons available | Recommended (Open-Meteo fallbacks work without it for rain/soil est.) |
| `TWILIO_ACCOUNT_SID` | SMS alerts | For live SMS |
| `TWILIO_MESSAGING_SERVICE_SID` | SMS send via Messaging Service | For live SMS |
| `TWILIO_SMS_FROM` | Fallback sender number | Optional if MG set |
| `TWILIO_API_KEY_SID` | Twilio API key auth | Yes (or auth token) |
| `TWILIO_API_KEY_SECRET` | Twilio API key secret | Yes (or auth token) |
| `TWILIO_AUTH_TOKEN` | Alternative to API key | Optional |

---

## 7. Known Issues & Notes

| Item | Status |
|------|--------|
| GitHub push (Enterprise Managed User) | User must push manually |
| Agromonitoring free tier — historical rain | `accumulated_precipitation` returns 401; Open-Meteo fallback used |
| Agromonitoring free tier — polygon quota | HTTP 413 when limit reached; soil/NDVI use Open-Meteo + model estimate |
| Agromonitoring NDVI on new polygons | Real satellite NDVI needs valid India polygon + days for pass (free tier: 0% cloud only) |
| Estimated vs satellite data | UI shows `(est.)` for Open-Meteo soil and model NDVI — not ground-truth satellite |
| District coverage | Only 16 curated districts in app; `api_contract.md` mentions 315 as aspirational scale |
| Voice input | Best in Chrome/Edge; requires mic permission + HTTPS (localhost OK) |
| Twilio trial | May require verified recipient numbers until account upgraded |
| Vercel serverless | Cold starts can slow first agro/chat request; district overlay builds 16× API calls |
| Legacy components | `ChatComponent.jsx`, `FarmerIntelligenceHub.jsx`, `AgroInsightsPanel.jsx` unused by App but kept in repo |

---

## 8. User Flows (Current)

### End-to-end flow (diagram)

```
┌──────────────┐     search / pin / GPS / district tap
│   Farmer     │──────────────────────────────────────────┐
└──────────────┘                                          │
       │                                                    ▼
       │                              ┌─────────────────────────────┐
       │                              │  Frontend (React :3000)      │
       │                              │  SearchBar · MapComponent    │
       │                              │  MapLocationMetrics          │
       │                              │  BhumijaAssistant            │
       │                              └──────────────┬──────────────┘
       │                                             │ /api/*
       │                              ┌──────────────▼──────────────┐
       │                              │  FastAPI (:8000 / Vercel)    │
       │                              │  main.py                     │
       │                              └──────────────┬──────────────┘
       │                    ┌───────────────────────┼───────────────────────┐
       │                    ▼                       ▼                       ▼
       │              Open-Meteo              Agromonitoring           MapMyIndia
       │              (weather/rain/soil)     (when available)         (map/search)
       │                    │                       │                       │
       │                    └───────────────────────┼───────────────────────┘
       │                                            ▼
       │                              farmer_intelligence.py
       │                              · crop recommend · alerts
       │                              · build_holistic_sms_body()
       │                                            │
       └◄──────────────────────────── Twilio SMS ───┘
                    (≤160 chars, location+rain+crop+week+RSK)
```

### Select farm & get advice
1. Open app → full-screen map
2. Search **any city** (e.g. Pune), tap district overlay, drop pin, or use GPS
3. Metrics card auto-expands: monsoon, soil, weather, vegetation, crops, risk
4. Open **Assistant** (mobile bottom nav or desktop side panel)
5. Location briefing appears in chat automatically
6. Ask via text, voice (mic), or upload field photo

### SMS alerts
1. Select farm location (search city or pin)
2. Enter 10-digit mobile in Assistant top bar
3. Tap **Alerts** → context gathered → **one** holistic SMS sent via Twilio
4. Subscriber saved to `sms_subscribers.json`

### Crop & forecast at a glance
- Top crop + score shown in Assistant header
- 72h rain + alert count chips
- Alternate crop pills scroll horizontally

---

## 9. Decisions & Rationale

| Decision | Why |
|----------|-----|
| Map-first layout | Farmers need spatial context; map is the primary interaction surface |
| Unified Assistant vs separate Chat/Hub | Reduces cognitive load; one place for voice, SMS, chat, insights |
| `/api/chat` as primary conversational endpoint | Supports multimodal images + multi-turn history + full farm context |
| Twilio Messaging Service over raw From | Matches user's Twilio console setup; better deliverability |
| Red/yellow/blue risk colors | User-requested semantic: high risk / medium / favorable |
| Rule-based fallback when Gemini unavailable | Ensures advice always available offline or without API key |
| Open-Meteo fallbacks over Agro-only | Free tier limits; farmers still get rain/soil/NDVI estimates |
| Single-segment SMS (160 chars) | Avoids 4-part Unicode split; works on basic phones |
| Mappls + Open-Meteo geocoding chain | Any Indian city searchable even when autosuggest lacks coords |
| JSON file persistence for logs/subscribers | Hackathon-speed; production would use DB + cron for alert broadcasts |

---

## 10. Future Enhancements (Not Yet Built)

### Critical for day-to-day farmer usefulness

| Gap | Why it matters | Suggested next step |
|-----|----------------|---------------------|
| **Scheduled SMS alert broadcasts** | Subscribe only sends welcome SMS; no ongoing dry-spell warnings | Vercel Cron or external scheduler → read `sms_subscribers.json` → push when `/api/farmer/alerts` is critical |
| **Expand district coverage** | Only 16 districts; most of India uncovered | Load full IMD/Agmark vulnerable district set or geocode any village via MapMyIndia |
| **Persistent database** | Health logs, subscribers, polygons lost on Vercel cold restart | Postgres/Supabase or Vercel KV for subscribers, logs, user farms |
| **Saved farms / user profiles** | Farmers re-enter location every visit | Phone OTP login + saved lat/lon + crop preferences |
| **Real satellite NDVI** | Model estimates ≠ field truth | Clear Agromonitoring polygon quota; or GEE/Sentinel integration |
| **Indic UI (not just chat)** | Labels/buttons still English | i18n for map metrics, overlay modes, assistant chrome |
| **Offline / low bandwidth** | Fields often have poor connectivity | PWA + cache last advisory + SMS as primary channel |

### High value, medium effort

| Gap | Why it matters | Suggested next step |
|-----|----------------|---------------------|
| **RSK appointment booking** | Referral exists but no scheduling | Integrate state RSK APIs or WhatsApp deep-link to nearest kendra |
| **Mandi / MSP prices** | Crop choice depends on market | Agmarknet or e-NAM price API in crop recommendations |
| **Irrigation calendar** | Alerts are text-only | Sowing window + irrigation schedule from monsoon forecast |
| **Explain crop scores** | Farmers need “why this crop?” | Show NDVI/rain/soil factors in Assistant crop card |
| **Multi-farm support** | Many farmers manage multiple plots | Saved locations list in profile |
| **Push notifications** | SMS costs money; push is free | Web push or Firebase for alert subscribers |
| **Admin dashboard** | No visibility into subscribers/alerts | Simple internal page for SMS list + alert triggers |

### Scale / production hardening

| Gap | Why it matters | Suggested next step |
|-----|----------------|---------------------|
| **Google Earth Engine / ALU / AMED** | Satellite at scale without polygon limits | See `product_plan.md` |
| **Rate limiting & caching** | District overlay hits 16+ external APIs per cold start | Pre-warm cache, edge cache overlay JSON, reduce Agro calls |
| **Monitoring & error alerts** | Silent Agro failures were invisible to users | Log fallback usage; Sentry/Datadog on `/api/agro/insights` |
| **Vercel env parity** | Production may miss keys local has | Verify all env vars in checklist before demo |
| **Agromonitoring polygon cleanup** | Free quota blocked India polygons | Delete unused US polygons in Agromonitoring dashboard |

### Already on roadmap (from earlier phases)

- Scheduled cron to push dry-spell SMS to all `sms_subscribers.json` entries
- Broadcast alerts when `/api/farmer/alerts` returns critical severity
- Google Earth Engine / ALU / AMED integration (see `product_plan.md`)
- Full RSK appointment booking API
- Offline PWA for low-connectivity fields

---

## 11. Data Source Reference (Quick Lookup)

```
Location selected on map
    │
    ├─ GET /api/weather          → Open-Meteo (temp, humidity, wind)
    ├─ GET /api/agro/insights    → Agromonitoring + Open-Meteo fallbacks
    │       ├─ monsoon 90d/365d    → Agro accumulated_precip OR Open-Meteo archive
    │       ├─ soil moisture       → Agro /soil (polyid) OR Open-Meteo soil model
    │       ├─ vegetation NDVI     → Agro /ndvi (polyid) OR rain+soil estimate
    │       └─ 72h forecast rain   → Agro forecast OR Open-Meteo hourly
    └─ MapLocationMetrics UI       → district.primary_crops from districts.json
                                     (nearest district soft-match if GPS outside radius)

Map overlay (bootstrap)
    └─ GET /api/agro/district-overlay → per-district rain + humidity → red/yellow/blue circles

Search (any city)
    └─ GET /api/search?q=Pune
            ├─ MapMyIndia autosuggest
            ├─ _geocode_place() → Mappls geocode → Open-Meteo geocoding fallback
            └─ find_nearest_district() → crop context for non-advisory locations

SMS subscribe
    └─ POST /api/farmer/sms-subscribe (phone, lat, lon, lang, place_name?)
            ├─ _gather_farm_context()
            ├─ recommend_crops() + generate_alerts() + build_weekly_plan()
            └─ build_holistic_sms_body() → Twilio (≤160 chars)

Voice assistant (frontend)
    └─ BhumijaAssistant.jsx
            ├─ Web Speech API — mic → POST /api/chat
            ├─ speechSynthesis — speak reply
            └─ Stop voice bar — stopVoice() cancels mic + TTS
```

---

## 12. Related Documents

| File | Purpose |
|------|---------|
| [`deployment.md`](deployment.md) | Run locally, deploy Vercel, API keys, troubleshooting |
| [`ppt.md`](ppt.md) | 10-slide presentation deck for PDF/PPTX export |
| [`product_plan.md`](product_plan.md) | Original product specification |
| [`apis/api_contract.md`](apis/api_contract.md) | API request/response contract |
| [`content.md`](content.md) | Full action log, phases 1–12 |

---

*Last updated: July 2026 — voice stop, single SMS, any-city search, Open-Meteo fallbacks, ppt.md deck.*
