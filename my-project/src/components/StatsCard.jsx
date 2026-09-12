import {
  Search,
  MessageSquare,
  AlertTriangle,
  Globe,
  MapPin,
} from 'lucide-react';

export default function StatsCard({ stats }) {
  if (!stats) return null;

  const cards = [
    { icon: Search, label: 'Total Queries', value: stats.total_queries, color: '#38bdf8' },
    { icon: MessageSquare, label: 'Total Chats', value: stats.total_chats, color: '#a78bfa' },
    { icon: AlertTriangle, label: 'Active Alerts', value: stats.active_alerts, color: '#f59e0b' },
    { icon: Globe, label: 'Weather Provider', value: stats.weather_provider?.replace('WeatherProvider', '') || 'Open-Meteo', color: '#34d399' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c, i) => {
        const IconComp = c.icon;
        return (
          <div className="stat-card" key={i} style={{ borderTopColor: c.color, animationDelay: `${i * 0.1}s` }}>
            <span className="stat-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <IconComp size={24} color={c.color} />
            </span>
            <span className="stat-value">{c.value}</span>
            <span className="stat-label">{c.label}</span>
          </div>
        );
      })}

      {stats.top_locations && stats.top_locations.length > 0 && (
        <div className="stat-card stat-card-wide" style={{ borderTopColor: '#2dd4bf' }}>
          <span className="stat-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <MapPin size={24} color="#2dd4bf" />
          </span>
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
