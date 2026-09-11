import { useState } from 'react';

const SEVERITY_CONFIG = {
  LOW: {
    color: '#38bdf8',
    bg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(14, 32, 76, 0.85) 100%)',
    border: 'rgba(56, 189, 248, 0.4)',
    glow: 'rgba(56, 189, 248, 0.2)',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    badgeText: '#7dd3fc',
    label: 'Advisory',
    icon: 'ℹ️',
  },
  MODERATE: {
    color: '#fbbf24',
    bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.14) 0%, rgba(14, 32, 76, 0.85) 100%)',
    border: 'rgba(251, 191, 36, 0.4)',
    glow: 'rgba(251, 191, 36, 0.22)',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
    badgeText: '#fde68a',
    label: 'Moderate Watch',
    icon: '⚠️',
  },
  HIGH: {
    color: '#f97316',
    bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.16) 0%, rgba(14, 32, 76, 0.9) 100%)',
    border: 'rgba(249, 115, 22, 0.5)',
    glow: 'rgba(249, 115, 22, 0.3)',
    badgeBg: 'rgba(249, 115, 22, 0.25)',
    badgeText: '#ffedd5',
    label: 'High Alert',
    icon: '⚡',
  },
  SEVERE: {
    color: '#ef4444',
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(14, 32, 76, 0.92) 100%)',
    border: 'rgba(239, 68, 68, 0.55)',
    glow: 'rgba(239, 68, 68, 0.35)',
    badgeBg: 'rgba(239, 68, 68, 0.25)',
    badgeText: '#fee2e2',
    label: 'Severe Warning',
    icon: '🚨',
  },
  EXTREME: {
    color: '#dc2626',
    bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.24) 0%, rgba(14, 32, 76, 0.94) 100%)',
    border: 'rgba(220, 38, 38, 0.7)',
    glow: 'rgba(220, 38, 38, 0.45)',
    badgeBg: 'rgba(220, 38, 38, 0.35)',
    badgeText: '#ffffff',
    label: 'Extreme Emergency',
    icon: '🛑',
  },
};

function getAlertIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('rain') || t.includes('flood') || t.includes('monsoon')) return '🌧️';
  if (t.includes('thunder') || t.includes('lightning')) return '⛈️';
  if (t.includes('wind') || t.includes('gale') || t.includes('storm')) return '💨';
  if (t.includes('heat') || t.includes('warm')) return '☀️';
  if (t.includes('cold') || t.includes('frost') || t.includes('snow')) return '❄️';
  return '⚠️';
}

export default function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (!alerts || alerts.alert_count === 0 || !alerts.alerts || alerts.alerts.length === 0) {
    return (
      <div className="pro-alert-all-clear">
        <div className="all-clear-glow-dot" />
        <span className="all-clear-icon">🛡️</span>
        <span className="all-clear-text">
          No Active Meteorological Warnings — Atmospheric conditions are normal.
        </span>
      </div>
    );
  }

  const locationName = alerts.location || 'Your Region';

  return (
    <div className="pro-alerts-container">
      {/* Alerts Summary Banner Header */}
      <div className="pro-alerts-banner-head">
        <div className="banner-head-left">
          <span className="pulsing-alert-orb">🚨</span>
          <div>
            <h4 className="banner-head-title">
              Active Meteorological Warnings & Hazards ({alerts.alert_count})
            </h4>
            <span className="banner-head-sub">
              Live automated telemetry advisory for {locationName}
            </span>
          </div>
        </div>
        <div className="banner-head-right">
          <span className="live-broadcast-pill">
            <span className="live-dot" /> LIVE ALERT
          </span>
          <button
            className="alert-dismiss-btn"
            title="Dismiss advisory"
            onClick={() => setDismissed(true)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Individual Alert Cards */}
      <div className="pro-alerts-cards-list">
        {alerts.alerts.map((alert, i) => {
          const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
          const icon = getAlertIcon(alert.type);

          return (
            <div
              key={i}
              className="pro-alert-card"
              style={{
                background: cfg.bg,
                borderColor: cfg.border,
                boxShadow: `0 8px 24px ${cfg.glow}`,
              }}
            >
              {/* Glowing vertical severity bar */}
              <div
                className="pro-alert-side-indicator"
                style={{ background: cfg.color }}
              />

              <div className="pro-alert-content">
                {/* Card Header */}
                <div className="pro-alert-top-row">
                  <div className="pro-alert-title-wrap">
                    <span className="pro-alert-icon">{icon}</span>
                    <h5 className="pro-alert-type">{alert.type}</h5>
                    <span className="pro-alert-location-pill">📍 {locationName}</span>
                  </div>

                  <div
                    className="pro-alert-severity-badge"
                    style={{
                      background: cfg.badgeBg,
                      color: cfg.badgeText,
                      borderColor: cfg.color,
                    }}
                  >
                    <span
                      className="severity-pulse-dot"
                      style={{ background: cfg.color }}
                    />
                    <span>{cfg.label}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="pro-alert-desc">{alert.message}</p>

                {/* Safety Recommendation Box */}
                {alert.recommendation && (
                  <div className="pro-alert-safety-box">
                    <div className="safety-box-header">
                      <span className="safety-shield-icon">🛡️</span>
                      <span className="safety-box-title">Recommended Safety Protocol</span>
                    </div>
                    <p className="safety-box-instruction">{alert.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
