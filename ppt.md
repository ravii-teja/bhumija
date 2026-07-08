---
title: Bhumija — El Niño Resilience Engine
subtitle: 10-Slide Deck (export to PDF via Marp, Slidev, or Google Slides)
author: Bhumija Team
date: July 2026
---

<!-- SLIDE 1: TITLE -->

# Bhumija
## Born of the Earth

**AI-powered drought resilience for Indian farmers**

Free · Map-first · Voice · SMS · Indic languages

*Hackathon / Demo deck — one section = one slide*

---

<!-- SLIDE 2: PROBLEM -->

# The Problem

## Super El Niño & India's Kharif Crisis

| Challenge | Impact |
|-----------|--------|
| **Deficient / delayed monsoon** | Failed Kharif sowing; Rabi deficits follow |
| **Micro-climate blindness** | State-level forecasts miss district rain shadows |
| **Drought–flood paradox** | Dry soil cannot absorb sudden cloudbursts → flash runoff |
| **Late advisories** | Paper/SMS chains reach farmers weeks after soil changes |
| **Digital divide** | Smallholders lack smartphones literacy & English-only apps |

**Who suffers most:** Rainfed farmers in Marathwada, Vidarbha, Rayalaseema, Rajasthan, Bundelkhand — **86% of India's farmers are small & marginal.**

**Food security link:** Crop failure → rural distress → higher import pressure on pulses, oilseeds, and cereals.

---

<!-- SLIDE 3: SOLUTION -->

# What Bhumija Does

## A free digital shield for rainfed agriculture

**Bhumija** turns satellite, weather, and soil signals into **actionable farm advice** at the **plot level**.

| Capability | Farmer benefit |
|------------|----------------|
| **Interactive map** | See El Niño risk zones, monsoon & soil overlays |
| **Hyper-local metrics** | 90d/365d rain, soil moisture, NDVI, crop fit |
| **Smart crop picks** | Drought-resilient alternatives (Bajra, Tur, Moong…) |
| **Dry-spell alerts** | Irrigation & mulching guidance before stress |
| **AI Assistant** | Chat, voice, photo upload in **5 Indic languages** |
| **SMS alerts (Twilio)** | One compact message: location, rain, crop, weekly plan, RSK |
| **RSK referral** | Link to nearest **Rythu Seva Kendra** for expert follow-up |

**Tagline:** *Right crop · Right time · Right water — before the dry spell wins.*

---

<!-- SLIDE 4: IMPACT -->

# Impact on El Niño & Food Shortages

## From climate shock to informed action

```
El Niño weakens monsoon
        ↓
Soil moisture drops · NDVI stress
        ↓
Bhumija detects risk (map + APIs)
        ↓
Farmer gets crop switch + irrigation plan
        ↓
Reduced crop loss · Better water use · Food stability
```

| Without Bhumija | With Bhumija |
|-----------------|--------------|
| Sow water-heavy cotton/soy in dry year | Switch to **short-duration millets & pulses** |
| Flood-irrigate during dry spell | **Drip/mulch** timing from soil + 72h rain |
| Learn too late from block office | **Instant SMS + AI** at farm coordinates |
| No expert path | **RSK phone** in every alert |

**Scale target:** 16 curated high-risk districts today → 315 vulnerable districts roadmap.

**Potential outcomes:** Lower preventable Kharif losses, improved pulse self-sufficiency, fewer distress migrations.

---

<!-- SLIDE 5: HOW TO USE (FARMER) -->

# How to Use — Farmer Journey

## 5 steps on phone or desktop

1. **Open** → http://localhost:3000 (or your Vercel URL)
2. **Find your farm**
   - Search any **city or village** (e.g. Pune, Aurangabad)
   - Or tap a **colored district circle**, **drop a pin**, or use **GPS**
3. **Read the metrics card** — monsoon rain, soil, weather, vegetation, best crop, risk badge (red / yellow / blue)
4. **Open Bhumija Assistant**
   - Ask in **Hindi, Telugu, Marathi, Kannada, or English**
   - Use **mic** (Chrome) or **upload a field photo**
5. **Subscribe to SMS** — enter mobile → tap **Alerts** → receive **one** holistic advisory SMS

**Mobile:** Bottom nav **Map | Assistant** · Metrics auto-expand when location is selected.

---

<!-- SLIDE 6: HOW TO USE (DEMO) -->

# Demo Script (3 minutes)

| Step | Action | Show |
|------|--------|------|
| 0:00 | Search **Pune** → select **City** | Map centers; metrics populate |
| 0:30 | Toggle overlay **Monsoon** / **Soil** | District colors update |
| 1:00 | Open **Assistant** | Top crop + 72h rain chips |
| 1:30 | Ask: *"What should I sow this week?"* | Gemini or rule-based reply with location context |
| 2:00 | Enter phone → **Alerts** | Single SMS: rain, Bajra, weekly hint, RSK |
| 2:30 | Tap **Aurangabad** district | El Niño high-risk zone + Marathwada crops |

