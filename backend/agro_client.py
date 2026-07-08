"""Agromonitoring (OpenWeather Agro API) client for Bhumija."""

from __future__ import annotations

import json
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests
import certifi

AGRO_BASE = "https://api.agromonitoring.com/agro/1.0"
OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"

# In-memory caches for free-tier rate limits
_polygon_cache: dict[str, str] = {}
_district_metrics_cache: dict[str, Any] = {"ts": 0, "data": None}
_rainfall_cache: dict[str, tuple[float, float]] = {}
DISTRICT_CACHE_TTL = 3600  # 1 hour
RAINFALL_CACHE_TTL = 1800  # 30 minutes


def _safe_request(method: str, url: str, **kwargs) -> requests.Response:
    kwargs.setdefault("timeout", 12)
    try:
        return requests.request(method, url, verify=certifi.where(), **kwargs)
    except requests.exceptions.SSLError:
        return requests.request(method, url, verify=False, **kwargs)


def kelvin_to_celsius(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return round(float(value) - 273.15, 1)


def _field_polygon_geojson(lat: float, lon: float, delta: float = 0.02) -> dict[str, Any]:
    """Small ~400 ha field polygon around a point (GeoJSON lon, lat order)."""
    return {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [lon - delta, lat - delta],
                    [lon + delta, lat - delta],
                    [lon + delta, lat + delta],
                    [lon - delta, lat + delta],
                    [lon - delta, lat - delta],
                ]
            ],
        },
    }


def _ensure_polygon(appid: str, lat: float, lon: float) -> Optional[str]:
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
    if cache_key in _polygon_cache:
        return _polygon_cache[cache_key]

    payload = {
        "name": f"bhumija_{cache_key}",
        "geo_json": _field_polygon_geojson(lat, lon),
    }
    try:
        response = _safe_request(
            "POST",
            f"{AGRO_BASE}/polygons",
            params={"appid": appid, "duplicated": "true"},
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
        )
        if response.status_code in (200, 201):
            poly_id = response.json().get("id")
            if poly_id:
                _polygon_cache[cache_key] = poly_id
                return poly_id
        if response.status_code == 413:
            print("Agro polygon quota reached — using Open-Meteo fallbacks for soil/NDVI")
        else:
            print(f"Agro polygon create warning: HTTP {response.status_code}")
    except Exception as exc:
        print(f"Agro polygon create warning: {exc}")
    return None


def _fetch_current_weather(appid: str, lat: float, lon: float) -> Optional[dict[str, Any]]:
    try:
        response = _safe_request(
            "GET",
            f"{AGRO_BASE}/weather",
            params={"lat": lat, "lon": lon, "appid": appid},
        )
        if response.status_code == 200:
            return response.json()
    except Exception as exc:
        print(f"Agro weather warning: {exc}")
    return None


def _fetch_forecast(appid: str, lat: float, lon: float) -> list[dict[str, Any]]:
    try:
        response = _safe_request(
            "GET",
            f"{AGRO_BASE}/weather/forecast",
            params={"lat": lat, "lon": lon, "appid": appid},
        )
        if response.status_code == 200:
            data = response.json()
            return data if isinstance(data, list) else []
    except Exception as exc:
        print(f"Agro forecast warning: {exc}")
    return []


def _fetch_open_meteo_rainfall(lat: float, lon: float, days: int = 90) -> Optional[float]:
    """Rainfall accumulation via Open-Meteo (free fallback when Agro history unavailable)."""
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{days}"
    cached = _rainfall_cache.get(cache_key)
    if cached and time.time() - cached[0] < RAINFALL_CACHE_TTL:
        return cached[1]

    try:
        if days <= 92:
            response = _safe_request(
                "GET",
                OPEN_METEO_FORECAST,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "precipitation_sum",
                    "past_days": min(days, 92),
                    "forecast_days": 1,
                },
            )
        else:
            end_date = datetime.now(timezone.utc).date()
            start_date = end_date - timedelta(days=days)
            response = _safe_request(
                "GET",
                OPEN_METEO_ARCHIVE,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "daily": "precipitation_sum",
                },
            )

        if response.status_code != 200:
            return None

        daily = response.json().get("daily") or {}
        values = daily.get("precipitation_sum") or []
        if not values:
            return None

        total = round(sum(float(v or 0) for v in values), 1)
        _rainfall_cache[cache_key] = (time.time(), total)
        return total
    except Exception as exc:
        print(f"Open-Meteo rainfall warning: {exc}")
    return None


