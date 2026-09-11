import { useState } from 'react';

const NAV_ITEMS = [
  { key: 'home', icon: '⊞', label: 'Dashboard', desc: 'Current Location' },
  { key: 'search', icon: '🗺️', label: 'Search & Maps', desc: 'Explore Places' },
  { key: 'weathergpt', icon: '🤖', label: 'WeatherGPT', desc: 'AI Voice & Chat' },
  { key: 'agriculture', icon: '🌾', label: 'Agriculture', desc: 'Crop Advisory' },
  { key: 'settings', icon: '⚙️', label: 'Settings', desc: 'Preferences' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="sidebar-container">
      <aside
        className={`app-sidebar ${hovered ? 'sidebar-expanded' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Sidebar navigation"
      >
        {/* Top Logo */}
        <div
          className="sidebar-logo"
          onClick={() => onNavigate('home')}
          title="WeatherSphere Dashboard"
        >
          <div className="sidebar-logo-icon-wrap">
            <span className="logo-icon">⛅</span>
          </div>
          <div className="sidebar-logo-brand">
            <span className="sidebar-logo-text">WeatherSphere</span>
            <span className="sidebar-logo-sub">Weather & AI</span>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
                title={!hovered ? item.label : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-btn-icon">{item.icon}</span>
                <div className="nav-btn-text">
                  <span className="nav-btn-title">{item.label}</span>
                  <span className="nav-btn-desc">{item.desc}</span>
                </div>
                {isActive && <div className="sidebar-active-indicator" />}
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
