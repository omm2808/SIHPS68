const CONDITION_ICONS = {
  'Clear': '☀️',
  'Partly Cloudy': '⛅',
  'Cloudy': '☁️',
  'Light Rain': '🌦️',
  'Moderate Rain': '🌧️',
  'Thunderstorm': '⛈️',
  'Haze': '🌫️',
  'Rain': '🌧️',
  'Clouds': '☁️',
  'Mist': '🌫️',
  'Drizzle': '🌦️',
};

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

  const condClass = CONDITION_CLASSES[data.condition] || 'weather-clear';
  const icon = CONDITION_ICONS[data.condition] || '🌡️';

  return (
    <div className={`weather-card ${condClass}`}>
      <div className="weather-card-bg" />
      <div className="weather-card-content">
        <div className="weather-main">
          <div className="weather-temp-block">
            <span className="weather-icon">{icon}</span>
            <span className="weather-temp">{data.temperature}°</span>
          </div>
          <div className="weather-info">
            <h2 className="weather-location">{data.location}</h2>
            <p className="weather-condition">{data.condition}</p>
            <p className="weather-feels">Feels like {data.feels_like}°C</p>
          </div>
        </div>

        <div className="weather-details">
          <div className="detail-item">
            <span className="detail-icon">💧</span>
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{data.humidity}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💨</span>
            <span className="detail-label">Wind</span>
            <span className="detail-value">{data.wind_speed} km/h</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🌡️</span>
            <span className="detail-label">Pressure</span>
            <span className="detail-value">{data.pressure} hPa</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">👁️</span>
            <span className="detail-label">Visibility</span>
            <span className="detail-value">{data.visibility} km</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🌧️</span>
            <span className="detail-label">Rain</span>
            <span className="detail-value">{data.rain_probability}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🌅</span>
            <span className="detail-label">Sunrise</span>
            <span className="detail-value">{data.sunrise}</span>
          </div>
        </div>

        {data.data_source && (
          <span className={`data-badge ${data.data_source === 'real' ? 'badge-real' : 'badge-mock'}`}>
            {data.data_source === 'real' ? '🟢 Live Data' : '🟡 Demo Data'}
          </span>
        )}
      </div>
    </div>
  );
}
