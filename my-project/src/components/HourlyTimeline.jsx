import { useSettings } from '../context/SettingsContext';
import { WeatherConditionIcon } from '../utils/weatherIcons';
import { Clock, Droplets } from 'lucide-react';

export default function HourlyTimeline({ hourly }) {
  if (!hourly || hourly.length === 0) return null;

  const { convertTemp } = useSettings();
  const maxT = Math.max(...hourly.map(h => h.temperature));
  const minT = Math.min(...hourly.map(h => h.temperature));
  const range = maxT - minT || 1;

  return (
    <div className="hourly-section">
      <h3 className="section-title">
        <Clock size={16} className="section-icon" color="#38bdf8" /> Hourly Forecast
      </h3>
      <div className="hourly-scroll">
        {hourly.map((h, i) => {
          const pct = ((h.temperature - minT) / range) * 100;
          return (
            <div className="hourly-item" key={i} style={{ animationDelay: `${i * 0.04}s` }}>
              <span className="hourly-time">{h.time}</span>
              <span className="hourly-icon">
                <WeatherConditionIcon condition={h.condition} size={20} />
              </span>
              <div className="hourly-bar-track">
                <div className="hourly-bar" style={{ height: `${Math.max(pct, 10)}%` }} />
              </div>
              <span className="hourly-temp">{convertTemp(h.temperature)}°</span>
              <span className="hourly-rain" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Droplets size={10} color="#60a5fa" />
                {h.rain_probability}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
