import { useState } from 'react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '🌤️' },
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { key: 'admin', label: 'Admin', icon: '📊' },
];

export default function Navbar({ activePage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a className="navbar-brand" href="#" onClick={() => onNavigate('dashboard')}>
          <span className="brand-icon">⛅</span>
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
          {NAV_ITEMS.map(item => (
            <li key={item.key}>
              <a
                href="#"
                className={`nav-link ${activePage === item.key ? 'active' : ''}`}
                onClick={e => { e.preventDefault(); onNavigate(item.key); setMenuOpen(false); }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
