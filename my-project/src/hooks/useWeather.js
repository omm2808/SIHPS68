import { useState, useEffect, useCallback } from 'react';
import { getCurrentWeather, getForecast, getHourly, getAlerts } from '../api/weatherApi';
import { evaluateMeteorologicalAlerts } from '../utils/alertEngine';

/**
 * useWeather(location, days, customCoords)
 * Fetches current weather, forecast, hourly, and alerts in parallel.
 * Computes live meteorological hazard alerts if backend returns 0.
 * Returns { current, forecast, hourly, alerts, loading, error, refresh }
 */
export default function useWeather(location = 'Indore', days = 10, customCoords = null) {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [alerts, setAlerts] = useState({ alert_count: 0, alerts: [], location: location });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!location || !location.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const lat = customCoords?.lat;
      const lon = customCoords?.lon;

      const [curr, fcast, hr, al] = await Promise.all([
        getCurrentWeather(location),
        getForecast(location, days || 10),
        getHourly(location, 12),
        getAlerts(location, lat, lon),
      ]);

      setCurrent(curr);
      setForecast(fcast.forecast || []);
      setHourly(hr.hourly || []);

      const evaluatedAlerts = evaluateMeteorologicalAlerts(curr?.location || location, curr, al);
      setAlerts(evaluatedAlerts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location, days, customCoords?.lat, customCoords?.lon]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { current, forecast, hourly, alerts, loading, error, refresh: fetchAll };
}
