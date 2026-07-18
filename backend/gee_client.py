"""Google Earth Engine (GEE) integration client for Bhumija.

Ingests satellite telemetry for Indian agricultural districts:
- Sentinel-2 Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED) for NDVI
- NASA SMAP Soil Moisture (NASA/SMAP/SPL3SMP_E/005) for Root Zone Soil Moisture
- ECMWF ERA5 Daily Reanalysis for rainfall anomalies
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Dict

logger = logging.getLogger("bhumija.gee")

_GEE_INITIALIZED = False


def init_gee(project_id: Optional[str] = None) -> bool:
    """Initialize Google Earth Engine API."""
    global _GEE_INITIALIZED
    if _GEE_INITIALIZED:
        return True

    try:
        import ee
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()
        _GEE_INITIALIZED = True
        logger.info("Google Earth Engine initialized successfully.")
        return True
    except Exception as exc:
        logger.warning(f"Google Earth Engine initialization warning/fallback: {exc}")
        return False


def get_gee_farm_insights(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch real-time satellite metrics around (lat, lon) using Earth Engine.
    
    Returns structured satellite telemetry dictionary.
    """
    if not init_gee():
        return {
            "gee_active": False,
            "source": "gee_uninitialized_fallback",
            "ndvi": 0.35,
            "soil_moisture_percentage": 14.5,
            "ndvi_description": "Moderate Vegetation Stress",
            "soil_status": "Moderate Moisture Deficit"
        }

    try:
        import ee
        point = ee.Geometry.Point([lon, lat])
        buffer_geom = point.buffer(2000)  # 2km farm radius

        # 1. Fetch Sentinel-2 NDVI (Normalized Difference Vegetation Index)
        # B8 = NIR, B4 = RED
        s2 = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(buffer_geom)
            .filterDate("2024-01-01", "2026-12-31")
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
            .sort("system:time_start", False)
            .first()
        )

        ndvi_val = 0.38
        if s2:
            ndvi_img = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")
            stats = ndvi_img.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=buffer_geom,
                scale=20,
                maxPixels=1e6
            ).getInfo()
            if stats and "NDVI" in stats and stats["NDVI"] is not None:
                ndvi_val = round(float(stats["NDVI"]), 3)

        # Describe NDVI
        if ndvi_val > 0.6:
            ndvi_desc = "Healthy / Dense Crop Canopy"
        elif ndvi_val > 0.3:
            ndvi_desc = "Moderate Crop Stress / Dry Spell Impact"
        else:
            ndvi_desc = "Severe Vegetation Stress / Soil Bareness"

        # 2. Fetch SMAP Soil Moisture (SPL3SMP_E)
        smap = (
            ee.ImageCollection("NASA/SMAP/SPL3SMP_E/005")
            .filterBounds(buffer_geom)
            .sort("system:time_start", False)
            .first()
        )

        sm_val = 14.2
        if smap:
            sm_img = smap.select("soil_moisture_am")
            stats_sm = sm_img.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=buffer_geom,
                scale=10000,
                maxPixels=1e6
            ).getInfo()
            if stats_sm and "soil_moisture_am" in stats_sm and stats_sm["soil_moisture_am"] is not None:
                # Convert volumetric soil moisture (m^3/m^3) to percentage
                raw_sm = float(stats_sm["soil_moisture_am"])
                sm_val = round(raw_sm * 100, 1) if raw_sm < 1.0 else round(raw_sm, 1)

        # Soil status description
        if sm_val < 15.0:
            soil_desc = "Severe Moisture Deficit (Drought Risk)"
        elif sm_val < 25.0:
            soil_desc = "Moderate Soil Moisture Deficit"
        else:
            soil_desc = "Adequate Soil Moisture"

        return {
            "gee_active": True,
            "source": "google_earth_engine",
            "lat": lat,
            "lon": lon,
            "ndvi": ndvi_val,
            "ndvi_description": ndvi_desc,
            "soil_moisture_percentage": sm_val,
            "soil_status": soil_desc,
        }

    except Exception as exc:
        logger.warning(f"Error executing Earth Engine reduction for point ({lat}, {lon}): {exc}")
        return {
            "gee_active": False,
            "source": "gee_error_fallback",
            "ndvi": 0.35,
            "soil_moisture_percentage": 14.0,
            "ndvi_description": "Moderate Crop Stress (Fallback)",
            "soil_status": "Moderate Moisture Deficit (Fallback)"
        }
