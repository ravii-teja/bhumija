# Bhumija — El Niño Resilience Engine

AI-powered drought resilience advisor for Indian farmers. Interactive MapMyIndia map, live weather, and Gemini-powered agricultural chat.

## Local development

```bash
./start.sh
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

Copy `backend/.env.example` to `backend/.env` and add your API keys.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add **Environment Variables** in Vercel project settings:
   - `MAPMYINDIA_API_KEY` — Mappls / MapMyIndia static key
   - `GEMINI_API_KEY` — Google Gemini API key
4. Deploy. Vercel will:
   - Build the React frontend from `frontend/`
   - Serve the FastAPI backend as a serverless function at `/api/*`

## Project structure

```
bhumija/
├── api/index.py          # Vercel serverless entry (FastAPI)
├── backend/              # FastAPI app + district data
├── frontend/             # React + Vite + Tailwind UI
├── apis/                 # API contract docs
└── vercel.json           # Vercel deployment config
```
