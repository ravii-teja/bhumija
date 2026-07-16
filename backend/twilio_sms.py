"""Twilio SMS delivery for Bhumija farmer alerts."""

from __future__ import annotations

import os
import re
from typing import Optional

_twilio_client = None
_cached_from_number: Optional[str] = None


def twilio_configured() -> bool:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    has_sender = bool(
        os.getenv("TWILIO_MESSAGING_SERVICE_SID") or os.getenv("TWILIO_SMS_FROM")
    )
    has_api_key = bool(os.getenv("TWILIO_API_KEY_SID") and os.getenv("TWILIO_API_KEY_SECRET"))
    has_auth_token = bool(os.getenv("TWILIO_AUTH_TOKEN"))
    return bool(account_sid and has_sender and (has_api_key or has_auth_token))


def normalize_phone_e164(phone: str, default_country: str = "91") -> str:
    # Remove all whitespace, dashes, parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    if not cleaned:
        raise ValueError("Invalid phone number")
    
    # Check if it starts with + or international prefix 00
    is_plus = False
    if cleaned.startswith("+"):
        is_plus = True
        cleaned = cleaned[1:]
    elif cleaned.startswith("00"):
        is_plus = True
        cleaned = cleaned[2:]
        
    # Strip any leading zeros from the remaining digits for national prefix handling
    if is_plus:
        if cleaned.startswith("0"):
            cleaned = cleaned.lstrip("0")
    else:
        if cleaned.startswith("0"):
            cleaned = cleaned.lstrip("0")

    # If it is empty or has non-digits
    if not cleaned or not cleaned.isdigit():
        raise ValueError("Invalid phone number")

    # Indian number heuristics
    if len(cleaned) == 10:
        return f"+{default_country}{cleaned}"
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return f"+{cleaned}"
        
    return f"+{cleaned}"



def _get_client():
    global _twilio_client
    if _twilio_client is not None:
        return _twilio_client

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    if not account_sid:
        return None

    api_key_sid = os.getenv("TWILIO_API_KEY_SID", "")
    api_key_secret = os.getenv("TWILIO_API_KEY_SECRET", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")

    try:
        from twilio.rest import Client
    except ImportError:
        print("Twilio SDK not installed. Run: pip install twilio")
        return None

    if api_key_sid and api_key_secret:
        _twilio_client = Client(api_key_sid, api_key_secret, account_sid)
    elif auth_token:
        _twilio_client = Client(account_sid, auth_token)
    else:
        return None

    return _twilio_client


def _resolve_from_number(client, account_sid: str) -> Optional[str]:
    global _cached_from_number
    configured = os.getenv("TWILIO_SMS_FROM", "").strip()
    if configured:
        return configured
    if _cached_from_number:
        return _cached_from_number
    try:
        numbers = client.api.account(account_sid).incoming_phone_numbers.list(limit=1)
        if numbers:
            _cached_from_number = numbers[0].phone_number
            return _cached_from_number
    except Exception as exc:
        print(f"Twilio from-number lookup failed: {exc}")
    return None


def send_sms(to_phone: str, body: str) -> dict:
    """Send SMS via Twilio Messaging Service or From number."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    messaging_service_sid = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "").strip()
    client = _get_client()
    if not client or not account_sid:
        return {
            "ok": False,
            "delivery": "not_configured",
            "error": "Twilio not configured. Set TWILIO_ACCOUNT_SID and credentials in backend/.env",
        }

    if not messaging_service_sid:
        from_number = _resolve_from_number(client, account_sid)
        if not from_number:
            return {
                "ok": False,
                "delivery": "not_configured",
                "error": "Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM in backend/.env",
            }

    try:
        to_e164 = normalize_phone_e164(to_phone)
    except ValueError as exc:
        return {"ok": False, "delivery": "invalid_phone", "error": str(exc)}

    text = body[:160]

    try:
        if messaging_service_sid:
            message = client.messages.create(
                body=text,
                messaging_service_sid=messaging_service_sid,
                to=to_e164,
            )
        else:
            message = client.messages.create(
                body=text,
                from_=from_number,
                to=to_e164,
            )
        return {
            "ok": True,
            "delivery": "sent",
            "message_sid": message.sid,
            "status": message.status,
            "to": to_e164[-4:].rjust(len(to_e164), "*"),
        }
    except Exception as exc:
        print(f"Twilio send error: {exc}")
        return {"ok": False, "delivery": "failed", "error": str(exc)}
