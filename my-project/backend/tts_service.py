"""
tts_service.py
--------------
Multilingual Text-to-Speech (TTS) engine for WeatherGPT.
Provides high-fidelity, natural speech audio for all Indian regional languages:
English, Hindi, Odia, Bengali, Tamil, Telugu, Marathi, Gujarati,
Kannada, Punjabi, Malayalam, Urdu, Assamese, and more.
"""

import re
import logging
from typing import List
import httpx

logger = logging.getLogger("weathergpt.tts")

# In-memory cache for fast instant playback of repeated queries / greetings
_TTS_CACHE: dict[str, bytes] = {}
_MAX_CACHE_SIZE = 400

# Mapping frontend ISO / regional language codes to Google TTS engine codes
TTS_LANG_MAP = {
    "en": "en",
    "en-in": "en-IN",
    "hi": "hi",
    "hi-in": "hi",
    "bn": "bn",
    "bn-in": "bn",
    "ta": "ta",
    "ta-in": "ta",
    "te": "te",
    "te-in": "te",
    "mr": "mr",
    "mr-in": "mr",
    "gu": "gu",
    "gu-in": "gu",
    "kn": "kn",
    "kn-in": "kn",
    "pa": "pa",
    "pa-in": "pa",
    "ml": "ml",
    "ml-in": "ml",
    "ur": "ur",
    "ur-in": "ur",
    "ur-pk": "ur",
    "or": "hi",       # Odia text voiced with Indo-Aryan phonetic engine
    "or-in": "hi",
    "as": "bn",       # Assamese voiced with Eastern Indic phonetic engine
    "sa": "hi",       # Sanskrit
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Referer": "https://translate.google.com/",
}


def clean_tts_text(text: str, lang: str = "en") -> str:
    """
    Cleans markdown formatting, emojis, symbols, and standardizes weather units
    for natural, seamless speech pronunciation.
    """
    if not text:
        return ""

    t = text
    # Strip markdown bold, italics, code blocks, headers, blockquotes
    t = re.sub(r"[*#_~`>]", " ", t)
    # Strip URLs
    t = re.sub(r"https?://\S+", " ", t)
    # Strip emojis and unicode variation selectors
    t = re.sub(
        r"[\U00010000-\U0010ffff\u200d\ufe0f\u2600-\u27BF\uFE00-\uFE0F]",
        " ",
        t,
    )

    # Unit replacements based on language family
    if lang.lower() in ("hi", "mr", "gu", "pa", "or", "bn", "ta", "te", "kn", "ml", "ur"):
        t = re.sub(r"(\d+)\s*°\s*C\b", r"\1 डिग्री सेल्सियस", t)
        t = re.sub(r"(\d+)\s*°\s*F\b", r"\1 डिग्री फारेनहाइट", t)
        t = t.replace("°C", " डिग्री सेल्सियस ")
        t = t.replace("°F", " डिग्री फारेनहाइट ")
        t = t.replace("°", " डिग्री ")
        t = t.replace("km/h", " किलोमीटर प्रति घंटा ")
        t = t.replace("hPa", " हेक्टोपास्कल ")
        t = t.replace("%", " प्रतिशत ")
    else:
        t = re.sub(r"(\d+)\s*°\s*C\b", r"\1 degrees Celsius", t)
        t = re.sub(r"(\d+)\s*°\s*F\b", r"\1 degrees Fahrenheit", t)
        t = t.replace("°C", " degrees Celsius ")
        t = t.replace("°F", " degrees Fahrenheit ")
        t = t.replace("°", " degrees ")
        t = t.replace("km/h", " kilometers per hour ")
        t = t.replace("hPa", " hectopascals ")
        t = t.replace("%", " percent ")

    # Collapse multiple whitespaces
    t = re.sub(r"\s+", " ", t).strip()
    return t


def split_sentences(text: str, max_len: int = 180) -> List[str]:
    """
    Splits text into naturally paced sentence chunks to prevent TTS truncation.
    """
    if not text:
        return []

    # Split by standard sentence delimiters including Indian Purna Viram (।)
    parts = re.split(r"([।\.\!\?\n\:\;]+)", text)
    chunks = []
    curr = ""

    for part in parts:
        if not part:
            continue
        if len(curr) + len(part) <= max_len:
            curr += part
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = part

    if curr.strip():
        chunks.append(curr.strip())

    # Further break down any segments that are still longer than max_len
    final_chunks = []
    for c in chunks:
        c = c.strip()
        while len(c) > max_len:
            split_at = c[:max_len].rfind(" ")
            if split_at == -1 or split_at < 30:
                split_at = max_len
            chunk_slice = c[:split_at].strip()
            if chunk_slice:
                final_chunks.append(chunk_slice)
            c = c[split_at:].strip()
        if c:
            final_chunks.append(c)

    return [fc for fc in final_chunks if fc]


async def generate_tts_audio(text: str, lang: str = "en") -> bytes:
    """
    Generates combined MP3 audio stream for given text in any requested language.
    Utilizes in-memory caching for low latency.
    """
    norm_lang = (lang or "en").strip().lower()
    cleaned = clean_tts_text(text, norm_lang)
    if not cleaned:
        return b""

    cache_key = f"{norm_lang}:{cleaned}"
    if cache_key in _TTS_CACHE:
        return _TTS_CACHE[cache_key]

    tts_code = TTS_LANG_MAP.get(norm_lang, "en")
    # If base language prefix exists in map (e.g. 'ta-in' -> 'ta')
    if tts_code == "en" and "-" in norm_lang:
        tts_code = TTS_LANG_MAP.get(norm_lang.split("-")[0], "en")

    chunks = split_sentences(cleaned, max_len=180)
    if not chunks:
        return b""

    combined = bytearray()
    async with httpx.AsyncClient(headers=HEADERS, timeout=12.0, follow_redirects=True) as client:
        for chunk in chunks:
            try:
                res = await client.get(
                    "https://translate.google.com/translate_tts",
                    params={
                        "ie": "UTF-8",
                        "q": chunk,
                        "tl": tts_code,
                        "client": "tw-ob",
                    },
                )
                if res.status_code == 200 and len(res.content) > 0:
                    combined.extend(res.content)
                else:
                    logger.warning(
                        f"TTS chunk fetch warning: status {res.status_code} for lang {tts_code}"
                    )
            except Exception as e:
                logger.error(f"TTS chunk download error for '{chunk[:30]}...': {e}")

    result = bytes(combined)

    # Manage cache size
    if len(_TTS_CACHE) >= _MAX_CACHE_SIZE:
        # Clear oldest half of entries
        keys = list(_TTS_CACHE.keys())
        for k in keys[: len(keys) // 2]:
            del _TTS_CACHE[k]

    if result:
        _TTS_CACHE[cache_key] = result

    return result
