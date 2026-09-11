export default function StatsCard({ stats }) {
  if (!stats) return null;

  const cards = [
    { icon: '🔍', label: 'Total Queries', value: stats.total_queries, color: 'var(--accent-blue)' },
    { icon: '💬', label: 'Total Chats', value: stats.total_chats, color: 'var(--accent-purple)' },
    { icon: '⚠️', label: 'Active Alerts', value: stats.active_alerts, color: 'var(--accent-orange)' },
    { icon: '🌐', label: 'Weather Provider', value: stats.weather_provider?.replace('WeatherProvider', ''), color: 'var(--accent-green)' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c, i) => (
        <div className="stat-card" key={i} style={{ borderTopColor: c.color, animationDelay: `${i * 0.1}s` }}>
          <span className="stat-icon">{c.icon}</span>
          <span className="stat-value">{c.value}</span>
          <span className="stat-label">{c.label}</span>
        </div>
      ))}

      {stats.top_locations && stats.top_locations.length > 0 && (
        <div className="stat-card stat-card-wide" style={{ borderTopColor: 'var(--accent-teal)' }}>
          <span className="stat-icon">📍</span>
          <span className="stat-label">Top Locations</span>
          <ul className="top-locations">
            {stats.top_locations.map((loc, i) => (
              <li key={i}>
                <span className="loc-name">{loc.location}</span>
                <span className="loc-count">{loc.count} queries</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
