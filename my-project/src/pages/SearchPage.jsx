import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import WeatherCard from '../components/WeatherCard';
import AlertBanner from '../components/AlertBanner';
import ForecastChart from '../components/ForecastChart';
import HourlyTimeline from '../components/HourlyTimeline';
import MapView from '../components/MapView';
import useWeather from '../hooks/useWeather';

const POPULAR = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Bhopal', 'Indore',
];

export default function SearchPage() {
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [forecastDays, setForecastDays] = useState(7);

  const { current, forecast, hourly, alerts, loading, error } = useWeather(submitted);

  const handleSearch = val => {
    if (val.trim()) setSubmitted(val.trim());
  };

  return (
    <div className="page search-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">🔍</span> Explore Weather
          </h1>
          <p className="page-subtitle">Search any city, town or village for live meteorological forecasts</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-section-wrapper">
        <SearchBar
          value={location}
          onChange={setLocation}
          onSearch={handleSearch}
          placeholder="Search for any city — e.g. Indore, Delhi, Mumbai…"
        />
      </div>

      {/* Popular cities quick-select */}
      <div className="popular-chips-container">
        <span className="popular-chips-label">Quick Cities:</span>
        <div className="popular-chips">
          {POPULAR.map(city => (
            <button
              key={city}
              className={`popular-chip ${submitted === city ? 'active' : ''}`}
              onClick={() => {
                setLocation(city);
                setSubmitted(city);
              }}
            >
              📍 {city}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!submitted && (
        <div className="empty-state">
          <div className="empty-icon">🌍</div>
          <h3>Search for a location</h3>
          <p>Type a city name above or pick from popular cities to get real-time weather analytics.</p>
        </div>
      )}

      {/* Loading */}
      {submitted && loading && (
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Fetching full weather telemetry for {submitted}…</p>
        </div>
      )}

      {/* Error */}
      {submitted && error && (
        <div className="page-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Results */}
      {submitted && !loading && !error && (
        <div className="search-results">
          <AlertBanner alerts={alerts} />

          {/* Top row: WeatherCard + Map side by side */}
          <div className="search-top-row">
            <div className="search-top-left">
              <WeatherCard data={current} />
            </div>
            <div className="search-top-right">
              <MapView locationName={submitted} />
            </div>
          </div>

          <HourlyTimeline hourly={hourly} />

          {/* Forecast with day-count toggle */}
          <div className="forecast-header-row">
            <div className="section-title">
              <span className="section-icon">📅</span> Multi-Day Forecast
            </div>
            <div className="day-toggle">
              {[7, 10].map(d => (
                <button
                  key={d}
                  className={`day-toggle-btn ${forecastDays === d ? 'active' : ''}`}
                  onClick={() => setForecastDays(d)}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>
          <ForecastChart forecast={forecast} days={forecastDays} />

          {/* Summary box */}
          {current && (
            <div className="summary-box">
              <div className="section-title">
                <span className="section-icon">📝</span> Location Summary
              </div>
              <p className="summary-text">
                <strong>{current.location}</strong> is currently experiencing{' '}
                <strong>{current.condition}</strong> conditions with a temperature of{' '}
                <strong>{current.temperature}°C</strong> (feels like {current.feels_like}°C).
                Humidity is at <strong>{current.humidity}%</strong> with winds blowing at{' '}
                <strong>{current.wind_speed} km/h</strong>. Surface pressure is measured at{' '}
                <strong>{current.pressure} hPa</strong> with visibility around{' '}
                <strong>{current.visibility} km</strong>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
