# Project Bhumija API Contract

This document defines the REST API contract between the React frontend and the FastAPI backend for Project Bhumija.

## Base URL
By default, the backend runs on `http://localhost:8000`.

---

## Endpoints

### 1. Get Vulnerable Districts
Returns the list of 315 vulnerable districts in India with coordinates, risk levels, soil types, primary crops, and mitigation advisories.

- **URL:** `/api/districts`
- **Method:** `GET`
- **Response Code:** `200 OK`
- **Response Body (JSON):**
  ```json
  [
    {
      "id": "aurangabad_mh",
      "name": "Aurangabad (Chhatrapati Sambhajinagar)",
      "state": "Maharashtra",
      "region": "Marathwada",
      "lat": 19.8762,
      "lon": 75.3433,
      "risk_level": "High",
      "soil_type": "Black Cotton Soil (Regur)",
      "primary_crops": ["Cotton", "Soybean", "Pigeon Pea (Tur)", "Bajra"],
      "mitigation_advisories": {
        "crop_switching": "Switch from long-duration cotton to short-duration pulses (mung/urad) or pearl millet (bajra).",
        "moisture_conservation": "Implement broad bed furrow (BBF) sowing and apply straw mulching to conserve residual soil moisture.",
        "water_harvesting": "Construct farm ponds (Shettale) and recharge existing open wells to capture sudden intense rain spells."
      }
    }
    // ... other districts
  ]
  ```

---

### 2. Get Live Weather Proxy
Proxies requests to the Open-Meteo API to fetch live weather data for given coordinates without requiring frontend API keys or running into CORS issues.

- **URL:** `/api/weather`
- **Method:** `GET`
- **Query Parameters:**
  - `lat` (float, required): Latitude of the location.
  - `lon` (float, required): Longitude of the location.
- **Response Code:** `200 OK`
- **Response Body (JSON):**
  ```json
  {
    "temperature": 32.5,
    "windspeed": 12.4,
    "weathercode": 3,
    "description": "Partly Cloudy",
    "is_day": 1,
    "rain": 0.0,
    "relative_humidity": 45
  }
  ```

---

### 3. Chat and Multimodal Advisory
Accepts a user query, location coordinates, and an optional image upload (soil/crop) to generate a hyper-local, context-aware agricultural advisory.

