"""
ai_service.py
---------------
This is WeatherGPT's "brain" for understanding language — but NOT for
knowing weather facts. Read this carefully, because it's the most
important architectural rule in the whole project:

    The AI NEVER invents temperature, rainfall, or any weather number.
    It only does two jobs:
      1. UNDERSTAND the question  -> figure out intent + location + date
      2. PHRASE the answer        -> turn real data (from weather_service.py)
                                      into a natural sentence

Modes & Fallback Hierarchy:
  1. Google Gemini API (Primary LLM):
     - Automatically checks all available models on the configured key.
     - Tests and dynamically sorts models into an intelligent fallback queue:
       (e.g., gemini-3.6-flash -> gemini-3.5-flash -> gemini-3.5-flash-lite -> ...)
     - If the primary model encounters rate limits (429), deprecation (404),
       or timeouts, it instantly fails over to the next candidate model.
  2. Anthropic Claude API (Secondary LLM fallback if configured).
  3. Rule-based Response Engine (Deterministic zero-cost fallback):
     - Uses keyword matching & localized templates in English and Hindi.
     - Always available even when offline or without API keys.
"""

import os
import re
import json
import time
import logging
from pathlib import Path
from typing import Optional, Tuple, List
import httpx
from dotenv import load_dotenv

# Search and load .env from backend directory or project root
for candidate in [
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path(".env").resolve(),
]:
    if candidate.exists():
        load_dotenv(dotenv_path=candidate, override=True)

logger = logging.getLogger("weathergpt.ai")

# ---------------------------------------------------------------------
# API Keys & Configurations
# ---------------------------------------------------------------------
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or os.getenv("GEMINIAPI_KEY") or "").strip()
GEMINI_MODEL_PREF = (os.getenv("GEMINI_MODEL") or "gemini-3.6-flash").strip()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5").strip()

USE_LLM = bool(GEMINI_API_KEY or ANTHROPIC_API_KEY)

# Preferred order of stable, fast Gemini models
DEFAULT_MODEL_PRIORITY = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.8-flash",
    "gemini-pro-latest",
]

# In-memory cache for discovered models
_cached_gemini_models: List[str] = []
_last_model_check_time: float = 0
_CACHE_TTL_SECONDS = 600  # 10 minutes


# Extended list of popular Indian cities (used as secondary keyword fallback)
KNOWN_CITIES = [
    # Metro & Major
    "delhi", "new delhi", "mumbai", "kolkata", "chennai", "bangalore", "bengaluru",
    "hyderabad", "ahmedabad", "pune", "surat", "jaipur", "lucknow", "kanpur",
    # Tier 2
    "indore", "bhopal", "nagpur", "patna", "vadodara", "ghaziabad", "ludhiana",
    "agra", "nashik", "faridabad", "meerut", "rajkot", "varanasi", "srinagar",
    "aurangabad", "dhanbad", "amritsar", "allahabad", "prayagraj", "ranchi",
    "coimbatore", "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai",
    "raipur", "kota", "chandigarh", "guwahati", "solapur", "hubli",
    # Odisha & East
    "cuttack", "bhubaneswar", "rourkela", "berhampur", "sambalpur", "puri",
    # Other notable
    "shimla", "dehradun", "nainital", "mussoorie", "manali", "leh", "gangtok",
    "bhopal", "ujjain", "gurgaon", "gurugram", "noida", "thane", "navi mumbai",
    "kochi", "thiruvananthapuram", "kozhikode", "thrissur", "mysuru", "mysore",
    "mangalore", "hubli", "belgaum", "bellary", "tiruchirappalli", "salem",
    "tirunelveli", "erode", "vellore", "tirupati", "warangal", "nizamabad",
    "karimnagar", "khammam", "nellore", "kurnool", "guntur", "vizag",
    "visakhapatnam", "kakinada", "rajahmundry",
]

# Common query patterns to extract city names from (regex groups)
_LOCATION_PATTERNS = [
    # "weather in cuttack odisha", "weather at pune", "temperature in delhi"
    r"(?:weather|temperature|forecast|rain|temp|mausam|barish)\s+(?:in|at|of|for)\s+([a-z][a-z ]+?)(?:\s+(?:today|tomorrow|now|aaj|kal|this week|odisha|state|district|city|india))?\s*$",
    # "what is the weather in cuttack"
    r"(?:in|at|of|for)\s+([a-z][a-z ]+?)(?:\s+(?:today|tomorrow|now|aaj|kal|this week|odisha|state|district|city|india))?\s*[?.]?\s*$",
    # "cuttack weather", "mumbai forecast"
    r"^([a-z][a-z ]+?)\s+(?:weather|temperature|forecast|rain|mausam|barish|temp)",
    # "whats the weather in cuttack odisha" — city before state
    r"(?:in|at|for)\s+([a-z]+)\s+(?:odisha|maharashtra|gujarat|rajasthan|up|uttarpradesh|mp|madhyapradesh|wb|westbengal|tn|tamilnadu|karnataka|kerala|andhra|telangana|bihar|jharkhand|assam|punjab|haryana|hp|himachal|uttarakhand|chhattisgarh|goa|sikkim|nagaland|manipur|mizoram|tripura|arunachal|meghalaya)",
]


