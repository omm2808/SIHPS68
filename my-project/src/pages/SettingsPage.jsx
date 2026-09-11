import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

export default function SettingsPage({ onNavigateDashboard }) {
  const {
    unit,
    speedUnit,
    notifications,
    voiceSpeed,
    updateSetting,
  } = useSettings();

  const [savedBanner, setSavedBanner] = useState('');

  const handleUpdate = (key, val, label) => {
    updateSetting(key, val);
    setSavedBanner(`Saved: ${label}. Dashboard updated!`);
    setTimeout(() => setSavedBanner(''), 3000);
  };

  return (
    <div className="page settings-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">⚙</span> Dashboard Settings
          </h1>
          <p className="page-subtitle">Customize units, notifications, and weather preferences (synced live to Dashboard)</p>
        </div>
      </div>

      {savedBanner && (
        <div className="settings-live-feedback">
          <span className="feedback-check">✓</span>
          <span>{savedBanner}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Unit Settings */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">🌡️ Temperature Unit</h3>
            <span className="setting-active-badge">Active: {unit === 'fahrenheit' ? '°F' : '°C'}</span>
          </div>
          <p className="setting-desc">Sets temperature display on Dashboard, Forecast, Popular Cities, and Charts</p>
          <div className="settings-options-row">
            <button
              className={`setting-choice-btn ${unit === 'celsius' ? 'active' : ''}`}
              onClick={() => handleUpdate('unit', 'celsius', 'Celsius (°C)')}
            >
              Celsius (°C)
            </button>
            <button
              className={`setting-choice-btn ${unit === 'fahrenheit' ? 'active' : ''}`}
              onClick={() => handleUpdate('unit', 'fahrenheit', 'Fahrenheit (°F)')}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>

        {/* Wind Speed Unit */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">💨 Wind Speed Unit</h3>
            <span className="setting-active-badge">Active: {speedUnit}</span>
          </div>
          <p className="setting-desc">Sets wind speed metrics across current weather stats and telemetry</p>
          <div className="settings-options-row">
            <button
              className={`setting-choice-btn ${speedUnit === 'kmh' ? 'active' : ''}`}
              onClick={() => handleUpdate('speedUnit', 'kmh', 'km/h')}
            >
              km/h
            </button>
            <button
              className={`setting-choice-btn ${speedUnit === 'mph' ? 'active' : ''}`}
              onClick={() => handleUpdate('speedUnit', 'mph', 'mph')}
            >
              mph
            </button>
            <button
              className={`setting-choice-btn ${speedUnit === 'ms' ? 'active' : ''}`}
              onClick={() => handleUpdate('speedUnit', 'ms', 'm/s')}
            >
              m/s
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">🔔 Severe Weather Notifications</h3>
            <span className={`setting-active-badge ${notifications ? 'badge-on' : 'badge-off'}`}>
              {notifications ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="settings-toggle-row">
            <span>Receive automatic warnings & live badges for thunderstorms and heavy rain</span>
            <button
              className={`toggle-switch ${notifications ? 'on' : 'off'}`}
              onClick={() => handleUpdate('notifications', !notifications, notifications ? 'Alerts Disabled' : 'Alerts Enabled')}
            >
              {notifications ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* AI Voice Assistant */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">🗣️ WeatherGPT Voice Speed</h3>
            <span className="setting-active-badge">Active: {voiceSpeed}</span>
          </div>
          <p className="setting-desc">Controls speech rate when WeatherGPT speaks responses</p>
          <div className="settings-options-row">
            <button
              className={`setting-choice-btn ${voiceSpeed === 'slow' ? 'active' : ''}`}
              onClick={() => handleUpdate('voiceSpeed', 'slow', 'Voice Speed: Slow')}
            >
              Slow
            </button>
            <button
              className={`setting-choice-btn ${voiceSpeed === 'normal' ? 'active' : ''}`}
              onClick={() => handleUpdate('voiceSpeed', 'normal', 'Voice Speed: Normal')}
            >
              Normal
            </button>
            <button
              className={`setting-choice-btn ${voiceSpeed === 'fast' ? 'active' : ''}`}
              onClick={() => handleUpdate('voiceSpeed', 'fast', 'Voice Speed: Fast')}
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
            <span className="about-badge">⚙️ Live State Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
