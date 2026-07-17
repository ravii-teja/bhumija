import os
import json
import math
import io
import requests
import certifi
import psycopg2
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from google import genai
from agro_client import get_district_metrics, get_location_insights
from twilio_sms import twilio_configured
from farmer_intelligence import (
    SUPPORTED_LANGUAGES,
    build_voice_advisory,
    create_health_log,
    generate_alerts,
    list_health_logs,
    localize_text,
    recommend_crops,
    subscribe_sms,
)

load_dotenv()

MAPMYINDIA_API_KEY = os.getenv("MAPMYINDIA_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
AGROMONITORING_API_KEY = os.getenv("AGROMONITORING_API_KEY", "")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("SUPABASE_DB_HOST"),
            database=os.getenv("SUPABASE_DB_NAME"),
            user=os.getenv("SUPABASE_DB_USER"),
            password=os.getenv("SUPABASE_DB_PASS"),
            port=os.getenv("SUPABASE_DB_PORT", "5432"),
            sslmode="require"
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def log_query_to_db(lat: float, lon: float, district_name: Optional[str], place_name: Optional[str], place_address: Optional[str]):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO queries (lat, lon, district, place_name, place_address, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);
            """, (lat, lon, district_name, place_name, place_address))
            conn.commit()
            cursor.close()
            conn.close()
            print("Logged query to DB")
        except Exception as e:
            print(f"Error logging query to DB: {e}")

def log_subscription_to_db(phone: str, lat: float, lon: float, language: str, status: str):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO subscriptions (phone, lat, lon, language, status, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP);
            """, (phone, lat, lon, language, status))
            conn.commit()
            cursor.close()
            conn.close()
            print("Logged subscription to DB")
        except Exception as e:
            print(f"Error logging subscription to DB: {e}")

