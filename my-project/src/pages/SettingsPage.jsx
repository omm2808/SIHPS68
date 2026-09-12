import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  Settings,
  Check,
  Thermometer,
  Wind,
  Bell,
  Volume2,
  Info,
  Zap,
  Globe,
  Map,
} from 'lucide-react';

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
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="page-title-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <Settings size={24} color="#38bdf8" />
            </span>
            <span>Dashboard Settings</span>
          </h1>
          <p className="page-subtitle">Customize units, notifications, and weather preferences (synced live to Dashboard)</p>
        </div>
      </div>

      {savedBanner && (
        <div className="settings-live-feedback" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} color="#10b981" />
          <span>{savedBanner}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Unit Settings */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={18} color="#f97316" /> Temperature Unit
            </h3>
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
            <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wind size={18} color="#60a5fa" /> Wind Speed Unit
            </h3>
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
            <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#fbbf24" /> Severe Weather Notifications
            </h3>
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
            <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={18} color="#a78bfa" /> WeatherGPT Voice Speed
            </h3>
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
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color="#38bdf8" /> About WeatherSphere
          </h3>
          <p className="about-text">
            WeatherSphere is a next-generation weather analytics and AI platform featuring real-time
            device geolocation, Leaflet interactive mapping, 10-day meteorological forecasting,
            multilingual WeatherGPT regional voice assistant, and agricultural crop advisory.
          </p>
          <div className="about-badges">
            <span className="about-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={12} color="#fbbf24" /> React 19
            </span>
            <span className="about-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Globe size={12} color="#38bdf8" /> Open-Meteo Free API
            </span>
            <span className="about-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Map size={12} color="#10b981" /> Leaflet Maps
            </span>
            <span className="about-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Settings size={12} color="#a78bfa" /> Live State Sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