def extract_location(text: str) -> str:
    """
    Smartly extracts city name from any natural language query.
    1. Regex pattern matching for 'weather in <city>', '<city> weather', etc.
    2. Known cities keyword scan.
    3. Falls back to 'indore' as the default demo city.
    """
    text_lower = text.lower().strip()

    # Step 1: Try regex patterns to extract city from natural language
    for pattern in _LOCATION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            candidate = match.group(1).strip()
            # Reject common non-city words
            skip_words = {
                "the", "it", "weather", "temperature", "rain", "today", "tomorrow",
                "now", "current", "forecast", "hot", "cold", "there", "this", "that",
                "my", "your", "our", "what", "how", "will", "aaj", "kal", "mausam"
            }
            if candidate and candidate not in skip_words and len(candidate) >= 3:
                # Normalize multi-word: 'new delhi' -> 'new delhi'
                return candidate.strip()

    # Step 2: Direct keyword scan against extended city list
    for city in KNOWN_CITIES:
        if city in text_lower:
            return city

    # Step 3: Default
    return "indore"



RAIN_WORDS = ["rain", "बारिश", "barish", "rainfall", "barsat", "varsha", "drizzle", "shower"]
TEMP_WORDS = ["temperature", "temp", "tapman", "तापमान", "hot", "cold", "garmi", "sardi", "weather"]
FORECAST_WORDS = ["tomorrow", "week", "forecast", "कल", "अगले", "आने वाले", "aane wale", "future"]
ALERT_WORDS = ["alert", "warning", "चेतावनी", "danger", "risk", "khatra", "flood", "cyclone", "storm"]
IRRIGATE_WORDS = ["irrigate", "irrigation", "सिंचाई", "crop", "फसल", "sinchai", "fasal", "kheti", "farmer", "agriculture"]
HEATWAVE_WORDS = ["heatwave", "heat wave", "लू", "precaution", "loo", "garmi"]


def detect_intent(text: str) -> str:
    """Keyword-based intent classifier."""
    text_lower = text.lower()

    if any(w in text_lower for w in IRRIGATE_WORDS):
        return "agriculture"
    if any(w in text_lower for w in HEATWAVE_WORDS):
        return "heatwave_precaution"
    if any(w in text_lower for w in ALERT_WORDS):
        return "alerts"
    if any(w in text_lower for w in RAIN_WORDS) and any(w in text_lower for w in FORECAST_WORDS):
        return "rain_forecast"
    if any(w in text_lower for w in RAIN_WORDS):
        return "rain_now"
    if any(w in text_lower for w in FORECAST_WORDS):
        return "forecast"
    if any(w in text_lower for w in TEMP_WORDS):
        return "temperature"
    return "current_weather"


def detect_language(text: str) -> str:
    """If the text contains Devanagari characters, treat it as Hindi."""
    return "hi" if re.search(r"[\u0900-\u097F]", text) else "en"


def parse_query(text: str) -> dict:
    """Turns a raw user question into structured intent."""
    return {
        "intent": detect_intent(text),
        "location": extract_location(text),
        "language": detect_language(text),
        "raw_query": text,
    }


