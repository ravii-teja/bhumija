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