- **URL:** `/api/chat`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data` (to support file uploads)
- **Form Data Parameters:**
  - `message` (string, required): The user's question or prompt.
  - `lat` (float, optional): Latitude of the farmer's location.
  - `lon` (float, optional): Longitude of the farmer's location.
  - `image` (file, optional): An uploaded image of the crop, leaves, or soil (JPEG/PNG).
- **Response Code:** `200 OK`
- **Response Body (JSON):**
  ```json
  {
    "response": "Based on your location in Marathwada (Lat 19.8762, Lon 75.3433) and the current temperature of 32.5°C, your soil is experiencing high moisture stress. Here is your Bhumija El Niño advisory:\n\n1. **Crop Switching**: Since the monsoon is delayed, avoid planting long-duration cotton. Switch immediately to short-duration Pigeon Pea (Tur) or Bajra.\n2. **Soil Management**: Your uploaded image indicates cracked black clay soil. Apply a 5cm layer of crop residue mulching to reduce evaporation.\n3. **Water Storage**: Prepare farm ponds now. The El Niño pattern suggests dry spells followed by sudden heavy cloudbursts; you must be ready to catch this water.",
    "location_context": {
      "district": "Aurangabad (Chhatrapati Sambhajinagar)",
      "region": "Marathwada",
      "risk_level": "High"
    },
    "weather_context": {
      "temperature": 32.5,
      "description": "Partly Cloudy"
    }
  }
  ```

---

### 4. Agromonitoring Farm Insights
Returns satellite-derived NDVI, soil moisture, agro weather, and monsoon rainfall context for a farm location.

- **URL:** `/api/agro/insights`
- **Method:** `GET`
- **Query Parameters:**
  - `lat` (float, required)
  - `lon` (float, required)
- **Response Code:** `200 OK`

---

### 5. Agromonitoring District Map Overlay
Returns per-district agro metrics for coloring map overlays (monsoon rain, soil/water stress).

- **URL:** `/api/agro/district-overlay`
- **Method:** `GET`
- **Response Code:** `200 OK`

---

## Farmer Intelligence Platform (Indic Voice & SMS)

Supported languages: `en`, `hi`, `te`, `mr`, `kn` (via `lang` query/form parameter).

### 6. Smart Crop Recommendation
Satellite NDVI, soil moisture, monsoon rainfall, and district soil profile.

- **URL:** `/api/farmer/crop-recommend`
- **Method:** `GET`
- **Query Parameters:** `lat`, `lon`, `lang` (optional, default `en`)

### 7. Real-Time Alerts & Irrigation Guidance
Dry-spell alerts, simulated ground sensor readings, irrigation and fertilization guidance.

- **URL:** `/api/farmer/alerts`
- **Method:** `GET`
- **Query Parameters:** `lat`, `lon`, `lang`

### 8. Crop Health Log (Photo / Voice)
AI diagnosis with Rythu Seva Kendra referral ID for expert follow-up.

- **URL:** `/api/farmer/health-log`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Form Data:** `lat`, `lon`, `notes`, `lang`, `input_type` (`text`|`voice`|`photo`), optional `image`

### 9. List Health Logs
- **URL:** `/api/farmer/health-logs`
- **Method:** `GET`
- **Query Parameters:** `limit` (default 10)

### 10. SMS Subscribe (Holistic Dry-Spell Alerts)
Twilio delivery of a **single-segment** holistic advisory (≤160 chars, GSM-safe). Gathers location, rainfall, soil, best crop, weekly hint, and RSK phone.

- **URL:** `/api/farmer/sms-subscribe`
- **Method:** `POST`
- **Form Data:** `phone`, `lat`, `lon`, `lang`, `place_name` (optional — searched city name from frontend)
- **Response fields:** `subscribed`, `sample_sms`, `holistic_summary`, `delivery`, `message_sid`, `twilio_configured`

### 11. Voice Advisory
Process voice transcript in Indic languages; returns spoken advisory text.

- **URL:** `/api/farmer/voice-advisory`
- **Method:** `POST`
- **Form Data:** `text`, `lat`, `lon`, `lang`

---

### 12. Place Search (MapMyIndia + Geocoding)
Search any city, village, or advisory district. MapMyIndia autosuggest with Mappls/Open-Meteo geocoding fallback.

- **URL:** `/api/search`
- **Method:** `GET`
- **Query Parameters:**
  - `q` (string, required): Search query (e.g. `Pune`)
  - `lat`, `lon` (float, optional): Bias autosuggest to map center
- **Response Code:** `200 OK`
- **Response Body (JSON array):**
  ```json
  [
    {
      "name": "Pune",
      "address": "Pune, Maharashtra, India",
      "lat": 18.5196,
      "lon": 73.8554,
      "district_id": "pune_mh",
      "district_name": "Pune",
      "approximate_district": true,
      "source": "open_meteo_geocode"
    }
  ]
  ```

---

### 13. Google Earth Engine Farm Telemetry
Ingests real-time Sentinel-2 (NDVI + 5-Yr Baseline), SMAP soil moisture, MODIS evapotranspiration, and Sentinel-1 SAR flood radar telemetry for farm coordinates.

- **URL:** `/api/gee/insights`
- **Method:** `GET`
- **Query Parameters:**
  - `lat` (float, required): Latitude
  - `lon` (float, required): Longitude
- **Response Body (JSON):**
  ```json
  {
    "gee_active": true,
    "source": "google_earth_engine",
    "lat": 19.8762,
    "lon": 75.3433,
    "ndvi": 0.467,
    "ndvi_5yr_baseline": 0.485,
    "ndvi_anomaly_percent": -23.9,
    "historical_vigor_status": "23.9% Below 5-Yr Average (Crop Stress)",
    "soil_moisture_percentage": 14.2,
    "evapotranspiration_mm_day": 4.2,
    "irrigation_action": "Daily crop water loss is 4.2mm. Give a 15-minute drip irrigation before 8 AM tomorrow.",
    "waterlogging_detected": false,
    "flood_radar_status": "No Standing Water Detected (Field Clear)"
  }
  ```

---

### 14. GEE District Crop Damage & Loss Quantifier
Generates GEE satellite-backed disaster assessment, crop loss acreage, impacted smallholders, and PMFBY severity level for government authorities.

- **URL:** `/api/gee/damage-quantification`
- **Method:** `GET`
- **Query Parameters:**
  - `district` (string, required): District name (e.g. `Marathwada`)
  - `lat` (float, required): Latitude
  - `lon` (float, required): Longitude
- **Response Body (JSON):**
  ```json
  {
    "district": "Marathwada",
    "lat": 19.8762,
    "lon": 75.3433,
    "gee_verified": true,
    "damage_percentage": 52.5,
    "affected_acreage_acres": 23625,
    "estimated_farmers_impacted": 33075,
    "pmfby_severity_level": "High Severity (PMFBY Emergency Claims Recommended)",
    "surface_water_depletion_pct": 42.5,
    "monsoon_delay_days": 21,
    "sowing_contingency_status": "Monsoon delayed by 21 days in Marathwada. Switch from Paddy/Cotton to short-duration Bajra & Tur."
  }
  ```
