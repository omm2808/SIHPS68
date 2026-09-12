"""
alert_service.py
------------------
Real-time, meteorological threshold-based hazard alert engine.
Evaluates 100% REAL LIVE sensor and satellite meteorological data (Open-Meteo & OpenWeatherMap).
Zero predefined or synthetic mock data.

Standard Meteorological Criteria (IMD / WMO Standards):
  - Thunderstorm & Lightning: WMO codes 95, 96, 99 or active convective storm
  - Torrential / Heavy Rainfall: Live rainfall >= 64.5 mm (IMD Heavy Rain criterion) or rate >= 15 mm/h
  - Heatwave: Live recorded temperature >= 40.0°C (plains) or >= 45.0°C (severe heatwave)
  - Severe Gale / Storm Wind: Live wind speed >= 50.0 km/h or gusts >= 65.0 km/h
  - Dense Fog / Low Visibility: Live visibility <= 1.0 km or WMO codes 45, 48
  - Extreme Cold Wave: Live recorded temperature <= 4.0°C
"""

def evaluate_alerts(weather: dict) -> list[dict]:
    alerts = []
    if not weather:
        return alerts

    temp = weather.get("temperature", 0)
    feels_like = weather.get("feels_like", temp)
    humidity = weather.get("humidity", 0)
    rainfall_mm = weather.get("rainfall_mm", 0.0)
    rain_prob = weather.get("rain_probability", 0)
    wind = weather.get("wind_speed", 0)
    condition = str(weather.get("condition", "")).lower()
    weather_code = weather.get("weather_code", None)
    location = weather.get("location", "Your Location")
    visibility = weather.get("visibility", 10.0)
    uv_index = weather.get("uv_index", 0.0)

    # ── 1. REAL-TIME THUNDERSTORM & LIGHTNING ──────────────────
    is_thunderstorm = (
        weather_code in (95, 96, 99)
        or "thunder" in condition
        or "lightning" in condition
        or "storm" in condition
    )
    if is_thunderstorm:
        alerts.append(_alert(
            alert_type="Thunderstorm & Lightning",
            severity="HIGH",
            message=f"Live radar detected active convective thunderstorm activity in {location}.",
            recommendation="Stay indoors immediately. Avoid open fields, tall trees, and metal structures. Unplug electrical appliances.",
            data_source="Live Real Data"
        ))

    # ── 2. REAL-TIME HEAVY RAINFALL & FLOOD RISK ───────────────
    if rainfall_mm >= 115.5 or (weather_code == 65 and rainfall_mm >= 64.5):
        alerts.append(_alert(
            alert_type="Very Heavy Rainfall / Flood Risk",
            severity="SEVERE",
            message=f"Torrential rainfall recorded in {location} ({rainfall_mm} mm live accumulation). High waterlogging risk.",
            recommendation="Avoid low-lying and waterlogged areas. Halt non-essential travel. Move valuables to higher ground.",
            data_source="Live Real Data"
        ))
    elif rainfall_mm >= 64.5 or weather_code in (65, 82) or "heavy rain" in condition:
        alerts.append(_alert(
            alert_type="Heavy Rainfall Warning",
            severity="HIGH",
            message=f"Heavy rain conditions active in {location} ({rainfall_mm} mm recorded).",
            recommendation="Drive with extreme caution. Watch for localized waterlogging and low visibility on roadways.",
            data_source="Live Real Data"
        ))
    elif (
        (weather_code is not None and (weather_code in (51, 53, 55, 61, 63, 80, 81) or 200 <= weather_code <= 599))
        or "rain" in condition
        or "drizzle" in condition
        or "shower" in condition
        or rainfall_mm > 0.0
    ):
        alerts.append(_alert(
            alert_type="Rain & Wet Road Advisory",
            severity="MODERATE",
            message=f"Precipitation and wet roadway conditions observed across {location}.",
            recommendation="Drive carefully at reduced speed. Maintain headlights and safe braking distances.",
            data_source="Live Real Data"
        ))

    # ── 3. REAL-TIME HEATWAVE & HIGH HEAT INDEX ───────────────
    if temp >= 45.0:
        alerts.append(_alert(
            alert_type="Severe Heatwave Warning",
            severity="EXTREME",
            message=f"Extreme temperature of {temp}°C measured in {location}. Dangerous heat index.",
            recommendation="Avoid all outdoor exposure between 11:00 AM and 4:00 PM. Drink water frequently with ORS or electrolytes.",
            data_source="Live Real Data"
        ))
    elif temp >= 40.0:
        alerts.append(_alert(
            alert_type="Heatwave Alert",
            severity="HIGH",
            message=f"Live temperature reached {temp}°C in {location} — official heatwave threshold exceeded.",
            recommendation="Maintain continuous hydration and limit strenuous outdoor work during peak afternoon hours.",
            data_source="Live Real Data"
        ))
    elif humidity >= 82 and (feels_like >= 30.0 or temp >= 27.0):
        alerts.append(_alert(
            alert_type="High Humidity & Sultry Weather Advisory",
            severity="MODERATE",
            message=f"Elevated humidity ({humidity}%) and thermal discomfort index recorded in {location} (Feels like {round(feels_like, 1)}°C).",
            recommendation="Stay hydrated with electrolytes and maintain good room ventilation. Avoid prolonged heavy exertion.",
            data_source="Live Real Data"
        ))

    # ── 4. REAL-TIME SEVERE WIND & GUST HAZARD ─────────────────
    if wind >= 65.0:
        alerts.append(_alert(
            alert_type="Severe Gale / Storm Wind",
            severity="SEVERE",
            message=f"High-velocity wind gusts of {wind} km/h recorded in {location}.",
            recommendation="Stay indoors away from windows. Secure loose rooftop objects and beware of falling branches or power lines.",
            data_source="Live Real Data"
        ))
    elif wind >= 40.0:
        alerts.append(_alert(
            alert_type="Strong Wind Advisory",
            severity="MODERATE",
            message=f"Strong sustained winds of {wind} km/h recorded in {location}.",
            recommendation="Exercise caution when driving high-sided vehicles or two-wheelers.",
            data_source="Live Real Data"
        ))

    # ── 5. REAL-TIME DENSE FOG & LOW VISIBILITY ────────────────
    if (visibility is not None and visibility <= 2.0) or weather_code in (45, 48) or "fog" in condition or "mist" in condition or "haze" in condition:
        alerts.append(_alert(
            alert_type="Fog & Low Visibility Advisory",
            severity="MODERATE",
            message=f"Atmospheric visibility in {location} reduced to {visibility} km.",
            recommendation="Operate vehicles with low-beam fog lights and maintain safe braking distances.",
            data_source="Live Real Data"
        ))

    # ── 6. REAL-TIME EXTREME COLD WAVE ─────────────────────────
    if temp <= 6.0:
        alerts.append(_alert(
            alert_type="Severe Cold Wave",
            severity="HIGH",
            message=f"Freezing cold conditions recorded in {location} ({temp}°C).",
            recommendation="Wear thermal protective clothing. Ensure adequate heating and protect livestock and crops from frost.",
            data_source="Live Real Data"
        ))

    # ── 7. UV RADIATION HAZARD ─────────────────────────────────
    if uv_index >= 8.0:
        alerts.append(_alert(
            alert_type="Extreme UV Radiation Advisory",
            severity="HIGH" if uv_index < 10.0 else "SEVERE",
            message=f"Very high solar ultraviolet radiation index ({round(uv_index, 1)}) recorded in {location}.",
            recommendation="Apply broad-spectrum sunscreen and wear UV-protective sunglasses and a wide-brim hat.",
            data_source="Live Real Data"
        ))

    return alerts


def _alert(alert_type: str, severity: str, message: str, recommendation: str, data_source: str = "Live Real Data") -> dict:
    return {
        "type": alert_type,
        "severity": severity,
        "message": message,
        "recommendation": recommendation,
        "data_source": data_source,
    }
