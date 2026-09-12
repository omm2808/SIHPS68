import SearchBar from '../components/SearchBar';
import WeatherCard from '../components/WeatherCard';
import AlertBanner from '../components/AlertBanner';
import ForecastChart from '../components/ForecastChart';
import HourlyTimeline from '../components/HourlyTimeline';
import useWeather from '../hooks/useWeather';
import { AlertTriangle } from 'lucide-react';

export default function Dashboard({ location, onLocationChange }) {
  const { current, forecast, hourly, alerts, loading, error } = useWeather(location);

  return (
    <div className="page dashboard-page">
      <SearchBar value={location} onChange={onLocationChange} onSearch={onLocationChange} />

      {loading && (
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Fetching weather for {location}…</p>
        </div>
      )}

      {error && (
        <div className="page-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <AlertBanner alerts={alerts} />
          <WeatherCard data={current} />
          <HourlyTimeline hourly={hourly} />
          <ForecastChart forecast={forecast} />
        </>
      )}
    </div>
  );
}
