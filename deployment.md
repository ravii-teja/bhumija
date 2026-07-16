# Bhumija — Deployment & Operations Reference

This document captures everything needed to run, deploy, and maintain **Project Bhumija** (El Niño Resilience Engine) for future reference.

---

## 1. Project Summary

| Item | Detail |
|------|--------|
| **Product name** | Bhumija ("Born of the Earth") |
| **Purpose** | Free AI-powered drought resilience advisor for Indian farmers — map, voice, SMS, crop AI |
| **Architecture** | Decoupled React frontend + FastAPI backend + Twilio SMS |
| **Primary deployment target** | [Vercel](https://vercel.com) |
| **Source code repo** | https://github.com/ravii-teja/bhumija |
| **Action log & feature context** | [`content.md`](content.md) |
| **Presentation deck (10 slides → PDF)** | [`ppt.md`](ppt.md) |

---

## 2. Website & Service URLs

### Production (after Vercel deploy)

| Service | URL | Notes |
|---------|-----|-------|
| **Live app** | `https://bhumija.vercel.app` *(or your assigned Vercel URL)* | Main user-facing site |
| **API base** | `https://<your-vercel-domain>/api` | Same origin as frontend |
| **API docs (local only)** | `http://localhost:8000/docs` | Swagger UI — not exposed on Vercel by default |

### Local development

| Service | URL |
|---------|-----|
| **Frontend (Vite)** | http://localhost:3000 |
| **Backend (FastAPI)** | http://localhost:8000 |
| **Backend Swagger** | http://localhost:8000/docs |
| **Backend health/config** | http://localhost:8000/api/config |

### External dashboards & consoles

| Tool | URL | Purpose |
|------|-----|---------|
| **GitHub repo** | https://github.com/ravii-teja/bhumija | Source control |
| **Vercel dashboard** | https://vercel.com/dashboard | Deployments, env vars, logs |
| **Mappls / MapMyIndia console** | https://auth.mappls.com/console | Map & search API keys |
| **Google AI Studio** | https://aistudio.google.com/apikey | Gemini API keys |
| **Agromonitoring** | https://home.agromonitoring.com/users/api-keys | Satellite NDVI, soil, monsoon |
| **Twilio Console** | https://console.twilio.com | SMS alerts — Account SID, Messaging Service, phone number |
| **Open-Meteo Geocoding** | https://geocoding-api.open-meteo.com | City search fallback (no key) |

---

## 3. Tech Stack & Tools

### Frontend (`frontend/`)

| Tool | Version / Notes |
|------|-----------------|
| **React** | 18.x |
| **Vite** | 5.x — build tool & dev server |
| **Tailwind CSS** | 3.x — matte orange / white UI, Material-inspired mobile |
| **Mappls Web SDK** | v3.0 — full-screen map, pin, GPS, overlays |
| **Web Speech API** | Voice input + text-to-speech; **Stop voice** button stops mic + TTS |
| **Lucide React** | Icons |

**Commands:**
```bash
cd frontend
npm install
npm run dev      # local dev on :3000
npm run build    # production build → frontend/dist
npm run preview  # preview production build
```

### Backend (`backend/`)

| Tool | Version / Notes |
|------|-----------------|
| **Python** | 3.11+ recommended |
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server (local dev) |
| **google-genai** | Gemini 2.5 Flash — chat, voice, health diagnosis |
| **twilio** | SMS alert delivery via Messaging Service |
| **Pillow** | Image upload handling |
| **requests + certifi** | HTTP client for external APIs |
| **python-dotenv** | Load `.env` locally |

**Commands:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Quick start (both servers)

**Option A — script:**
```bash
./start.sh
```

**Option B — separate terminals (recommended for dev):**
```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — frontend
cd frontend && npm run dev -- --host 0.0.0.0 --port 3000
```

Frontend proxies `/api/*` → `http://localhost:8000` via [`frontend/vite.config.js`](frontend/vite.config.js).

### Deployment (`vercel.json` + `api/index.py`)

| Tool | Role |
|------|------|
| **Vercel** | Hosts React static build + Python serverless API |
| **api/index.py** | Serverless entrypoint — imports FastAPI app from `backend/main.py` |
| **requirements.txt** (root) | Python deps for Vercel serverless function |

---

## 3b. End-to-End Application Flow

### Farmer journey (runtime)

1. **Open app** → http://localhost:3000 (or Vercel URL)
2. **Select location** via one of:
   - **Search** any city/village (`SearchBar` → `/api/search`)
   - **Tap** colored district circle on map
   - **Pin mode** → tap map
   - **GPS** button → `navigator.geolocation`
3. **Frontend fetches in parallel:**
   - `GET /api/weather?lat=&lon=`
   - `GET /api/agro/insights?lat=&lon=`
4. **MapLocationMetrics** shows monsoon, soil, weather, NDVI, crops, risk badge
5. **BhumijaAssistant** loads crop recommend + alerts; posts location briefing to chat
6. **Optional:** voice, photo upload → `POST /api/chat`; SMS → `POST /api/farmer/sms-subscribe`

### Search pipeline (`GET /api/search?q=`)

```
Query (e.g. "Pune")
    │
    ├─► MapMyIndia autosuggest
    │
    ├─► For each hit: _resolve_search_coordinates()
    │       ├─ CITY/short names → _geocode_place()
    │       │       ├─ Mappls geocode (3 query variants)
    │       │       └─ Open-Meteo geocoding fallback
    │       └─ POI with coords → use autosuggest lat/lon
    │
    ├─► find_nearest_district() → crop/advisory context
    │
    └─► If zero results → _geocode_place(query) direct fallback
```

**Frontend:** MapMyIndia **City** results listed first; curated advisory zones second. On select, `placeName` + `placeAddress` passed to map metrics and SMS.

### Agro data pipeline (`GET /api/agro/insights`)

```
lat/lon
    ├─ Agromonitoring: live weather + forecast
    ├─ Agromonitoring: accumulated rain (paid) → fallback Open-Meteo archive/forecast
    ├─ Agromonitoring: polygon → soil/NDVI → fallback Open-Meteo soil + NDVI estimate
    └─ Response includes data_notes.estimated flags
```

### SMS pipeline (`POST /api/farmer/sms-subscribe`)

```
Form: phone, lat, lon, lang, place_name (optional)
    │
    ├─► _gather_farm_context() — district, weather, agro
    ├─► recommend_crops() + generate_alerts() + build_weekly_plan()
    ├─► build_holistic_sms_body() — ≤160 chars, GSM-safe, one SMS segment
    ├─► twilio_sms.send_sms()
    └─► Save to data/sms_subscribers.json
```

**Example SMS (hi):**
`Bhumija Pune: Barish 399mm/90din, 10.7mm/72ghante. Mitti 47%. Fasal Bajra 92%. Saptah: dekhte rahein; drip; Bajra bovai. RSK 2442256789 Alert ON`

### Voice & chat pipeline (`BhumijaAssistant.jsx`)

```
User taps mic (Chrome/Edge)
    │
    ├─► Web Speech API — SpeechRecognition (hi/te/mr/kn/en-IN)
    ├─► Final transcript → POST /api/chat (with lat, lon, conversation history)
    ├─► Optional auto-speak reply via speechSynthesis
    │
    Stop controls:
    ├─► "Stop voice" bar — stops mic + TTS (stopVoice)
    ├─► Mic button (MicOff) — stops listening only
    └─► "Listen" → "Stop" toggle — stops TTS only (stopSpeaking)

Photo upload → multipart /api/chat with Gemini vision (or rule-based fallback)
```

**Languages:** en, hi, te, mr, kn · **Best browser:** Chrome or Edge · **Requires:** mic permission, HTTPS (localhost OK)

### Map metrics pipeline (on location select)

```
App.handleSelectLocation(lat, lon, district?, { name, address })
    │
    ├─► findDistrictByCoords() — soft-match nearest advisory district for crops
    ├─► Parallel fetch: /api/weather + /api/agro/insights
    └─► MapLocationMetrics — auto-expanded on mobile/desktop
            · placeName from search (if set) else district name
            · monsoon, soil (est.), vegetation (est.), weather, crops, risk badge
```

---

## 4. API Keys & Secrets

> **Security:** Never commit real API keys to Git. Keys live in `backend/.env` locally and in **Vercel Environment Variables** in production. Both paths are gitignored or platform-managed.

### Required environment variables

| Variable | Used for | Where to get it |
|----------|----------|-----------------|
| `MAPMYINDIA_API_KEY` | Mappls map tiles, autosuggest search, geocoding | [Mappls Console](https://auth.mappls.com/console) → static `access_token` |
| `GEMINI_API_KEY` | Conversational AI chat, voice, crop/irrigation photo analysis | [Google AI Studio](https://aistudio.google.com/apikey) |
| `AGROMONITORING_API_KEY` | Satellite NDVI, soil moisture, monsoon rainfall | [Agromonitoring](https://home.agromonitoring.com/users/api-keys) → `appid` |
| `TWILIO_ACCOUNT_SID` | SMS alert delivery | [Twilio Console](https://console.twilio.com) → Account SID (`AC…`) |
| `TWILIO_MESSAGING_SERVICE_SID` | Send SMS via Messaging Service | Twilio Console → Messaging → Services (`MG…`) |
| `TWILIO_SMS_FROM` | Fallback sender phone number | Twilio Console → Phone Numbers (e.g. `+18777804236`) |
| `TWILIO_API_KEY_SID` | Twilio API authentication | Twilio Console → API Keys (`SK…`) |
| `TWILIO_API_KEY_SECRET` | Twilio API key secret | Shown once when API key is created |
| `TWILIO_AUTH_TOKEN` | Alternative auth (Account SID + token) | Twilio Console → Account Info (optional if using API key) |

### Local setup

1. Copy the example env file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Paste your keys into `backend/.env`:
   ```env
   MAPMYINDIA_API_KEY=<your_mappls_static_key>
   GEMINI_API_KEY=<your_gemini_api_key>
   AGROMONITORING_API_KEY=<your_agromonitoring_appid>

   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_SMS_FROM=+1XXXXXXXXXX
   TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_KEY_SECRET=<your_api_key_secret>
   # TWILIO_AUTH_TOKEN=<optional_if_using_api_key>
   ```
3. Restart the backend after changes.

### Production (Vercel)

1. Open **Vercel → Project → Settings → Environment Variables**
2. Add **all** variables above for **Production**, **Preview**, and **Development**
3. Redeploy after adding or changing keys

### Key capabilities to enable in Mappls Console
 
Ensure these are enabled for your Mappls app:
- Web Maps JS SDK
- Autosuggest API
- Geocoding API
 
---

## 4b. Supabase Analytics Integration

Bhumija uses a Supabase backend to track queries and numbers accessed to monitor usage and improve quality.

### Credentials
Configured in `frontend/.env`:
```env
VITE_SUPABASE_URL=https://cbzbhwxchjvjadrbjftv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sncbaKNrAWT0oXFsUWylAA_jDHSFNrO
```

### Logged Tables
1. **`queries`**: Stores search query and location clicks.
   - Schema: `lat` (float), `lon` (float), `district` (text), `place_name` (text), `place_address` (text), `created_at` (timestamptz).
2. **`subscriptions`**: Stores SMS alerts/number subscriptions.
   - Schema: `phone` (text), `lat` (float), `lon` (float), `language` (text), `status` (text), `created_at` (timestamptz).

---
 
## 5. External APIs Used
 
### Mappls / MapMyIndia (requires `MAPMYINDIA_API_KEY`)
 
| API | Endpoint | Used by |
|-----|----------|---------|
| **Web Maps SDK** | `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=<KEY>` | Frontend map overlay |
| **Autosuggest** | `https://search.mappls.com/search/places/autosuggest/json` | `/api/search` |
| **Geocoding** | `https://search.mappls.com/search/address/geocode` | `/api/search` primary geocode |
 
### Google Gemini (requires `GEMINI_API_KEY`)
 
| API | Model | Used by |
|-----|-------|---------|
| **Google GenAI SDK** | `gemini-2.5-flash` | `/api/chat`, `/api/farmer/voice-advisory`, `/api/farmer/health-log` |
 
**Chat endpoint supports:** `message`, `lat`, `lon`, `lang` (en/hi/te/mr/kn), `conversation` (JSON history), optional `image` (crop/irrigation photo).
 
**Fallback:** Rule-based expert advisory if Gemini unavailable.
 
### Twilio (requires `TWILIO_*` env vars)
 
| API | Used by |
|-----|---------|
| **Messages API** | `POST /2010-04-01/Accounts/{SID}/Messages.json` via Messaging Service | `/api/farmer/sms-subscribe` |
 
SMS flow: farmer selects location → enters mobile → backend gathers **full farm context** → **single holistic SMS** (≤160 chars) via Twilio → subscriber saved. Includes: location, 90d + 72h rain, soil %, best crop + score, weekly action hint, RSK phone. 
- **Phone Normalization (E.164)**: Auto-formats 10-digit Indian numbers (e.g. `6303850265` -> `+916303850265`), handles national `0` prefixes, and formats double-zero `00` international prefixes.

**Form fields:** `phone`, `lat`, `lon`, `lang`, `place_name` (optional — from search bar).
 
Holistic SMS builder: `build_holistic_sms_body()` in [`backend/farmer_intelligence.py`](backend/farmer_intelligence.py) — reusable for future scheduled alert cron.
 
Implementation: [`backend/twilio_sms.py`](backend/twilio_sms.py)
 
### Open-Meteo (free, no key)
 
| API | Endpoint | Used by |
|-----|----------|---------|
| **Weather forecast** | `https://api.open-meteo.com/v1/forecast` | `/api/weather`, agro fallbacks |
| **Historical rainfall (90d)** | `https://api.open-meteo.com/v1/forecast?past_days=92&daily=precipitation_sum` | `/api/agro/insights`, district overlay (fallback) |
| **Historical rainfall (365d)** | `https://archive-api.open-meteo.com/v1/archive?daily=precipitation_sum` | `/api/agro/insights` (fallback) |
| **Soil moisture model** | `https://api.open-meteo.com/v1/forecast?hourly=soil_moisture_0_to_7cm` | `/api/agro/insights` when Agro polygon unavailable |
| **72h forecast rain** | `https://api.open-meteo.com/v1/forecast?hourly=precipitation` | `/api/agro/insights` when Agro forecast empty |
| **Geocoding (search fallback)** | `https://geocoding-api.open-meteo.com/v1/search` | `/api/search` when Mappls geocode fails |
 
Open-Meteo is the **automatic fallback** when Agromonitoring historical rain or polygon-based soil/NDVI fail. Responses include `estimated: true` and `(est.)` in the UI where applicable.
 
### Agromonitoring / OpenWeather Agro (requires `AGROMONITORING_API_KEY`)
 
| API | Endpoint | Used by |
|-----|----------|---------|
| **Current agro weather** | `https://api.agromonitoring.com/agro/1.0/weather` | `/api/agro/insights`, district overlay |
| **5-day forecast** | `https://api.agromonitoring.com/agro/1.0/weather/forecast` | `/api/agro/insights` |
| **Accumulated precipitation (monsoon)** | `https://api.agromonitoring.com/agro/1.0/weather/history/accumulated_precipitation` | `/api/agro/insights`, district overlay — **paid plan only** |
| **Soil moisture & temperature** | `https://api.agromonitoring.com/agro/1.0/soil?polyid=` | `/api/agro/insights` — requires polygon |
| **NDVI history** | `https://api.agromonitoring.com/agro/1.0/ndvi/history?polyid=` | `/api/agro/insights` — requires polygon |
| **Create field polygon** | `POST https://api.agromonitoring.com/agro/1.0/polygons` | Auto-created per farm location — **free tier limit** |
| **List polygons** | `GET https://api.agromonitoring.com/agro/1.0/polygons` | Debug quota; delete unused polygons to free slots |
 
**Free-tier limitations (observed July 2026):**
 
| Limit | HTTP response | Bhumija behavior |
|-------|---------------|------------------|
| Historical accumulated rain | `401` | Falls back to Open-Meteo archive/forecast |
| Polygon quota exhausted | `413` “You can not create polygons anymore” | Falls back to Open-Meteo soil + NDVI estimate |
| New polygon NDVI delay | Empty `/ndvi/history` | Satellite pass may take days; free tier skips cloudy scenes |
 
**Map overlay modes:** Risk zones · Monsoon (90d) · Soil / Water · All layers (composite)  
**Risk colors:** Red (high/dry) · Yellow (medium) · Blue (favorable/moist)
 
---
 
## 6. Internal API Endpoints
 
Base URL:
- **Local:** `http://localhost:8000`
- **Production:** `https://<your-vercel-domain>/api`
 
Full contract: [`apis/api_contract.md`](apis/api_contract.md)
 
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Map key, Gemini/Agro/Twilio flags, supported languages |
| `GET` | `/api/districts` | Vulnerable district dataset |
| `GET` | `/api/search?q=&lat=&lon=` | MapMyIndia autosuggest + Mappls/Open-Meteo geocode + nearest district |
| `GET` | `/api/weather?lat=&lon=` | Open-Meteo weather proxy |
| `GET` | `/api/agro/insights?lat=&lon=` | NDVI, soil, 90d/365d monsoon, forecast |
| `GET` | `/api/agro/district-overlay` | District metrics for map overlays |
| `POST` | `/api/chat` | **Conversational AI** — message, lat, lon, lang, conversation, optional image |
| `GET` | `/api/farmer/crop-recommend?lat=&lon=&lang=` | Smart crop recommendations |
| `GET` | `/api/farmer/alerts?lat=&lon=&lang=` | Dry-spell alerts + irrigation/fertilization |
| `POST` | `/api/farmer/health-log` | Photo/voice health log + RSK referral |
| `GET` | `/api/farmer/health-logs` | Recent health logs |
| `POST` | `/api/farmer/sms-subscribe` | **Twilio SMS** — single-segment holistic advisory (`place_name` optional) |
| `POST` | `/api/farmer/voice-advisory` | Indic voice transcript → advisory |
 
**Frontend UI:** Full-screen map + **Bhumija Assistant** panel (chat, voice with stop, photo, SMS, crop/forecast insights). Mobile: bottom nav **Map | Assistant** with bottom sheet.
 
**Search response fields:** `name`, `address`, `lat`, `lon`, `district_id`, `district_name`, `approximate_district`, `source`
 
**SMS subscribe response fields:** `subscribed`, `sample_sms`, `holistic_summary`, `delivery`, `message_sid`, `twilio_configured`
 
Full action log: [`content.md`](content.md)
 
---
 
## 7. Project Structure
 
```
bhumija/
├── content.md              ← chat history, actions taken, feature context
├── deployment.md           ← this file
├── ppt.md                  ← 10-slide deck for PDF/PPTX export
├── product_plan.md         ← product specification
├── README.md
├── vercel.json
├── requirements.txt        ← Python deps for Vercel serverless
├── start.sh
│
├── api/
│   └── index.py            ← Vercel serverless FastAPI entry
│
├── apis/
│   └── api_contract.md
│
├── backend/
│   ├── main.py                 ← FastAPI routes, search geocode, district match
│   ├── agro_client.py          ← Agromonitoring + Open-Meteo fallbacks
│   ├── farmer_intelligence.py  ← crops, alerts, SMS body, weekly plan, RSK
│   ├── twilio_sms.py           ← Twilio send (160-char cap)
│   ├── requirements.txt
│   ├── .env                ← GITIGNORED
│   ├── .env.example
│   └── data/
│       ├── districts.json
│       ├── rythu_seva_kendras.json
│       ├── health_logs.json      ← runtime
│       └── sms_subscribers.json  ← runtime
│
└── frontend/src/
    ├── App.jsx               ← map-first layout
    ├── components/
    │   ├── BhumijaAssistant.jsx  ← chat, voice+stop, photo, SMS, insights
    │   ├── MapComponent.jsx      ← map, pin, GPS, overlays
    │   ├── MapLocationMetrics.jsx ← metrics card, placeName, auto-expand
    │   ├── SearchBar.jsx         ← city-first search, City badge
    │   ├── MobileNavBar.jsx
    │   └── BottomSheet.jsx
    ├── hooks/useMediaQuery.js
    └── utils/
        ├── mappls.js
        ├── riskScore.js
        └── supabase.js       ← Supabase client initialization
```
 
---
 
## 8. GitHub Setup & Push
 
### First-time push
 
1. Create an empty repo at https://github.com/ravii-teja/bhumija (no README/license if pushing existing code)
2. Push from local:
 
```bash
cd /Users/in-r.teja/Devo/bhumija
git remote add origin https://github.com/ravii-teja/bhumija.git
git branch -M main
git push -u origin main
```
 
### What is committed vs ignored
 
| Committed | Ignored (never push) |
|-----------|----------------------|
| Source code, configs, `districts.json` | `backend/.env` |
| `.env.example` (placeholders only) | `backend/venv/` |
| `vercel.json`, `requirements.txt` | `frontend/node_modules/` |
| | `frontend/dist/` |
| | `frontend/.env` |
 
---
 
## 9. Vercel Deployment Steps
 
### One-time setup
 
1. Push code to GitHub (see above)
2. Go to https://vercel.com/new
3. **Import** `ravii-teja/bhumija`
4. Confirm settings (auto-read from `vercel.json`):
   - **Build command:** `cd frontend && npm install && npm run build`
   - **Output directory:** `frontend/dist`
   - **Install command:** `cd frontend && npm install`
5. Add environment variables (Section 4)
6. Click **Deploy**
 
### How routing works on Vercel
 
| Request | Handled by |
|---------|------------|
| `/`, `/assets/*`, SPA routes | Static files from `frontend/dist` |
| `/api/*` | Python serverless function (`api/index.py` → `backend/main.py`) |
 
Defined in [`vercel.json`](vercel.json):
```json
"rewrites": [
  { "source": "/api/(.*)", "destination": "/api/index" },
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]
```
 
---
 
## 10. Troubleshooting
 
| Issue | Likely cause | Fix |
|-------|--------------|-----|
| Map shows "API key missing" | `MAPMYINDIA_API_KEY` not set or `/api/config` failing | Check `backend/.env` locally or Vercel env vars; redeploy |
| Map fails to load | Mappls SDK blocked or invalid key | Verify key in Mappls console; whitelist your domain |
| Search returns no results | Mappls autosuggest/geocode error | Open-Meteo geocoding fallback added; verify with `?q=Pune` |
| Search city wrong location | State-only district match (fixed) | City results use geocode; restart backend after update |
| SMS arrives as multiple parts | Unicode/emojis/multi-line body | Now ≤160 chars GSM-safe single segment |
| Chat uses rule-based mode only | `GEMINI_API_KEY` missing or invalid | Set key in env; check Vercel function logs |
| Voice not working | Browser lacks SpeechRecognition or mic blocked | Use Chrome/Edge; allow mic; needs HTTPS (localhost OK) |
| Voice won't stop | No stop handler (fixed Phase 12) | Use **Stop voice** bar or MicOff; `stopVoice()` cancels mic + TTS |
| Gemini 429 / quota | Free tier rate limit | Rule-based fallback still works; retry later or upgrade key |
| SMS not sent | Twilio env incomplete or trial restrictions | Set all `TWILIO_*` vars; verify recipient on trial accounts |
| SMS "not_configured" | Missing Account SID or Messaging Service | Check `backend/.env`; `GET /api/config` → `twilio_configured` |
| Agro NDVI null | New polygon, satellite pass pending, or quota exceeded | Normal on free tier; Open-Meteo NDVI estimate used; delete unused Agro polygons or upgrade plan |
| Map metrics show `—` for rain/soil | Agro historical/polygons blocked | Should auto-fallback to Open-Meteo after Phase 9 fix; restart backend; check `/api/agro/insights` |
| Crops show `—` | No district match for GPS location | Nearest-district soft-match added; tap a district circle for exact match |
| Soil/vegetation marked `(est.)` | Agro polygon unavailable | Expected with free tier; real satellite needs polygon quota |
| Weather shows fallback data | Open-Meteo unreachable | Transient; backend returns safe defaults |
| Local frontend can't reach API | Backend not running | Run `./start.sh` or backend on `:8000` |
| Vercel API 500 errors | Python deps or cold start | Check Vercel Functions logs; ensure `twilio` in root `requirements.txt` |
| SSL errors on macOS (local) | Python cert store | Backend uses certifi with SSL fallback |
| Supabase tracking fails | Missing environment vars in frontend | Make sure `frontend/.env` contains valid credentials and rebuild frontend |
 
---
 
## 11. Future / Scale APIs (from product plan)
 
These are documented in [`product_plan.md`](product_plan.md) for post-hackathon scale — not yet integrated:
 
| API / Tool | Purpose |
|------------|---------|
| Google Earth Engine (GEE) | NDVI, SMAP soil moisture satellite layers |
| Google ALU API | Farm field boundary delineation |
| Google AMED API | Crop type & sowing/harvest detection |
| Google NeuralGCM | Monsoon shift prediction |
| Google SEEDS | Ensemble weather forecasting |
 
---
 
## 12. Quick Reference Checklist
 
- [ ] `backend/.env` with MapMyIndia key (required)
- [ ] `backend/.env` with Gemini + Agromonitoring keys (recommended; Open-Meteo fallbacks cover gaps)
- [ ] `backend/.env` with Twilio Account SID, Messaging Service, API key (or Auth Token)
- [ ] `frontend/.env` with Supabase keys configured
- [ ] Local app: `./start.sh` or separate backend + frontend terminals → http://localhost:3000
- [ ] Map: search **Pune** or any city, pin, GPS, overlays, location metrics (auto-expanded)
- [ ] Search returns correct city coords (~18.52, 73.86 for Pune)
- [ ] Agro metrics show rain/soil/NDVI (may show `(est.)` on free Agro tier)
- [ ] SMS subscribe sends **one** message (check length ≤160 in API `sample_sms`)
- [ ] Assistant: chat, voice (Chrome), **Stop voice** button, photo upload, SMS subscribe
- [ ] `npm run build` succeeds in `frontend/`
- [ ] Export deck: open [`ppt.md`](ppt.md) → PDF for presentations
- [ ] Code pushed to https://github.com/ravii-teja/bhumija
- [ ] Vercel project imported; **all** env vars set
- [ ] Production verified: map, assistant, Twilio SMS test, Supabase analytics table logs
 
---
 
## 13. Implementation Changelog (Phases 9–13)
 
Summary of recent changes — full detail in [`content.md`](content.md).
 
| Phase | Theme | Key files | Outcome |
|-------|-------|-----------|---------|
| **9** | Map data fix | `agro_client.py`, `MapLocationMetrics.jsx`, `mappls.js` | Open-Meteo fallbacks when Agro 401/413; soft district match; mobile metrics auto-expand |
| **10** | Holistic SMS | `farmer_intelligence.py`, `twilio_sms.py` | Location + rain + soil + crop + weekly plan in one message |
| **11** | Single SMS + any-city search | `main.py`, `SearchBar.jsx`, `App.jsx` | ≤160 char GSM-safe SMS; city-first search; Mappls + Open-Meteo geocode; `placeName` in UI/SMS |
| **12** | Voice stop + docs | `BhumijaAssistant.jsx`, `deployment.md`, `api_contract.md` | Stop voice bar; smoke test commands; full ops reference |
| **13** | Supabase & E.164 normalizer | `twilio_sms.py`, `supabase.js`, `BhumijaAssistant.jsx`, `App.jsx` | Robust E.164 phone formats (Indian standard, leading 0, double-zero 00 prefixes); Supabase query & subscription logs |
 
### Backend key functions
 
| Function | File | Purpose |
|----------|------|---------|
| `_geocode_place()` | `main.py` | Mappls geocode → Open-Meteo fallback |
| `_resolve_search_coordinates()` | `main.py` | CITY vs POI coordinate resolution |
| `_match_local_district()` | `main.py` | District match without state-only false positives |
| `find_nearest_district()` | `main.py` | Nearest advisory district for crop context |
| `get_agro_insights()` | `agro_client.py` | Agro + Open-Meteo composite with `estimated` flags |
| `build_holistic_sms_body()` | `farmer_intelligence.py` | Single-segment SMS text builder |
| `build_weekly_plan()` | `farmer_intelligence.py` | Weekly action hints for SMS + API |
| `send_sms()` | `twilio_sms.py` | Twilio send with 160-char truncation |
| `normalize_phone_e164()` | `twilio_sms.py` | Formats and cleans Indian standard, leading zero, and double-zero phone numbers |
 
### Related documents
 
| File | Purpose |
|------|---------|
| [`content.md`](content.md) | Full action log, phases 1–13, E2E data flow |
| [`ppt.md`](ppt.md) | 10-slide presentation deck |
| [`product_plan.md`](product_plan.md) | Original product specification |
| [`apis/api_contract.md`](apis/api_contract.md) | API request/response contract |

---

*Last updated: July 2026 — Bhumija v3 (voice stop, single SMS, any-city search, Open-Meteo fallbacks, smoke tests, ppt.md deck)*
