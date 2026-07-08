import os
import json
import math
import io
import requests
import certifi
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from google import genai

load_dotenv()

MAPMYINDIA_API_KEY = os.getenv("MAPMYINDIA_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

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
    # If the nearest district is within 1.5 degrees (~150km), consider it a match
    if min_dist < 1.5:
        return nearest
    return None


def _match_local_district(place_name: str, place_address: str = ""):
    """Match MapMyIndia place names to curated vulnerable districts."""
    haystack = f"{place_name} {place_address}".lower()
    state_hint = place_address.strip().lower()

    for district in districts_db:
        district_name = district["name"].lower()
        state_name = district["state"].lower()
        region_name = district["region"].lower()

        if state_hint and state_hint not in {state_name, region_name} and state_hint not in haystack:
            continue

        aliases = [district_name, state_name, region_name]
        if any(alias and alias in haystack for alias in aliases):
            return district
        if district_name.split("(")[0].strip() in haystack and (not state_hint or state_hint == state_name):
            return district
    return None


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


@app.get("/api/config")
def get_config():
    """Returns public frontend configuration (MapMyIndia key for map SDK)."""
    return {
        "mapmyindia_key": MAPMYINDIA_API_KEY,
        "gemini_configured": bool(GEMINI_API_KEY),
    }


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
        latitude = item.get("latitude") or item.get("lat")
        longitude = item.get("longitude") or item.get("lng") or item.get("lon")

        matched_district = _match_local_district(place_name, place_address)

        if latitude is None or longitude is None:
            if matched_district:
                latitude = matched_district["lat"]
                longitude = matched_district["lon"]
            else:
                geocode_query = f"{place_name}, {place_address}, India".strip(", ")
                latitude, longitude = _geocode_mappls_address(geocode_query)

        if latitude is None or longitude is None:
            continue

        results.append(
            {
                "name": place_name,
                "address": place_address or place_name,
                "lat": float(latitude),
                "lon": float(longitude),
                "type": item.get("type") or "place",
                "district_id": matched_district["id"] if matched_district else None,
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

@app.post("/api/chat")
async def chat_advisory(
    message: str = Form(..., description="User query"),
    lat: Optional[float] = Form(None, description="Latitude"),
    lon: Optional[float] = Form(None, description="Longitude"),
    image: Optional[UploadFile] = File(None, description="Optional soil or crop image"),
    authorization: Optional[str] = Header(None)
):
    """
    Handles agricultural queries, using Gemini 2.5 Flash if an API key is available.
    Falls back to a highly sophisticated rule-based expert agronomist system if no key is found.
    """
    # 1. Resolve Gemini API Key
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.split(" ")[1].strip()
    if not api_key:
        api_key = GEMINI_API_KEY

    # 2. Gather context (District & Weather)
    nearest_district = None
    weather_summary = "No weather data available."
    weather_context = None
    
    if lat is not None and lon is not None:
        nearest_district = find_nearest_district(lat, lon)
        weather_data = get_weather(lat, lon)
        weather_context = weather_data
        weather_summary = f"Temp: {weather_data['temperature']}°C, Wind: {weather_data['windspeed']} km/h, Sky: {weather_data['description']}"

    # 3. Handle image upload if present
    pil_image = None
    if image:
        try:
            image_bytes = await image.read()
            pil_image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            print(f"Error reading uploaded image: {e}")

    # 4. Generate response
    if api_key and api_key != "null" and api_key != "undefined":
        try:
            # Initialize official Google GenAI Client
            client = genai.Client(api_key=api_key)
            
            # Construct a rich system prompt
            system_prompt = (
                "You are Bhumija, an AI Crisis Agronomist specializing in Indian Super El Niño mitigation. "
                "Your mission is to provide free, lightweight, hyper-local, and practical advice to smallholder farmers. "
                "Use simple, direct, and empathetic language. Structure your response with clear headings and bullet points.\n\n"
            )
            
            if nearest_district:
                system_prompt += (
                    f"CONTEXT:\n"
                    f"- Location: {nearest_district['name']}, {nearest_district['state']} (Region: {nearest_district['region']})\n"
                    f"- El Niño Vulnerability Risk Level: {nearest_district['risk_level']}\n"
                    f"- Soil Type: {nearest_district['soil_type']}\n"
                    f"- Typical Primary Crops: {', '.join(nearest_district['primary_crops'])}\n"
                    f"- Live Weather: {weather_summary}\n\n"
                    f"CRITICAL LOCAL ADVISORIES:\n"
                    f"- Crop Switching: {nearest_district['mitigation_advisories']['crop_switching']}\n"
                    f"- Soil Moisture Conservation: {nearest_district['mitigation_advisories']['moisture_conservation']}\n"
                    f"- Water Harvesting: {nearest_district['mitigation_advisories']['water_harvesting']}\n\n"
                )
            else:
                system_prompt += (
                    f"CONTEXT:\n"
                    f"- Location Coordinates: Lat {lat}, Lon {lon}\n"
                    f"- Live Weather: {weather_summary}\n\n"
                )

            system_prompt += (
                "CRITICAL PROTOCOLS:\n"
                "1. If the farmer is in a high-risk arid zone (Marathwada, Vidarbha, Rayalaseema, Bundelkhand, Western Rajasthan), "
                "always guide them toward short-duration, drought-resilient alternatives like Millets (Ragi, Bajra, Jowar) or Pulses (Tur, Mung, Urad).\n"
                "2. If an image is provided, analyze it carefully (e.g., dry/cracked soil, pest-infested leaves, wilted crops) and give actionable, low-cost remedies.\n"
                "3. Educate the farmer about the 'Drought-Flood Paradox': recommend farm-ponds, trenches, or bunding to capture sudden, intense cloudbursts safely.\n"
                "4. Keep recommendations highly practical, low-cost, and tailored to Indian farming conditions.\n\n"
                f"Farmer Query: {message}"
            )

            payload = [system_prompt]
            if pil_image:
                payload.append(pil_image)

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=payload
            )
            
            return {
                "response": response.text,
                "location_context": {
                    "district": nearest_district["name"] if nearest_district else "Unknown District",
                    "region": nearest_district["region"] if nearest_district else "Unknown Region",
                    "risk_level": nearest_district["risk_level"] if nearest_district else "Medium"
                } if nearest_district else None,
                "weather_context": weather_context
            }
        except Exception as e:
            print(f"Gemini API Execution Error: {e}")
            # Fall back to rule-based system if Gemini fails

    # 5. Rule-Based Fallback System (Expert Agronomist)
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
