import { useState } from 'react';

export default function SettingsPage() {
  const [unit, setUnit] = useState('celsius');
  const [speedUnit, setSpeedUnit] = useState('kmh');
  const [notifications, setNotifications] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState('normal');

  return (
    <div className="page settings-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">⚙</span> Dashboard Settings
          </h1>
          <p className="page-subtitle">Customize units, notifications, and weather preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Unit Settings */}
        <div className="settings-card">
          <h3 className="settings-card-title">🌡️ Temperature Unit</h3>
          <div className="settings-options-row">
            <button
              className={`setting-choice-btn ${unit === 'celsius' ? 'active' : ''}`}
              onClick={() => setUnit('celsius')}
            >
              Celsius (°C)
            </button>
            <button
              className={`setting-choice-btn ${unit === 'fahrenheit' ? 'active' : ''}`}
              onClick={() => setUnit('fahrenheit')}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>

        {/* Wind Speed Unit */}
        <div className="settings-card">
          <h3 className="settings-card-title">💨 Wind Speed Unit</h3>
          <div className="settings-options-row">
            <button
              className={`setting-choice-btn ${speedUnit === 'kmh' ? 'active' : ''}`}
              onClick={() => setSpeedUnit('kmh')}
            >
              km/h
            </button>
            <button
              className={`setting-choice-btn ${speedUnit === 'mph' ? 'active' : ''}`}
              onClick={() => setSpeedUnit('mph')}
            >
              mph
            </button>
            <button
              className={`setting-choice-btn ${speedUnit === 'ms' ? 'active' : ''}`}
              onClick={() => setSpeedUnit('ms')}
            >
              m/s
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <h3 className="settings-card-title">🔔 Severe Weather Notifications</h3>
          <div className="settings-toggle-row">
            <span>Receive automatic warnings for thunderstorms and heavy rain</span>
            <button
              className={`toggle-switch ${notifications ? 'on' : 'off'}`}
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* AI Voice Assistant */}
        <div className="settings-card">
          <h3 className="settings-card-title">🗣️ WeatherGPT Voice Speed</h3>
          <div className="settings-options-row">
            <button
              className={`setting-choice-btn ${voiceSpeed === 'slow' ? 'active' : ''}`}
              onClick={() => setVoiceSpeed('slow')}
            >
              Slow
            </button>
            <button
              className={`setting-choice-btn ${voiceSpeed === 'normal' ? 'active' : ''}`}
              onClick={() => setVoiceSpeed('normal')}
            >
              Normal
            </button>
            <button
              className={`setting-choice-btn ${voiceSpeed === 'fast' ? 'active' : ''}`}
              onClick={() => setVoiceSpeed('fast')}
            >
              Fast
            </button>
          </div>
        </div>

        {/* About App */}
        <div className="settings-card full-span">
          <h3 className="settings-card-title">ℹ️ About WeatherSphere</h3>
          <p className="about-text">
            WeatherSphere is a next-generation weather analytics and AI platform featuring real-time
            device geolocation, Leaflet interactive mapping, 10-day meteorological forecasting,
            multilingual WeatherGPT regional voice assistant, and agricultural crop advisory.
          </p>
          <div className="about-badges">
            <span className="about-badge">⚡ React 19</span>
            <span className="about-badge">🌐 Open-Meteo Free API</span>
            <span className="about-badge">🗺️ Leaflet Maps</span>
            <span className="about-badge">🗣️ Web Speech API</span>
          </div>
        </div>
      </div>
    </div>
  );
}
