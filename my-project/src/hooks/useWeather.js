import { useState, useEffect, useCallback } from 'react';
import { getCurrentWeather, getForecast, getHourly, getAlerts } from '../api/weatherApi';

/**
 * useWeather(location)
 * Fetches current weather, forecast, hourly, and alerts in parallel.
 * Returns { current, forecast, hourly, alerts, loading, error, refresh }
 */
export default function useWeather(location = 'Indore') {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [alerts, setAlerts] = useState({ alert_count: 0, alerts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [curr, fcast, hr, al] = await Promise.all([
        getCurrentWeather(location),
        getForecast(location, 7),
        getHourly(location, 12),
        getAlerts(location),
      ]);
      setCurrent(curr);
      setForecast(fcast.forecast || []);
      setHourly(hr.hourly || []);
      setAlerts(al);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { current, forecast, hourly, alerts, loading, error, refresh: fetchAll };
}