**Fallback if Gemini quota exceeded:** Rule-based expert mode still answers with district + weather + crop data.

---

<!-- SLIDE 7: TECH STACK -->

# Tech Stack

## Modern, free-tier-friendly architecture

```
┌─────────────────────────────────────────────────────────┐
│  React 18 + Vite + Tailwind  │  Mappls Web SDK (map)    │
│  BhumijaAssistant · SearchBar · MapLocationMetrics      │
└───────────────────────────┬─────────────────────────────┘
                            │ /api/*  (Vite proxy / Vercel)
┌───────────────────────────▼─────────────────────────────┐
│  FastAPI (Python) — main.py                             │
│  agro_client · farmer_intelligence · twilio_sms         │
└───────────────────────────┬─────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
 MapMyIndia            Open-Meteo              Agromonitoring
 (map/search)          (weather/rain/soil)     (NDVI when available)
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            ▼
              Gemini 2.5 Flash · Twilio SMS
```

| Layer | Tools |
|-------|-------|
| **Frontend** | React, Vite, Tailwind, Lucide, Web Speech API |
| **Backend** | FastAPI, Uvicorn, google-genai, twilio, Pillow |
| **Deploy** | Vercel (static + Python serverless), GitHub |
| **Data** | JSON districts, RSK kendras, runtime subscriber logs |

---

<!-- SLIDE 8: DATA FLOW -->

# End-to-End Data Flow

## What happens when a farmer selects a location

```
User selects lat/lon (search · pin · GPS · district tap)
        │
        ├─► GET /api/weather          → Open-Meteo (temp, humidity)
        ├─► GET /api/agro/insights    → Rain 90d/365d, soil, NDVI, forecast
        │         (Agromonitoring + Open-Meteo fallbacks)
        ├─► GET /api/farmer/crop-recommend → Region-aware drought crops
        ├─► GET /api/farmer/alerts    → Dry-spell severity + irrigation
        │
        ▼
Map metrics card + Assistant briefing + risk halo on map

SMS subscribe:
        │
        ├─► Gather same context
        ├─► build_holistic_sms_body() → ≤160 chars, 1 SMS segment
        └─► Twilio → farmer phone (+91 formatted)
```

**Search any city:** MapMyIndia autosuggest → geocode (Mappls → Open-Meteo fallback) → nearest advisory district for crops.

---

<!-- SLIDE 9: KEY INTEGRATIONS -->

# APIs & Resilience Design

| Service | Role | Fallback if unavailable |
|---------|------|-------------------------|
| **MapMyIndia / Mappls** | Map tiles, search, geocode | Open-Meteo geocoding |
| **Open-Meteo** | Weather, 90d/365d rain, soil model | Static weather defaults |
| **Agromonitoring** | Live agro weather, satellite NDVI/soil | Open-Meteo + NDVI estimate |
| **Gemini 2.5 Flash** | Chat, voice, photo diagnosis | Rule-based expert advisory |
| **Twilio** | SMS alerts | Local subscribe + `sample_sms` in API |

**Design principle:** Farmers always see **something useful** — never blank `—` metrics when a free fallback exists.

**Languages:** English · Hindi · Telugu · Marathi · Kannada

---

<!-- SLIDE 10: ROADMAP & CLOSE -->

# Roadmap & Call to Action

## Built · Proven · Ready to scale

| ✅ Shipped | 🔜 Next |
|-----------|---------|
| Map-first UI + 16 risk districts | Expand to 315 vulnerable districts |
| Open-Meteo agro fallbacks | Scheduled weekly SMS cron |
| Holistic single-segment SMS | Postgres for subscribers & farms |
| Any-city search + geocode | Mandi prices · irrigation calendar |
| Voice + photo + RSK referral | Google Earth Engine at scale |

---

# Thank You

**Bhumija** — *Born of the Earth*

- **Demo:** http://localhost:3000
- **Repo:** https://github.com/ravii-teja/bhumija
- **Docs:** `content.md` · `deployment.md`

*Protecting Kharif. Empowering farmers. Building food resilience against El Niño.*

---

## Export tips (for PDF)

1. **Marp for VS Code** — open this file → export PDF/PPTX
2. **Google Slides** — paste each `---` section as one slide
3. **Pandoc** — `pandoc ppt.md -o bhumija-deck.pdf` (may need slide template)
4. **Brand colors:** Orange `#ea580c` (brand-600) · Risk red `#dc2626` · Favorable blue `#2563eb`
