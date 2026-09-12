import { useSettings } from '../context/SettingsContext';
import { WeatherConditionIcon } from '../utils/weatherIcons';
import { Calendar, Droplets } from 'lucide-react';

export default function ForecastChart({ forecast, days = 7, hideTitle = false }) {
  if (!forecast || forecast.length === 0) return null;

  const { convertTemp } = useSettings();
  const visible = forecast.slice(0, days);
  const maxTemp = Math.max(...visible.map(d => d.temp_max));
  const minTemp = Math.min(...visible.map(d => d.temp_min));
  const range = maxTemp - minTemp || 1;

  return (
    <div className="forecast-section">
      {!hideTitle && (
        <h3 className="section-title">
          <Calendar size={16} className="section-icon" color="#38bdf8" /> {days}-Day Forecast
        </h3>
      )}
      <div className="forecast-scroll">
        {visible.map((day, i) => {
          const highPct = ((day.temp_max - minTemp) / range) * 100;
          const lowPct = ((day.temp_min - minTemp) / range) * 100;

          return (
            <div className="forecast-day" key={day.date || i} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="forecast-dayname">{i === 0 ? 'Today' : day.day_name?.slice(0, 3)}</span>
              <span className="forecast-icon">
                <WeatherConditionIcon condition={day.condition} size={20} />
              </span>
              <div className="forecast-bar-track">
                <div
                  className="forecast-bar"
                  style={{ bottom: `${lowPct}%`, height: `${highPct - lowPct}%` }}
                />
              </div>
              <span className="forecast-high">{convertTemp(day.temp_max)}°</span>
              <span className="forecast-low">{convertTemp(day.temp_min)}°</span>
              <div className="forecast-rain">
                <Droplets size={10} color="#60a5fa" />
                <span>{day.rain_probability}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
