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

## Project structure

```
bhumija/
├── api/index.py          # Vercel serverless entry (FastAPI)
├── backend/              # FastAPI app + district data & venv
├── frontend/             # React + Vite + Tailwind UI
├── apis/                 # API contract docs
├── docs/                 # Product plans, walkthroughs, and deployment docs
└── vercel.json           # Vercel deployment config
```
