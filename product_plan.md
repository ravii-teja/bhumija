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

4. CORE DATA POINTS FOR INTEGRATION
--------------------------------------------------------------------------------
To feed the AI contextual layer, the application aggregates or infers:
1. Root Zone Soil Moisture (RZSM) to determine crop stress levels.
2. Vegetation Index (NDVI) tracking to pinpoint localized crop failure early.
3. Shifting monsoon onset/offset boundaries across specific sub-districts.
4. Historical 5-year acreage metrics vs. current sowing trends.
5. Local structural capacities (reservoirs, farm ponds, groundwater levels).
6. weather api, soil, india geograpy, crop type, water levels or sources neaby if avaiable, seasonal aspects of indian crops. 

5. COMPLETE LIST OF APIs, MODELS, & TOOLS
--------------------------------------------------------------------------------
The backend and frontend are entirely optimized for a FREE-TIER PROTOTYPE.

AI Brain & Foundation Models:
* Google Gemini 2.5 Flash API (via Google AI Studio): Handles multi-modal inputs 
  (text chat + uploaded field/soil imagery). Generous free tier: 15 Requests 
  Per Minute (RPM) / 1,500 Requests Per Day (RPD).

Specialized Agritech Models (For Scale):
* Google Agricultural Understanding (ALU) API: For automated farm field 
  boundary delineation and mapping across rural India.
* Google Agricultural Monitoring and Event Detection (AMED) API: Tracks 
  crop types, field sizes, and precise sowing/harvesting dates every 15 days.
* Google NeuralGCM Model: Open-source, lightweight global physics-AI climate model 
  capable of running locally on a laptop to predict monsoon shifts.
* Google SEEDS Framework: Generative weather-forecasting architecture for cost-efficient 
  ensemble forecasting.

Geospatial Data Layers:
* Google Earth Engine (GEE): Free for research. Streamlines ingestion of MODIS 
  (MOD13Q1) or Sentinel-2 (for NDVI) and SMAP satellite arrays (for soil moisture).
* Open-Meteo API: Completely free weather forecasting layer used without api keys 
  to pull live temperature, windspeed, and rain data on the fly.

6. CORE PROGRAMMING LIBRARIES & STACK
--------------------------------------------------------------------------------
Frontend (React + Vite + Tailwind):
* react, react-dom  - Interactive user interface components.
* leaflet, lucide-react - Mapping layout and icon visual assets.
* @vercel/analytics - Vercel usage stats tracker.
* @supabase/supabase-js - Supabase client to record farmer queries and subscriptions.

Backend (FastAPI + Python):
* fastapi, uvicorn   - Serverless routing API framework.
* google-genai      - Official SDK to execute Gemini AI prompts (voice/image/chat).
* twilio            - SMS dispatch integration.
* pillow            - Image diagnostic support.
* requests, certifi - Meteorological telemetry integration.

7. APP ARCHITECTURE & DATA FLOW
--------------------------------------------------------------------------------
The application is structured as a decoupled React client calling a serverless FastAPI backend:

```
[React Frontend] ────(HTTP /api/* Proxy)────► [FastAPI Backend]
       │                                             │
       ├─► Supabase: Log Search Queries              ├─► Google Gemini API
       ├─► Supabase: Log SMS Subscriptions           ├─► Twilio SMS Delivery
       └─► Vercel Analytics                          ├─► Agromonitoring API
                                                     └─► Open-Meteo API
```

Data Flow Sequence:
1. Farmer selects a location on the Mappls Map component (either by geocode search, GPS, or manual pin drops).
2. The coordinates are matched to the nearest drought-vulnerable district.
3. Live Open-Meteo and Agromonitoring weather/satellite telemetry is fetched for the location.
4. The crops advice and alerts engine in the backend processes this data to recommend drought-resilient crops and calculate dry-spell alert badges.
5. If the farmer subscribes to SMS alerts, a concise GSM-compliant SMS summary is built and sent via Twilio to the farmer's mobile phone, and logged to Supabase.

8. DEPLOYMENT & SHARING PIPELINE
--------------------------------------------------------------------------------
* Git Repository: https://github.com/ravii-teja/bhumija
* Deployment Platform: Vercel (React Static Build + Python Serverless Functions)
* Supabase Backend: Cloud Database for search query analytics and subscriber tables.
* Twilio SMS Integration: Indian standard phone numbers (e.g. 10-digit mobile) auto-normalized to E.164.
use free apis where possible,
