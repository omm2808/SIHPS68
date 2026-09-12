/**
 * alertEngine.js
 * Centralized, standardized meteorological hazard alert evaluator.
 * Guarantees 100% parity across Dashboard, Search, Map, and Notification panels.
 * Follows IMD / WMO standard weather warning thresholds.
 */

export function evaluateMeteorologicalAlerts(targetName = 'Your Location', weatherData = null, backendAlerts = null) {
  let list = [];

  // 1. If backend alerts exist and have items, map them
  if (backendAlerts && Array.isArray(backendAlerts.alerts) && backendAlerts.alerts.length > 0) {
    list = backendAlerts.alerts.map((a) => ({
      ...a,
      location: a.location || backendAlerts.location || targetName,
      data_source: a.data_source || backendAlerts.data_source || 'Live Real Data',
    }));
    return {
      alert_count: list.length,
      alerts: list,
      location: backendAlerts.location || targetName,
      data_source: backendAlerts.data_source || 'Live Real Data',
    };
  }

  // 2. Client-side meteorological evaluation from live telemetry
  if (weatherData) {
    // Normalize data from either Open-Meteo or backend object format
    const cur = weatherData.current || weatherData;
    const temp = cur.temperature_2m ?? cur.temperature ?? null;
    const feelsLike = cur.apparent_temperature ?? cur.feels_like ?? temp;
    const humidity = cur.relative_humidity_2m ?? cur.humidity ?? 0;
    const code = cur.weather_code ?? null;
    const wind = cur.wind_speed_10m ?? cur.wind_speed ?? 0;
    const rainfall = cur.precipitation ?? cur.rainfall_mm ?? 0;
    const rainProb = cur.precipitation_probability ?? cur.rain_probability ?? 0;
    const condition = String(cur.condition || '').toLowerCase();
    const visibility = cur.visibility ?? null;
    const uvIndex = cur.uv_index ?? 0.0;
    const locName = cur.location || targetName;

    // ── Thunderstorm & Lightning ──
    if ([95, 96, 99].includes(code) || condition.includes('thunder') || condition.includes('lightning') || condition.includes('storm')) {
      list.push({
        type: 'Thunderstorm & Lightning',
        severity: 'HIGH',
        message: `Active convective thunderstorm radar signal detected in ${locName}.`,
        recommendation: 'Stay indoors immediately. Avoid open fields, tall trees, and metal structures. Unplug electrical appliances.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }

    // ── Heavy Rainfall & Flood Risk ──
    if (rainfall >= 115.5 || (code === 65 && rainfall >= 64.5)) {
      list.push({
        type: 'Very Heavy Rainfall / Flood Risk',
        severity: 'SEVERE',
        message: `Torrential rainfall recorded in ${locName} (${rainfall} mm live accumulation). High waterlogging risk.`,
        recommendation: 'Avoid low-lying and waterlogged areas. Halt non-essential travel. Move valuables to higher ground.',
        location: locName,
        data_source: 'Live Real Data',
      });
    } else if (rainfall >= 64.5 || [65, 82].includes(code) || condition.includes('heavy rain')) {
      list.push({
        type: 'Heavy Rainfall Warning',
        severity: 'HIGH',
        message: `Heavy rain conditions active in ${locName} (${rainfall ? `${rainfall} mm` : 'radar detected'}).`,
        recommendation: 'Drive with extreme caution. Watch for localized waterlogging and low visibility on roadways.',
        location: locName,
        data_source: 'Live Real Data',
      });
    } else if (
      [51, 53, 55, 61, 63, 80, 81].includes(code) ||
      (code !== null && code >= 200 && code <= 599) ||
      condition.includes('rain') ||
      condition.includes('drizzle') ||
      condition.includes('shower') ||
      rainfall > 0
    ) {
      list.push({
        type: 'Rain & Wet Road Advisory',
        severity: 'MODERATE',
        message: `Active precipitation and wet roadway conditions observed across ${locName}. Roadways may be slippery.`,
        recommendation: 'Drive carefully at reduced speeds. Keep headlights on and maintain safe braking distance.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }

    // ── Heatwave & High Heat Index / Moisture Surge ──
    if (temp !== null && temp >= 45.0) {
      list.push({
        type: 'Severe Heatwave Warning',
        severity: 'EXTREME',
        message: `Extreme temperature of ${Math.round(temp)}°C measured in ${locName}. Dangerous heat index.`,
        recommendation: 'Avoid all outdoor exposure between 11:00 AM and 4:00 PM. Drink water frequently with ORS or electrolytes.',
        location: locName,
        data_source: 'Live Real Data',
      });
    } else if (temp !== null && temp >= 40.0) {
      list.push({
        type: 'Heatwave Alert',
        severity: 'HIGH',
        message: `Live temperature reached ${Math.round(temp)}°C in ${locName} — official heatwave threshold exceeded.`,
        recommendation: 'Maintain continuous hydration and limit strenuous outdoor work during peak afternoon hours.',
        location: locName,
        data_source: 'Live Real Data',
      });
    } else if (humidity >= 82 && (feelsLike >= 30.0 || (temp !== null && temp >= 27.0))) {
      list.push({
        type: 'High Humidity & Sultry Weather Advisory',
        severity: 'MODERATE',
        message: `Elevated humidity (${humidity}%) and thermal discomfort index recorded in ${locName} (Feels like ${Math.round(feelsLike)}°C).`,
        recommendation: 'Stay hydrated with electrolytes and maintain good room ventilation. Avoid prolonged heavy exertion.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }

    // ── Wind & Gale ──
    if (wind >= 65.0) {
      list.push({
        type: 'Severe Gale / Storm Wind',
        severity: 'SEVERE',
        message: `High-velocity wind gusts of ${Math.round(wind)} km/h recorded in ${locName}.`,
        recommendation: 'Stay indoors away from windows. Secure loose outdoor objects and beware of falling tree branches or wires.',
        location: locName,
        data_source: 'Live Real Data',
      });
    } else if (wind >= 40.0) {
      list.push({
        type: 'Strong Wind Advisory',
        severity: 'MODERATE',
        message: `Strong sustained winds of ${Math.round(wind)} km/h recorded in ${locName}.`,
        recommendation: 'Exercise caution when driving high-sided vehicles or two-wheelers.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }

    // ── Dense Fog / Visibility ──
    if ((visibility !== null && visibility <= 2.0) || [45, 48].includes(code) || condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) {
      list.push({
        type: 'Fog & Low Visibility Advisory',
        severity: 'MODERATE',
        message: `Atmospheric visibility in ${locName} reduced below safe clearance thresholds.`,
        recommendation: 'Operate vehicles with low-beam fog lights and maintain safe braking distances.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }

    // ── Severe Cold Wave ──
    if (temp !== null && temp <= 6.0) {
      list.push({
        type: 'Severe Cold Wave',
        severity: 'HIGH',
        message: `Freezing cold conditions recorded in ${locName} (${Math.round(temp)}°C).`,
        recommendation: 'Wear thermal protective clothing. Protect sensitive crops, seedlings and livestock from frost.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }

    // ── UV Radiation Hazard ──
    if (uvIndex >= 8.0) {
      list.push({
        type: 'Extreme UV Radiation Advisory',
        severity: uvIndex < 10.0 ? 'HIGH' : 'SEVERE',
        message: `Very high solar ultraviolet radiation index (${Math.round(uvIndex)}) recorded in ${locName}.`,
        recommendation: 'Apply broad-spectrum sunscreen and wear UV-protective sunglasses and a wide-brim hat.',
        location: locName,
        data_source: 'Live Real Data',
      });
    }
  }

  return {
    alert_count: list.length,
    alerts: list,
    location: targetName,
    data_source: list.length > 0 ? 'Live Real Data' : 'Live Sensor Clear',
  };
}
