import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import WeatherCard from '../components/WeatherCard';
import AlertBanner from '../components/AlertBanner';
import ForecastChart from '../components/ForecastChart';
import HourlyTimeline from '../components/HourlyTimeline';
import MapView from '../components/MapView';
import useWeather from '../hooks/useWeather';
import { useSettings } from '../context/SettingsContext';

const POPULAR = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Bhopal', 'Indore',
];

const KNOWN_COORDS = {
  delhi: { lat: 28.6139, lon: 77.2090 },
  newdelhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  pune: { lat: 18.5204, lon: 73.8567 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  indore: { lat: 22.7196, lon: 75.8577 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  patna: { lat: 25.5941, lon: 85.1376 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
  surat: { lat: 21.1702, lon: 72.8311 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  visakhapatnam: { lat: 17.6868, lon: 83.2185 },
  varanasi: { lat: 25.3176, lon: 82.9739 },
  srinagar: { lat: 34.0837, lon: 74.7973 },
  amritsar: { lat: 31.6340, lon: 74.8723 },
  goa: { lat: 15.2993, lon: 74.1240 },
};

export default function SearchPage() {
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [coords, setCoords] = useState(null);
  const [forecastDays, setForecastDays] = useState(7);

  const { convertTemp, convertWind, tempUnitSymbol } = useSettings();
  const { current, forecast, hourly, alerts, loading, error } = useWeather(submitted, 10);

  const resolveAndSetCity = async (cityName) => {
    if (!cityName || !cityName.trim()) return;
    const name = cityName.trim();
    setSubmitted(name);

    const clean = name.toLowerCase().replace(/\s+/g, '');
    if (KNOWN_COORDS[clean]) {
      setCoords(KNOWN_COORDS[clean]);
      return;
    }

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setCoords({
          lat: data.results[0].latitude,
          lon: data.results[0].longitude,
        });
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
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
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
      (err) => console.warn('Locate device error:', err)
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
