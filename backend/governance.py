"""Governance module for Bhumija: calculates district impact metrics and administration recommendations."""

import os
import json
import random
from typing import Any, Optional
from google import genai

# Try loading env or variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def get_governance_insights(
    district: Optional[dict[str, Any]],
    weather: Optional[dict[str, Any]],
    agro_data: Optional[dict[str, Any]]
) -> dict[str, Any]:
    """Generates governance/first-action metrics & directives for the selected location."""
    
    district_name = district.get("name", "Selected Zone") if district else "Selected Zone"
    state_name = district.get("state", "Unknown State") if district else "Unknown State"
    region = district.get("region", "Default Region") if district else "Default Region"
    risk_level = district.get("risk_level", "Medium") if district else "Medium"
    primary_crops = district.get("primary_crops", ["Kharif Crops"]) if district else ["Kharif Crops"]
    soil_type = district.get("soil_type", "Loamy Soil") if district else "Loamy Soil"

    # 1. Deterministic/Heuristic calculations
    # Establish base population of farmers in the district
    # Larger seed for stability based on district name
    seed_val = sum(ord(c) for c in district_name)
    random.seed(seed_val)
    
    if risk_level == "High":
        base_impacted_pct = random.uniform(0.35, 0.55)
        farmer_base = random.randint(80000, 150000)
        avg_savings_per_farmer = random.randint(18000, 28000)
        water_impact_status = "Critical Deficit - Groundwater depletion accelerated"
    elif risk_level == "Medium":
        base_impacted_pct = random.uniform(0.15, 0.35)
        farmer_base = random.randint(40000, 80000)
        avg_savings_per_farmer = random.randint(12000, 18000)
        water_impact_status = "Moderate Deficit - Localized water scarcity in tail-end canals"
    else:
        base_impacted_pct = random.uniform(0.05, 0.15)
        farmer_base = random.randint(15000, 40000)
        avg_savings_per_farmer = random.randint(8000, 12000)
        water_impact_status = "Normal/Stable - Adequate storage for current cropping cycle"

    # Scale with current weather/monsoon indices if available
    monsoon_status = "Deficient"
    if agro_data and "monsoon" in agro_data:
        mon_score = agro_data["monsoon"].get("monsoon_score", 0.5)
        if mon_score < 0.35:
            monsoon_status = "Severe Deficit"
            base_impacted_pct *= 1.2
        elif mon_score < 0.65:
            monsoon_status = "Sub-normal / Erratic"
        else:
            monsoon_status = "Normal / Adequate"
            base_impacted_pct *= 0.8

    impacted_farmers = int(farmer_base * base_impacted_pct)
    potential_savings_inr = impacted_farmers * avg_savings_per_farmer
    potential_savings_crores = round(potential_savings_inr / 10_000_000, 2)

    # Base advisories
    gov_steps = [
        f"Initiate priority desiltation of community check dams and local tanks in {district_name}.",
        f"Release emergency seed subsidies for low water crops: {', '.join(primary_crops[:2])}.",
        "Establish district water governance board to regulate deep borewell extraction.",
        "Pre-position drinking water tankers and fodder banks for dry livestock management."
    ]

    first_action_steps = [
        "Deploy Krishi Seva mobile vans to demonstrate Broad Bed Furrow (BBF) planting methods.",
        "Broadcast localized SMS crop advisories regarding drought-resilient intercropping.",
        "Distribute water-absorbing agricultural hydrogels for root zones at village level.",
        "Set up temporary seed distribution kiosks next to Rythu Seva Kendras (RSK)."
    ]

    # 2. Leverage Gemini for highly customized and premium localized insights if key exists
    if GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = (
                f"You are the Chief Agricultural Resilience Advisor for the Government of India.\n"
                f"Provide administrative recommendations for {district_name} district in {state_name} ({region} region).\n"
                f"Details:\n"
                f"- Primary crops grown: {', '.join(primary_crops)}\n"
                f"- Soil type: {soil_type}\n"
                f"- El Niño Risk level: {risk_level}\n"
                f"- Current weather: {json.dumps(weather)}\n\n"
                f"Generate a JSON object with exactly the following structure (no markdown wrapper, raw text only):\n"
                f"{{\n"
                f"  \"monsoon_forecast\": \"Short summary of forecasted monsoon behavior (max 20 words)\",\n"
                f"  \"water_impact\": \"Summary of water resource/irrigation impact (max 20 words)\",\n"
                f"  \"gov_steps\": [\"Step 1 (specific)\", \"Step 2 (specific)\", \"Step 3 (specific)\", \"Step 4 (specific)\"],\n"
                f"  \"first_action_steps\": [\"Step 1 (specific)\", \"Step 2 (specific)\", \"Step 3 (specific)\", \"Step 4 (specific)\"]\n"
                f"}}\n"
                f"Provide actionable, specific steps for local governance (e.g. naming the crops or soil-specific actions)."
            )
            response = client.models.generate_content(model="gemini-3.1-flash-lite", contents=[prompt])
            text = response.text.strip()
            
            # Clean markdown formatting if any
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()
                
            ai_data = json.loads(text)
            if "monsoon_forecast" in ai_data:
                monsoon_status = ai_data["monsoon_forecast"]
            if "water_impact" in ai_data:
                water_impact_status = ai_data["water_impact"]
            if "gov_steps" in ai_data and len(ai_data["gov_steps"]) >= 3:
                gov_steps = ai_data["gov_steps"]
            if "first_action_steps" in ai_data and len(ai_data["first_action_steps"]) >= 3:
                first_action_steps = ai_data["first_action_steps"]
                
        except Exception as e:
            print(f"Failed to fetch Gemini insights for governance: {e}")

    # Water level indicators based on risk
    if risk_level == "High":
        previous_pct = 74.0
        current_pct = 46.0
        projected_pct = 22.0
    elif risk_level == "Medium":
        previous_pct = 78.0
        current_pct = 61.0
        projected_pct = 42.0
    else:
        previous_pct = 85.0
        current_pct = 76.0
        projected_pct = 68.0

    return {
        "district_id": district.get("id") if district else None,
        "district_name": district_name,
        "state_name": state_name,
        "risk_level": risk_level,
        "impacted_farmers": impacted_farmers,
        "potential_savings_crores": potential_savings_crores,
        "monsoon_forecast": monsoon_status,
        "water_impact": water_impact_status,
        "gov_steps": gov_steps,
        "first_action_steps": first_action_steps,
        "water_levels": {
            "previous_pct": previous_pct,
            "current_pct": current_pct,
            "projected_pct": projected_pct
        }
    }

