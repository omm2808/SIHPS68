import { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Sprout,
  BarChart3,
  CloudSun,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'agriculture', label: 'Agriculture', icon: Sprout },
  { key: 'admin', label: 'Admin', icon: BarChart3 },
];

export default function Navbar({ activePage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a className="navbar-brand" href="#" onClick={() => onNavigate('dashboard')}>
          <CloudSun size={20} color="#60a5fa" />
          <span className="brand-text">WeatherGPT</span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
        </button>

        <ul className={`nav-links ${menuOpen ? 'show' : ''}`}>
          {NAV_ITEMS.map(item => {
            const IconComp = item.icon;
            return (
              <li key={item.key}>
                <a
                  href="#"
                  className={`nav-link ${activePage === item.key ? 'active' : ''}`}
                  onClick={e => { e.preventDefault(); onNavigate(item.key); setMenuOpen(false); }}
                >
                  <IconComp size={16} className="nav-icon" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
