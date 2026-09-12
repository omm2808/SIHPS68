import { useState, useEffect, useRef } from 'react';
import SearchBar from '../components/SearchBar';
import WeatherCard from '../components/WeatherCard';
import AlertBanner from '../components/AlertBanner';
import RiskAlertToast from '../components/RiskAlertToast';
import ForecastChart from '../components/ForecastChart';
import HourlyTimeline from '../components/HourlyTimeline';
import MapView from '../components/MapView';
import useWeather from '../hooks/useWeather';
import { useSettings } from '../context/SettingsContext';
import { KNOWN_COORDS, geocodeLocation } from '../utils/knownCoords';
import { useGlobalWeather } from '../context/WeatherContext';
import {
  Search,
  MapPin,
  ShieldCheck,
  OctagonAlert,
  Settings,
  Globe,
  AlertTriangle,
  Calendar,
  FileText,
} from 'lucide-react';

const POPULAR = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Bhopal', 'Indore',
];

export default function SearchPage({ onNavigateSettings }) {
  const { fetchWeatherForLocation, locationName: globalLocationName } = useGlobalWeather();
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(globalLocationName || 'Indore');
  const [coords, setCoords] = useState(null);
  const [forecastDays, setForecastDays] = useState(7);

  // Risk Alert Toast state
  const [toastAlert, setToastAlert] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const lastAlertKeyRef = useRef('');
  const toastTimerRef = useRef(null);

  const { unit, speedUnit, notifications, convertTemp, convertWind, tempUnitSymbol } = useSettings();
  const { current, forecast, hourly, alerts, loading, error } = useWeather(submitted, 10, coords);

  // Trigger floating RiskAlertToast after location is loaded and weather analyzed
  useEffect(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    if (notifications && !loading && alerts?.alerts && alerts.alerts.length > 0) {
      const firstAlert = alerts.alerts[0];
      const key = `${submitted}-${firstAlert.type}-${alerts.alerts.length}`;
      if (lastAlertKeyRef.current !== key) {
        toastTimerRef.current = setTimeout(() => {
          lastAlertKeyRef.current = key;
          setToastAlert(firstAlert);
          setShowToast(true);
        }, 1800);
      }
    } else {
      setShowToast(false);
    }

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [alerts, notifications, submitted, loading]);

  // Hide toast immediately if notifications turned OFF in Settings
  useEffect(() => {
    if (!notifications) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setShowToast(false);
    }
  }, [notifications]);

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
          fetchWeatherForLocation(name);
        } catch {
          setLocation('My Location');
          setSubmitted('My Location');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="page search-page">
      {/* Floating Risk Alert Toast Popup (Top-Right) */}
      {showToast && toastAlert && notifications && (
        <div className="risk-toast-wrapper">
          <RiskAlertToast
            alert={toastAlert}
            totalAlerts={alerts?.alerts?.length || 1}
            duration={6500}
            onClose={() => setShowToast(false)}
            onOpenPanel={() => {
              setShowToast(false);
              const el = document.getElementById('search-alert-banner');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      )}

      <div className="page-header-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="page-title-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <Search size={24} color="#38bdf8" />
            </span>
            <span>Explore Weather</span>
          </h1>
          <p className="page-subtitle">
            Search any city, town or village for real-time risk alerts, forecasts & satellite mapping
          </p>
        </div>

        {/* Top Header Alerts & Settings Indicators */}
        <div className="topbar-actions" style={{ marginLeft: 'auto' }}>
          <div
            className={`topbar-settings-pill ${alerts?.alerts?.length > 0 ? 'has-active-alerts' : ''}`}
            title={alerts?.alerts?.length > 0 ? `${alerts.alerts.length} Active Alerts in ${submitted}` : 'Atmospheric conditions normal'}
            style={{ cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {alerts?.alerts?.length > 0 ? <OctagonAlert size={14} color="#ef4444" /> : <ShieldCheck size={14} color="#10b981" />}
            </span>
            <span>{alerts?.alerts?.length > 0 ? `${alerts.alerts.length} Active Warnings` : 'All Clear'}</span>
          </div>
          {onNavigateSettings && (
            <button
              className="topbar-settings-pill"
              title="Configure notification settings"
              onClick={onNavigateSettings}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <Settings size={14} />
              </span>
              <span>{notifications ? 'Alerts ON' : 'Alerts OFF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="search-section-wrapper">
        <SearchBar
          value={location}
          onChange={setLocation}
          onSearch={handleSearch}
          placeholder="Search for any city — e.g. Delhi, Mumbai, Bangalore, Indore, Jaipur…"
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <MapPin size={12} color="rgba(255,255,255,0.7)" />
              <span>{city}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!submitted && (
        <div className="empty-state">
          <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <Globe size={48} color="#38bdf8" />
          </div>
          <h3>Search for a location</h3>
          <p>Type a city name above or pick from popular cities to get real-time weather analytics & live map view.</p>
        </div>
      )}

      {/* Loading */}
      {submitted && loading && (
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Fetching full weather telemetry & risk alerts for {submitted}…</p>
        </div>
      )}

      {/* Error */}
      {submitted && error && (
        <div className="page-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {submitted && !loading && !error && (
        <div className="search-results">
          {/* Live In-Page Risk Alert Banner */}
          <div id="search-alert-banner">
            <AlertBanner alerts={alerts} />
          </div>

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
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#38bdf8" />
              <span>{forecastDays}-Day Meteorological Forecast</span>
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
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#38bdf8" />
                <span>Location Summary</span>
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
