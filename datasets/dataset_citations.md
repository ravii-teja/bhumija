# Bhumija: Verified Datasets and Telemetry Sources

Bhumija leverages the following verified data sources and APIs to power its administrative and farmer-facing metrics:

1. **Historical Crops & Yields Database:**
   - **Source:** India Data Portal (Area, Production, and Yield - APY Dataset)
   - **Citation Link:** [https://indiadataportal.com/p/area-production-yield-apy](https://indiadataportal.com/p/area-production-yield-apy)
   - **Verification Scope:** Provides the official historical baseline for crop types, total cropped area (hectares), and average yields (tonnes/hectare) for the selected cropping season (Kharif, Rabi, Summer).

2. **Meteorological Forecasting:**
   - **Source:** Open-Meteo Weather API
   - **Verification Scope:** Provides real-time and 72-hour forecast parameters including temperature, wind speed, relative humidity, and precipitation probability.

3. **Agricultural Telemetry & Satellites:**
   - **Source:** Sentinel-2 Satellite Constellation (via Agromonitoring APIs)
   - **Verification Scope:** Captures real-time vegetation health profiles (Normalized Difference Vegetation Index - NDVI) and topsoil moisture percentage.