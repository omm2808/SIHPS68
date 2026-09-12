import { useSettings } from '../context/SettingsContext';
import { WeatherConditionIcon } from '../utils/weatherIcons';
import {
  Droplets,
  Wind as WindIcon,
  Gauge,
  Eye,
  CloudRain,
  Sunrise,
  Radio,
} from 'lucide-react';

const CONDITION_CLASSES = {
  'Clear': 'weather-clear',
  'Partly Cloudy': 'weather-partly-cloudy',
  'Cloudy': 'weather-cloudy',
  'Light Rain': 'weather-rain',
  'Moderate Rain': 'weather-rain',
  'Thunderstorm': 'weather-storm',
  'Haze': 'weather-haze',
};

export default function WeatherCard({ data }) {
  if (!data) return null;

  const { convertTemp, convertWind, tempUnitSymbol } = useSettings();
  const condClass = CONDITION_CLASSES[data.condition] || 'weather-clear';

  const displayTemp = convertTemp(data.temperature);
  const displayFeels = convertTemp(data.feels_like);
  const windObj = convertWind(data.wind_speed);

  return (
    <div className={`weather-card ${condClass}`}>
      <div className="weather-card-bg" />
      <div className="weather-card-content">
        <div className="weather-main">
          <div className="weather-temp-block">
            <span className="weather-icon">
              <WeatherConditionIcon condition={data.condition} size={42} />
            </span>
            <span className="weather-temp">{displayTemp}°</span>
          </div>
          <div className="weather-info">
            <h2 className="weather-location">{data.location}</h2>
            <p className="weather-condition">{data.condition}</p>
            <p className="weather-feels">Feels like {displayFeels}{tempUnitSymbol}</p>
          </div>
        </div>

        <div className="weather-details">
          <div className="detail-item">
            <Droplets size={20} className="detail-icon" color="#38bdf8" />
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{data.humidity}%</span>
          </div>
          <div className="detail-item">
            <WindIcon size={20} className="detail-icon" color="#a78bfa" />
            <span className="detail-label">Wind</span>
            <span className="detail-value">{windObj.val} {windObj.unit}</span>
          </div>
          <div className="detail-item">
            <Gauge size={20} className="detail-icon" color="#f472b6" />
            <span className="detail-label">Pressure</span>
            <span className="detail-value">{data.pressure} hPa</span>
          </div>
          <div className="detail-item">
            <Eye size={20} className="detail-icon" color="#fbbf24" />
            <span className="detail-label">Visibility</span>
            <span className="detail-value">{data.visibility} km</span>
          </div>
          <div className="detail-item">
            <CloudRain size={20} className="detail-icon" color="#60a5fa" />
            <span className="detail-label">Rain</span>
            <span className="detail-value">{data.rain_probability}%</span>
          </div>
          <div className="detail-item">
            <Sunrise size={20} className="detail-icon" color="#fb923c" />
            <span className="detail-label">Sunrise</span>
            <span className="detail-value">{(() => {
              const raw = String(data.sunrise || '').trim();
              if (!raw) return '05:35 AM';
              const parts = raw.split(':');
              if (parts.length >= 2) {
                let h = parseInt(parts[0], 10);
                let m = parseInt(parts[1], 10);
                if (isNaN(h) || isNaN(m)) return raw;
                if (h <= 2) {
                  h += 5;
                  m += 30;
                  if (m >= 60) {
                    h += 1;
                    m -= 60;
                  }
                }
                const suffix = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
              }
              return raw;
            })()}</span>
          </div>
        </div>

        {data.data_source && (() => {
          const ds = String(data.data_source).toLowerCase();
          const isLive = !ds.includes('mock') && !ds.includes('demo');
          return (
            <span className={`data-badge ${isLive ? 'badge-real' : 'badge-mock'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Radio size={12} />
              {isLive ? 'Live Data' : 'Demo Data'}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