def update_statewise_repository(lat: float, lon: float):
    district = find_nearest_district(lat, lon)
    if not district or not district.get("state"):
        return
    
    state_name = district["state"]
    soil_type = district.get("soil_type", "Unknown")
    primary_crops = district.get("primary_crops", [])
    
    # Get current weather
    try:
        weather_res = get_weather(lat, lon)
        weather_info = {
            "temperature": weather_res.get("temperature"),
            "description": weather_res.get("description"),
            "rain": weather_res.get("rain"),
            "relative_humidity": weather_res.get("relative_humidity")
        }
    except Exception:
        weather_info = {"temperature": 30.0, "description": "Sunny", "rain": 0.0, "relative_humidity": 50}
        
    # Generate water resources via Gemini
    water_resources = []
    if GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = (
                f"Identify the main agricultural water sources (rivers, dams, canals, or lakes) "
                f"providing irrigation to {district['name']} in {state_name}, India. "
                f"Return ONLY a JSON list of strings (e.g., [\"River A\", \"Dam B\"]). No explanation, no markdown blocks."
            )
            response = client.models.generate_content(model="gemini-2.5-flash", contents=[prompt])
            text = response.text.strip()
            # Clean markdown formatting if any
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()
            water_resources = json.loads(text)
        except Exception as e:
            print(f"Error calling Gemini for water resources: {e}")
            water_resources = ["Local Ground Water", "Monsoon Rainfed"]
    else:
        water_resources = ["Local Ground Water", "Monsoon Rainfed"]
        
    # Save/update statewise_repository in database
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO statewise_repository (state, crops, weather_data, soil_type, water_resources, last_updated)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (state) DO UPDATE 
                SET crops = EXCLUDED.crops,
                    weather_data = EXCLUDED.weather_data,
                    soil_type = EXCLUDED.soil_type,
                    water_resources = EXCLUDED.water_resources,
                    last_updated = CURRENT_TIMESTAMP;
            """, (
                state_name,
                json.dumps(primary_crops),
                json.dumps(weather_info),
                soil_type,
                json.dumps(water_resources)
            ))
            conn.commit()
            cursor.close()
            conn.close()
            print(f"Updated statewise repository for state: {state_name}")
        except Exception as e:
            print(f"Error saving to statewise_repository: {e}")


app = FastAPI(title="Bhumija API Backend", description="AI-Powered Super El Niño Resilience Engine Backend")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load vulnerable districts database
DISTRICTS_FILE = os.path.join(os.path.dirname(__file__), "data", "districts.json")
try:
    with open(DISTRICTS_FILE, "r") as f:
        districts_db = json.load(f)
except Exception as e:
    print(f"Error loading districts database: {e}")
    districts_db = []


def _safe_get(url: str, **kwargs):
    """Fetch with certifi first; fall back for local macOS SSL issues in dev."""
    kwargs.setdefault("timeout", 8)
    try:
        return requests.get(url, verify=certifi.where(), **kwargs)
    except requests.exceptions.SSLError:
        return requests.get(url, verify=False, **kwargs)


WEATHER_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail"
}

def find_nearest_district(lat: float, lon: float):
    if not districts_db:
        return None
    nearest = None
    min_dist = float("inf")
    for district in districts_db:
        # Simple Euclidean distance for local proximity
        dist = math.sqrt((district["lat"] - lat) ** 2 + (district["lon"] - lon) ** 2)
        if dist < min_dist:
            min_dist = dist
            nearest = district
    if not nearest:
        return None
    # Exact match within ~150 km
    if min_dist < 1.5:
        return nearest
    # Soft match for search/GPS locations outside curated zones
    return {**nearest, "approximateMatch": True}


def _district_name_matches(place_name: str, place_address: str, district: dict) -> bool:
    haystack = f"{place_name} {place_address}".lower()
    district_name = district["name"].lower().split("(")[0].strip()
    place_lower = place_name.lower().strip()
    return place_lower in district_name or district_name in haystack


def _resolve_search_coordinates(
    place_name: str,
    place_address: str,
    item: dict,
    matched_district: Optional[dict],
) -> tuple[Optional[float], Optional[float]]:
    """Resolve lat/lon for search hits — prefer geocode for cities when autosuggest omits coords."""
    latitude = item.get("latitude") or item.get("lat")
    longitude = item.get("longitude") or item.get("lng") or item.get("lon")
    place_type = (item.get("type") or "").upper()

    if latitude is None or longitude is None:
        if matched_district and _district_name_matches(place_name, place_address, matched_district):
            return matched_district["lat"], matched_district["lon"]
        return _geocode_place(place_name, place_address)

    # Autosuggest often misplaces city centroids — prefer geocode for cities
    if place_type in {"CITY", "STATE", "SUBCITY", "TOWN", "VILLAGE"} or len(place_name.split()) <= 2:
        geo_lat, geo_lon = _geocode_place(place_name, place_address)
        if geo_lat is not None and geo_lon is not None:
            return geo_lat, geo_lon

    return float(latitude), float(longitude)


def _match_local_district(place_name: str, place_address: str = ""):
    """Match MapMyIndia place names to curated vulnerable districts."""
    haystack = f"{place_name} {place_address}".lower()
    place_lower = place_name.lower().strip()

    for district in districts_db:
        district_name = district["name"].lower()
        district_short = district_name.split("(")[0].strip()
        state_name = district["state"].lower()
        region_name = district["region"].lower()

        if place_lower in district_name or district_short in haystack:
            return district
        if region_name in haystack and (place_lower in district_name or district_short in place_lower):
            return district
        if state_name in haystack and district_short in place_lower:
            return district
    return None


def _geocode_open_meteo(name: str):
    """Fallback geocoder (free) when MapMyIndia geocode fails."""
    try:
        response = _safe_get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": name, "count": 1, "language": "en"},
            timeout=8,
        )
        if response.status_code != 200:
            return None, None
        hits = response.json().get("results") or []
        if not hits:
            return None, None
        hit = hits[0]
        return float(hit["latitude"]), float(hit["longitude"])
    except Exception as exc:
        print(f"Open-Meteo geocode warning for '{name}': {exc}")
    return None, None


def _geocode_place(place_name: str, place_address: str = ""):
    """Resolve coordinates via MapMyIndia, then Open-Meteo."""
    for query in (
        f"{place_name}, {place_address}, India".strip(", "),
        f"{place_name}, India",
        place_name,
    ):
        lat, lon = _geocode_mappls_address(query)
        if lat is not None and lon is not None:
            return lat, lon
    return _geocode_open_meteo(place_name)


def _geocode_mappls_address(address: str):
    """Resolve a free-text Indian address to coordinates via MapMyIndia geocoding."""
    try:
        response = _safe_get(
            "https://search.mappls.com/search/address/geocode",
            params={"address": address, "access_token": MAPMYINDIA_API_KEY},
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        cop = payload.get("copResults") or payload.get("results") or {}
        lat = cop.get("latitude") or cop.get("lat")
        lon = cop.get("longitude") or cop.get("lng") or cop.get("lon")
        if lat is not None and lon is not None:
            return float(lat), float(lon)
    except Exception as exc:
        print(f"MapMyIndia geocode warning for '{address}': {exc}")
    return None, None


def _gather_farm_context(lat: float, lon: float):
    district = find_nearest_district(lat, lon)
    weather = get_weather(lat, lon)
    agro = (
        get_location_insights(AGROMONITORING_API_KEY, lat, lon)
        if AGROMONITORING_API_KEY
        else {"available": False}
    )
    return district, weather, agro


def _gemini_generate(prompt: str, image: Optional[Image.Image] = None) -> Optional[str]:
    if not GEMINI_API_KEY:
        return None
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        payload: list = [prompt]
        if image:
            payload.append(image)
        response = client.models.generate_content(model="gemini-2.5-flash", contents=payload)
        return response.text
    except Exception as exc:
        print(f"Gemini error: {exc}")
        return None


def _localize_with_gemini(text_en: str, language: str) -> str:
    if language == "en" or not text_en:
        return text_en
    lang_names = {"hi": "Hindi", "te": "Telugu", "mr": "Marathi", "kn": "Kannada"}
    prompt = (
        f"Translate the following agricultural advisory into simple {lang_names.get(language, language)} "
        f"for small Indian farmers. Keep it short and practical:\n\n{text_en}"
    )
    translated = _gemini_generate(prompt)
    return translated or text_en


@app.get("/api/config")
def get_config():
    """Returns public frontend configuration (MapMyIndia key for map SDK)."""
    return {
        "mapmyindia_key": MAPMYINDIA_API_KEY,
        "gemini_configured": bool(GEMINI_API_KEY),
        "agro_configured": bool(AGROMONITORING_API_KEY),
        "supported_languages": SUPPORTED_LANGUAGES,
        "twilio_configured": twilio_configured(),
    }


@app.get("/api/agro/insights")
def agro_insights(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Agromonitoring agriculture intelligence: NDVI, soil, weather, monsoon rainfall."""
    if not AGROMONITORING_API_KEY:
        raise HTTPException(status_code=503, detail="Agromonitoring API key not configured")
    return get_location_insights(AGROMONITORING_API_KEY, lat, lon)


