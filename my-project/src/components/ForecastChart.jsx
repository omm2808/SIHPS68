const CONDITION_ICONS = {
  'Clear': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️',
  'Light Rain': '🌦️', 'Moderate Rain': '🌧️', 'Thunderstorm': '⛈️',
  'Haze': '🌫️', 'Rain': '🌧️', 'Clouds': '☁️',
};

export default function ForecastChart({ forecast, days = 7 }) {
  if (!forecast || forecast.length === 0) return null;

  const visible = forecast.slice(0, days);
  const maxTemp = Math.max(...visible.map(d => d.temp_max));
  const minTemp = Math.min(...visible.map(d => d.temp_min));
  const range = maxTemp - minTemp || 1;

  return (
    <div className="forecast-section">
      <h3 className="section-title">
        <span className="section-icon">📅</span> {days}-Day Forecast
      </h3>
      <div className="forecast-scroll">
        {visible.map((day, i) => {
          const highPct = ((day.temp_max - minTemp) / range) * 100;
          const lowPct = ((day.temp_min - minTemp) / range) * 100;
          const icon = CONDITION_ICONS[day.condition] || '🌡️';

          return (
            <div className="forecast-day" key={day.date || i} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="forecast-dayname">{i === 0 ? 'Today' : day.day_name?.slice(0, 3)}</span>
              <span className="forecast-icon">{icon}</span>
              <div className="forecast-bar-track">
                <div
                  className="forecast-bar"
                  style={{ bottom: `${lowPct}%`, height: `${highPct - lowPct}%` }}
                />
              </div>
              <span className="forecast-high">{day.temp_max}°</span>
              <span className="forecast-low">{day.temp_min}°</span>
              <div className="forecast-rain">
                <span className="rain-drop">💧</span>
                <span>{day.rain_probability}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
