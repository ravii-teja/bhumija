"""Farmer intelligence: crop recommendations, alerts, health logs, RSK referrals."""

from __future__ import annotations

import json
import math
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from agro_client import get_location_insights
from twilio_sms import send_sms, twilio_configured

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "mr": "Marathi",
    "kn": "Kannada",
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DISTRICTS_FILE = os.path.join(DATA_DIR, "districts.json")
RSK_FILE = os.path.join(DATA_DIR, "rythu_seva_kendras.json")

# Use /tmp on Vercel or read-only environments where package dir is read-only
if os.getenv("VERCEL") or not os.access(DATA_DIR, os.W_OK):
    HEALTH_LOGS_FILE = "/tmp/health_logs.json"
    SMS_SUBSCRIBERS_FILE = "/tmp/sms_subscribers.json"
else:
    HEALTH_LOGS_FILE = os.path.join(DATA_DIR, "health_logs.json")
    SMS_SUBSCRIBERS_FILE = os.path.join(DATA_DIR, "sms_subscribers.json")


# Drought-resilient crop knowledge base keyed by region pattern
CROP_KNOWLEDGE = {
    "Marathwada": [
        {"crop": "Pearl Millet (Bajra)", "score_base": 92, "duration_days": 65, "water_need": "Low"},
        {"crop": "Pigeon Pea (Tur)", "score_base": 88, "duration_days": 120, "water_need": "Low-Medium"},
        {"crop": "Green Gram (Moong)", "score_base": 85, "duration_days": 60, "water_need": "Low"},
        {"crop": "Sorghum (Jowar)", "score_base": 87, "duration_days": 90, "water_need": "Low"},
    ],
    "Vidarbha": [
        {"crop": "Soybean (short duration)", "score_base": 80, "duration_days": 90, "water_need": "Medium"},
        {"crop": "Cotton (early maturing)", "score_base": 75, "duration_days": 140, "water_need": "Medium-High"},
        {"crop": "Pigeon Pea (Tur)", "score_base": 86, "duration_days": 120, "water_need": "Low-Medium"},
        {"crop": "Pearl Millet (Bajra)", "score_base": 90, "duration_days": 65, "water_need": "Low"},
    ],
    "Rayalaseema": [
        {"crop": "Foxtail Millet (Korra)", "score_base": 93, "duration_days": 70, "water_need": "Very Low"},
        {"crop": "Pearl Millet (Bajra)", "score_base": 91, "duration_days": 65, "water_need": "Low"},
        {"crop": "Groundnut (if early rains)", "score_base": 72, "duration_days": 110, "water_need": "Medium"},
        {"crop": "Red Gram (Tur)", "score_base": 84, "duration_days": 120, "water_need": "Low-Medium"},
    ],
    "North Interior Karnataka": [
        {"crop": "Finger Millet (Ragi)", "score_base": 89, "duration_days": 110, "water_need": "Low-Medium"},
        {"crop": "Pearl Millet (Bajra)", "score_base": 90, "duration_days": 65, "water_need": "Low"},
        {"crop": "Sunflower", "score_base": 78, "duration_days": 90, "water_need": "Medium"},
    ],
    "Western Rajasthan": [
        {"crop": "Cluster Bean (Guar)", "score_base": 94, "duration_days": 70, "water_need": "Very Low"},
        {"crop": "Moth Bean", "score_base": 93, "duration_days": 65, "water_need": "Very Low"},
        {"crop": "Pearl Millet (Bajra)", "score_base": 92, "duration_days": 65, "water_need": "Low"},
    ],
    "Bundelkhand": [
        {"crop": "Black Gram (Urad)", "score_base": 86, "duration_days": 70, "water_need": "Low"},
        {"crop": "Pigeon Pea (Tur)", "score_base": 88, "duration_days": 120, "water_need": "Low-Medium"},
        {"crop": "Pearl Millet (Bajra)", "score_base": 89, "duration_days": 65, "water_need": "Low"},
    ],
    "default": [
        {"crop": "Pearl Millet (Bajra)", "score_base": 88, "duration_days": 65, "water_need": "Low"},
        {"crop": "Pigeon Pea (Tur)", "score_base": 85, "duration_days": 120, "water_need": "Low-Medium"},
        {"crop": "Green Gram (Moong)", "score_base": 83, "duration_days": 60, "water_need": "Low"},
    ],
}