# ---------------------------------------------------------------------
# Dynamic Gemini Model Discovery & Fallback Ordering
# ---------------------------------------------------------------------
async def discover_gemini_models() -> List[str]:
    """
    Queries the Gemini API to check all models available for the configured API key.
    Filters for models that support `generateContent` and returns them sorted by priority.
    """
    global _cached_gemini_models, _last_model_check_time

    if not GEMINI_API_KEY:
        return []

    now = time.time()
    if _cached_gemini_models and (now - _last_model_check_time < _CACHE_TTL_SECONDS):
        return _cached_gemini_models

    discovered_names = []
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                for m in data.get("models", []):
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        raw_name = m.get("name", "")
                        clean_name = raw_name.replace("models/", "").strip()
                        # Exclude pure image/audio generator preview models from text chat if desired
                        if not any(tag in clean_name for tag in ["-tts-", "image-preview", "transcribe", "robotics"]):
                            discovered_names.append(clean_name)
    except Exception as e:
        logger.warning(f"Error discovering Gemini models: {e}")

    # Build prioritized fallback list:
    # 1. User preferred model from .env (if supported)
    # 2. Curated standard fast/stable models that exist in discovered list
    # 3. Any remaining discovered models
    fallback_queue: List[str] = []

    if GEMINI_MODEL_PREF:
        clean_pref = GEMINI_MODEL_PREF.replace("models/", "").strip()
        fallback_queue.append(clean_pref)

    for m in DEFAULT_MODEL_PRIORITY:
        if m not in fallback_queue and (not discovered_names or m in discovered_names):
            fallback_queue.append(m)

    for m in discovered_names:
        if m not in fallback_queue:
            fallback_queue.append(m)

    _cached_gemini_models = fallback_queue
    _last_model_check_time = now
    return fallback_queue


