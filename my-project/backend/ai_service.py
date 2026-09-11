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
  3. Multilingual Rule-based Response Engine (Deterministic zero-cost fallback):
     - Supports English, Hindi, Tamil, Telugu, Marathi, Bengali, Kannada, Gujarati, Punjabi, Malayalam, Odia, Urdu.
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

# Language name lookup for 12 supported Indian regional languages
LANG_MAP = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "bn": "Bengali",
    "kn": "Kannada",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ml": "Malayalam",
    "or": "Odia",
    "ur": "Urdu",
}

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
    "cuttack", "bhubaneswar", "rourkela", "berhampur", "sambalpur", "puri", "salipur", "salepur",
    # Other notable
    "shimla", "dehradun", "nainital", "mussoorie", "manali", "leh", "gangtok",
    "bhopal", "ujjain", "gurgaon", "gurugram", "noida", "thane", "navi mumbai",
    "kochi", "thiruvananthapuram", "kozhikode", "thrissur", "mysuru", "mysore",
    "mangalore", "hubli", "belgaum", "bellary", "tiruchirappalli", "salem",
    "tirunelveli", "erode", "vellore", "tirupati", "warangal", "nizamabad",
    "karimnagar", "khammam", "nellore", "kurnool", "guntur", "vizag",
    "visakhapatnam", "kakinada", "rajahmundry",
]

# Multilingual script synonyms mapping Indian regional names to normalized English city names
INDIAN_CITY_SYNONYMS = {
    # Puri
    "पुरी": "puri", "ପୁରୀ": "puri", "பூரி": "puri", "పూరి": "puri", "পুরী": "puri", "પૂરી": "puri",
    # Cuttack
    "कटक": "cuttack", "କଟକ": "cuttack", "கட்டாக்": "cuttack", "కటక్": "cuttack", "কটক": "cuttack",
    # Bhubaneswar
    "भुवनेश्वर": "bhubaneswar", "ଭୁବନେଶ୍ୱର": "bhubaneswar", "புவனேஸ்வர்": "bhubaneswar", "భువనేశ్వర్": "bhubaneswar", "ভুবনেশ্বর": "bhubaneswar",
    # Salipur / Salepur
    "सालेपुर": "salipur", "सालीपुर": "salipur", "ସାଲେପୁର": "salipur", "ସାଲିପୁର": "salipur",
    # Delhi / New Delhi
    "दिल्ली": "delhi", "नई दिल्ली": "new delhi", "দিল্লি": "delhi", "தில்லி": "delhi", "ఢిల్లీ": "delhi", "દિલ્હી": "delhi", "ਦਿੱਲੀ": "delhi", "ദില്ലി": "delhi", "دہلی": "delhi", "ଦିଲ୍ଲୀ": "delhi",
    # Mumbai
    "मुंबई": "mumbai", "মুম্বই": "mumbai", "மும்பை": "mumbai", "ముంబై": "mumbai", "મુંબઈ": "mumbai", "ਮੁੰਬਈ": "mumbai", "മുംബൈ": "mumbai", "ممبئی": "mumbai", "ମୁମ୍ବାଇ": "mumbai",
    # Kolkata
    "कोलकाता": "kolkata", "কলকাতা": "kolkata", "கொல்கத்தா": "kolkata", "కోల్‌కతా": "kolkata", "કોલકાતા": "kolkata", "ਕੋਲਕਾਤਾ": "kolkata", "କୋଲକାତା": "kolkata",
    # Chennai
    "चेन्नई": "chennai", "சென்னை": "chennai", "చెన్నై": "chennai", "ચેન્નઈ": "chennai", "ଚେନ୍ନାଇ": "chennai", "ചെന്നൈ": "chennai",
    # Bengaluru / Bangalore
    "बेंगलुरु": "bengaluru", "बैंगलोर": "bangalore", "பெங்களூரு": "bengaluru", "బెంగళూరు": "bengaluru", "બેંગલુરુ": "bengaluru", "ਬੈਂਗਲੁਰੂ": "bengaluru", "ബെംഗളൂരു": "bengaluru", "ବେଙ୍ଗାଲୁରୁ": "bengaluru",
    # Hyderabad
    "हैदराबाद": "hyderabad", "హైదరాబాద్": "hyderabad", "ஹைதராபாத்": "hyderabad", "হায়দ্রাবাদ": "hyderabad", "હૈદરાબાદ": "hyderabad", "ହାଇଦ୍ରାବାଦ": "hyderabad",
    # Indore
    "इंदौर": "indore", "ইন্দোর": "indore", "இந்தோர்": "indore", "ఇండోర్": "indore", "ઇન્દોર": "indore", "ଇନ୍ଦୋର": "indore",
    # Jaipur
    "जयपुर": "jaipur", "ஜெய்ப்பூர்": "jaipur", "జైపూర్": "jaipur", "জয়পুর": "jaipur", "જયપુર": "jaipur", "ଜୟପୁର": "jaipur",
    # Ahmedabad
    "अहमदाबाद": "ahmedabad", "અમદાવાદ": "ahmedabad", "அகமதாபாத்": "ahmedabad", "అహ్మదాబాద్": "ahmedabad",
    # Pune
    "पुणे": "pune", "பூனே": "pune", "పుణె": "pune", "પુણે": "pune", "ପୁଣେ": "pune",
    # Patna
    "पटना": "patna", "பாட்னா": "patna", "పాట్నా": "patna", "পাটনা": "patna", "ପାଟନା": "patna",
    # Lucknow
    "लखनऊ": "lucknow", "லக்னோ": "lucknow", "లక్నో": "lucknow", "ଲକ୍ଷ୍ନୌ": "lucknow",
    # Varanasi
    "वाराणसी": "varanasi", "काशी": "varanasi", "ವಾರಣಾಸಿ": "varanasi", "વારાણસી": "varanasi", "ବାରଣାସୀ": "varanasi",
    # Rourkela
    "राउरकेला": "rourkela", "ରାଉରକେଲା": "rourkela",
}

