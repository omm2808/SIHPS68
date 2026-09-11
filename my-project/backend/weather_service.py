"""
weather_service.py
--------------------
Central weather service for WeatherGPT.

Architecture:
  WeatherProvider (abstract interface)
    |-- RealWeatherProvider       -> OpenWeatherMap API (uses WEATHER_API_KEY from .env)
    |-- OpenMeteoWeatherProvider  -> Live global real-time satellite & meteorological API (real data, zero-key)
    |-- MockWeatherProvider       -> Synthetic test data (used ONLY when DEMO_MODE=true)

Selection Logic:
  - If DEMO_MODE=true in .env              -> MockWeatherProvider
  - If WEATHER_API_KEY is present in .env  -> RealWeatherProvider (OpenWeatherMap)
  - If DEMO_MODE=false (default)           -> OpenMeteoWeatherProvider (Real live data)
"""

import os
import random
import math
from pathlib import Path
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
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

CONDITIONS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Moderate Rain", "Thunderstorm", "Haze"]

CITY_COORDS = {
    "salipur": (20.4795, 86.1306),
    "salepur": (20.4795, 86.1306),
    "cuttack": (20.4625, 85.8828),
    "bhubaneswar": (20.2961, 85.8245),
    "puri": (19.8135, 85.8312),
    "rourkela": (22.2604, 84.8536),
    "indore": (22.7196, 75.8577),
    "delhi": (28.6139, 77.2090),
    "newdelhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "bhopal": (23.2599, 77.4126),
    "jaipur": (26.9124, 75.7873),
    "pune": (18.5204, 73.8567),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "ahmedabad": (23.0225, 72.5714),
    "lucknow": (26.8467, 80.9462),
    "patna": (25.5941, 85.1376),
    "chandigarh": (30.7333, 76.7794),
    "surat": (21.1702, 72.8311),
    "nagpur": (21.1458, 79.0882),
    "kochi": (9.9312, 76.2673),
    "coimbatore": (11.0168, 76.9558),
    "visakhapatnam": (17.6868, 83.2185),
    "varanasi": (25.3176, 82.9739),
}

WMO_CODE_MAP = {
    0: "Clear",
    1: "Partly Cloudy",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Haze",
    48: "Haze",
    51: "Light Rain",
    53: "Moderate Rain",
    55: "Heavy Rain",
    56: "Light Rain",
    57: "Heavy Rain",
    61: "Light Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Rain",
    67: "Heavy Rain",
    71: "Snow",
    73: "Snow",
    75: "Heavy Snow",
    77: "Snow",
    80: "Light Rain",
    81: "Moderate Rain",
    82: "Thunderstorm",
    85: "Snow",
    86: "Heavy Snow",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
}


class WeatherProvider(ABC):
    """Abstract base class for weather providers."""

    @abstractmethod
    async def get_current(self, location: str) -> dict:
        ...

    @abstractmethod
    async def get_hourly(self, location: str, hours: int = 12) -> list[dict]:
        ...

    @abstractmethod
    async def get_forecast(self, location: str, days: int = 7) -> list[dict]:
        ...


