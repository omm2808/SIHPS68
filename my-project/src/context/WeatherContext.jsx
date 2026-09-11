import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { geocodeLocation, KNOWN_COORDS } from '../utils/knownCoords';

const WeatherContext = createContext(null);

export function WeatherProvider({ children }) {
  const [weatherData, setWeatherData] = useState(null);
  const [coords, setCoords] = useState({ lat: 20.4795, lon: 86.1306 }); // Default Salipur/Odisha
  const [locationName, setLocationName] = useState('Salipur');
  const [loading, setLoading] = useState(false);

  // ─── Fetch weather by lat, lon, name ──────────────────
  const fetchWeather = useCallback(async (lat, lon, name) => {
    try {
      setLoading(true);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,uv_index&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=auto&forecast_days=10`;
      const res = await fetch(url);
      const data = await res.json();
      setWeatherData(data);
      setCoords({ lat, lon });
      if (name) setLocationName(name);
    } catch (err) {
      console.error('Global weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Resolve location query and fetch ─────────────────
  const fetchWeatherForLocation = useCallback(async (cityName) => {
    if (!cityName || !cityName.trim()) return;
    const clean = cityName.trim().toLowerCase().replace(/\s+/g, '');
    if (KNOWN_COORDS[clean]) {
      const { lat, lon } = KNOWN_COORDS[clean];
      await fetchWeather(lat, lon, cityName.trim());
      return;
    }

    const resolved = await geocodeLocation(cityName);
    if (resolved) {
      await fetchWeather(resolved.lat, resolved.lon, resolved.name || cityName.trim());
    } else {
      // Fallback
      await fetchWeather(20.4795, 86.1306, cityName.trim());
    }
  }, [fetchWeather]);

  // ─── Compute Weather Scene based on data & time ───────
  const weatherScene = useMemo(() => {
    const cur = weatherData?.current;
    const now = new Date();
    const hour = now.getHours();

    let isAfterSunset = hour < 6 || hour >= 19;
    const sunsetStr = weatherData?.daily?.sunset?.[0];
    const sunriseStr = weatherData?.daily?.sunrise?.[0];
    if (sunsetStr && sunriseStr.includes('T')) {
      const sDate = new Date(sunsetStr);
      isAfterSunset = now >= sDate;
    }

    if (!cur) {
      // Default to clear/cloudy depending on hour
      if (hour >= 17 && hour <= 19) return { bg: '/weather-bg/sunset.jpg', type: 'sunset' };
      if (hour < 6 || hour >= 19) return { bg: '/weather-bg/cloudy.jpg', type: 'night' };
      return { bg: '/weather-bg/clear.jpg', type: 'clear' };
    }

    const code = cur.weather_code;

    // Thunderstorm
    if ([95, 96, 99].includes(code)) {
      return { bg: '/weather-bg/thunderstorm.jpg', type: 'thunderstorm' };
    }
    // Rain / Drizzle / Snow
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 71, 73, 75].includes(code)) {
      return { bg: '/weather-bg/rain.jpg', type: 'rain' };
    }
    // Sunset / Twilight (between 5 PM and 7:30 PM, or sunrise 5:30 AM - 7 AM)
    if ((hour >= 17 && hour <= 19) || (hour >= 5 && hour <= 7)) {
      return { bg: '/weather-bg/sunset.jpg', type: 'sunset' };
    }
    // Clear / Sunny
    if ([0, 1].includes(code) && !isAfterSunset) {
      return { bg: '/weather-bg/clear.jpg', type: 'clear' };
    }
    // Overcast / Cloudy / Fog / Night
    return { bg: '/weather-bg/cloudy.jpg', type: isAfterSunset ? 'night' : 'cloudy' };
  }, [weatherData]);

  return (
    <WeatherContext.Provider
      value={{
        weatherData,
        setWeatherData,
        coords,
        setCoords,
        locationName,
        setLocationName,
        weatherScene,
        fetchWeather,
        fetchWeatherForLocation,
        loading,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useGlobalWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error('useGlobalWeather must be used within WeatherProvider');
  }
  return ctx;
}
