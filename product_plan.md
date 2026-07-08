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

6. CORE PROGRAMMING LIBRARIES (PYTHON TECH STACK)
--------------------------------------------------------------------------------
Add these dependencies to your Cursor `requirements.txt`:
* streamlit           - For building the responsive, browser-ready dashboard.
* streamlit-folium    - A free wrapper linking interactive maps to Streamlit.
* folium              - Generates responsive maps based on OpenStreetMap.
* google-genai        - The official SDK to execute multimodal Gemini prompts.
* pillow              - Handles incoming image manipulation (soil/crop uploads).
* requests            - Executes fast API fetches to the live weather network.

7. APP ARCHITECTURE & IMPLEMENTATION SCRIPT (`app.py`)
--------------------------------------------------------------------------------
```python
import streamlit as st
import folium
from streamlit_folium import st_folium
from google import genai
from PIL import Image
import requests

st.set_page_config(page_title="Bhumija", page_icon="🌾", layout="centered")

# 1. API Authentication
api_key = st.sidebar.text_input("Enter Free Gemini API Key", type="password")
client = genai.Client(api_key=api_key) if api_key else None

if not api_key:
    st.warning("👈 Please enter your free Gemini API key in the sidebar to activate Bhumija.")

st.title("🌾 Bhumija: El Niño Resilience Engine")
st.markdown("---")

# 2. Interactive Map Layer
st.subheader("📍 1. Select Farm Location on India Map")
india_map = folium.Map(location=[20.5937, 78.9629], zoom_start=5)
india_map.add_child(folium.LatLngPopup())
map_data = st_folium(india_map, height=350, width=700)

lat, lon, weather_summary = None, None, "No location selected."

if map_data and map_data.get("last_clicked"):
    lat = map_data["last_clicked"]["lat"]
    lon = map_data["last_clicked"]["lng"]
    st.success(f"Location Captured: Lat {lat:.4f}, Lon {lon:.4f}")
    
    # Fetch live weather (Free, No API Key Required)
    try:
        weather_url = f"https://open-meteo.com{lat}&longitude={lon}&current_weather=true"
        w_res = requests.get(weather_url).json()
        if "current_weather" in w_res:
            cw = w_res["current_weather"]
            weather_summary = f"Temp: {cw['temperature']}°C, WindSpeed: {cw['windspeed']} km/h"
            st.info(f"☀️ Current Weather: {weather_summary}")
    except Exception:
        weather_summary = "Weather service temporarily offline."

# 3. Multimodal Image Layer
st.subheader("📸 2. Upload Crop, Leaves, or Soil Image")
uploaded_file = st.file_uploader("Upload field imagery for visual diagnosis", type=["jpg", "jpeg", "png"])
image = Image.open(uploaded_file) if uploaded_file else None
if image:
    st.image(image, caption="Uploaded Field Image", use_container_width=True)

# 4. Interactive Chat Interface Layer (Bhumija Crisis Mode)
st.subheader("💬 3. Chat with Bhumija AI")

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

if user_query := st.chat_input("Ask about crop switching, emergency sowing, or water storage..."):
    with st.chat_message("user"):
        st.write(user_query)
    st.session_state.messages.append({"role": "user", "content": user_query})

    if client:
        # Structured system rule for Super El Niño tracking
        elnino_crisis_prompt = (
            "You are Bhumija, an AI Crisis Agronomist specializing in Indian Super El Niño mitigation. "
            f"The farmer is located at Latitude: {lat}, Longitude: {lon}. "
            f"The current live weather status is: {weather_summary}. "
            "CRITICAL PROTOCOLS: "
            "1. If the coordinates place the farmer in high-risk arid zones (Marathwada, Vidarbha, Rayalaseema, Bundelkhand, Western Rajasthan), "
            "   immediately guide them toward short-duration, drought-resilient alternatives like Millets (Ragi, Bajra, Jowar) or Pulses. "
            "2. If an image shows dry, parched soil, give actionable micro-irrigation, mulching, or hydrogel instructions. "
            "3. Educate the farmer about the Drought-Flood Paradox: recommend farm-ponds or water harvesting trenches to catch "
            "   sudden flash cloudbursts safely. "
            f"Farmer Input: {user_query}"
        )
        
        payload = [elnino_crisis_prompt]
        if image:
            payload.append(image)

        with st.chat_message("assistant"):
            with st.spinner("Analyzing agricultural parameters..."):
                try:
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=payload
                    )
                    st.write(response.text)
                    st.session_state.messages.append({"role": "assistant", "content": response.text})
                except Exception as e:
                    st.error(f"Execution Error: {e}")
```

8. DEPLOYMENT & SHARING PIPELINE
--------------------------------------------------------------------------------
* Git Repository Name: bhumija: 
* Free Deployment Platform: Streamlit Community Cloud (linked to public GitHub)
* Expected Endpoint URL Structure: https://streamlit.app
ensure that we are able to run it at low cost, use free apis where possible, 