@app.get("/api/agro/district-overlay")
def agro_district_overlay():
    """District-level agro metrics for map overlay coloring (soil stress, monsoon rain)."""
    if not AGROMONITORING_API_KEY:
        return {"available": False, "metrics": []}
    metrics = get_district_metrics(AGROMONITORING_API_KEY, districts_db)
    return {"available": True, "metrics": metrics}


@app.get("/api/farmer/crop-recommend")
def crop_recommend(
    lat: float = Query(...),
    lon: float = Query(...),
    lang: str = Query("en", description="Language code: en, hi, te, mr, kn"),
):
    """Smart crop recommendation using satellite NDVI, soil moisture, and monsoon data."""
    district, weather, agro = _gather_farm_context(lat, lon)
    result = recommend_crops(district, agro, weather, lang)
    for rec in result["recommendations"]:
        rec["reason"] = _localize_with_gemini(rec.pop("reason_en"), lang)
    result["summary"] = _localize_with_gemini(result.pop("summary_en"), lang)
    result["crop_label"] = localize_text("crop_recommended", lang, "Recommended crop")
    return result


@app.get("/api/farmer/alerts")
def farmer_alerts(
    lat: float = Query(...),
    lon: float = Query(...),
    lang: str = Query("en"),
):
    """Real-time dry-spell alerts with irrigation/fertilization guidance and ground sensor data."""
    district, weather, agro = _gather_farm_context(lat, lon)
    result = generate_alerts(district, agro, weather, lang)
    for alert in result.get("alerts", []):
        alert["title"] = _localize_with_gemini(alert.pop("title_en"), lang)
        alert["message"] = _localize_with_gemini(alert.pop("message_en"), lang)
    irr = result.get("irrigation_guidance", {})
    if irr.get("action_en"):
        irr["action"] = _localize_with_gemini(irr.pop("action_en"), lang)
    fert = result.get("fertilization_guidance", {})
    if fert.get("action_en"):
        fert["action"] = _localize_with_gemini(fert.pop("action_en"), lang)
    if fert.get("note_en"):
        fert["note"] = _localize_with_gemini(fert.pop("note_en"), lang)
    return result


