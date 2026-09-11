const SEVERITY_CONFIG = {
  LOW:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Low' },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Moderate' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'High' },
  SEVERE:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Severe' },
  EXTREME:  { color: '#dc2626', bg: 'rgba(220,38,38,0.18)', label: 'Extreme' },
};

export default function AlertBanner({ alerts }) {
  if (!alerts || alerts.alert_count === 0) {
    return (
      <div className="alert-banner alert-ok">
        <span className="alert-icon">✅</span>
        <span>No active weather alerts — conditions are normal.</span>
      </div>
    );
  }

  return (
    <div className="alert-list">
      {alerts.alerts.map((alert, i) => {
        const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
        return (
          <div
            className="alert-banner alert-warning"
            key={i}
            style={{ borderLeftColor: cfg.color, background: cfg.bg }}
          >
            <div className="alert-header">
              <span className="alert-icon">⚠️</span>
              <strong className="alert-type">{alert.type}</strong>
              <span className="alert-severity" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
            <p className="alert-message">{alert.message}</p>
            <p className="alert-rec">💡 {alert.recommendation}</p>
          </div>
        );
      })}
    </div>
  );
}