def _load_json(path: str, default: Any) -> Any:
    # If path starts with /tmp and doesn't exist yet, check the packaged fallback in DATA_DIR
    resolved_path = path
    if not os.path.exists(path) and path.startswith("/tmp/"):
        fallback = os.path.join(DATA_DIR, os.path.basename(path))
        if os.path.exists(fallback):
            resolved_path = fallback

    try:
        with open(resolved_path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        return default



def _save_json(path: str, data: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)


def _find_nearest_district(lat: float, lon: float, threshold: float = 1.5) -> Optional[dict]:
    districts = _load_json(DISTRICTS_FILE, [])
    if not districts:
        return None
    nearest = None
    min_dist = float("inf")
    for district in districts:
        dist = math.sqrt((district["lat"] - lat) ** 2 + (district["lon"] - lon) ** 2)
        if dist < min_dist:
            min_dist = dist
            nearest = district
    if nearest and min_dist < threshold:
        return nearest
    if nearest:
        return {**nearest, "approximateMatch": True}
    return None


def build_weekly_plan(
    district: Optional[dict],
    agro: dict,
    weather: Optional[dict],
    crop_data: dict,
    alerts: dict,
    language: str = "en",
) -> list[dict]:
    """Actionable farm plan buckets for the coming week."""
    monsoon = agro.get("monsoon") or {}
    rain_90 = monsoon.get("accumulated_rainfall_90d_mm")
    forecast_72 = monsoon.get("forecast_rainfall_72h_mm") or 0
    soil_pct = (agro.get("soil") or {}).get("moisture_percent")
    humidity = (weather or {}).get("relative_humidity") or (agro.get("weather") or {}).get("humidity_pct")
    irrigation = alerts.get("irrigation_guidance") or {}
    top_crop = (crop_data.get("recommendations") or [{}])[0]
    severity = alerts.get("severity", "info")

    if soil_pct is None:
        soil_pct = irrigation.get("sensor_moisture_percent") or 35

    days_1_2 = _weekly_step(
        language,
        "days_1_2",
        "Days 1-2: Apply mulch on fields. Avoid flood irrigation; prefer drip/sprinkler early morning.",
        {
            "hi": "दिन 1-2: खेत में मल्च/परali डालें। बाढ़ सिंचाई न करें; सुबह ड्रिप/स्प्रिंकलर बेहतर।",
            "te": "రోజు 1-2: పొలంలో మల్చ్ వేయండి. వరద నీటిపారుదల వద్దు; ఉదయం డ్రిప్/స్ప్రింక్లర్.",
            "mr": "दिवस 1-2: शेतात mulch/परali वापरा. पूर सिंचन टाळा; सकाळी drip/sprinkler.",
            "kn": "ದಿನ 1-2: ಹೊಲದಲ್ಲಿ mulch ಹಾಕಿ. ಪ್ರವಾಹ ನೀರಾವರಿ ಬೇಡ; ಬೆಳಗಿನ drip/ಸ್ಪ್ರಿಂಕ್ಲರ್.",
        },
    )

    if forecast_72 < 5 and soil_pct < 35:
        days_3_4 = _weekly_step(
            language,
            "days_3_4",
            "Days 3-4: Protective light irrigation if soil stays dry. Check forecast daily.",
            {
                "hi": "दिन 3-4: मिट्टी सूखी रहे तो हल्की सुरक्षात्मक सिंचाई। रोज मौसम देखें।",
                "te": "రోజు 3-4: నేల ఎండిగా ఉంటే తేలికపాటి నీటిపారుదల. ప్రతిరోజు వాతావరణం చూడండి.",
                "mr": "दिवस 3-4: माती कोरडी असल्यास हलकी सिंचन. दररोज हवामान तपासा.",
                "kn": "ದಿನ 3-4: ಮಣ್ಣು ಒಣವಾಗಿದ್ದರೆ ಹಗುರ ರಕ್ಷಣಾ ನೀರಾವರಿ. ಪ್ರತಿದಿನ ಹವಾಮಾನ ನೋಡಿ.",
            },
        )
    elif forecast_72 >= 8:
        days_3_4 = _weekly_step(
            language,
            "days_3_4",
            "Days 3-4: Rain expected — skip irrigation. Ensure field drainage is clear.",
            {
                "hi": "दिन 3-4: बारिश की संभावना — सिंचाई रोकें। खेत की निकासी ठीक रखें।",
                "te": "రోజు 3-4: వర్షం రావచ్చు — నీటిపారుదల ఆపండి. పొలం drainage సరిచూడండి.",
                "mr": "दिवस 3-4: पाऊस अपेक्षित — सिंचन थांबवा. शेत निचरा तपासा.",
                "kn": "ದಿನ 3-4: ಮಳೆ ಬರಬಹುದು — ನೀರಾವರಿ ನಿಲ್ಲಿಸಿ. ಹೊಲ drainage ಪರಿಶೀಲಿಸಿ.",
            },
        )
    else:
        days_3_4 = _weekly_step(
            language,
            "days_3_4",
            irrigation.get("action_en", "Days 3-4: Monitor soil moisture. Irrigate only if needed."),
            {
                "hi": "दिन 3-4: मिट्टी की नमी देखें। जरूरत हो तभी सिंचाई करें।",
                "te": "రోజు 3-4: నేల తేమ చూడండి. అవసరమైతే మాత్రమే నీటిపారుదల.",
                "mr": "दिवस 3-4: मातीचा ओलावा तपासा. गरज असल्यावरच सिंचन.",
                "kn": "ದಿನ 3-4: ಮಣ್ಣಿನ ತೇಮೆ ನೋಡಿ. ಅಗತ್ಯವಿದ್ದರೆ ಮಾತ್ರ ನೀರಾವರಿ.",
            },
        )

    crop_name = top_crop.get("crop", "Pearl Millet (Bajra)")
    if severity in ("critical", "warning") or (rain_90 is not None and rain_90 < 120):
        days_5_7 = _weekly_step(
            language,
            "days_5_7",
            f"Days 5-7: Plan short-duration sowing — top pick {crop_name}. Delay water-heavy crops.",
            {
                "hi": f"दिन 5-7: छोटी अवधि की बुवाई — {crop_name} पर विचार। पानी वाली फसलें स्थगित करें।",
                "te": f"రోజు 5-7: చిన్న కాలపు sowing — {crop_name} పరిగణించండి. నీళ్ల పంటలు ఆపండి.",
                "mr": f"दिवस 5-7: लहान कालावधी पेरणी — {crop_name} विचारात घ्या. पाणी जास्त पिके स्थगित.",
                "kn": f"ದಿನ 5-7: ಚಿಕ್ಕ ಅವಧಿ sowing — {crop_name} ಪರಿಗಣಿಸಿ. ನೀರು ಹೆಚ್ಚು ಬೆಳೆಗಳನ್ನು ಮುಂದೂಡಿ.",
            },
        )
    else:
        days_5_7 = _weekly_step(
            language,
            "days_5_7",
            f"Days 5-7: Good window for {crop_name}. Apply basal fertilizer at sowing if moisture OK.",
            {
                "hi": f"दिन 5-7: {crop_name} बोने का अच्छा समय। नमी ठीक हो तो बुवाई पर basal खाद।",
                "te": f"రోజు 5-7: {crop_name} sowing కు మంచి సమయం. తేమ సరిగా ఉంటే basal fertilizer.",
                "mr": f"दिवस 5-7: {crop_name} पेरणीसाठी चांगली वेळ. ओलावा असल्यास basal खत.",
                "kn": f"ದಿನ 5-7: {crop_name} sowing ಗೆ ಒಳ್ಳೆಯ ಸಮಯ. ತೇಮೆ ಸರಿಯಿದ್ದರೆ basal fertilizer.",
            },
        )

    fert = alerts.get("fertilization_guidance") or {}
    ongoing = _weekly_step(
        language,
        "ongoing",
        fert.get("action_en", "Ongoing: Scout for pests weekly. Visit RSK if leaves yellow or wilt."),
        {
            "hi": "निरंतर: साप्ताहिक कीट जांच। पत्ते पीले/मुरझाएं तो RSK जाएं।",
            "te": "నిరంతర: వారానికి pest scouting. ఆకులు పసుపు/వాడితే RSK కు వెళ్లండి.",
            "mr": "सतत: साप्ताहिक कीड तपासणी. पाने पिवळी/कोमेजली तर RSK ला भेट द्या.",
            "kn": "ನಿರಂತರ: ವಾರದ pest scouting. ಎಲೆ ಹಳದಿ/ಬಾಡಿದರೆ RSK ಗೆ ಭೇಟಿ.",
        },
    )

    return [days_1_2, days_3_4, days_5_7, ongoing]


def _weekly_step(language: str, key: str, fallback_en: str, localized: dict[str, str]) -> dict:
    text = localized.get(language, fallback_en)
    return {"key": key, "text": text}


SMS_SINGLE_LIMIT = 160


def _short_location_name(district: Optional[dict], lat: float, lon: float, place_name: Optional[str] = None) -> str:
    if place_name:
        return place_name.split(",")[0].strip()[:18]
    if district:
        return district.get("name", "Farm").split("(")[0].strip()[:18]
    return f"{lat:.1f},{lon:.1f}"


def _short_crop_name(crop: str) -> str:
    if "(" in crop:
        inner = crop.split("(")[1].split(")")[0].strip()
        return inner.split()[0][:14]
    return crop.split()[0][:14]


def _short_phone(phone: Optional[str]) -> str:
    if not phone:
        return "1800-180-1551"
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) >= 10:
        return digits[-10:]
    return phone[:14]


