# Bhumija — El Niño Resilience Engine

AI-powered drought resilience advisor for Indian farmers. Interactive MapMyIndia map, live weather, and Gemini-powered agricultural chat.

## Local development

1. Copy the frontend and backend environment templates and populate them:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Start the dev servers (both frontend and backend) simultaneously:
   ```bash
   ./start.sh
   ```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

---

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add **Environment Variables** in Vercel project settings:
   - `MAPMYINDIA_API_KEY` — Mappls / MapMyIndia static key
   - `GEMINI_API_KEY` — Google Gemini API key
   - `AGROMONITORING_API_KEY` — Agromonitoring key
   - `TWILIO_ACCOUNT_SID` — Twilio account SID
   - `TWILIO_MESSAGING_SERVICE_SID` — Twilio messaging service SID
   - `TWILIO_SMS_FROM` — Twilio sender phone number
   - `TWILIO_API_KEY_SID` — Twilio API key SID
   - `TWILIO_API_KEY_SECRET` — Twilio API key secret
   - `SUPABASE_DB_HOST` — Supabase database host
   - `SUPABASE_DB_NAME` — Supabase database name
   - `SUPABASE_DB_USER` — Supabase database username
   - `SUPABASE_DB_PASS` — Supabase database password
   - `SUPABASE_DB_PORT` — Supabase database port (usually 5432 or 6543 for transaction pooling)
4. Deploy. Vercel will build the React frontend from `frontend/` and serve the FastAPI backend as serverless functions.

---

## SMS Alert Subscription Workflow

When a farmer registers their phone number for dry-spell alert subscription:
1. **Context Gathering:** The backend resolves the coordinates to the nearest agricultural district and fetches real-time weather & Soil/NDVI agrotechnical data.
2. **First SMS Delivery:** A personalized welcome warning SMS containing regional crop advice, rain estimates, and Rythu Seva Kendra (RSK) contact details is compiled and sent via Twilio first.
3. **Database Logging:** Right after the message is dispatched, the subscription event (phone, lat, lon, language, status, and timestamp) is logged directly into the Supabase Postgres `subscriptions` table.

---

## How to Use Bhumija

### 🌾 Farmer Advisory Mode
1. **Locate your plot**: Select a district on the map or search for a location using the Search Bar at the top.
2. **Consult Bhumija Assistant**: Use the right-hand panel (desktop) or tap "Assistant" (mobile bottom sheet) to:
   - Ask crop and soil questions via **Text** or **Voice** (supports English, Hindi, Telugu, Marathi, and Kannada).
   - Upload field photos to diagnose crop health issues.
3. **SMS Alerts**: Submit a 10-digit mobile number to subscribe to automated weather and crop warnings via Twilio.

### 🏛️ Government & Governance Dashboard
1. **Toggle Mode**: Click the **"Governance"** tab in the desktop right sidebar or mobile navigation bar.
2. **Analyze District Risks**: View live risk cards including **Impacted Farmers** counts and **Potential Savings** (INR Crores) based on regional El Niño forecasts.
3. **Monitor Reservoir Storage**: Review the custom water level line indicator showing past averages, current volume, and projected dry-down trajectories under El Niño.
4. **Inspect Historical Sowing Stats**: Review historical crop acreage and yields derived from Supabase for the active season.
5. **Manage Contingency Action Plan**: Work through the checklists for district administrators and first-action field workers, marking off tasks as they are executed.

---

## Key Implemented Features
* **Interactive Map & Overlays**: Real-time Leaflet mapping showing districts flagged for El Niño vulnerability.
* **Indic Voice & Image Diagnostic Chat**: Multi-modal Gemini AI integration for crop health diagnosis and localized advice.
* **Supabase Crop Yields Mapping Database**: Houses 6,800+ aggregated district-crop records since 2010 to fetch and analyze seasonal crop suitability on the fly.
* **Google-Style Governance Dashboard**: Premium admin panel showing water storage indicators, savings calculators, and interactive checklist systems.
* **Autosuggest Performance Optimization**: High-speed search query and geocoding caches to reduce latency on repeated autocomplete keystrokes.

---

## Project structure

```
bhumija/
├── api/index.py          # Vercel serverless entry (FastAPI)
├── backend/              # FastAPI app + district data & venv
├── datasets/             # CSV crop dataset and citation details
├── frontend/             # React + Vite + Tailwind UI
├── docs/                 # Product plans, walkthroughs, presentation decks, and contracts
└── vercel.json           # Vercel deployment config
```

