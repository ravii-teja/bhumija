#!/usr/bin/env python3
"""Script to parse crop dataset streamingly, aggregate data since 2010, and load it into Supabase."""

import os
import csv
import sys
import psycopg2
from collections import defaultdict
from dotenv import load_dotenv

# Add backend directory to path to load .env correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "datasets", "crop-wise-area-production-yield.csv")
SQL_SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "create_crop_yields_table.sql")

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("SUPABASE_DB_HOST"),
        database=os.getenv("SUPABASE_DB_NAME"),
        user=os.getenv("SUPABASE_DB_USER"),
        password=os.getenv("SUPABASE_DB_PASS"),
        port=os.getenv("SUPABASE_DB_PORT", "5432"),
        sslmode="require"
    )

def run_migration():
    print("Running database migrations...")
    if not os.path.exists(SQL_SCHEMA_PATH):
        print(f"Schema file not found at {SQL_SCHEMA_PATH}")
        sys.exit(1)
        
    with open(SQL_SCHEMA_PATH, "r") as f:
        sql = f.read()
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()
    cursor.close()
    conn.close()
    print("Migrations complete (table and indexes ready).")

def clean_name(val: str) -> str:
    """Normalize district/state names for consistent matching."""
    if not val:
        return ""
    # Standard normalization matching districts.json (e.g. Aurangabad (Chhatrapati Sambhajinagar))
    val_clean = val.strip()
    if "Ananthapuramu" in val_clean:
        return "Anantapur"
    return val_clean

def load_and_aggregate():
    print(f"Opening dataset: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"CSV file not found at {CSV_PATH}")
        sys.exit(1)

    # Dictionary format: (state, district, crop, crop_type, season) -> [area_sums, yield_sums, count]
    aggregates = defaultdict(lambda: [0.0, 0.0, 0])

    print("Parsing and aggregating crop records streamingly...")
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        row_count = 0
        skipped_count = 0
        
        for row in reader:
            row_count += 1
            if row_count % 100000 == 0:
                print(f"  Processed {row_count} raw rows...")

            # Filter records starting from year 2010-2011 onwards
            year_str = row.get("year", "")
            try:
                start_year = int(year_str.split("-")[0])
            except ValueError:
                skipped_count += 1
                continue

            if start_year < 2010:
                skipped_count += 1
                continue

            state = clean_name(row.get("state_name"))
            district = clean_name(row.get("district_name"))
            crop = row.get("crop_name", "").strip()
            crop_type = row.get("crop_type", "").strip()
            season = row.get("season", "").strip()

            # Ignore totals or undefined rows
            if season.lower() == "total" or not crop or not state or not district:
                continue

            try:
                area = float(row.get("area") or 0)
                crop_yield = float(row.get("yield") or 0)
            except ValueError:
                continue

            key = (state, district, crop, crop_type, season)
            # Add to area sum, yield sum, and increment count for averages
            aggregates[key][0] += area
            aggregates[key][1] += crop_yield
            aggregates[key][2] += 1

    print(f"Aggregation complete. Total rows parsed: {row_count}, skipped: {skipped_count}")
    print(f"Total aggregated distinct keys: {len(aggregates)}")
    return aggregates

def push_to_database(aggregates):
    print("Connecting to database for insertion...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Clearing existing crop metrics...")
    cursor.execute("TRUNCATE TABLE district_crop_yields;")
    conn.commit()

    print("Batch inserting data into Supabase...")
    batch_size = 1000
    batch = []
    
    insert_query = """
        INSERT INTO district_crop_yields (state_name, district_name, crop_name, crop_type, season, total_area, avg_yield)
        VALUES (%s, %s, %s, %s, %s, %s, %s);
    """

    inserted_count = 0
    for key, metrics in aggregates.items():
        state, district, crop, crop_type, season = key
        total_area = metrics[0]
        count = metrics[2]
        avg_yield = round(metrics[1] / count, 4) if count > 0 else 0.0

        batch.append((state, district, crop, crop_type, season, total_area, avg_yield))

        if len(batch) >= batch_size:
            cursor.executemany(insert_query, batch)
            conn.commit()
            inserted_count += len(batch)
            print(f"  Inserted {inserted_count} rows...")
            batch = []

    # Insert remaining
    if batch:
        cursor.executemany(insert_query, batch)
        conn.commit()
        inserted_count += len(batch)
        print(f"  Inserted remaining {len(batch)} rows.")

    cursor.close()
    conn.close()
    print("Database sync completed successfully!")

if __name__ == "__main__":
    run_migration()
    aggregates = load_and_aggregate()
    push_to_database(aggregates)