@app.post("/api/farmer/health-log")
async def farmer_health_log(
    lat: float = Form(...),
    lon: float = Form(...),
    notes: str = Form(""),
    lang: str = Form("en"),
    input_type: str = Form("text"),
    image: Optional[UploadFile] = File(None),
):
    """Crop health log with photo/voice AI diagnosis and Rythu Seva Kendra referral."""
    district, weather, agro = _gather_farm_context(lat, lon)
    pil_image = None
    if image:
        try:
            pil_image = Image.open(io.BytesIO(await image.read()))
        except Exception as exc:
            print(f"Health log image error: {exc}")

    prompt = (
        "You are an agricultural expert for Indian smallholder farmers. "
        "Diagnose crop/soil health from the farmer notes"
        + (" and uploaded field image" if pil_image else "")
        + ". Give a concise diagnosis and 3 actionable low-cost remedies.\n\n"
        f"Location: {district['name'] if district else f'Lat {lat}, Lon {lon}'}\n"
        f"Farmer notes: {notes or 'No notes provided'}"
    )
    diagnosis = _gemini_generate(prompt, pil_image)
    if not diagnosis:
        diagnosis = (
            "Monitor for drought stress (wilting, leaf curl). "
            "Apply mulch, check soil moisture, visit Rythu Seva Kendra if symptoms persist."
        )

    entry = create_health_log(
        lat, lon, district, notes, diagnosis, lang, input_type, bool(pil_image)
    )
    entry["diagnosis_localized"] = _localize_with_gemini(diagnosis, lang)
    return entry


@app.get("/api/farmer/health-logs")
def farmer_health_logs(limit: int = Query(10, ge=1, le=50)):
    return {"logs": list_health_logs(limit)}


@app.post("/api/farmer/sms-subscribe")
async def farmer_sms_subscribe(
    phone: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    lang: str = Form("hi"),
    place_name: Optional[str] = Form(None),
):
    """Register farmer phone for dry-spell SMS alerts in Indic languages."""
    cleaned = "".join(c for c in phone if c.isdigit())
    if len(cleaned) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    district, weather, agro = _gather_farm_context(lat, lon)
    result = subscribe_sms(
        cleaned,
        lat,
        lon,
        lang,
        district=district,
        weather=weather,
        agro=agro,
        place_name=place_name.strip() if place_name else None,
    )
    # Log subscription to Supabase
    log_subscription_to_db(cleaned, lat, lon, lang, result.get("delivery", "subscribed"))
    return result


@app.post("/api/farmer/voice-advisory")
async def farmer_voice_advisory(
    text: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    lang: str = Form("hi"),
):
    """Process voice input in Indic languages and return spoken advisory."""
    district, weather, agro = _gather_farm_context(lat, lon)
    alerts = generate_alerts(district, agro, weather, lang)
    base = build_voice_advisory(text, lang, district, agro, alerts)

    prompt = (
        f"You are Bhumija, a friendly agricultural advisor for Indian farmers. "
        f"Respond in {SUPPORTED_LANGUAGES.get(lang, 'English')} to this farmer query: {text}\n"
        f"Include irrigation and crop advice based on dry-spell risk."
    )
    gemini_reply = _gemini_generate(prompt)
    base["response"] = gemini_reply or _localize_with_gemini(base["advisory_en"], lang)
    return base


