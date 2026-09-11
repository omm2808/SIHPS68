const CONDITION_ICONS = {
  'Clear': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️',
  'Light Rain': '🌦️', 'Moderate Rain': '🌧️', 'Thunderstorm': '⛈️',
  'Haze': '🌫️', 'Rain': '🌧️', 'Clouds': '☁️',
};

import { useSettings } from '../context/SettingsContext';

export default function HourlyTimeline({ hourly }) {
  if (!hourly || hourly.length === 0) return null;

  const { convertTemp } = useSettings();
  const maxT = Math.max(...hourly.map(h => h.temperature));
  const minT = Math.min(...hourly.map(h => h.temperature));
  const range = maxT - minT || 1;

  return (
    <div className="hourly-section">
      <h3 className="section-title">
        <span className="section-icon">⏱️</span> Hourly Forecast
      </h3>
      <div className="hourly-scroll">
        {hourly.map((h, i) => {
          const pct = ((h.temperature - minT) / range) * 100;
          const icon = CONDITION_ICONS[h.condition] || '🌡️';
          return (
            <div className="hourly-item" key={i} style={{ animationDelay: `${i * 0.04}s` }}>
              <span className="hourly-time">{h.time}</span>
              <span className="hourly-icon">{icon}</span>
              <div className="hourly-bar-track">
                <div className="hourly-bar" style={{ height: `${Math.max(pct, 10)}%` }} />
              </div>
              <span className="hourly-temp">{convertTemp(h.temperature)}°</span>
              <span className="hourly-rain">💧{h.rain_probability}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