# Common query patterns to extract city names from (regex groups)
_LOCATION_PATTERNS = [
    # "weather in cuttack odisha", "weather at pune", "temperature in delhi"
    r"(?:weather|temperature|forecast|rain|temp|mausam|barish|pag|havaman)\s+(?:in|at|of|for|re|me|lo)\s+([a-z][a-z ]+?)(?:\s+(?:today|tomorrow|now|aaj|kal|this week|odisha|state|district|city|india))?\s*$",
    # "what is the weather in cuttack"
    r"(?:in|at|of|for)\s+([a-z][a-z ]+?)(?:\s+(?:today|tomorrow|now|aaj|kal|this week|odisha|state|district|city|india))?\s*[?.]?\s*$",
    # "cuttack weather", "mumbai forecast"
    r"^([a-z][a-z ]+?)\s+(?:weather|temperature|forecast|rain|mausam|barish|temp)",
    # "whats the weather in cuttack odisha" — city before state
    r"(?:in|at|for)\s+([a-z]+)\s+(?:odisha|maharashtra|gujarat|rajasthan|up|uttarpradesh|mp|madhyapradesh|wb|westbengal|tn|tamilnadu|karnataka|kerala|andhra|telangana|bihar|jharkhand|assam|punjab|haryana|hp|himachal|uttarakhand|chhattisgarh|goa|sikkim|nagaland|manipur|mizoram|tripura|arunachal|meghalaya)",
]


def extract_location(text: str) -> str:
    """
    Smartly extracts city name from any natural language query across all Indian languages.
    1. Checks multilingual script synonyms.
    2. Regex pattern matching for 'weather in <city>', '<city> weather', etc.
    3. Known cities keyword scan.
    4. Falls back to 'indore' or first recognized geographic entity.
    """
    text_clean = text.strip()
    text_lower = text_clean.lower()

    # Step 1: Multilingual direct match in native scripts
    for native_word, standard_city in INDIAN_CITY_SYNONYMS.items():
        if native_word in text_clean:
            return standard_city

    # Step 2: Try regex patterns to extract city from natural language
    for pattern in _LOCATION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            candidate = match.group(1).strip()
            # Reject common non-city words
            skip_words = {
                "the", "it", "weather", "temperature", "rain", "today", "tomorrow",
                "now", "current", "forecast", "hot", "cold", "there", "this", "that",
                "my", "your", "our", "what", "how", "will", "aaj", "kal", "mausam",
                "pag", "havaman"
            }
            if candidate and candidate not in skip_words and len(candidate) >= 3:
                return candidate.strip()

    # Step 3: Direct keyword scan against extended city list
    for city in KNOWN_CITIES:
        if re.search(r'\b' + re.escape(city) + r'\b', text_lower):
            return city
        elif city in text_lower and len(city) >= 4:
            return city

    # Step 4: Default
    return "puri"