@app.get("/api/search")
def search_places(
    q: str = Query(..., min_length=1, description="Search query"),
    lat: Optional[float] = Query(None, description="Bias latitude"),
    lon: Optional[float] = Query(None, description="Bias longitude"),
):
    """Proxy MapMyIndia/Mappls autosuggest for Indian location search."""
    if not MAPMYINDIA_API_KEY:
        raise HTTPException(status_code=503, detail="MapMyIndia API key not configured")

    params = {
        "query": q,
        "access_token": MAPMYINDIA_API_KEY,
    }
    if lat is not None and lon is not None:
        params["location"] = f"{lat},{lon}"

    try:
        response = _safe_get(
            "https://search.mappls.com/search/places/autosuggest/json",
            params=params,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print(f"MapMyIndia search warning: {exc}")
        return {"query": q, "results": [], "fallback": True}

    results = []
    for item in data.get("suggestedLocations", [])[:8]:
        place_name = item.get("placeName") or item.get("keyword") or q
        place_address = item.get("placeAddress") or ""

        matched_district = _match_local_district(place_name, place_address)
        if matched_district and not _district_name_matches(place_name, place_address, matched_district):
            matched_district = None

        latitude, longitude = _resolve_search_coordinates(
            place_name, place_address, item, matched_district
        )

        if latitude is None or longitude is None:
            continue

        lat_f, lon_f = float(latitude), float(longitude)
        nearest_district = find_nearest_district(lat_f, lon_f)
        district_for_result = matched_district or nearest_district

        results.append(
            {
                "name": place_name,
                "address": place_address or place_name,
                "lat": lat_f,
                "lon": lon_f,
                "type": item.get("type") or "place",
                "source": "mapmyindia",
                "district_id": district_for_result.get("id") if district_for_result else None,
                "district_name": district_for_result.get("name") if district_for_result else None,
                "approximate_district": bool(
                    district_for_result and district_for_result.get("approximateMatch")
                ),
            }
        )

    if not results:
        latitude, longitude = _geocode_place(q.strip())
        if latitude is not None and longitude is not None:
            lat_f, lon_f = float(latitude), float(longitude)
            nearest_district = find_nearest_district(lat_f, lon_f)
            results.append(
                {
                    "name": q.strip().title(),
                    "address": "India",
                    "lat": lat_f,
                    "lon": lon_f,
                    "type": "geocode",
                    "source": "mapmyindia",
                    "district_id": nearest_district.get("id") if nearest_district else None,
                    "district_name": nearest_district.get("name") if nearest_district else None,
                    "approximate_district": bool(
                        nearest_district and nearest_district.get("approximateMatch")
                    ),
                }
            )

    return {"query": q, "results": results}


@app.get("/api/districts")
def get_districts():
    """Returns the list of 315 vulnerable districts (mocked with our high-quality curated dataset)"""
    return districts_db

@app.get("/api/weather")
def get_weather(lat: float = Query(..., description="Latitude"), lon: float = Query(..., description="Longitude")):
    """Proxies request to Open-Meteo to fetch live weather data for the coordinates"""
    # Log search and update statewise repository in database
    try:
        district = find_nearest_district(lat, lon)
        district_name = district["name"] if district else None
        log_query_to_db(lat, lon, district_name, None, None)
        update_statewise_repository(lat, lon)
    except Exception as e:
        print(f"Error updating statewise repository on weather fetch: {e}")

    try:
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
            f"&current_weather=true"
        )
        response = _safe_get(weather_url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if "current_weather" in data:
            cw = data["current_weather"]
            weather_code = int(cw.get("weathercode", 0))
            description = WEATHER_CODES.get(weather_code, "Unknown Weather")
            
            return {
                "temperature": cw.get("temperature"),
                "windspeed": cw.get("windspeed") or data.get("current", {}).get("wind_speed_10m"),
                "weathercode": weather_code,
                "description": description,
                "is_day": cw.get("is_day"),
                "rain": data.get("current", {}).get("rain", 0.0),
                "relative_humidity": data.get("current", {}).get("relative_humidity_2m", 50),
            }
        else:
            raise HTTPException(status_code=502, detail="Invalid response from weather service")
    except Exception as e:
        # Fallback weather data in case of API failure
        return {
            "temperature": 30.0,
            "windspeed": 10.0,
            "weathercode": 1,
            "description": "Mainly Clear (Offline Fallback)",
            "is_day": 1,
            "rain": 0.0,
            "relative_humidity": 55
        }

@app.get("/api/statewise-repository")
def get_statewise_repository():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT state, crops, weather_data, soil_type, water_resources, last_updated FROM statewise_repository ORDER BY state ASC;")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        repo_data = []
        for row in rows:
            repo_data.append({
                "state": row[0],
                "crops": row[1] if isinstance(row[1], list) else json.loads(row[1] or "[]"),
                "weather_data": row[2] if isinstance(row[2], dict) else json.loads(row[2] or "{}"),
                "soil_type": row[3],
                "water_resources": row[4] if isinstance(row[4], list) else json.loads(row[4] or "[]"),
                "last_updated": row[5].isoformat() if row[5] else None
            })
        return repo_data
    except Exception as e:
        print(f"Error fetching statewise repository: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_advisory(
    message: str = Form(..., description="User query"),
    lat: Optional[float] = Form(None, description="Latitude"),
    lon: Optional[float] = Form(None, description="Longitude"),
    lang: str = Form("en", description="Response language: en, hi, te, mr, kn"),
    conversation: Optional[str] = Form(None, description="JSON array of prior {role, content} turns"),
    image: Optional[UploadFile] = File(None, description="Optional soil or crop image"),
    authorization: Optional[str] = Header(None),
):
    """
    Conversational agricultural advisor with full farm context, multimodal images, and Indic languages.
    """
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.split(" ")[1].strip()
    if not api_key:
        api_key = GEMINI_API_KEY

    nearest_district = None
    weather_summary = "No weather data available."
    weather_context = None
    agro_summary = ""
    farmer_context = ""

    agro = {"available": False}
    if lat is not None and lon is not None:
        nearest_district, weather_context, agro = _gather_farm_context(lat, lon)
        if weather_context:
            weather_summary = (
                f"Temp: {weather_context['temperature']}°C, "
                f"Humidity: {weather_context.get('relative_humidity', 'N/A')}%, "
                f"Wind: {weather_context['windspeed']} km/h, Sky: {weather_context['description']}"
            )
        if agro.get("available"):
            veg = agro.get("vegetation") or {}
            soil = agro.get("soil") or {}
            monsoon = agro.get("monsoon") or {}
            agro_summary = (
                f"NDVI: {veg.get('ndvi', 'N/A')} ({veg.get('health', 'unknown')}). "
                f"Soil moisture: {soil.get('moisture_percent', 'N/A')}%. "
                f"90-day rain: {monsoon.get('accumulated_rainfall_90d_mm', 'N/A')} mm. "
                f"Yearly rain: {monsoon.get('accumulated_rainfall_365d_mm', 'N/A')} mm. "
                f"Forecast 72h rain: {monsoon.get('forecast_rainfall_72h_mm', 'N/A')} mm. "
                f"Monsoon: {monsoon.get('status', 'unknown')}."
            )

        crop_data = recommend_crops(nearest_district, agro, weather_context, lang)
        alert_data = generate_alerts(nearest_district, agro, weather_context, lang)
        top_crops = ", ".join(
            f"{r['crop']} ({r['suitability_score']}%)" for r in crop_data.get("recommendations", [])[:3]
        )
        alert_lines = "; ".join(
            a.get("title_en", a.get("title", "")) for a in alert_data.get("alerts", [])[:2]
        ) or "No critical alerts"
        irr = alert_data.get("irrigation_guidance", {}).get("action_en", "")
        fert = alert_data.get("fertilization_guidance", {}).get("action_en", "")

        farmer_context = (
            f"CROP RECOMMENDATIONS: {top_crops or 'Pending satellite data'}. "
            f"ACTIVE ALERTS: {alert_lines}. "
            f"IRRIGATION: {irr}. FERTILIZATION: {fert}."
        )

    pil_image = None
    if image:
        try:
            image_bytes = await image.read()
            pil_image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            print(f"Error reading uploaded image: {e}")

    history_block = ""
    if conversation:
        try:
            turns = json.loads(conversation)
            if isinstance(turns, list) and turns:
                lines = []
                for turn in turns[-8:]:
                    role = turn.get("role", "user")
                    content = (turn.get("content") or "")[:500]
                    lines.append(f"{role.upper()}: {content}")
                history_block = "CONVERSATION SO FAR:\n" + "\n".join(lines) + "\n\n"
        except json.JSONDecodeError:
            pass

    lang_name = SUPPORTED_LANGUAGES.get(lang, "English")

    if api_key and api_key not in ("null", "undefined"):
        try:
            client = genai.Client(api_key=api_key)

            system_prompt = (
                f"You are Bhumija, a warm conversational AI agronomist for Indian smallholder farmers. "
                f"Reply in {lang_name}. Keep answers practical, empathetic, and concise (3-6 short paragraphs max). "
                f"Continue the conversation naturally — refer to prior messages when relevant.\n\n"
            )

            if nearest_district:
                system_prompt += (
                    f"FARM CONTEXT:\n"
                    f"- Location: {nearest_district['name']}, {nearest_district['state']} ({nearest_district['region']})\n"
                    f"- El Niño risk: {nearest_district['risk_level']}\n"
                    f"- Soil: {nearest_district['soil_type']}\n"
                    f"- Primary crops: {', '.join(nearest_district['primary_crops'])}\n"
                    f"- Weather: {weather_summary}\n"
                    f"- Satellite/soil: {agro_summary or 'Unavailable'}\n"
                    f"- {farmer_context}\n\n"
                    f"LOCAL ADVISORIES:\n"
                    f"- Crop switching: {nearest_district['mitigation_advisories']['crop_switching']}\n"
                    f"- Moisture: {nearest_district['mitigation_advisories']['moisture_conservation']}\n"
                    f"- Water harvesting: {nearest_district['mitigation_advisories']['water_harvesting']}\n\n"
                )
            elif lat is not None and lon is not None:
                system_prompt += (
                    f"FARM CONTEXT:\n"
                    f"- Coordinates: {lat}, {lon}\n"
                    f"- Weather: {weather_summary}\n"
                    f"- Satellite/soil: {agro_summary or 'Unavailable'}\n"
                    f"- {farmer_context}\n\n"
                )

            system_prompt += history_block

            if pil_image:
                system_prompt += (
                    "The farmer uploaded a field photo (crop, soil, or irrigation). "
                    "Analyze it carefully and tie your advice to the location context above.\n\n"
                )

            system_prompt += (
                "PROTOCOLS: Recommend drought-resilient millets/pulses in high-risk zones; "
                "give low-cost irrigation and mulching tips; explain drought-flood paradox when useful.\n\n"
                f"FARMER'S LATEST MESSAGE: {message}"
            )

            payload = [system_prompt]
            if pil_image:
                payload.append(pil_image)

            response = client.models.generate_content(model="gemini-2.5-flash", contents=payload)

            return {
                "response": response.text,
                "location_context": {
                    "district": nearest_district["name"] if nearest_district else "Unknown District",
                    "region": nearest_district["region"] if nearest_district else "Unknown Region",
                    "risk_level": nearest_district["risk_level"] if nearest_district else "Medium",
                }
                if nearest_district
                else None,
                "weather_context": weather_context,
            }
        except Exception as e:
            print(f"Gemini API Execution Error: {e}")

    # Rule-based fallback
    fallback_response = ""
    if nearest_district:
        fallback_response = (
            f"### 🌾 Bhumija Expert Advisory for {nearest_district['name']} ({nearest_district['state']})\n\n"
            f"Hello Farmer! Since you are located in the **{nearest_district['region']}** region, which is a **{nearest_district['risk_level']} Risk** zone for El Niño drought, here is your immediate action plan:\n\n"
            f"#### ☀️ Current Weather Context\n"
            f"- **Sky Condition**: {weather_context['description'] if weather_context else 'Sunny'}\n"
            f"- **Temperature**: {weather_context['temperature'] if weather_context else '30'}°C\n"
            f"- **Soil Type**: {nearest_district['soil_type']}\n\n"
            f"#### 🔄 1. Crop Switching Strategy\n"
            f"Your typical crops are {', '.join(nearest_district['primary_crops'])}. Under current Super El Niño conditions, we highly recommend:\n"
            f"- **{nearest_district['mitigation_advisories']['crop_switching']}**\n\n"
            f"#### 💧 2. Soil Moisture Conservation\n"
            f"To protect your crops from drying up, implement these low-cost methods immediately:\n"
            f"- **{nearest_district['mitigation_advisories']['moisture_conservation']}**\n"
            f"- Apply a 5-8 cm layer of straw, dry leaves, or crop residue (mulch) around the base of your plants to reduce water evaporation by up to 40%.\n\n"
            f"#### 🌧️ 3. Managing the Drought-Flood Paradox\n"
            f"El Niño causes long dry spells followed by sudden, extremely heavy rain. Parched soil cannot absorb this water, leading to flash floods. Prepare now:\n"
            f"- **{nearest_district['mitigation_advisories']['water_harvesting']}**\n"
            f"- Dig simple, shallow trenches across slopes to slow down rainwater, allowing it to sink into the ground rather than washing away your topsoil.\n\n"
        )
    else:
        fallback_response = (
            f"### 🌾 Bhumija General Expert Advisory\n\n"
            f"Hello Farmer! Based on your coordinates (Lat {lat:.4f}, Lon {lon:.4f}), here is your immediate resilient action plan:\n\n"
            f"#### 🔄 1. Crop Switching Strategy\n"
            f"- If rains are delayed by more than 2-3 weeks, avoid planting long-duration crops like cotton or rice.\n"
            f"- Switch immediately to short-duration pulses (green gram, black gram) or drought-hardy millets (Bajra, Ragi).\n\n"
            f"#### 💧 2. Soil Moisture Conservation\n"
            f"- Apply straw or dry grass mulching in your fields to cover the soil. This traps moisture and keeps the roots cool.\n"
            f"- If possible, use drip or sprinkler irrigation during early morning or late evening to minimize water loss.\n\n"
            f"#### 🌧️ 3. Managing the Drought-Flood Paradox\n"
            f"- Dig small farm ponds (20m x 20m x 3m) at the lowest point of your land to catch sudden heavy rain showers.\n"
            f"- Create field bunds (small mud walls) to hold water in the field and prevent topsoil erosion during sudden cloudbursts.\n\n"
        )

    if pil_image:
        fallback_response += (
            "\n---\n"
            "#### 📸 Image Analysis Note\n"
            "*(Note: You have uploaded a field image. To get a detailed visual diagnosis of your crop/soil using AI, "
            "please enter a valid Gemini API Key in the sidebar. Our rule-based expert system has analyzed your location parameters instead.)*"
        )
    else:
        fallback_response += (
            "\n---\n"
            "*(Note: To activate full interactive AI conversations with Bhumija, please enter a valid Gemini API Key in the sidebar.)*"
        )

    return {
        "response": fallback_response,
        "location_context": {
            "district": nearest_district["name"] if nearest_district else "Unknown District",
            "region": nearest_district["region"] if nearest_district else "Unknown Region",
            "risk_level": nearest_district["risk_level"] if nearest_district else "Medium"
        } if nearest_district else None,
        "weather_context": weather_context
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
