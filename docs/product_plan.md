================================================================================
                    PROJECT SPECIFICATION: PROJECT BHUMIJA
          AI-Powered Super El Niño Resilience Engine for Indian Farmers
================================================================================

1. PRODUCT OVERVIEW & POSITIONING
--------------------------------------------------------------------------------
Product Name: Bhumija ("Born of the Earth")
Core Mission: To act as a free, lightweight digital shield for Indian farmers 
              against severe agricultural droughts triggered by the "Super El Niño". 
Positioning:  A multi-modal AI advisor providing real-time, hyper-local guidance 
              on drought mitigation, crop switching, moisture conservation, and 
              the "Drought-Flood Paradox" via an interactive map and chat interface.

2. THE PROBLEM STATEMENT
--------------------------------------------------------------------------------
The intensification of "Super El Niño" conditions severely threatens Indian 
agriculture by causing highly erratic, delayed, or deficient Southwest Monsoons. 
This impacts major summer (Kharif) crops and leaves cascading deficits for winter 
(Rabi) staples like wheat and chickpea. 

Key challenges faced by smallholder farmers include:
* Micro-climate Blindness: Traditional, macro-level weather forecasts fail to 
  account for district-level rain shadows and micro-climatic anomalies.
* The Drought-Flood Paradox: Parched, cracked, and unmanaged topsoil cannot absorb 
  sudden, heavy cloudbursts, leading to catastrophic flash floods directly following 
  extended dry spells.
* Delayed Advisory Chains: Bureaucratic agricultural advisories reach rainfed 
  farmers weeks after local soil conditions change, preventing timely cropping shifts.

3. AREAS OF GEOGRAPHICAL FOCUS
--------------------------------------------------------------------------------
Project Bhumija prioritizes India's rainfed zones, specifically tracking:
* 315 Vulnerable Districts flagged by central authorities for extreme weather risks.
* 111 High-Priority Rainfed Zones, focusing critically on high-risk sectors:
  - Marathwada & Vidarbha (Maharashtra)
  - Rayalaseema & North Interior Karnataka
  - Western Rajasthan & Bundelkhand (Uttar Pradesh / Madhya Pradesh)

4. CORE DATA POINTS & SATELLITE TELEMETRY (GEE INTEGRATION)
--------------------------------------------------------------------------------
To feed the AI contextual layer, the application aggregates real-time satellite telemetry:
1. Root Zone Soil Moisture (SMAP SPL3SMP_E) to determine crop moisture stress levels.
2. 5-Year Historical Vegetation Index (Sentinel-2 NDVI Anomaly 2021–2025) tracking early crop failure.
3. Evapotranspiration & Daily Water Loss Index (MODIS/061/MOD16A2 & ERA5 Reanalysis).
4. All-Weather Flood & Waterlogging Radar Scan (Sentinel-1 SAR Radar COPERNICUS/S1_GRD).
5. Surface Water & Farm Pond (Shettale) Depletion Index (JRC Global Surface Water).
6. Monsoon Onset & Sowing Shift Delay Tracker (CHIRPS Daily Satellite Rainfall).

5. COMPLETE LIST OF APIs, MODELS, & TOOLS
--------------------------------------------------------------------------------
The backend and frontend are entirely optimized for a FREE-TIER PROTOTYPE & SCALABLE PRODUCTION.

AI Brain & Foundation Models:
* Google Gemini 3.1 Flash Lite API (via Google AI Studio): Handles multi-modal inputs 
  (text chat + uploaded field/soil imagery) with high throughput and zero rate limit errors.

Geospatial & Satellite Layers:
* Google Earth Engine (GEE): Multi-satellite array ingesting Sentinel-2 (NDVI + 5-Yr Baseline), 
  NASA SMAP (Soil Moisture), Sentinel-1 SAR (Flood Radar), MODIS (Evapotranspiration), 
  JRC Surface Water, and CHIRPS Rainfall. Supports headless GCP Service Account authentication.
* MapMyIndia (Mappls) v3.0 Web SDK: Pure vector map layer displaying risk zones and farm pins.
* Open-Meteo API: Free weather forecasting layer pulling live temperature, humidity, and rain.

Indic Regional Language System:
* Native Multi-lingual Support: Telugu (తెలుగు), Hindi (हिंदी), Marathi (मराठी), Kannada (ಕನ್ನಡ), and English (en).

6. CORE PROGRAMMING LIBRARIES & STACK
--------------------------------------------------------------------------------
Frontend (React + Vite + Tailwind):
* react, react-dom  - Interactive user interface components.
* lucide-react      - UI icon assets.
* @vercel/analytics - Vercel usage stats tracker.
* @supabase/supabase-js - Supabase database client for logs and subscriptions.

Backend (FastAPI + Python):
* fastapi, uvicorn   - Serverless API routing.
* google-genai      - Official SDK to execute Gemini AI prompts (voice/image/chat).
* earthengine-api   - Python SDK for Google Earth Engine satellite processing.
* twilio            - SMS dispatch integration.
* pillow, certifi   - Image diagnostic and macOS SSL certificate trust bundle support.

7. APP ARCHITECTURE & DATA FLOW
--------------------------------------------------------------------------------
The application is structured as a decoupled React client calling a FastAPI backend:

```
[React Frontend] ────(HTTP /api/* Proxy)────► [FastAPI Backend]
       │                                             │
       ├─► Supabase: Log Search Queries              ├─► Google Gemini 3.1 Flash Lite API
       ├─► Supabase: Log SMS Subscriptions           ├─► Google Earth Engine (Sentinel-2 / SMAP / SAR)
       └─► Vercel Analytics                          ├─► Twilio SMS Delivery
                                                     └─► Open-Meteo API
```

8. DEPLOYMENT & CREDENTIALS PIPELINE
--------------------------------------------------------------------------------
* Git Branch: feature/gee-gemini-integration (Remote: https://github.com/ravii-teja/bhumija)
* Local Dev Authentication: Auto-cached OAuth token (~/.config/earthengine/credentials).
* Production Authentication: Headless GCP Service Account JSON key (`GEE_SERVICE_ACCOUNT` & `GEE_SERVICE_ACCOUNT_KEY_FILE`).
* Secret Scanning: `gee_service_account.json` and `.env` added to `.gitignore` to prevent credential exposure.

================================================================================
                    9. GOVERNMENT DASHBOARD & GEE LOSS QUANTIFIER
================================================================================
The Governance View leverages satellite parameters to provide administration-level insights:
1. **GEE Crop Damage & PMFBY Quantifier**: Automatically calculates affected acreage, impacted smallholder count, and PMFBY insurance severity level.
2. **Surface Water & Farm Pond Stress Tracker**: Tracks reservoir & check-dam depletion percentages for emergency tanker deployment.
3. **Monsoon Onset Anomaly & Sowing Shift Tracker**: Tracks monsoon delay days and auto-triggers district contingency seed distribution directives.
4. **1-Click Export Report**: Generates print-ready PDF contingency and crop loss reports for district collectors.