def _fetch_open_meteo_forecast_rain(lat: float, lon: float, hours: int = 72) -> Optional[float]:
    try:
        response = _safe_request(
            "GET",
            OPEN_METEO_FORECAST,
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": "precipitation",
                "forecast_days": max(1, min(7, math.ceil(hours / 24))),
            },
        )
        if response.status_code != 200:
            return None
        hourly = response.json().get("hourly") or {}
        values = hourly.get("precipitation") or []
        slots = min(len(values), max(1, hours))
        return round(sum(float(v or 0) for v in values[:slots]), 1)
    except Exception as exc:
        print(f"Open-Meteo forecast rain warning: {exc}")
    return None


def _fetch_open_meteo_soil(lat: float, lon: float) -> Optional[dict[str, Any]]:
    try:
        response = _safe_request(
            "GET",
            OPEN_METEO_FORECAST,
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": "soil_moisture_0_to_7cm,soil_temperature_0cm",
                "forecast_days": 1,
                "past_days": 1,
            },
        )
        if response.status_code != 200:
            return None

        hourly = response.json().get("hourly") or {}
        moisture_values = hourly.get("soil_moisture_0_to_7cm") or []
        temp_values = hourly.get("soil_temperature_0cm") or []
        if not moisture_values:
            return None

        moisture = float(moisture_values[-1] or 0)
        surface_temp = float(temp_values[-1]) if temp_values else None
        return {
            "moisture_m3_m3": round(moisture, 3),
            "moisture_percent": round(moisture * 100, 1),
            "surface_temp_c": round(surface_temp, 1) if surface_temp is not None else None,
            "depth_10cm_temp_c": None,
            "timestamp": None,
            "source": "Open-Meteo model",
            "estimated": True,
        }
    except Exception as exc:
        print(f"Open-Meteo soil warning: {exc}")
    return None


def _estimate_vegetation(
    rain_90d: Optional[float],
    soil_moisture_pct: Optional[float],
    humidity_pct: Optional[int],
) -> dict[str, Any]:
    """Heuristic NDVI proxy when satellite polygon data is unavailable."""
    rain = rain_90d if rain_90d is not None else 80
    soil = soil_moisture_pct if soil_moisture_pct is not None else 35
    humidity = humidity_pct if humidity_pct is not None else 50

    rain_factor = max(0.0, min(1.0, rain / 250))
    soil_factor = max(0.0, min(1.0, soil / 50))
    humidity_factor = max(0.0, min(1.0, humidity / 80))
    ndvi = round(0.12 + 0.48 * rain_factor * 0.5 + 0.25 * soil_factor + 0.15 * humidity_factor, 3)
    ndvi = max(0.08, min(0.72, ndvi))
    return {
        "ndvi": ndvi,
        "health": _ndvi_health_label(ndvi),
        "timestamp": None,
        "points": 0,
        "source": "Rainfall + soil model estimate",
        "estimated": True,
    }


def _fetch_agro_accumulated_precipitation(
    appid: str, lat: float, lon: float, days: int = 90
) -> Optional[float]:
    end = int(datetime.now(timezone.utc).timestamp())
    start = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())
    try:
        response = _safe_request(
            "GET",
            f"{AGRO_BASE}/weather/history/accumulated_precipitation",
            params={"lat": lat, "lon": lon, "start": start, "end": end, "appid": appid},
        )
        if response.status_code == 200:
            rows = response.json()
            if rows:
                latest = rows[-1]
                return round(float(latest.get("rain", 0)), 1)
    except Exception as exc:
        print(f"Agro accumulated precipitation warning: {exc}")
    return None


def _fetch_accumulated_precipitation(appid: str, lat: float, lon: float, days: int = 90) -> Optional[float]:
    """Monsoon-relevant accumulated rainfall (mm) over recent window."""
    agro_value = _fetch_agro_accumulated_precipitation(appid, lat, lon, days=days)
    if agro_value is not None:
        return agro_value
    return _fetch_open_meteo_rainfall(lat, lon, days=days)


def _fetch_soil(appid: str, poly_id: str) -> Optional[dict[str, Any]]:
    try:
        response = _safe_request(
            "GET",
            f"{AGRO_BASE}/soil",
            params={"polyid": poly_id, "appid": appid},
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "moisture_m3_m3": round(float(data.get("moisture", 0)), 3),
                "moisture_percent": round(float(data.get("moisture", 0)) * 100, 1),
                "surface_temp_c": kelvin_to_celsius(data.get("t0")),
                "depth_10cm_temp_c": kelvin_to_celsius(data.get("t10")),
                "timestamp": data.get("dt"),
            }
    except Exception as exc:
        print(f"Agro soil warning: {exc}")
    return None