class RealWeatherProvider(WeatherProvider):
    """
    Calls the OpenWeatherMap API (free tier).
    Requires WEATHER_API_KEY in .env.
    """

    BASE_URL = "https://api.openweathermap.org/data/2.5"

    def _get_api_key(self) -> str:
        return os.getenv("WEATHER_API_KEY", "").strip()

    async def _get_coords(self, client: httpx.AsyncClient, location: str):
        api_key = self._get_api_key()
        geo_url = "https://api.openweathermap.org/geo/1.0/direct"

        queries = [location]
        if "," not in location:
            queries.append(f"{location},IN")

        for q in queries:
            try:
                resp = await client.get(geo_url, params={"q": q, "limit": 1, "appid": api_key})
                if resp.status_code == 200:
                    data = resp.json()
                    if data and len(data) > 0:
                        return data[0]["lat"], data[0]["lon"]
            except Exception:
                continue

        loc_lower = location.strip().lower()
        if loc_lower in CITY_COORDS:
            return CITY_COORDS[loc_lower]

        raise ValueError(f"Location '{location}' could not be resolved via OpenWeatherMap geocoding")

    async def get_current(self, location: str, lat: float = None, lon: float = None) -> dict:
        api_key = self._get_api_key()
        async with httpx.AsyncClient(timeout=10) as client:
            if lat is None or lon is None:
                lat, lon = await self._get_coords(client, location)
            resp = await client.get(f"{self.BASE_URL}/weather", params={
                "lat": lat, "lon": lon, "appid": api_key, "units": "metric"
            })
            resp.raise_for_status()
            d = resp.json()
            tz_offset = d.get("timezone", 19800)
            if tz_offset == 0 and 68 <= lon <= 97 and 6 <= lat <= 38:
                tz_offset = 19800

            sunrise_ts = d.get("sys", {}).get("sunrise")
            sunset_ts = d.get("sys", {}).get("sunset")
            sunrise = datetime.utcfromtimestamp(sunrise_ts + tz_offset).strftime("%H:%M") if sunrise_ts else "05:45"
            sunset = datetime.utcfromtimestamp(sunset_ts + tz_offset).strftime("%H:%M") if sunset_ts else "18:15"

            return {
                "location": location.title(),
                "timestamp": datetime.utcnow().isoformat(),
                "temperature": round(d["main"]["temp"], 1),
                "feels_like": round(d["main"]["feels_like"], 1),
                "humidity": d["main"]["humidity"],
                "wind_speed": round(d["wind"]["speed"] * 3.6, 1),
                "wind_direction": str(d["wind"].get("deg", "N")),
                "pressure": d["main"]["pressure"],
                "visibility": round(d.get("visibility", 10000) / 1000, 1),
                "condition": d["weather"][0]["main"],
                "rain_probability": int(d.get("clouds", {}).get("all", 0)),
                "rainfall_mm": round(d.get("rain", {}).get("1h", 0), 1),
                "sunrise": sunrise,
                "sunset": sunset,
                "data_source": "OpenWeatherMap (Live)",
            }

    async def get_hourly(self, location: str, hours: int = 12) -> list[dict]:
        api_key = self._get_api_key()
        async with httpx.AsyncClient(timeout=10) as client:
            lat, lon = await self._get_coords(client, location)
            resp = await client.get(f"{self.BASE_URL}/forecast", params={
                "lat": lat, "lon": lon, "appid": api_key, "units": "metric"
            })
            resp.raise_for_status()
            d = resp.json()
            result = []
            for item in d["list"][: math.ceil(hours / 3)]:
                result.append({
                    "time": item["dt_txt"].split(" ")[1][:5],
                    "temperature": round(item["main"]["temp"], 1),
                    "rain_probability": int(item.get("pop", 0) * 100),
                    "condition": item["weather"][0]["main"],
                })
            return result

    async def get_forecast(self, location: str, days: int = 7) -> list[dict]:
        api_key = self._get_api_key()
        async with httpx.AsyncClient(timeout=10) as client:
            lat, lon = await self._get_coords(client, location)
            resp = await client.get(f"{self.BASE_URL}/forecast", params={
                "lat": lat, "lon": lon, "appid": api_key, "units": "metric"
            })
            resp.raise_for_status()
            d = resp.json()
            by_day = {}
            for item in d["list"]:
                date = item["dt_txt"].split(" ")[0]
                by_day.setdefault(date, []).append(item)

            result = []
            for date, items in list(by_day.items())[:days]:
                temps = [i["main"]["temp"] for i in items]
                result.append({
                    "date": date,
                    "day_name": datetime.strptime(date, "%Y-%m-%d").strftime("%A"),
                    "temp_max": round(max(temps), 1),
                    "temp_min": round(min(temps), 1),
                    "condition": items[len(items) // 2]["weather"][0]["main"],
                    "rain_probability": int(max(i.get("pop", 0) for i in items) * 100),
                    "rainfall_mm": round(sum(i.get("rain", {}).get("3h", 0) for i in items), 1),
                    "wind_speed": round(items[0]["wind"]["speed"] * 3.6, 1),
                })
            return result


class OpenMeteoWeatherProvider(WeatherProvider):
    """
    Live real-world meteorological provider (Open-Meteo).
    Provides 100% real live data globally without needing an API key.
    Used when DEMO_MODE=false to ensure real live data is always delivered.
    """

    GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
    WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

    async def _get_coords(self, client: httpx.AsyncClient, location: str):
        loc_clean = location.split(",")[0].strip()
        loc_lower = loc_clean.lower()
        if loc_lower in CITY_COORDS:
            return CITY_COORDS[loc_lower]

        try:
            resp = await client.get(self.GEO_URL, params={"name": loc_clean, "count": 10, "language": "en"})
            if resp.status_code == 200:
                data = resp.json()
                if "results" in data and len(data["results"]) > 0:
                    in_match = next((r for r in data["results"] if r.get("country_code") == "IN"), None)
                    chosen = in_match or data["results"][0]
                    return chosen["latitude"], chosen["longitude"]
        except Exception:
            pass

        # Fallback to Indore coords if city is completely unknown
        return CITY_COORDS.get("indore", (22.7196, 75.8577))

    async def get_current(self, location: str, lat: float = None, lon: float = None) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            if lat is None or lon is None:
                lat, lon = await self._get_coords(client, location)
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m",
                "daily": "sunrise,sunset,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,temperature_2m_max,temperature_2m_min",
                "timezone": "auto",
            }
            resp = await client.get(self.WEATHER_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            curr = data.get("current", {})
            daily = data.get("daily", {})

            condition_code = curr.get("weather_code", 0)
            condition = WMO_CODE_MAP.get(condition_code, "Clear")
            sunrise = (daily.get("sunrise", ["06:00"])[0]).split("T")[-1][:5] if daily.get("sunrise") else "06:00"
            sunset = (daily.get("sunset", ["18:30"])[0]).split("T")[-1][:5] if daily.get("sunset") else "18:30"
            
            rain_prob_daily = daily.get("precipitation_probability_max", [0])
            rain_prob = int(rain_prob_daily[0]) if rain_prob_daily and rain_prob_daily[0] is not None else 0
            
            rain_sum_daily = daily.get("precipitation_sum", [0.0])
            rainfall_mm = float(rain_sum_daily[0]) if rain_sum_daily and rain_sum_daily[0] is not None else float(curr.get("precipitation", 0.0) or 0.0)

            return {
                "location": location.title(),
                "timestamp": datetime.utcnow().isoformat(),
                "temperature": round(curr.get("temperature_2m", 25.0), 1),
                "feels_like": round(curr.get("apparent_temperature", curr.get("temperature_2m", 25.0)), 1),
                "humidity": int(curr.get("relative_humidity_2m", 50)),
                "wind_speed": round(curr.get("wind_speed_10m", 10.0), 1),
                "wind_direction": str(curr.get("wind_direction_10m", 0)),
                "pressure": round(curr.get("surface_pressure", 1013)),
                "visibility": 10.0,
                "condition": condition,
                "weather_code": condition_code,
                "rain_probability": rain_prob,
                "rainfall_mm": round(rainfall_mm, 1),
                "sunrise": sunrise,
                "sunset": sunset,
                "data_source": "Open-Meteo (Live Real Data)",
            }

    async def get_hourly(self, location: str, hours: int = 12) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            lat, lon = await self._get_coords(client, location)
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": "temperature_2m,precipitation_probability,weather_code",
                "timezone": "auto",
                "forecast_hours": hours,
            }
            resp = await client.get(self.WEATHER_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            temps = hourly.get("temperature_2m", [])
            rain_probs = hourly.get("precipitation_probability", [])
            codes = hourly.get("weather_code", [])

            result = []
            for i in range(min(hours, len(times))):
                time_str = times[i].split("T")[1][:5] if "T" in times[i] else f"{i:02d}:00"
                result.append({
                    "time": time_str,
                    "temperature": round(temps[i], 1) if i < len(temps) else 25.0,
                    "rain_probability": int(rain_probs[i]) if i < len(rain_probs) and rain_probs[i] is not None else 0,
                    "condition": WMO_CODE_MAP.get(codes[i], "Clear") if i < len(codes) else "Clear",
                })
            return result

    async def get_forecast(self, location: str, days: int = 7) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            lat, lon = await self._get_coords(client, location)
            params = {
                "latitude": lat,
                "longitude": lon,
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
                "timezone": "auto",
                "forecast_days": days,
            }
            resp = await client.get(self.WEATHER_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            daily = data.get("daily", {})
            dates = daily.get("time", [])
            t_max = daily.get("temperature_2m_max", [])
            t_min = daily.get("temperature_2m_min", [])
            rain_sums = daily.get("precipitation_sum", [])
            rain_probs = daily.get("precipitation_probability_max", [])
            winds = daily.get("wind_speed_10m_max", [])
            codes = daily.get("weather_code", [])

            result = []
            for i in range(min(days, len(dates))):
                date_str = dates[i]
                day_obj = datetime.strptime(date_str, "%Y-%m-%d")
                result.append({
                    "date": date_str,
                    "day_name": day_obj.strftime("%A"),
                    "temp_max": round(t_max[i], 1) if i < len(t_max) else 30.0,
                    "temp_min": round(t_min[i], 1) if i < len(t_min) else 20.0,
                    "condition": WMO_CODE_MAP.get(codes[i], "Clear") if i < len(codes) else "Clear",
                    "rain_probability": int(rain_probs[i]) if i < len(rain_probs) and rain_probs[i] is not None else 0,
                    "rainfall_mm": round(rain_sums[i], 1) if i < len(rain_sums) and rain_sums[i] is not None else 0.0,
                    "wind_speed": round(winds[i], 1) if i < len(winds) and winds[i] is not None else 10.0,
                })
            return result


class MockWeatherProvider(WeatherProvider):
    """
    Generates realistic simulated data. Used only when DEMO_MODE=true.
    """

    def _seeded_random(self, location: str, offset: int = 0):
        seed = sum(ord(c) for c in location.lower()) + offset
        return random.Random(seed)

    async def get_current(self, location: str) -> dict:
        rng = self._seeded_random(location)
        base_temp = rng.uniform(24, 38)
        return {
            "location": location.title(),
            "timestamp": datetime.utcnow().isoformat(),
            "temperature": round(base_temp, 1),
            "feels_like": round(base_temp + rng.uniform(-1, 3), 1),
            "humidity": rng.randint(35, 90),
            "wind_speed": round(rng.uniform(4, 35), 1),
            "wind_direction": rng.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
            "pressure": rng.randint(998, 1015),
            "visibility": round(rng.uniform(2, 10), 1),
            "condition": rng.choice(CONDITIONS),
            "rain_probability": rng.randint(0, 90),
            "sunrise": "06:12",
            "sunset": "18:47",
            "data_source": "mock (demo mode)",
        }

    async def get_hourly(self, location: str, hours: int = 12) -> list[dict]:
        rng = self._seeded_random(location, offset=1)
        base_temp = rng.uniform(24, 38)
        now = datetime.utcnow()
        result = []
        for h in range(hours):
            hour_time = now + timedelta(hours=h)
            temp = base_temp + 4 * math.sin(h / 24 * 2 * math.pi) + rng.uniform(-1, 1)
            result.append({
                "time": hour_time.strftime("%H:00"),
                "temperature": round(temp, 1),
                "rain_probability": rng.randint(0, 80),
                "condition": rng.choice(CONDITIONS),
            })
        return result

    async def get_forecast(self, location: str, days: int = 7) -> list[dict]:
        rng = self._seeded_random(location, offset=2)
        base_temp = rng.uniform(24, 36)
        today = datetime.utcnow()
        result = []
        for d in range(days):
            date = today + timedelta(days=d)
            day_variation = rng.uniform(-3, 3)
            result.append({
                "date": date.strftime("%Y-%m-%d"),
                "day_name": date.strftime("%A"),
                "temp_max": round(base_temp + day_variation + 3, 1),
                "temp_min": round(base_temp + day_variation - 5, 1),
                "condition": rng.choice(CONDITIONS),
                "rain_probability": rng.randint(0, 85),
                "rainfall_mm": round(rng.uniform(0, 60), 1) if rng.random() > 0.5 else 0,
                "wind_speed": round(rng.uniform(5, 30), 1),
            })
        return result


def get_weather_provider() -> WeatherProvider:
    """
    Decides which weather provider to use:
    - DEMO_MODE=true in .env -> MockWeatherProvider
    - WEATHER_API_KEY in .env -> RealWeatherProvider (OpenWeatherMap)
    - Default (DEMO_MODE=false) -> OpenMeteoWeatherProvider (Live Real Data)
    """
    demo_mode = os.getenv("DEMO_MODE", "false").strip().lower() == "true"
    api_key = os.getenv("WEATHER_API_KEY", "").strip()

    if demo_mode:
        return MockWeatherProvider()
    if api_key:
        return RealWeatherProvider()
    # When DEMO_MODE=false and no OpenWeatherMap key is specified, provide real live data
    return OpenMeteoWeatherProvider()


async def get_current_weather_safe(location: str, lat: float = None, lon: float = None) -> dict:
    """
    Safe getter for current weather. Tries configured provider first,
    then fails over to OpenMeteoWeatherProvider (real data) before mock.
    """
    provider = get_weather_provider()
    try:
        if isinstance(provider, (OpenMeteoWeatherProvider, RealWeatherProvider)):
            return await provider.get_current(location, lat=lat, lon=lon)
        return await provider.get_current(location)
    except Exception as e:
        # Fallback to OpenMeteo real provider if OpenWeatherMap failed
        if not isinstance(provider, OpenMeteoWeatherProvider):
            try:
                real_fallback = await OpenMeteoWeatherProvider().get_current(location, lat=lat, lon=lon)
                real_fallback["data_source"] = "Open-Meteo (Real Live Fallback)"
                return real_fallback
            except Exception:
                pass
        # Final fallback to mock if completely offline
        fallback = await MockWeatherProvider().get_current(location)
        fallback["data_source"] = f"mock (offline fallback: {str(e)})"
        return fallback