RAIN_WORDS = [
    "rain", "बारिश", "barish", "rainfall", "barsat", "varsha", "drizzle", "shower",
    "ବର୍ଷା", "மழை", "వర్షం", "पाऊस", "বৃষ্টি", "மழைப்பொழிவு", "மழை", "వర్షం", "বৃষ্টিপাত"
]
TEMP_WORDS = [
    "temperature", "temp", "tapman", "तापमान", "hot", "cold", "garmi", "sardi", "weather",
    "ତାପମାତ୍ରା", "வெப்பநிலை", "ఉష్ణోగ్రత", "ತಾಪಮಾನ", "વાતાવરણ", "तापमान"
]
FORECAST_WORDS = [
    "tomorrow", "week", "forecast", "कल", "अगले", "आने वाले", "aane wale", "future",
    "ଆଗାମୀ", "କାଲି", "நாளை", "రేపు", "কাল", "આવતીકાલે", "ਕੱਲ੍ਹ"
]
ALERT_WORDS = [
    "alert", "warning", "चेतावनी", "danger", "risk", "khatra", "flood", "cyclone", "storm",
    "ସତର୍କତା", "எச்சரிக்கை", "హెచ్చరిక", "সতর্কতা", "સાવચેતી"
]
IRRIGATE_WORDS = [
    "irrigate", "irrigation", "सिंचाई", "crop", "फसल", "sinchai", "fasal", "kheti", "farmer", "agriculture",
    "ଚାଷ", "ଜଳସେଚନ", "விவசாயம்", "వ్యవసాయం", "शेती", "কৃষি", "ખેતી"
]
HEATWAVE_WORDS = ["heatwave", "heat wave", "लू", "precaution", "loo", "garmi", "ଗ୍ରୀଷ୍ମ ପ୍ରବାହ"]


def detect_intent(text: str) -> str:
    """Keyword-based intent classifier with multi-script awareness."""
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
    """Detect script if not provided explicitly."""
    if re.search(r"[\u0B00-\u0B7F]", text):
        return "or"  # Odia
    if re.search(r"[\u0980-\u09FF]", text):
        return "bn"  # Bengali
    if re.search(r"[\u0B80-\u0BFF]", text):
        return "ta"  # Tamil
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "te"  # Telugu
    if re.search(r"[\u0C80-\u0CFF]", text):
        return "kn"  # Kannada
    if re.search(r"[\u0D00-\u0D7F]", text):
        return "ml"  # Malayalam
    if re.search(r"[\u0A80-\u0AFF]", text):
        return "gu"  # Gujarati
    if re.search(r"[\u0A00-\u0A7F]", text):
        return "pa"  # Punjabi
    if re.search(r"[\u0600-\u06FF]", text):
        return "ur"  # Urdu
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"  # Hindi / Devanagari
    return "en"


