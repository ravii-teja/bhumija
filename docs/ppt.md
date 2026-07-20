---
title: Bhumija — El Niño Resilience Engine
subtitle: 9-Slide Presentation
author: Team Rocket
date: July 2026
---

<!-- SLIDE 1 -->
# The Problem & Our Approach

## Overcoming Micro-Climate Blindness

**The Problem:**
Farmers face catastrophic crop failures due to unpredictable monsoons and a lack of data-driven guidance. Traditional choices rely on habit or hearsay rather than crucial localized metrics like soil health, groundwater depth, or rainfall data, leading to wasted resources and financial devastation during El Niño events.

**How We Tackle It:**
Bhumija is a voice-and-SMS agricultural intelligence platform built in Indic languages for small and marginal farmers. We replace guesswork with data by bringing satellite and soil insights directly to the farmer, delivering real-time dry-spell alerts, crop recommendations, and pest diagnosis.

---

<!-- SLIDE 2 -->
# The Bhumija Solution

## Connecting Data to the Field
**Product Link:** https://bhumija-phi.vercel.app/

**How We Are Solving It:**
We built a smart crop recommendation engine and a real-time advisory system that alerts farmers about local dry spells and provides irrigation/fertilization guidance before crops fail.

**Data Points Gathered & Combined:**
- **Satellite & Weather Data:** Rainfall tracking, temperature, and Open-Meteo climate data.
- **Soil & Ground Sensor Data:** Soil moisture, vegetation health (NDVI).
- **Agricultural Knowledge:** Seasonal patterns, drought-resilient crop suitability, and historical sowing trends.
*By unifying these layers through Google Gemini AI, Bhumija delivers precise, location-aware agronomic intelligence.*

---

<!-- SLIDE 3 -->
# Process Flow

## From Satellite to Action

1. **Location Capture:** Farmer accesses the app via mobile/desktop; GPS or map click captures precise coordinates.
2. **Data Aggregation:** The backend fetches real-time weather, soil metrics, and historical rainfall for that exact micro-climate.
3. **AI Analysis:** Google Gemini processes the geospatial data alongside current agricultural rules to generate tailored recommendations.
4. **Actionable Delivery:** Insights are delivered via an interactive map, Voice/Text Chat in native Indic languages, and SMS.
5. **Expert Handoff:** For complex issues like crop health logging via photo, the platform connects farmers to Rythu Seva Kendras for professional follow-up.

---

<!-- SLIDE 4 -->
# How to Use Bhumija: Geospatial & Visual Insights

## Precise Field-Level Intelligence

**Map Visuals & Geolocation Based Insights:**
- **Density Heatmap Sowing:** Instant visual tracking of 315 El Niño vulnerable districts mapped as a color-graded density heatmap on initial load to avoid clutter.
- **Interactive Circle Overlays:** Tapping, pinning, or searching for a location clears the heatmap and centers a clean, unified risk circle overlay exactly at the selected coordinate.
- **High-Accuracy Geolocation:** GPS-assisted coordinate query running with raw hardware querying (`maximumAge: 0`) for pin-point accuracy on the map.
- **Hyper-Local Metrics Dashboard:** View 90-day/365-day rainfall accumulation, vegetation stress (NDVI), and current temperatures specific to your plot.

---

<!-- SLIDE 5 -->
# How to Use Bhumija: The AI Assistant

## Voice & Text Chat Interface

**Bhumija Assistant (Crisis Mode):**
- **Native Language Support:** Chat seamlessly in English, Hindi, Telugu, Marathi, or Kannada. 
- **Voice-Enabled:** No typing required! Use the microphone to ask questions naturally ("What should I sow this week?").
- **Visual Diagnosis:** Upload a photo of stressed crops, leaves, or dry soil directly into the chat. The Gemini vision model instantly analyzes the image and suggests remedies or connects you with a Rythu Seva Kendra.

---

<!-- SLIDE 6 -->
# How to Use Bhumija: Actionable Advice

## Real-Time Insights & Smart Alerts

**Making Data-Driven Decisions:**
- **Smart Crop Picks:** Get immediate suggestions for short-duration or drought-resilient crops (like Bajra, Tur, Moong) based on the live moisture profile of your soil.
- **Database-Backed Advisories:** Recommendations incorporate localized historical yield statistics (t/ha) and acreage from a 455k-row crop production database.
- **In-App Alerts:** Receive dynamic "red/yellow/green" risk badges alerting you to upcoming dry spells.
- **Irrigation Guidance:** The platform tells you exactly when to deploy protective measures like mulching or drip irrigation, ensuring every drop of water is conserved.

---

<!-- SLIDE 7 -->
# Forecasting Alerts via SMS

## Reaching the Unconnected

**No Smartphone? No Problem:**
- **Automated Mobile Alerts:** Farmers can subscribe by entering their phone number on the dashboard.
- **Proactive Forecasting:** The system sends out compact, one-segment SMS alerts via Twilio directly to the farmer's mobile phone.
- **Comprehensive SMS Content:** A single message contains the location summary, 72-hour rainfall forecast, the top recommended crop, a weekly agricultural hint, and a direct referral to the nearest Rythu Seva Kendra.

---

<!-- SLIDE 8 -->
---

<!-- SLIDE 8 -->
# Government Dashboard & Contingency Directives

## Data-Driven District Contingency & Resource Allocation

**Governance Mode Portal:**
- **Dynamic Risk & Loss KPI Indicators**: Displays El Niño Predicted Loss (₹ Crores), estimated impacted farmers, and potential savings (₹ Crores) based on district risk profiles.
- **Reservoir Capacity & Outlook Tracker**: Graphical comparison of reservoir storage levels (previous year, current, and 3-month outlook under El Niño).
- **Location-to-Crop Database Integration**: Connects district data directly to a 455k-row historical database since 2010 for seasonal acreage and yield trends.
- **Interactive Checklists**: Tailored action steps for District Collectors and Field Workers to track mitigation tasks.

---

<!-- SLIDE 9 -->
# Tech Stack Overview

## A Modern, Scalable Architecture

- **Frontend:** React 18, Vite, and Tailwind CSS for a fast, mobile-responsive UI. Interactive map layers powered by MapMyIndia (Mappls) and Leaflet.
- **Backend:** FastAPI (Python) running as a serverless backend.
- **Database & Storage:** Supabase PostgreSQL storing queries, statewise repositories, and historical crop data (using `psycopg2`).
- **AI & Intelligence:** Google Gemini 2.5 Flash for chat, voice, vision, and dynamic administrative directives.
- **Performance & Delivery:** In-memory autocomplete search caching; 2-decimal rounded coordinate response cache (weather, agromonitoring, crop recommendations, and governance insights); Open-Meteo for telemetry; Twilio for SMS; Vercel for hosting.

---

<!-- SLIDE 9 -->
# Team Rocket

## The Builders

**Ravi Teja Bankupalli**  
**Karunakara Reddy**

*Protecting Kharif. Empowering farmers. Building food resilience against El Niño through accessible AI and data.*