def _fetch_ndvi_latest(appid: str, poly_id: str) -> Optional[dict[str, Any]]:
    end = int(datetime.now(timezone.utc).timestamp())
    start = int((datetime.now(timezone.utc) - timedelta(days=45)).timestamp())
    try:
        response = _safe_request(
            "GET",
            f"{AGRO_BASE}/ndvi/history",
            params={
                "polyid": poly_id,
                "start": start,
                "end": end,
                "appid": appid,
            },
        )
        if response.status_code != 200:
            return None
        history = response.json()
        if not history:
            return None
        latest = history[-1]
        mean_ndvi = latest.get("data", {}).get("mean") if isinstance(latest.get("data"), dict) else latest.get("mean")
        if mean_ndvi is None and isinstance(latest.get("data"), list) and latest["data"]:
            mean_ndvi = latest["data"][-1].get("mean")
        if mean_ndvi is None:
            return None
        ndvi = round(float(mean_ndvi), 3)
        return {
            "ndvi": ndvi,
            "health": _ndvi_health_label(ndvi),
            "timestamp": latest.get("dt"),
            "points": len(history),
        }
    except Exception as exc:
        print(f"Agro NDVI warning: {exc}")
    return None


def _ndvi_health_label(ndvi: float) -> str:
    if ndvi < 0.2:
        return "Bare / stressed soil"
    if ndvi < 0.35:
        return "Sparse vegetation / drought stress"
    if ndvi < 0.5:
        return "Moderate crop cover"
    if ndvi < 0.65:
        return "Healthy vegetation"
    return "Dense healthy crop cover"


