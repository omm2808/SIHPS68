import { useState } from 'react';
import {
  LayoutDashboard,
  Compass,
  Bot,
  Sprout,
  Settings,
  CloudSun,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'home', icon: LayoutDashboard, label: 'Dashboard', desc: 'Current Location' },
  { key: 'search', icon: Compass, label: 'Search & Maps', desc: 'Explore Places' },
  { key: 'weathergpt', icon: Bot, label: 'WeatherGPT', desc: 'AI Voice & Chat' },
  { key: 'agriculture', icon: Sprout, label: 'Agriculture', desc: 'Crop Advisory' },
  { key: 'settings', icon: Settings, label: 'Settings', desc: 'Preferences' },
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
            <CloudSun size={22} color="#ffffff" />
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
                <item.icon size={20} className="nav-btn-icon" />
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
