import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import WeatherCard from '../components/WeatherCard';
import AlertBanner from '../components/AlertBanner';
import ForecastChart from '../components/ForecastChart';
import HourlyTimeline from '../components/HourlyTimeline';
import MapView from '../components/MapView';
import useWeather from '../hooks/useWeather';
import { useSettings } from '../context/SettingsContext';
import { KNOWN_COORDS, geocodeLocation } from '../utils/knownCoords';

import { useGlobalWeather } from '../context/WeatherContext';

const POPULAR = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Bhopal', 'Indore',
];

export default function SearchPage() {
  const { fetchWeatherForLocation, locationName: globalLocationName } = useGlobalWeather();
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(globalLocationName || '');
  const [coords, setCoords] = useState(null);
  const [forecastDays, setForecastDays] = useState(7);

  const { convertTemp, convertWind, tempUnitSymbol } = useSettings();
  const { current, forecast, hourly, alerts, loading, error } = useWeather(submitted, 10);

  const resolveAndSetCity = async (cityName) => {
    if (!cityName || !cityName.trim()) return;
    const name = cityName.trim();
    setSubmitted(name);
    fetchWeatherForLocation(name);

    const clean = name.toLowerCase().replace(/\s+/g, '');
    if (KNOWN_COORDS[clean]) {
      setCoords(KNOWN_COORDS[clean]);
      return;
    }

    try {
      const resolved = await geocodeLocation(name);
      if (resolved) {
        setCoords({ lat: resolved.lat, lon: resolved.lon });
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
    }
  };

  const handleSearch = (val) => {
    if (val && val.trim()) {
      resolveAndSetCity(val);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`
          );
          const d = await res.json();
          const name =
            d.address?.city ||
            d.address?.town ||
            d.address?.village ||
            d.address?.county ||
            d.display_name?.split(',')[0] ||
            'My Location';
          setLocation(name);
          setSubmitted(name);
        } catch {
          setLocation('My Location');
          setSubmitted('My Location');
        }
      },
      (err) => {
        setLocation('My Location');
        setSubmitted('My Location');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="page search-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">🔍</span> Explore Weather
          </h1>
          <p className="page-subtitle">Search any city, town or village for live meteorological forecasts & interactive map</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-section-wrapper">
        <SearchBar
          value={location}
          onChange={setLocation}
          onSearch={handleSearch}
          placeholder="Search for any city — e.g. Delhi, Mumbai, Bangalore, Indore…"
        />
      </div>

      {/* Popular cities quick-select */}
      <div className="popular-chips-container">
        <span className="popular-chips-label">Quick Cities:</span>
        <div className="popular-chips">
          {POPULAR.map((city) => (
            <button
              key={city}
              className={`popular-chip ${submitted === city ? 'active' : ''}`}
              onClick={() => {
                setLocation(city);
                resolveAndSetCity(city);
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
          <p>Type a city name above or pick from popular cities to get real-time weather analytics & live map view.</p>
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
              <MapView
                coords={coords}
                locationName={submitted}
                onLocateMe={handleLocateMe}
              />
            </div>
          </div>

          <HourlyTimeline hourly={hourly} />

          {/* Forecast with day-count toggle */}
          <div className="forecast-header-row">
            <div className="section-title">
              <span className="section-icon">📅</span> {forecastDays}-Day Meteorological Forecast
            </div>
            <div className="day-toggle">
              {[7, 10].map((d) => (
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
          <ForecastChart
            forecast={forecast}
            days={forecastDays}
            hideTitle={true}
          />

          {/* Summary box */}
          {current && (
            <div className="summary-box">
              <div className="section-title">
                <span className="section-icon">📝</span> Location Summary
              </div>
              <p className="summary-text">
                <strong>{current.location}</strong> is currently experiencing{' '}
                <strong>{current.condition}</strong> conditions with a temperature of{' '}
                <strong>{convertTemp(current.temperature)}{tempUnitSymbol}</strong> (feels like {convertTemp(current.feels_like)}{tempUnitSymbol}).
                Humidity is at <strong>{current.humidity}%</strong> with winds blowing at{' '}
                <strong>{convertWind(current.wind_speed).val} {convertWind(current.wind_speed).unit}</strong>. Surface pressure is measured at{' '}
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
