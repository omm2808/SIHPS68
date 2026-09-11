import { useState, useEffect, useCallback, useRef } from 'react';
import MapView from '../components/MapView';
import SummaryChart from '../components/SummaryChart';
import RiskAlertToast from '../components/RiskAlertToast';
import { getAlerts } from '../api/weatherApi';
import { useSettings } from '../context/SettingsContext';
import { useGlobalWeather } from '../context/WeatherContext';
import { geocodeLocation, KNOWN_COORDS } from '../utils/knownCoords';

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

export default function HomePage({ onNavigateSearch, onNavigateSettings }) {
  const { unit, speedUnit, notifications, convertTemp, convertWind, tempUnitSymbol } = useSettings();
  const {
    weatherData,
    coords,
    locationName,
    fetchWeather,
    setLocationName,
  } = useGlobalWeather();

  const [currentTime, setCurrentTime] = useState('');
  const [geoState, setGeoState] = useState('pending'); // 'pending' | 'success' | 'denied' | 'error'
  const [forecastDays, setForecastDays] = useState(7);
  const [selectedDayIdx, setSelectedDayIdx] = useState(3);
  const [cityTemps, setCityTemps] = useState({});

  // Topbar search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  // Alerts & Notifications
  const [alertsList, setAlertsList] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [toastAlert, setToastAlert] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const lastAlertKeyRef = useRef('');

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

  // ─── Fetch Real-Time Alerts for current location ─────────────────
  const fetchAlertsForLocation = useCallback(async (targetName, currentWeatherData, currentCoords) => {
    if (!targetName || targetName === 'Locating…') return;
    try {
      const lat = currentCoords?.lat;
      const lon = currentCoords?.lon;
      const res = await getAlerts(targetName, lat, lon);
      let list = [];
      if (res && res.alerts && res.alerts.length > 0) {
        list = res.alerts.map((a) => ({
          ...a,
          location: res.location || targetName,
        }));
      }

      // If backend was unreachable or returned 0, evaluate directly against live satellite/sensor data
      if (list.length === 0 && currentWeatherData?.current) {
        const c = currentWeatherData.current;
        const code = c.weather_code;
        const tempVal = c.temperature_2m;
        const wind = c.wind_speed_10m;

        if ([95, 96, 99].includes(code)) {
          list.push({
            type: 'Thunderstorm & Lightning',
            severity: 'HIGH',
            message: `Active convective thunderstorm radar signal detected in ${targetName}.`,
            recommendation: 'Stay indoors. Avoid open fields, tall trees, and metal structures. Unplug electronics.',
            location: targetName,
            data_source: 'Live Real Data',
          });
        }
        if ([65, 82].includes(code)) {
          list.push({
            type: 'Heavy Rainfall Warning',
            severity: 'SEVERE',
            message: `Torrential rainfall currently observed in ${targetName}.`,
            recommendation: 'Avoid waterlogged areas and unnecessary travel. Move to higher ground if near flood-prone zones.',
            location: targetName,
            data_source: 'Live Real Data',
          });
        }
        if (wind >= 50) {
          list.push({
            type: 'Strong Wind Advisory',
            severity: wind >= 65 ? 'SEVERE' : 'MODERATE',
            message: `Sustained wind gusts of ${Math.round(wind)} km/h recorded in ${targetName}.`,
            recommendation: 'Secure loose outdoor items. Drive carefully, especially two-wheelers.',
            location: targetName,
            data_source: 'Live Real Data',
          });
        }
        if (tempVal >= 40) {
          list.push({
            type: 'Heatwave Alert',
            severity: tempVal >= 45 ? 'EXTREME' : 'HIGH',
            message: `Live temperature in ${targetName} reached ${Math.round(tempVal)}°C — heatwave threshold exceeded.`,
            recommendation: 'Limit outdoor exposure during peak afternoon hours. Drink water frequently with electrolytes.',
            location: targetName,
            data_source: 'Live Real Data',
          });
        }
      }

      setAlertsList(list);

      // Trigger right-top popup toast if notifications enabled and hazards exist
      if (notifications && list.length > 0) {
        const key = `${targetName}-${list[0].type}-${list.length}`;
        if (lastAlertKeyRef.current !== key) {
          lastAlertKeyRef.current = key;
          setToastAlert(list[0]);
          setShowToast(true);
        }
      }
    } catch (err) {
      console.warn('Alerts fetch error:', err);
    }
  }, [notifications]);

  // Hide toast immediately if notifications turned OFF
  useEffect(() => {
    if (!notifications) {
      setShowToast(false);
    }
  }, [notifications]);

  // Sync alerts on weather change
  useEffect(() => {
    if (weatherData && locationName && locationName !== 'Locating…') {
      fetchAlertsForLocation(locationName, weatherData, coords);
    }
  }, [weatherData, locationName, coords, fetchAlertsForLocation]);

  // ─── Reverse geocode ──────────────────────────────────
  const reverseGeocode = async (lat, lon) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`
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
      fetchWeather(20.4795, 86.1306, 'Salipur');
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
          fetchWeather(lat, lon, name);
        },
        (err) => {
          console.warn(`Geolocation attempt ${attempt} failed:`, err.message);
          if (highAccuracy && attempt === 1) {
            tryGeo(false, 2);
          } else {
            setGeoState(err.code === 1 ? 'denied' : 'error');
            fetchWeather(20.4795, 86.1306, 'Salipur');
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
  }, [fetchWeather, setLocationName]);

  // Initial load: render immediate weather & map, then refine with GPS in background
  useEffect(() => {
    if (!weatherData) {
      fetchWeather(20.4795, 86.1306, 'Salipur');
      locateDevice();
    }
  }, [locateDevice, weatherData, fetchWeather]);

  // ─── Fetch live temps for Popular Cities ───────────────
  useEffect(() => {
    const fetchCityTemps = async () => {
      const results = {};
      await Promise.all(
        POPULAR_CITIES.map(async (c) => {
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code&timezone=auto`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.current) {
              const code = data.current.weather_code;
              const [desc, icon] = getWmoInfo(code);
              results[c.name] = {
                temp: data.current.temperature_2m,
                code,
                desc,
                icon,
              };
            }
          } catch {
            // keep fallback
          }
        })
      );
      setCityTemps(results);
    };

    fetchCityTemps();
    const interval = setInterval(fetchCityTemps, 180000);
    return () => clearInterval(interval);
  }, []);

  // ─── Topbar Autocomplete Search ───────────────────────
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
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en`
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
    fetchWeather(lat, lon, name);
  };

  // ─── Derived weather values ───────────────────────────
  const cur = weatherData?.current;
  const wmoInfo = cur ? getWmoInfo(cur.weather_code) : ['—', '🌡️'];
  const rawTemp = cur ? cur.temperature_2m : null;
  const temp = rawTemp !== null ? convertTemp(rawTemp) : '—';
  const humidity = cur ? cur.relative_humidity_2m : '—';
  const windObj = cur ? convertWind(cur.wind_speed_10m) : { val: '—', unit: speedUnit === 'mph' ? 'mph' : speedUnit === 'ms' ? 'm/s' : 'km/h' };
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
            className={`topbar-icon-btn bell-btn ${!notifications ? 'bell-muted' : ''} ${notifications && alertsList.length > 0 ? 'has-active-alerts' : ''}`}
            title={
              notifications
                ? `Weather Alerts (${alertsList.length} active in ${locationName})`
                : 'Weather Alerts (Notifications Silenced in Settings)'
            }
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <span>{notifications ? '🔔' : '🔕'}</span>
            {notifications && alertsList.length > 0 && (
              <span className="bell-badge">{alertsList.length}</span>
            )}
          </button>
          {onNavigateSettings && (
            <button
              className="topbar-settings-pill"
              title="Click to change units & dashboard settings"
              onClick={onNavigateSettings}
            >
              <span className="settings-pill-icon">⚙️</span>
              <span className="settings-pill-text">{tempUnitSymbol} · {speedUnit}</span>
            </button>
          )}
        </div>

        {showAlerts && (
          <div className="alerts-modal-dropdown" role="dialog" aria-label="Active Weather Alerts Panel">
            <div className="alerts-modal-header">
              <div className="panel-title-group">
                <span className="panel-title-icon">⚡</span>
                <span className="panel-title-text">Notification Panel</span>
                {alertsList.length > 0 && (
                  <span className="panel-count-tag">{alertsList.length} Active</span>
                )}
              </div>
              <button
                className="close-btn"
                onClick={() => setShowAlerts(false)}
                title="Close notification panel"
              >
                ✕
              </button>
            </div>

            <div className="alerts-modal-body">
              {!notifications && (
                <div className="alert-panel-item item-silenced">
                  <div className="silenced-top">
                    <span>🔕</span>
                    <strong>Alert Popups Silenced</strong>
                  </div>
                  <p>Right-top corner hazard popups are currently turned OFF in Settings. Alerts remain stored here for your safety.</p>
                  {onNavigateSettings && (
                    <button
                      className="silenced-settings-btn"
                      onClick={() => {
                        setShowAlerts(false);
                        onNavigateSettings();
                      }}
                    >
                      Turn ON in Settings →
                    </button>
                  )}
                </div>
              )}

              {alertsList.length === 0 ? (
                <div className="alert-panel-all-clear">
                  <span className="clear-icon">🛡️</span>
                  <div className="clear-text">
                    <strong>All Clear — No Active Hazards</strong>
                    <p>Current atmospheric conditions in {locationName} indicate normal parameters.</p>
                  </div>
                </div>
              ) : (
                alertsList.map((alert, idx) => {
                  const sev = (alert.severity || 'HIGH').toUpperCase();
                  const sevClass =
                    sev === 'SEVERE' || sev === 'EXTREME'
                      ? 'sev-severe'
                      : sev === 'HIGH'
                      ? 'sev-high'
                      : sev === 'MODERATE'
                      ? 'sev-mod'
                      : 'sev-low';

                  const icon = alert.type?.toLowerCase().includes('rain')
                    ? '🌧️'
                    : alert.type?.toLowerCase().includes('thunder')
                    ? '⛈️'
                    : alert.type?.toLowerCase().includes('wind')
                    ? '💨'
                    : alert.type?.toLowerCase().includes('heat')
                    ? '☀️'
                    : alert.type?.toLowerCase().includes('snow')
                    ? '❄️'
                    : '⚠️';

                  return (
                    <div key={idx} className={`alert-panel-card ${sevClass}`}>
                      <div className="panel-card-head">
                        <div className="panel-card-title-wrap">
                          <span className="panel-card-icon">{icon}</span>
                          <span className="panel-card-title">{alert.type}</span>
                        </div>
                        <span className={`panel-sev-pill ${sevClass}`}>{alert.severity}</span>
                      </div>

                      <div className="panel-card-location">📍 {alert.location || locationName}</div>

                      <p className="panel-card-msg">{alert.message}</p>

                      {alert.recommendation && (
                        <div className="panel-card-safety">
                          <span className="safety-ico">🛡️</span>
                          <span className="safety-txt">{alert.recommendation}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Footer */}
            {onNavigateSettings && (
              <div className="alerts-modal-footer">
                <button
                  className="panel-cfg-btn"
                  onClick={() => {
                    setShowAlerts(false);
                    onNavigateSettings();
                  }}
                  title="Configure alert notification settings"
                >
                  ⚙️ Notification Settings
                </button>
              </div>
            )}
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
                <span className="temp-unit">{tempUnitSymbol}</span>
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
              <span className="metric-val">{windObj.val}{windObj.unit}</span>
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
              const rawC = live?.temp;
              const displayTemp = rawC !== undefined && rawC !== null ? `${convertTemp(rawC)}°` : '—°';

              return (
                <div key={city.name} className="pop-city-row">
                  <div className="pop-city-left">
                    <span className="city-weather-icon">{icon}</span>
                    <div className="city-info-col">
                      <span className="city-name-text" title={city.name}>{city.name}</span>
                      <span className="city-condition-text" title={cond}>{cond}</span>
                    </div>
                  </div>
                  <div className="pop-city-right">
                    <span className="city-temp-badge">{displayTemp}</span>
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
                  const hi = convertTemp(daily.temperature_2m_max[idx]);
                  const lo = convertTemp(daily.temperature_2m_min[idx]);
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

      {/* ═══ TOP-RIGHT FLOATING RISK POPUP (TOAST) ═══ */}
      {showToast && toastAlert && notifications && (
        <div className="risk-toast-wrapper">
          <RiskAlertToast
            alert={toastAlert}
            totalAlerts={alertsList.length}
            duration={6500}
            onClose={() => setShowToast(false)}
            onOpenPanel={() => {
              setShowToast(false);
              setShowAlerts(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
