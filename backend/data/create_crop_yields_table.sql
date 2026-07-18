-- Migration: Create district_crop_yields table for location-crop mapping
CREATE TABLE IF NOT EXISTS district_crop_yields (
    id SERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    crop_type VARCHAR(50),
    season VARCHAR(50),
    avg_yield NUMERIC,
    total_area NUMERIC,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimize queries by district and season
CREATE INDEX IF NOT EXISTS idx_crop_yields_district ON district_crop_yields(state_name, district_name);
CREATE INDEX IF NOT EXISTS idx_crop_yields_season ON district_crop_yields(season);