def _compact_week_hint(severity: str, crop_short: str, language: str) -> str:
    hints = {
        "en": {
            "critical": f"mulch now; drip; sow {crop_short}",
            "warning": f"mulch; light drip; plan {crop_short}",
            "info": f"monitor; drip if dry; sow {crop_short}",
        },
        "hi": {
            "critical": f"mulch abhi; drip; {crop_short} bovai",
            "warning": f"mulch; halki sinchai; {crop_short}",
            "info": f"dekhte rahein; drip; {crop_short} bovai",
        },
        "te": {
            "critical": f"mulch; drip; {crop_short} sowing",
            "warning": f"mulch; light water; {crop_short}",
            "info": f"monitor; drip; {crop_short} sowing",
        },
        "mr": {
            "critical": f"mulch ata; drip; {crop_short} pere",
            "warning": f"mulch; halki sinchan; {crop_short}",
            "info": f"monitor; drip; {crop_short} pere",
        },
        "kn": {
            "critical": f"mulch; drip; {crop_short} sowing",
            "warning": f"mulch; light water; {crop_short}",
            "info": f"monitor; drip; {crop_short} sowing",
        },
    }
    bucket = hints.get(language, hints["en"])
    return bucket.get(severity, bucket["warning"])


def _fit_single_sms(text: str, limit: int = SMS_SINGLE_LIMIT) -> str:
    """Keep SMS to one GSM segment (160 chars) — no emojis or line breaks."""
    cleaned = " ".join(text.replace("\n", " ").split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def build_holistic_sms_body(
    lat: float,
    lon: float,
    language: str,
    district: Optional[dict],
    weather: Optional[dict],
    agro: dict,
    crop_data: dict,
    alerts: dict,
    *,
    subscribed: bool = True,
    place_name: Optional[str] = None,
) -> str:
    """Single-segment SMS (~160 chars): location, rain, crop, weekly hint, RSK."""
    monsoon = agro.get("monsoon") or {}
    soil = agro.get("soil") or {}
    rain_90 = monsoon.get("accumulated_rainfall_90d_mm")
    forecast_72 = monsoon.get("forecast_rainfall_72h_mm")
    soil_pct = soil.get("moisture_percent")

    loc = _short_location_name(district, lat, lon, place_name)
    recommendations = crop_data.get("recommendations") or []
    top = recommendations[0] if recommendations else {"crop": "Pearl Millet (Bajra)", "suitability_score": 85}
    crop_short = _short_crop_name(top["crop"])
    score = int(top.get("suitability_score") or 0)
    severity = alerts.get("severity", "info")
    week_hint = _compact_week_hint(severity, crop_short, language)
    rsk = find_nearest_rsk(lat, lon, district.get("id") if district else None)
    phone = _short_phone(rsk.get("phone") if rsk else None)

    r90 = int(rain_90) if rain_90 is not None else "?"
    r72 = round(float(forecast_72), 1) if forecast_72 is not None else "?"
    soil_val = int(soil_pct) if soil_pct is not None else "?"

    templates = {
        "en": (
            "Bhumija {loc}: Rain {r90}mm/90d, {r72}mm/72h. Soil {soil}%. "
            "Crop {crop} {score}%. Week: {week}. RSK {phone}"
        ),
        "hi": (
            "Bhumija {loc}: Barish {r90}mm/90din, {r72}mm/72ghante. Mitti {soil}%. "
            "Fasal {crop} {score}%. Saptah: {week}. RSK {phone}"
        ),
        "te": (
            "Bhumija {loc}: Varsham {r90}mm/90roju, {r72}mm/72ganta. Mannu {soil}%. "
            "Panta {crop} {score}%. Week: {week}. RSK {phone}"
        ),
        "mr": (
            "Bhumija {loc}: Paus {r90}mm/90d, {r72}mm/72h. Mati {soil}%. "
            "Pik {crop} {score}%. Athvda: {week}. RSK {phone}"
        ),
        "kn": (
            "Bhumija {loc}: Male {r90}mm/90d, {r72}mm/72h. Mannu {soil}%. "
            "Bale {crop} {score}%. Vara: {week}. RSK {phone}"
        ),
    }

    template = templates.get(language, templates["en"])
    body = template.format(
        loc=loc,
        r90=r90,
        r72=r72,
        soil=soil_val,
        crop=crop_short,
        score=score,
        week=week_hint,
        phone=phone,
    )
    if subscribed:
        suffix = {"en": " Alerts ON", "hi": " Alert ON", "te": " Alerts ON", "mr": " Alert ON", "kn": " Alerts ON"}
        body += suffix.get(language, " Alerts ON")

    return _fit_single_sms(body)


def _sms_alert_summary(severity: str, alerts: dict, language: str) -> str:
    active = alerts.get("alerts") or []
    if active:
        title = active[0].get("title_en", "Farm alert")
        localized = {
            "critical": {
                "hi": "गंभीर सूखा — तुरंत सिंचाई/मल्च करें",
                "te": "తీవ్ర పండుగ — వెంటనే నీటిపారుదల/mulch",
                "mr": "गंभीर drought — लगेच mulch/सिंचन",
                "kn": "ಗಂಭೀರ ಬರ — ತಕ್ಷಣ mulch/ನೀರಾವರಿ",
                "en": "Critical dry spell — mulch & irrigate now",
            },
            "warning": {
                "hi": "सूखा चेतावनी — El Niño पैटर्न, दैनिक निगरानी",
                "te": "పండుగ హెచ్చరిక — El Niño, రోజువారీ monitoring",
                "mr": "दुष्काळ इशारा — El Niño, दैनिक monitoring",
                "kn": "ಬರ ಎಚ್ಚರಿಕೆ — El Niño, ದೈನಂದಿನ monitoring",
                "en": "Dry spell watch — monitor fields daily",
            },
        }
        bucket = localized.get(severity, localized["warning"])
        return bucket.get(language, title)

    ok = {
        "hi": "स्थिति स्थिर — सामान्य खेती जारी रखें",
        "te": "పరిస్థితి స్థిరం — సాధారణ farming కొనసాగించండి",
        "mr": "स्थिती स्थिर — सामान्य शेती सुरू ठेवा",
        "kn": "ಸ್ಥಿತಿ ಸ್ಥಿರ — ಸಾಮಾನ್ಯ farming ಮುಂದುವರಿಸಿ",
        "en": "Conditions stable — continue normal farm care",
    }
    return ok.get(language, ok["en"])


def _sms_label(language: str, key: str, long_en: str, short_en: str) -> str:
    labels = {
        "location": {"hi": "स्थान", "te": "ప్రాంతం", "mr": "स्थान", "kn": "ಸ್ಥಳ", "en": "Location"},
        "rain_90": {"hi": "90 दिन", "te": "90 రోజు", "mr": "90 दिवस", "kn": "90 ದಿನ", "en": "90d"},
        "rain_year": {"hi": "वर्ष", "te": "సంవత్సరం", "mr": "वर्ष", "kn": "ವರ್ಷ", "en": "yr"},
        "rain_72h": {"hi": "अगले 72 घंटे", "te": "72 గంటలు", "mr": "72 तास", "kn": "72 ಗಂಟೆ", "en": "72h"},
        "rain_na": {"hi": "बारिश डेटा अपडेट हो रहा", "te": "వర్షం డేటా updating", "mr": "पाऊस डेटा updating", "kn": "ಮಳೆ ಡೇಟಾ updating", "en": "Rain updating"},
        "soil": {"hi": "मिट्टी", "te": "నేల", "mr": "माती", "kn": "ಮಣ್ಣು", "en": "Soil"},
        "best_crop": {"hi": "सर्वोत्तम फसल", "te": "అత్యుత్తమ పంట", "mr": "सर्वोत्तम पीक", "kn": "ಅತ್ಯುತ್ತಮ ಬೆಳೆ", "en": "Best crop"},
        "alt_crops": {"hi": "विकल्प", "te": "మరికల्प", "mr": "पर्याय", "kn": "ಪರ್ಯಾಯ", "en": "Alt"},
        "this_week": {"hi": "इस सप्ताह", "te": "ఈ వారం", "mr": "या आठवड्यात", "kn": "ಈ ವಾರ", "en": "This week"},
        "rsk": {"hi": "RSK सहायता", "te": "RSK సహాయం", "mr": "RSK मदत", "kn": "RSK ಸಹಾಯ", "en": "RSK"},
        "subscribed": {"hi": "Bhumija अलर्ट सक्रिय", "te": "Bhumija alerts ON", "mr": "Bhumija alerts सक्रिय", "kn": "Bhumija alerts ON", "en": "Bhumija alerts ON"},
        "alert": {"hi": "Bhumija सलाह", "te": "Bhumija advisory", "mr": "Bhumija सल्ला", "kn": "Bhumija advisory", "en": "Bhumija advisory"},
    }
    if key in ("best_crop", "alt_crops"):
        prefix = labels.get(key, {}).get(language, labels.get(key, {}).get("en", ""))
        if language == "en":
            return long_en
        # long_en already has full English crop line; rebuild with localized prefix
        if key == "best_crop":
            crop_part = long_en.split(": ", 1)[-1] if ": " in long_en else long_en
            return f"{prefix}: {crop_part}"
        if key == "alt_crops":
            crop_part = long_en.split(": ", 1)[-1] if ": " in long_en else long_en
            return f"{prefix}: {crop_part}"
    if key in labels:
        return labels[key].get(language, short_en)
    return long_en if language == "en" else short_en


def find_nearest_rsk(lat: float, lon: float, district_id: Optional[str] = None) -> Optional[dict]:
    kendras = _load_json(RSK_FILE, [])
    if not kendras:
        return None

    if district_id:
        match = next((k for k in kendras if k.get("district_id") == district_id), None)
        if match:
            return match

    nearest = None
    min_dist = float("inf")
    for kendra in kendras:
        dist = math.sqrt((kendra["lat"] - lat) ** 2 + (kendra["lon"] - lon) ** 2)
        if dist < min_dist:
            min_dist = dist
            nearest = kendra
    return nearest


def _simulate_ground_sensors(agro: dict, humidity: Optional[int]) -> dict:
    """Simulate IoT ground sensor readings from satellite/soil API + weather."""
    soil = agro.get("soil") or {}
    moisture = soil.get("moisture_percent")
    if moisture is None:
        moisture = max(15, min(55, (humidity or 45) * 0.5 + 10))

    return {
        "soil_moisture_percent": moisture,
        "soil_temperature_c": soil.get("depth_10cm_temp_c") or 28,
        "sensor_status": "simulated_from_satellite" if not soil else "satellite_calibrated",
        "last_reading": datetime.now(timezone.utc).isoformat(),
    }


def recommend_crops(
    district: Optional[dict],
    agro: dict,
    weather: Optional[dict],
    language: str = "en",
) -> dict:
    from governance import get_current_season, get_district_crop_metrics
    current_season = get_current_season()
    region = district.get("region", "default") if district else "default"
    db_crops = []
    if district:
        db_crops = get_district_crop_metrics(district.get("state", ""), district.get("name", ""), current_season)

    if db_crops:
        candidates = []
        for c in db_crops:
            crop_type = c["type"].lower()
            water_need = "Low-Medium"
            duration_days = 90
            
            if "oilseed" in crop_type or "pulse" in crop_type:
                water_need = "Low"
                duration_days = 80
            elif "cereal" in crop_type:
                water_need = "Medium"
                duration_days = 110
            elif "fiber" in crop_type or "commercial" in crop_type:
                water_need = "High"
                duration_days = 140
            
            candidates.append({
                "crop": c["crop"],
                "score_base": 85 if c["area_ha"] > 10000 else 75,
                "duration_days": duration_days,
                "water_need": water_need,
                "area_ha": c["area_ha"],
                "yield": c["avg_yield"]
            })
    else:
        region = district.get("region", "default") if district else "default"
        candidates = CROP_KNOWLEDGE.get(region, CROP_KNOWLEDGE["default"])


    monsoon = agro.get("monsoon") or {}
    vegetation = agro.get("vegetation") or {}
    accumulated = monsoon.get("accumulated_rainfall_90d_mm") or 0
    forecast_rain = monsoon.get("forecast_rainfall_72h_mm") or 0
    ndvi = vegetation.get("ndvi")
    dry_spell = accumulated < 80 or forecast_rain < 5

    recommendations = []
    for crop in candidates:
        score = crop["score_base"]
        if dry_spell and crop["water_need"] in ("Low", "Very Low", "Low-Medium"):
            score += 8
        if dry_spell and "High" in crop["water_need"]:
            score -= 20
        if ndvi is not None and ndvi < 0.3 and "Millet" in crop["crop"]:
            score += 5

        score = max(0, min(100, score))
        
        # Determine specific advice reason based on name
        crop_name = crop["crop"].lower()
        soil = district.get("soil_type", "local soil") if district else "local soil"
        
        if "yield" in crop: # Database crop
            avg_y = crop["yield"]
            area_h = crop["area_ha"]
            if "rice" in crop_name or "paddy" in crop_name:
                reason = f"Traditionally covers {area_h:,.0f} ha. Under dry spells, switch to Alternate Wetting & Drying (AWD) to preserve standard yields (avg. {avg_y:.2f} t/ha)."
            elif "cotton" in crop_name:
                reason = f"Main commercial crop in district ({area_h:,.0f} ha). Severe dry spell reduces boll size; adopt micro-sprinklers to save avg. yield of {avg_y:.2f} t/ha."
            elif "groundnut" in crop_name:
                reason = f"Grown over {area_h:,.0f} ha. Requires gypsum application at pegging; protect soil root-zone to maintain {avg_y:.2f} t/ha yield."
            elif "arhar" in crop_name or "pigeon" in crop_name or "tur" in crop_name:
                reason = f"Highly suited pulse ({area_h:,.0f} ha, avg. {avg_y:.2f} t/ha). Intercrop with millets to optimize water use."
            elif "soybean" in crop_name:
                reason = f"Covers {area_h:,.0f} ha (avg. {avg_y:.2f} t/ha). Sow using Broad Bed Furrow (BBF) to conserve moisture and protect against cloudbursts."
            else:
                reason = f"Acreage: {area_h:,.0f} ha with avg. yield of {avg_y:.2f} t/ha. { 'Resilient choice under dry conditions' if crop['water_need'] == 'Low' else 'Requires supplement irrigation support' }."
        else:
            reason = _crop_reason(crop, dry_spell, district)

        recommendations.append(
            {
                "crop": crop["crop"],
                "suitability_score": score,
                "duration_days": crop["duration_days"],
                "water_requirement": crop["water_need"],
                "reason_en": reason,
            }
        )

    recommendations.sort(key=lambda item: item["suitability_score"], reverse=True)
    top = recommendations[:3]

    return {
        "language": language,
        "region": region,
        "data_sources": ["Agromonitoring satellite NDVI", "Soil moisture API", "Open-Meteo weather", "District soil profile"],
        "dry_spell_context": dry_spell,
        "recommendations": top,
        "summary_en": (
            f"Based on satellite soil data and monsoon conditions in {region}, "
            f"we recommend short-duration drought-resilient crops for El Niño risk zones."
        ),
    }


def _crop_reason(crop: dict, dry_spell: bool, district: Optional[dict]) -> str:
    soil = district.get("soil_type", "local soil") if district else "local soil"
    if dry_spell:
        return f"Low water need suits dry spell on {soil}; matures in {crop['duration_days']} days."
    return f"Good fit for {soil}; balances yield and water use over {crop['duration_days']} days."


def generate_alerts(
    district: Optional[dict],
    agro: dict,
    weather: Optional[dict],
    language: str = "en",
) -> dict:
    monsoon = agro.get("monsoon") or {}
    forecast = agro.get("forecast_summary") or []
    humidity = (weather or {}).get("relative_humidity") or (agro.get("weather") or {}).get("humidity_pct")
    sensors = _simulate_ground_sensors(agro, humidity)

    forecast_rain = monsoon.get("forecast_rainfall_72h_mm") or 0
    accumulated = monsoon.get("accumulated_rainfall_90d_mm") or 0
    soil_moisture = sensors["soil_moisture_percent"]

    alerts = []
    severity = "info"

    if forecast_rain < 3 and soil_moisture < 25:
        severity = "critical"
        alerts.append(
            {
                "type": "dry_spell",
                "severity": "critical",
                "title_en": "Dry Spell Alert — Immediate Action Required",
                "message_en": (
                    "No significant rain forecast for 72 hours and soil moisture is critically low. "
                    "Delay irrigation-heavy crops. Apply mulch immediately."
                ),
            }
        )
    elif forecast_rain < 8 or accumulated < 100:
        severity = "warning"
        alerts.append(
            {
                "type": "dry_spell",
                "severity": "warning",
                "title_en": "Dry Spell Watch — El Niño Pattern",
                "message_en": (
                    "Below-normal rainfall expected. Monitor fields daily. "
                    "Consider protective irrigation for existing crops."
                ),
            }
        )

    irrigation = _irrigation_guidance(soil_moisture, forecast_rain, humidity)
    fertilization = _fertilization_guidance(soil_moisture, district)

    return {
        "language": language,
        "severity": severity,
        "alerts": alerts,
        "ground_sensors": sensors,
        "irrigation_guidance": irrigation,
        "fertilization_guidance": fertilization,
        "forecast_rain_72h_mm": forecast_rain,
        "next_forecast_slots": forecast[:4],
    }


def _irrigation_guidance(moisture: float, forecast_rain: float, humidity: Optional[int]) -> dict:
    if moisture < 20:
        action = "Irrigate immediately if water available. Use drip/sprinkler in early morning."
        priority = "high"
    elif moisture < 35 and forecast_rain < 5:
        action = "Schedule light protective irrigation within 48 hours. Avoid flood irrigation."
        priority = "medium"
    else:
        action = "Soil moisture adequate. Skip irrigation; monitor for 3 days."
        priority = "low"

    return {
        "priority": priority,
        "action_en": action,
        "recommended_method": "Drip or sprinkler (saves 30-40% water vs flood)",
        "timing": "Early morning (5-8 AM) or evening (5-7 PM)",
        "sensor_moisture_percent": moisture,
        "humidity_percent": humidity,
    }


def _fertilization_guidance(moisture: float, district: Optional[dict]) -> dict:
    if moisture < 25:
        return {
            "action_en": "Postpone nitrogen application until soil moisture improves. Apply FYM/compost with mulch.",
            "priority": "hold",
            "note_en": "Fertilizer on dry soil causes root burn and waste.",
        }
    crops = district.get("primary_crops", ["pulses"]) if district else ["pulses"]
    return {
        "action_en": f"Apply balanced NPK at sowing for {crops[0]}. Split nitrogen dose — 50% at sowing, 50% at flowering.",
        "priority": "normal",
        "note_en": "Combine with micronutrient spray (Zn/Fe) if leaves show yellowing.",
    }


def create_health_log(
    lat: float,
    lon: float,
    district: Optional[dict],
    notes: str,
    diagnosis: str,
    language: str = "en",
    input_type: str = "text",
    image_attached: bool = False,
) -> dict:
    rsk = find_nearest_rsk(lat, lon, district.get("id") if district else None)
    referral_id = f"RSK-{uuid.uuid4().hex[:8].upper()}"

    entry = {
        "id": str(uuid.uuid4()),
        "referral_id": referral_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lat": lat,
        "lon": lon,
        "district": district.get("name") if district else None,
        "language": language,
        "input_type": input_type,
        "image_attached": image_attached,
        "farmer_notes": notes,
        "ai_diagnosis": diagnosis,
        "rsk_referral": {
            "kendra_name": rsk["name"] if rsk else "Nearest Rythu Seva Kendra",
            "phone": rsk["phone"] if rsk else "1800-180-1551",
            "address": rsk["address"] if rsk else "Contact district agriculture office",
            "referral_id": referral_id,
            "status": "pending_expert_review",
            "instructions_en": (
                "Visit the Rythu Seva Kendra with this referral ID within 7 days "
                "for free expert crop health follow-up."
            ),
        },
    }

    logs = _load_json(HEALTH_LOGS_FILE, [])
    logs.insert(0, entry)
    _save_json(HEALTH_LOGS_FILE, logs[:100])
    return entry


def list_health_logs(limit: int = 20) -> list:
    return _load_json(HEALTH_LOGS_FILE, [])[:limit]


def subscribe_sms(
    phone: str,
    lat: float,
    lon: float,
    language: str = "hi",
    *,
    district: Optional[dict] = None,
    weather: Optional[dict] = None,
    agro: Optional[dict] = None,
    place_name: Optional[str] = None,
) -> dict:
    subscribers = _load_json(SMS_SUBSCRIBERS_FILE, [])
    entry = {
        "phone": phone,
        "lat": lat,
        "lon": lon,
        "language": language,
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }
    subscribers = [s for s in subscribers if s.get("phone") != phone]
    subscribers.insert(0, entry)
    _save_json(SMS_SUBSCRIBERS_FILE, subscribers[:500])

    if district is None:
        district = _find_nearest_district(lat, lon)
    if agro is None:
        appid = os.getenv("AGROMONITORING_API_KEY", "")
        agro = get_location_insights(appid, lat, lon) if appid else {"available": False, "monsoon": {}, "soil": {}}

    crop_data = recommend_crops(district, agro, weather, language)
    alerts = generate_alerts(district, agro, weather, language)

    welcome = build_holistic_sms_body(
        lat,
        lon,
        language,
        district,
        weather,
        agro,
        crop_data,
        alerts,
        subscribed=True,
        place_name=place_name,
    )

    sms_result = send_sms(phone, welcome)

    top_crop = (crop_data.get("recommendations") or [{}])[0]
    result = {
        "subscribed": True,
        "phone": phone[-4:].rjust(len(phone), "*"),
        "language": language,
        "message_en": "Single SMS sent with location, rainfall, crop, weekly hint, and RSK contact.",
        "sample_sms": welcome,
        "holistic_summary": {
            "location": district.get("name") if district else f"{lat:.4f}, {lon:.4f}",
            "rainfall_90d_mm": (agro.get("monsoon") or {}).get("accumulated_rainfall_90d_mm"),
            "rainfall_365d_mm": (agro.get("monsoon") or {}).get("accumulated_rainfall_365d_mm"),
            "forecast_72h_mm": (agro.get("monsoon") or {}).get("forecast_rainfall_72h_mm"),
            "best_crop": top_crop.get("crop"),
            "crop_score": top_crop.get("suitability_score"),
            "weekly_steps": [step["text"] for step in build_weekly_plan(district, agro, weather, crop_data, alerts, language)],
            "alert_severity": alerts.get("severity"),
        },
        "delivery": sms_result.get("delivery", "simulated"),
        "twilio_configured": twilio_configured(),
    }

    if sms_result.get("ok"):
        result["message_sid"] = sms_result.get("message_sid")
        result["delivery"] = "sent"
        result["note_en"] = "Welcome SMS sent via Twilio."
    elif sms_result.get("delivery") == "not_configured":
        result["note_en"] = sms_result.get("error", "Add TWILIO_ACCOUNT_SID and TWILIO_SMS_FROM to backend/.env")
    else:
        result["note_en"] = sms_result.get("error", "SMS delivery failed")

    return result


def build_voice_advisory(
    text: str,
    language: str,
    district: Optional[dict],
    agro: dict,
    alerts: dict,
) -> dict:
    lang_name = SUPPORTED_LANGUAGES.get(language, "English")
    return {
        "language": language,
        "language_name": lang_name,
        "input_text": text,
        "advisory_en": (
            f"Farmer query ({lang_name}): {text}\n\n"
            f"Location: {district.get('name') if district else 'your farm'}\n"
            f"Alerts: {len(alerts.get('alerts', []))} active\n"
            f"Irrigation: {alerts.get('irrigation_guidance', {}).get('action_en', 'Monitor fields')}"
        ),
        "speak_back": True,
    }


def localize_text(key: str, language: str, fallback: str) -> str:
    """Simple Indic phrase map for UI labels and SMS templates."""
    phrases = {
        "dry_spell_alert": {
            "hi": "सूखा चेतावनी: अगले 72 घंटों में बारिश कम। सिंचाई और मल्च करें।",
            "te": "పండుగ హెచ్చరిక: 72 గంటల్లో వర్షం తక్కువ. నీటిపారుదల చేయండి.",
            "mr": "दुष्काळ इशारा: 72 तास पाऊस कमी. सिंचन आणि mulching करा.",
            "kn": "ಬರಗಾಲ ಎಚ್ಚರಿಕೆ: 72 ಗಂಟೆಗಳಲ್ಲಿ ಮಳೆ ಕಡಿಮೆ. ನೀರಾವರಿ ಮಾಡಿ.",
            "en": "Dry spell alert: Low rain next 72h. Irrigate and mulch now.",
        },
        "crop_recommended": {
            "hi": "अनुशंसित फसल",
            "te": "సిఫార్సు పంట",
            "mr": "शिफारस केलेली पीक",
            "kn": "ಶಿಫಾರಸು ಮಾಡಿದ ಬೆಳೆ",
            "en": "Recommended crop",
        },
    }
    return phrases.get(key, {}).get(language, fallback)