def _forecast_rain_mm(forecast: list[dict[str, Any]], hours: int = 72) -> float:
    total = 0.0
    slots = min(len(forecast), max(1, hours // 3))
    for item in forecast[:slots]:
        rain = item.get("rain") or {}
        total += float(rain.get("3h") or rain.get("1h") or 0)
    return round(total, 1)


def _monsoon_context(accumulated_mm: Optional[float], forecast_rain_mm: float) -> str:
    acc = accumulated_mm or 0
    if acc < 50 and forecast_rain_mm < 5:
        return "Deficient — El Niño dry spell risk"
    if acc < 120:
        return "Below normal — monitor sowing windows"
    if acc < 250:
        return "Moderate — adequate for short-duration crops"
    return "Favorable — good moisture for Kharif"


def _yearly_monsoon_context(accumulated_mm: Optional[float]) -> str:
    acc = accumulated_mm or 0
    if acc < 400:
        return "Deficient yearly rainfall — drought resilience critical"
    if acc < 700:
        return "Below normal annual rain — plan water harvesting"
    if acc < 1000:
        return "Moderate annual rainfall"
    return "Favorable yearly monsoon accumulation"


def get_location_insights(appid: str, lat: float, lon: float) -> dict[str, Any]:
    """Full agro intelligence packet for a farm location."""
    if not appid:
        return {"available": False, "reason": "AGROMONITORING_API_KEY not configured"}

    weather = _fetch_current_weather(appid, lat, lon)
    forecast = _fetch_forecast(appid, lat, lon)
    accumulated_rain_agro = _fetch_agro_accumulated_precipitation(appid, lat, lon, days=90)
    accumulated_rain_year_agro = _fetch_agro_accumulated_precipitation(appid, lat, lon, days=365)
    accumulated_rain = accumulated_rain_agro or _fetch_open_meteo_rainfall(lat, lon, days=90)
    accumulated_rain_year = accumulated_rain_year_agro or _fetch_open_meteo_rainfall(lat, lon, days=365)
    forecast_rain = _forecast_rain_mm(forecast)

    poly_id = _ensure_polygon(appid, lat, lon)
    soil = _fetch_soil(appid, poly_id) if poly_id else None
    ndvi = _fetch_ndvi_latest(appid, poly_id) if poly_id else None

    if soil is None:
        soil = _fetch_open_meteo_soil(lat, lon)
    if ndvi is None:
        humidity_pct = (weather.get("main") or {}).get("humidity") if weather else None
        ndvi = _estimate_vegetation(
            accumulated_rain,
            soil.get("moisture_percent") if soil else None,
            humidity_pct,
        )

    if forecast_rain == 0:
        open_forecast = _fetch_open_meteo_forecast_rain(lat, lon)
        if open_forecast is not None:
            forecast_rain = open_forecast

    using_open_meteo_rain = accumulated_rain_agro is None or accumulated_rain_year_agro is None
    monsoon_source = "Open-Meteo rainfall model" if using_open_meteo_rain else "Agromonitoring"

    current = {}
    if weather:
        main = weather.get("main") or {}
        wind = weather.get("wind") or {}
        weather_meta = (weather.get("weather") or [{}])[0]
        rain = weather.get("rain") or {}
        current = {
            "temp_c": kelvin_to_celsius(main.get("temp")),
            "humidity_pct": main.get("humidity"),
            "wind_ms": wind.get("speed"),
            "description": weather_meta.get("description"),
            "rain_1h_mm": rain.get("1h"),
            "rain_3h_mm": rain.get("3h"),
        }

    return {
        "available": True,
        "source": "Agromonitoring / OpenWeather Agro API",
        "coordinates": {"lat": lat, "lon": lon},
        "polygon_id": poly_id,
        "vegetation": ndvi,
        "soil": soil,
        "weather": current,
        "monsoon": {
            "accumulated_rainfall_90d_mm": accumulated_rain,
            "accumulated_rainfall_365d_mm": accumulated_rain_year,
            "forecast_rainfall_72h_mm": forecast_rain,
            "status": _monsoon_context(accumulated_rain, forecast_rain),
            "yearly_status": _yearly_monsoon_context(accumulated_rain_year),
            "season_note": "Southwest monsoon (Jun–Sep) rainfall context for India",
            "source": monsoon_source,
        },
        "data_notes": {
            "polygon_available": poly_id is not None,
            "soil_estimated": bool(soil and soil.get("estimated")),
            "vegetation_estimated": bool(ndvi and ndvi.get("estimated")),
        },
        "forecast_summary": [
            {
                "time": item.get("dt"),
                "temp_c": kelvin_to_celsius((item.get("main") or {}).get("temp")),
                "humidity_pct": (item.get("main") or {}).get("humidity"),
                "rain_3h_mm": (item.get("rain") or {}).get("3h"),
                "description": ((item.get("weather") or [{}])[0]).get("description"),
            }
            for item in forecast[:8]
        ],
    }


def get_district_metrics(appid: str, districts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Lightweight agro metrics per district for map overlay coloring."""
    now = time.time()
    if _district_metrics_cache["data"] and now - _district_metrics_cache["ts"] < DISTRICT_CACHE_TTL:
        return _district_metrics_cache["data"]

    if not appid:
        return []

    metrics: list[dict[str, Any]] = []
    for district in districts:
        lat, lon = district["lat"], district["lon"]
        weather = _fetch_current_weather(appid, lat, lon)
        accumulated = _fetch_accumulated_precipitation(appid, lat, lon, days=90)

        humidity = None
        if weather:
            humidity = (weather.get("main") or {}).get("humidity")

        # Use humidity + rainfall as soil/water proxy when polygon soil unavailable at scale
        soil_stress = _soil_stress_score(humidity, accumulated)
        monsoon_score = _monsoon_score(accumulated)

        metrics.append(
            {
                "district_id": district["id"],
                "lat": lat,
                "lon": lon,
                "humidity_pct": humidity,
                "accumulated_rainfall_90d_mm": accumulated,
                "soil_stress_score": soil_stress,
                "monsoon_score": monsoon_score,
                "overlay_colors": {
                    "soil": _score_color(soil_stress, invert=True),
                    "monsoon": _score_color(monsoon_score, invert=False),
                    "water": _score_color(monsoon_score, invert=False),
                },
            }
        )

    _district_metrics_cache["ts"] = now
    _district_metrics_cache["data"] = metrics
    return metrics


def _soil_stress_score(humidity: Optional[int], rain_mm: Optional[float]) -> float:
    h = humidity if humidity is not None else 40
    r = rain_mm if rain_mm is not None else 80
    # Higher score = more stress (drier)
    stress = max(0.0, min(1.0, (100 - h) / 100 * 0.5 + (250 - min(r, 250)) / 250 * 0.5))
    return round(stress, 2)


def _monsoon_score(rain_mm: Optional[float]) -> float:
    r = rain_mm if rain_mm is not None else 0
    return round(max(0.0, min(1.0, r / 300)), 2)


def _score_color(score: float, invert: bool) -> str:
    """Return hex color: red (risk/dry), yellow (medium), blue (good/moist)."""
    value = 1 - score if invert else score
    if value < 0.33:
        return "#dc2626"
    if value < 0.66:
        return "#eab308"
    return "#2563eb"