# ---------------------------------------------------------------------
# Gemini Response Generator with Dynamic Multi-Model Fallbacks
# ---------------------------------------------------------------------
async def generate_response_gemini(intent: str, language: str, context: dict, raw_query: str) -> Tuple[str, str]:
    """
    Generates a natural language response using Gemini.
    Tries candidate models in fallback order until one succeeds.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    models_to_try = await discover_gemini_models()
    if not models_to_try:
        models_to_try = DEFAULT_MODEL_PRIORITY

    lang_name = "Hindi" if language == "hi" else "English"
    # Explicitly tell Gemini to write out units as text (avoids degree symbol encoding edge cases)
    system_instruction = (
        "You are WeatherGPT, a friendly weather assistant for Indian users. "
        "You are given REAL weather data as JSON context. "
        "Write 1-2 complete natural sentences answering the user's question "
        f"in {lang_name}. "
        "When mentioning temperature, write the full number with units like '29 degrees Celsius' or '29°C'. "
        "CRITICAL RULE: Use ONLY the numbers given in the context. "
        "NEVER invent, estimate, or guess any weather value not present in the context. "
        "Always complete your sentence — never stop mid-sentence."
    )

    user_text = (
        f"User question: {raw_query}\n"
        f"Intent: {intent}\n"
        f"Weather context: {json.dumps(context, ensure_ascii=False)}"
    )

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_text}]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 400,
        }
    }

    last_error = None
    async with httpx.AsyncClient(timeout=10) as client:
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"].strip()
                            return text, f"gemini:{model}"
                else:
                    err_msg = resp.text[:150]
                    logger.warning(f"Gemini model {model} returned status {resp.status_code}: {err_msg}")
                    last_error = f"{model} status {resp.status_code}"
            except Exception as e:
                logger.warning(f"Gemini model {model} failed: {e}")
                last_error = f"{model} error: {e}"

    raise RuntimeError(f"All Gemini fallback models failed. Last error: {last_error}")


# ---------------------------------------------------------------------
# Claude / Anthropic Secondary Fallback
# ---------------------------------------------------------------------
async def generate_response_anthropic(intent: str, language: str, context: dict, raw_query: str) -> Tuple[str, str]:
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    lang_name = "Hindi" if language == "hi" else "English"
    system_prompt = (
        "You are WeatherGPT, a weather assistant for Indian users. "
        "You are given REAL weather data as JSON context. "
        "Write ONE short, natural, friendly sentence or two answering the user's question "
        f"in {lang_name}. "
        "CRITICAL RULE: Use ONLY the numbers given in the context. "
        "NEVER invent, estimate, or guess any weather value not present in the context."
    )
    user_prompt = f"User question: {raw_query}\nIntent: {intent}\nWeather context: {json.dumps(context)}"

    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL or "claude-sonnet-5",
                "max_tokens": 200,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"].strip(), f"anthropic:{ANTHROPIC_MODEL}"


# ---------------------------------------------------------------------
# Response templates (rule-based — always available, zero API cost)
# ---------------------------------------------------------------------
TEMPLATES = {
    "en": {
        "current_weather": "The weather in {location} right now is {condition} with a temperature of {temperature}°C (feels like {feels_like}°C). Humidity is {humidity}% and wind speed is {wind_speed} km/h.",
        "temperature": "The current temperature in {location} is {temperature}°C, feels like {feels_like}°C.",
        "rain_now": "Current rain probability in {location} is {rain_probability}%. Condition: {condition}.",
        "rain_forecast": "Tomorrow's rain probability in {location} is around {rain_probability}%, with an expected condition of {condition}.",
        "forecast": "Here's the forecast for {location}: expect {condition} with a high of {temp_max}°C and a low of {temp_min}°C.",
        "alerts_none": "No active weather alerts for {location} right now. Conditions look normal.",
        "alerts_some": "⚠️ {count} active alert(s) for {location}: {alert_summary}",
        "heatwave_precaution": "Current temperature in {location} is {temperature}°C. During heatwaves: stay hydrated, avoid direct sun 12–3 PM, wear light cotton clothing, and check on elderly/children regularly.",
    },
    "hi": {
        "current_weather": "{location} में अभी मौसम {condition} है। तापमान {temperature}°C है (महसूस {feels_like}°C जैसा)। आर्द्रता {humidity}% है और हवा की गति {wind_speed} किमी/घंटा है।",
        "temperature": "{location} में वर्तमान तापमान {temperature}°C है, महसूस {feels_like}°C जैसा होता है।",
        "rain_now": "{location} में अभी बारिश की संभावना {rain_probability}% है। स्थिति: {condition}.",
        "rain_forecast": "{location} में कल बारिश की संभावना लगभग {rain_probability}% है, स्थिति {condition} रहने की उम्मीद है।",
        "forecast": "{location} का पूर्वानुमान: {condition}, अधिकतम तापमान {temp_max}°C और न्यूनतम {temp_min}°C रहने की संभावना है।",
        "alerts_none": "{location} के लिए अभी कोई सक्रिय मौसम चेतावनी नहीं है। स्थिति सामान्य है।",
        "alerts_some": "⚠️ {location} के लिए {count} सक्रिय चेतावनी: {alert_summary}",
        "heatwave_precaution": "{location} में वर्तमान तापमान {temperature}°C है। लू के दौरान: पानी पीते रहें, दोपहर 12-3 बजे धूप से बचें, हल्के सूती कपड़े पहनें, बुजुर्गों और बच्चों का ध्यान रखें।",
    },
}

CONDITION_HI = {
    "Clear": "साफ़", "Partly Cloudy": "आंशिक बादल", "Cloudy": "बादल छाए हुए",
    "Light Rain": "हल्की बारिश", "Moderate Rain": "मध्यम बारिश",
    "Thunderstorm": "आंधी-तूफान", "Haze": "धुंध",
}


def generate_response_rule_based(intent: str, language: str, context: dict) -> str:
    """Fills in a template using ONLY real data passed in `context`."""
    lang = language if language in TEMPLATES else "en"
    template_set = TEMPLATES[lang]
    template = template_set.get(intent, template_set["current_weather"])

    render_context = dict(context)
    if lang == "hi" and "condition" in render_context:
        render_context["condition"] = CONDITION_HI.get(render_context["condition"], render_context["condition"])

    try:
        return template.format(**render_context)
    except KeyError:
        return template_set["current_weather"].format(**{**render_context, **_safe_defaults()})


def _safe_defaults():
    return {
        "condition": "Clear", "temperature": "N/A", "feels_like": "N/A",
        "humidity": "N/A", "wind_speed": "N/A", "location": "your location"
    }


# ---------------------------------------------------------------------
# Master Response Generator
# ---------------------------------------------------------------------
async def generate_response(intent: str, language: str, context: dict, raw_query: str) -> Tuple[str, str]:
    """
    Returns (response_text, method_used).
    1. Tries Gemini with dynamic model fallback queue.
    2. Tries Anthropic Claude if configured and Gemini fails.
    3. Falls back to deterministic rule-based templates if all LLMs fail.
    """
    # 1. Try Gemini
    if GEMINI_API_KEY:
        try:
            return await generate_response_gemini(intent, language, context, raw_query)
        except Exception as e:
            logger.warning(f"Gemini generation failed, trying next fallback: {e}")

    # 2. Try Anthropic
    if ANTHROPIC_API_KEY:
        try:
            return await generate_response_anthropic(intent, language, context, raw_query)
        except Exception as e:
            logger.warning(f"Anthropic generation failed: {e}")

    # 3. Rule-based template fallback
    return generate_response_rule_based(intent, language, context), "rule_based"


def get_llm_status() -> dict:
    """Returns current LLM status for health / diagnostic endpoints."""
    return {
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_preferred_model": GEMINI_MODEL_PREF,
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "primary_provider": "gemini" if GEMINI_API_KEY else ("anthropic" if ANTHROPIC_API_KEY else "rule_based"),
        "cached_models": _cached_gemini_models,
    }
