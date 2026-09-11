import { useState, useEffect, useCallback, useRef } from 'react';
import MapView from '../components/MapView';
import SummaryChart from '../components/SummaryChart';

// WMO Code mapping
const WMO_CODES = {
  0: ['Clear Sky', '☀️'],
  1: ['Mainly Clear', '🌤️'],
  2: ['Partly Cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'],
  48: ['Rime Fog', '🌫️'],
  51: ['Light Drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy Drizzle', '🌧️'],
  61: ['Slight Rain', '🌧️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy Rain', '🌧️'],
  71: ['Slight Snow', '🌨️'],
  73: ['Snow', '❄️'],
  75: ['Heavy Snow', '❄️'],
  80: ['Rain Showers', '🌦️'],
  81: ['Showers', '🌧️'],
  82: ['Heavy Showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm w/ Hail', '⛈️'],
  99: ['Heavy Thunderstorm', '🌩️'],
};

function getWmoInfo(code) {
  return WMO_CODES[code] || ['Unknown', '🌡️'];
}

const POPULAR_CITIES = [
  { name: 'Delhi', lat: 28.6139, lon: 77.209, defaultCondition: 'Partly Cloudy', icon: '⛅' },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, defaultCondition: 'Drizzle Rain', icon: '🌦️' },
  { name: 'Hyderabad', lat: 17.385, lon: 78.4867, defaultCondition: 'Heavy Rain', icon: '🌧️' },
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946, defaultCondition: 'Light Thunders', icon: '⛈️' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, defaultCondition: 'Mostly Sunny', icon: '🌤️' },
];

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState('');
  const [coords, setCoords] = useState({ lat: 17.385, lon: 78.4867 });
  const [locationName, setLocationName] = useState('Locating…');
  const [geoState, setGeoState] = useState('pending'); // 'pending' | 'success' | 'denied' | 'error'
  const [weatherData, setWeatherData] = useState(null);
  const [forecastDays, setForecastDays] = useState(7);
  const [selectedDayIdx, setSelectedDayIdx] = useState(3);
  const [cityTemps, setCityTemps] = useState({});

  // Topbar search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  // Alerts
  const [showAlerts, setShowAlerts] = useState(false);

  // Clock
  useEffect(() => {
    const tick = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      );
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  // ─── Fetch weather from Open-Meteo ────────────────────
  const fetchWeather = useCallback(async (lat, lon, name) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,uv_index&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=10`;
      const res = await fetch(url);
      const data = await res.json();
      setWeatherData(data);
      setCoords({ lat, lon });
      if (name) setLocationName(name);
    } catch (err) {
      console.error('Weather fetch error:', err);
    }
  }, []);

  // ─── Reverse geocode ──────────────────────────────────
  const reverseGeocode = async (lat, lon) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const d = await r.json();
      return (
        d.address?.city ||
        d.address?.town ||
        d.address?.village ||
        d.address?.county ||
        d.display_name?.split(',')[0] ||
        'Your Location'
      );
    } catch {
      return 'Your Location';
    }
  };

  // ─── Device GPS Geolocation (FIXED — robust multi-attempt) ────
  const locateDevice = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState('error');
      setLocationName('Hyderabad');
      fetchWeather(17.385, 78.4867, 'Hyderabad');
      return;
    }

    setGeoState('pending');
    setLocationName('Locating…');

    // Try high accuracy first, then fallback to low accuracy
    const tryGeo = (highAccuracy, attempt) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          setGeoState('success');
          const name = await reverseGeocode(lat, lon);
          setLocationName(name);
          setCoords({ lat, lon });
          fetchWeather(lat, lon, name);
        },
        (err) => {
          console.warn(`Geolocation attempt ${attempt} failed:`, err.message);
          if (highAccuracy && attempt === 1) {
            // Retry without high accuracy
            tryGeo(false, 2);
          } else {
            // Final fallback
            setGeoState(err.code === 1 ? 'denied' : 'error');
            setLocationName('Hyderabad');
            setCoords({ lat: 17.385, lon: 78.4867 });
            fetchWeather(17.385, 78.4867, 'Hyderabad');
          }
        },
        {
          timeout: highAccuracy ? 6000 : 10000,
          enableHighAccuracy: highAccuracy,
          maximumAge: 60000,
        }
      );
    };

    tryGeo(true, 1);
  }, [fetchWeather]);

  // Initial load
  useEffect(() => {
    locateDevice();
  }, [locateDevice]);

  // ─── Fetch live temps for popular cities ──────────────
  useEffect(() => {
    POPULAR_CITIES.forEach(async (city) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=auto`
        );
        const d = await r.json();
        if (d.current) {
          const wmo = getWmoInfo(d.current.weather_code);
          setCityTemps((prev) => ({
            ...prev,
            [city.name]: {
              temp: Math.round(d.current.temperature_2m),
              desc: wmo[0],
              icon: wmo[1],
            },
          }));
        }
      } catch {}
    });
  }, []);

  // ─── Topbar search autocomplete ───────────────────────
  const handleSearchInput = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimerRef.current);

    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`
        );
        setSearchResults(await r.json());
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];
    setSearchQuery('');
    setSearchResults([]);
    setLocationName(name);
    setCoords({ lat, lon });
    fetchWeather(lat, lon, name);
  };

  // ─── Derived weather values ───────────────────────────
  const cur = weatherData?.current;
  const wmoInfo = cur ? getWmoInfo(cur.weather_code) : ['—', '🌡️'];
  const temp = cur ? Math.round(cur.temperature_2m) : '—';
  const humidity = cur ? cur.relative_humidity_2m : '—';
  const wind = cur ? Math.round(cur.wind_speed_10m) : '—';
  const pressure = cur ? Math.round(cur.surface_pressure) : '—';
  const uv = cur ? Math.round(cur.uv_index ?? 0) : '—';
  const daily = weatherData?.daily;

  return (
    <div className="home-dashboard">
      {/* ═══ TOPBAR ═══ */}
      <header className="dash-topbar">
        <div className="topbar-search-wrapper">
          <div className="topbar-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search for location"
              value={searchQuery}
              onChange={handleSearchInput}
            />
            {searchLoading && <span className="search-spinner" />}
          </div>
          {searchResults.length > 0 && (
            <div className="search-dropdown-menu">
              {searchResults.map((r, i) => (
                <div key={i} className="search-dropdown-item" onClick={() => selectSearchResult(r)}>
                  <span className="s-drop-icon">📍</span>
                  <span className="s-drop-text">{r.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-actions">
          <button
            className="topbar-icon-btn bell-btn"
            title="Weather Alerts"
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <span>🔔</span>
            <span className="bell-badge" />
          </button>
          <div className="user-avatar-pill" title="Profile">
            <div className="avatar-img-frame">
              <span>👩‍🦰</span>
            </div>
          </div>
        </div>

        {showAlerts && (
          <div className="alerts-modal-dropdown">
            <div className="alerts-modal-header">
              <span>⚡ Weather Alerts</span>
              <button className="close-btn" onClick={() => setShowAlerts(false)}>✕</button>
            </div>
            <div className="alerts-modal-body">
              <div className="alert-item warn">
                <strong>🌧️ Monsoon Heavy Rain Watch</strong>
                <p>Heavy rainfall expected in next 24-48 hours.</p>
              </div>
              <div className="alert-item info">
                <strong>💨 Wind Advisory</strong>
                <p>Gusty winds up to 25 km/h expected.</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ═══ DASHBOARD GRID ═══ */}
      <div className="dash-grid">

        {/* ── CURRENT WEATHER ── */}
        <div className="dash-card current-weather-card">
          <div className="card-top-row">
            <h3 className="card-title">Current Weather</h3>
            <span className="live-clock">{currentTime || '—'}</span>
          </div>

          <div className="current-weather-body">
            <div className="weather-art-wrap">
              <div className="weather-sun-glow" />
              <div className="weather-art-icon">{wmoInfo[1]}</div>
              <div className="rain-drops-animation">
                <span className="drop d1" />
                <span className="drop d2" />
                <span className="drop d3" />
              </div>
            </div>

            <div className="weather-temp-wrap">
              <div className="temp-number-row">
                <span className="temp-big">{temp}</span>
                <span className="temp-unit">°C</span>
              </div>
              <div className="weather-condition-text">{wmoInfo[0]}</div>
              <div className="weather-location-sub">
                {geoState === 'pending' ? '📡 Locating…' : `📍 ${locationName}`}
              </div>
            </div>
          </div>

          <div className="current-stats-bar">
            <div className="stat-metric-col">
              <span className="metric-icon">🌊</span>
              <span className="metric-val">{pressure}</span>
              <span className="metric-label">hPa</span>
            </div>
            <div className="stat-metric-divider" />
            <div className="stat-metric-col">
              <span className="metric-icon">💧</span>
              <span className="metric-val">{humidity}%</span>
              <span className="metric-label">Humidity</span>
            </div>
            <div className="stat-metric-divider" />
            <div className="stat-metric-col">
              <span className="metric-icon">💨</span>
              <span className="metric-val">{wind}km/h</span>
              <span className="metric-label">Wind</span>
            </div>
            <div className="stat-metric-divider" />
            <div className="stat-metric-col">
              <span className="metric-icon">☀️</span>
              <span className="metric-val">{uv}</span>
              <span className="metric-label">UV</span>
            </div>
          </div>
        </div>

        {/* ── MAP ── */}
        <div className="dash-card map-view-card">
          <MapView
            coords={coords}
            locationName={locationName}
            onLocateMe={locateDevice}
          />
        </div>

        {/* ── POPULAR CITIES (read-only — no map/weather change on click) ── */}
        <div className="dash-card popular-cities-card">
          <div className="card-top-row">
            <h3 className="card-title">Popular Cities</h3>
            <span className="view-more-label">Live</span>
          </div>

          <div className="popular-cities-list">
            {POPULAR_CITIES.map((city) => {
              const live = cityTemps[city.name];
              const cond = live?.desc || city.defaultCondition;
              const icon = live?.icon || city.icon;
              const tempC = live?.temp ?? '—';

              return (
                <div key={city.name} className="pop-city-row">
                  <div className="city-left">
                    <span className="city-weather-icon">{icon}</span>
                    <span className="city-name-text">{city.name}</span>
                  </div>
                  <div className="city-right">
                    <span className="city-condition-text">{cond}</span>
                    <span className="city-temp-badge">{tempC}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FORECAST ── */}
        <div className="dash-card forecast-card">
          <div className="card-top-row">
            <h3 className="card-title">Forecast</h3>
            <div className="forecast-pills-toggle">
              <button className={`pill-btn ${forecastDays === 7 ? 'active' : ''}`} onClick={() => setForecastDays(7)}>7 Days</button>
              <button className={`pill-btn ${forecastDays === 10 ? 'active' : ''}`} onClick={() => setForecastDays(10)}>10 Days</button>
            </div>
          </div>

          <div className="forecast-daily-list">
            {daily && daily.time
              ? daily.time.slice(0, forecastDays).map((t, idx) => {
                  const d = new Date(t + 'T12:00:00');
                  const label = idx === 0 ? 'Today' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });
                  const hi = Math.round(daily.temperature_2m_max[idx]);
                  const lo = Math.round(daily.temperature_2m_min[idx]);
                  const w = getWmoInfo(daily.weather_code[idx]);
                  return (
                    <div key={t} className={`forecast-row-item ${idx === selectedDayIdx ? 'active-highlight' : ''}`} onClick={() => setSelectedDayIdx(idx)}>
                      <span className="f-icon">{w[1]}</span>
                      <span className="f-temp-range">{hi}° / {lo}°</span>
                      <span className="f-date-label">{label}</span>
                    </div>
                  );
                })
              : Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={`forecast-row-item placeholder ${i === selectedDayIdx ? 'active-highlight' : ''}`}>
                    <span className="f-icon">🌧️</span>
                    <span className="f-temp-range">—° / —°</span>
                    <span className="f-date-label">Loading…</span>
                  </div>
                ))
            }
          </div>
        </div>

        {/* ── SUMMARY CHART ── */}
        <div className="dash-card summary-card-wrapper">
          <SummaryChart
            hourlyData={weatherData?.hourly}
            currentData={cur}
            dailyData={daily}
          />
        </div>
      </div>
    </div>
  );
}