def parse_query(text: str, preferred_language: Optional[str] = None) -> dict:
    """Turns a raw user question into structured intent and language."""
    detected_lang = detect_language(text)
    final_lang = preferred_language if preferred_language and preferred_language != "en" else (detected_lang if detected_lang != "en" else (preferred_language or "en"))

    return {
        "intent": detect_intent(text),
        "location": extract_location(text),
        "language": final_lang,
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
                        if clean_name:
                            discovered_names.append(clean_name)
    except Exception as e:
        logger.warning(f"Could not discover Gemini models dynamically: {e}")

    fallback_queue = []
    if GEMINI_MODEL_PREF:
        fallback_queue.append(GEMINI_MODEL_PREF)

    for p in DEFAULT_MODEL_PRIORITY:
        if p not in fallback_queue and (p in discovered_names or not discovered_names):
            fallback_queue.append(p)

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
    Generates a natural language response using Gemini in any selected Indian language.
    Tries candidate models in fallback order until one succeeds.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    models_to_try = await discover_gemini_models()
    if not models_to_try:
        models_to_try = DEFAULT_MODEL_PRIORITY

    lang_name = LANG_MAP.get(language, "English")
    system_instruction = (
        "You are WeatherGPT, a friendly, helpful weather assistant for Indian users. "
        "You are given REAL live weather data as JSON context. "
        f"Write 1-2 complete natural sentences answering the user's question in {lang_name}. "
        "When mentioning temperature, state the number clearly with units like '29°C' or degrees Celsius. "
        "CRITICAL RULE: Use ONLY the numbers provided in the context. "
        "NEVER invent, hallucinate, or estimate any weather value not in the context. "
        "Always complete your sentence and speak with a polite, natural tone in the requested language."
    )

    user_text = (
        f"User question: {raw_query}\n"
        f"Requested Language: {lang_name} ({language})\n"
        f"Intent: {intent}\n"
        f"Real Live Weather context: {json.dumps(context, ensure_ascii=False)}"
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

    lang_name = LANG_MAP.get(language, "English")
    system_prompt = (
        "You are WeatherGPT, a weather assistant for Indian users. "
        "You are given REAL weather data as JSON context. "
        f"Write ONE short, natural, friendly sentence or two answering the user's question in {lang_name}. "
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
# Response templates (rule-based multilingual fallback — zero API cost)
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
    "or": {
        "current_weather": "{location} ରେ ବର୍ତ୍ତମାନ ପାଗ {condition} ଅଛି। ତାପମାତ୍ରା {temperature}°C (ଅନୁଭବ {feels_like}°C)। ଆର୍ଦ୍ରତା {humidity}% ଏବଂ ପବନର ଗତି {wind_speed} କିମି/ଘଣ୍ଟା।",
        "temperature": "{location} ରେ ବର୍ତ୍ତମାନର ତାପମାତ୍ରା {temperature}°C ଅଟେ।",
        "rain_now": "{location} ରେ ବର୍ଷା ସମ୍ଭାବନା {rain_probability}% ଅଛି। ପାଗ: {condition}.",
        "rain_forecast": "ଆସନ୍ତାକାଲି {location} ରେ ବର୍ଷାର ସମ୍ଭାବନା ପ୍ରାୟ {rain_probability}% ଅଛି।",
        "forecast": "{location} ର ପୂର୍ବାନୁମାନ: {condition}, ସର୍ବାଧିକ ତାପମାତ୍ରା {temp_max}°C ଓ ସର୍ବନିମ୍ନ {temp_min}°C।",
        "alerts_none": "{location} ପାଇଁ ବର୍ତ୍ତମାନ କୌଣସି ବିପଦ ସତର୍କତା ନାହିଁ।",
        "alerts_some": "⚠️ {location} ପାଇଁ {count} ଟି ସତର୍କତା: {alert_summary}",
        "heatwave_precaution": "{location} ରେ ତାପମାତ୍ରା {temperature}°C। ଗ୍ରୀଷ୍ମ ପ୍ରବାହ ସମୟରେ ପ୍ରଚୁର ପାଣି ପିଅନ୍ତୁ ଏବଂ ଖରାରୁ ଦୂରେଇ ରୁହନ୍ତୁ।",
    },
    "bn": {
        "current_weather": "{location}-এ এখন আবহাওয়া {condition}। তাপমাত্রা {temperature}°C (অনুভূত {feels_like}°C)। আর্দ্রতা {humidity}% এবং বাতাসের গতি {wind_speed} কিমি/ঘণ্টা।",
        "temperature": "{location}-এর বর্তমান তাপমাত্রা {temperature}°C।",
        "rain_now": "{location}-এ বৃষ্টির সম্ভাবনা {rain_probability}%।",
        "rain_forecast": "আগামীকাল {location}-এ বৃষ্টির সম্ভাবনা প্রায় {rain_probability}%।",
        "forecast": "{location}-এর পূর্বাভাস: {condition}, সর্বোচ্চ {temp_max}°C এবং সর্বনিম্ন {temp_min}°C।",
        "alerts_none": "{location}-এর জন্য এই মুহূর্তে কোনও সতর্কতা নেই।",
        "alerts_some": "⚠️ {location}-এর জন্য {count}টি সক্রিয় সতর্কতা: {alert_summary}",
        "heatwave_precaution": "বর্তমান তাপমাত্রা {temperature}°C। প্রচুর জল পান করুন এবং রোদ এড়িয়ে চলুন।",
    },
    "ta": {
        "current_weather": "{location}-ல் தற்போதைய வானிலை {condition}, வெப்பநிலை {temperature}°C (உணரப்படுவது {feels_like}°C). ஈரப்பதம் {humidity}%, காற்றின் வேகம் {wind_speed} கிமீ/மணி.",
        "temperature": "{location}-ல் தற்போதைய வெப்பநிலை {temperature}°C.",
        "rain_now": "{location}-ல் மழைக்கான வாய்ப்பு {rain_probability}%.",
        "rain_forecast": "நாளை {location}-ல் மழைக்கான வாய்ப்பு {rain_probability}%.",
        "forecast": "{location} வானிலை முன்னறிவிப்பு: {condition}, அதிகபட்சம் {temp_max}°C, குறைந்தபட்சம் {temp_min}°C.",
        "alerts_none": "{location}-க்கு தற்போது எச்சரிக்கைகள் ஏதுமில்லை.",
        "alerts_some": "⚠️ {location}-க்கு {count} எச்சரிக்கைகள்: {alert_summary}",
        "heatwave_precaution": "வெப்பநிலை {temperature}°C. வெப்ப அலை போது போதுமான தண்ணீர் குடிக்கவும்.",
    },
    "te": {
        "current_weather": "{location} లో ప్రస్తుత వాతావరణం {condition}, ఉష్ణోగ్రత {temperature}°C (అనిపించేది {feels_like}°C). తేమ {humidity}%, గాలి వేగం {wind_speed} కిమీ/గం.",
        "temperature": "{location} లో ప్రస్తుత ఉష్ణోగ్రత {temperature}°C.",
        "rain_now": "{location} లో వర్షం పడే అవకాశం {rain_probability}%.",
        "rain_forecast": "రేపు {location} లో వర్షం అవకాశం దాదాపు {rain_probability}%.",
        "forecast": "{location} వాతావరణ అంచనా: {condition}, గరిష్ట {temp_max}°C, కనిష్ట {temp_min}°C.",
        "alerts_none": "{location} కు ఎలాంటి వాతావరణ హెచ్చరికలు లేవు.",
        "alerts_some": "⚠️ {location} కు {count} హెచ్చరికలు ఉన్నాయి: {alert_summary}",
        "heatwave_precaution": "ఉష్ణోగ్రత {temperature}°C ఉంది. ఎండ తీవ్రత నుంచి రక్షణకు నీరు ఎక్కువగా తాగండి.",
    },
}


def generate_response_rule_based(intent: str, language: str, context: dict) -> str:
    """Fills in a template using ONLY real data passed in `context`."""
    lang = language if language in TEMPLATES else "en"
    template_set = TEMPLATES[lang]
    template = template_set.get(intent, template_set.get("current_weather", TEMPLATES["en"]["current_weather"]))

    render_context = dict(context)

    try:
        return template.format(**render_context)
    except KeyError:
        fallback_tpl = template_set.get("current_weather", TEMPLATES["en"]["current_weather"])
        return fallback_tpl.format(**{**render_context, **_safe_defaults()})


def _safe_defaults():
    return {
        "condition": "Clear", "temperature": "N/A", "feels_like": "N/A",
        "humidity": "N/A", "wind_speed": "N/A", "location": "your location",
        "rain_probability": 0, "temp_max": 30, "temp_min": 22,
        "count": 0, "alert_summary": "None"
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
