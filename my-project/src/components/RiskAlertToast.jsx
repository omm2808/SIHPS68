import { useState, useEffect, useRef } from 'react';

const SEVERITY_CONFIG = {
  LOW: {
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.35)',
    border: 'rgba(56, 189, 248, 0.5)',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    badgeText: '#bae6fd',
    label: 'Advisory Watch',
    badgeIcon: 'ℹ️',
  },
  MODERATE: {
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.35)',
    border: 'rgba(251, 191, 36, 0.5)',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
    badgeText: '#fde68a',
    label: 'Moderate Risk',
    badgeIcon: '⚠️',
  },
  HIGH: {
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.45)',
    border: 'rgba(249, 115, 22, 0.65)',
    badgeBg: 'rgba(249, 115, 22, 0.25)',
    badgeText: '#ffedd5',
    label: 'High Alert',
    badgeIcon: '⚡',
  },
  SEVERE: {
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.5)',
    border: 'rgba(239, 68, 68, 0.7)',
    badgeBg: 'rgba(239, 68, 68, 0.25)',
    badgeText: '#fee2e2',
    label: 'Severe Warning',
    badgeIcon: '🚨',
  },
  EXTREME: {
    color: '#dc2626',
    glow: 'rgba(220, 38, 38, 0.6)',
    border: 'rgba(220, 38, 38, 0.8)',
    badgeBg: 'rgba(220, 38, 38, 0.35)',
    badgeText: '#ffffff',
    label: 'Extreme Danger',
    badgeIcon: '🛑',
  },
};

function getHazardIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('rain') || t.includes('flood') || t.includes('monsoon')) return '🌧️';
  if (t.includes('thunder') || t.includes('lightning')) return '⛈️';
  if (t.includes('wind') || t.includes('gale') || t.includes('storm')) return '💨';
  if (t.includes('heat') || t.includes('warm')) return '☀️';
  if (t.includes('cold') || t.includes('frost') || t.includes('snow')) return '❄️';
  return '⚠️';
}

/**
 * RiskAlertToast
 * 
 * Floating right-top corner popup toast for active weather hazards.
 * Automatically disappears after `duration` ms with smooth animations,
 * but keeps alerts safely saved in the notification panel.
 */
export default function RiskAlertToast({
  alert,
  totalAlerts = 1,
  duration = 6500,
  onClose,
  onOpenPanel,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const cfg = SEVERITY_CONFIG[alert?.severity] || SEVERITY_CONFIG.HIGH;
  const icon = getHazardIcon(alert?.type);
  const location = alert?.location || 'Current Area';

  // Handle countdown timer with pause on hover
  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      triggerExit();
    }, remainingTime);

    timerRef.current = timer;
    startTimeRef.current = Date.now();

    return () => clearTimeout(timer);
  }, [isPaused, remainingTime]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    setRemainingTime((prev) => Math.max(prev - elapsed, 1000));
    clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const triggerExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 350); // Matches slide-out animation duration
  };

  if (!alert) return null;

  return (
    <div
      className={`risk-alert-toast ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        '--alert-color': cfg.color,
        '--alert-glow': cfg.glow,
        '--alert-border': cfg.border,
        '--toast-duration': `${duration}ms`,
        animationPlayState: isPaused ? 'paused' : 'running',
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Top Accent Strip */}
      <div className="toast-accent-strip" style={{ background: cfg.color }} />

      {/* Header */}
      <div className="toast-head">
        <div className="toast-head-left">
          <span className="toast-live-pulse" style={{ background: cfg.color }} />
          <span
            className="toast-severity-capsule"
            style={{
              background: cfg.badgeBg,
              color: cfg.badgeText,
              borderColor: cfg.color,
            }}
          >
            <span className="toast-badge-icon">{cfg.badgeIcon}</span>
            <span>{cfg.label}</span>
          </span>
          <span className="toast-location-tag">📍 {location}</span>
        </div>

        <button
          className="toast-close-btn"
          onClick={triggerExit}
          title="Dismiss popup (alert remains saved in notification bell)"
          aria-label="Close alert popup"
        >
          ✕
        </button>
      </div>

      {/* Main Body */}
      <div className="toast-body">
        <div className="toast-title-row">
          <span className="toast-hazard-icon">{icon}</span>
          <h4 className="toast-title">{alert.type}</h4>
        </div>

        <p className="toast-message">{alert.message}</p>

        {alert.recommendation && (
          <div className="toast-protocol-box">
            <span className="protocol-icon">🛡️</span>
            <span className="protocol-text">{alert.recommendation}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="toast-footer">
        <button
          className="toast-panel-btn"
          onClick={() => {
            triggerExit();
            onOpenPanel?.();
          }}
          title="View all hazards in notification panel"
        >
          <span>🔔 View in Notification Panel</span>
          {totalAlerts > 1 && (
            <span className="toast-extra-count">+{totalAlerts - 1} more</span>
          )}
          <span className="toast-arrow">→</span>
        </button>

        <span className="toast-timer-hint">
          {isPaused ? 'Paused' : 'Auto-closing'}
        </span>
      </div>

      {/* Shrinking Countdown Progress Bar */}
      <div className="toast-progress-bar-wrap">
        <div
          className="toast-progress-bar-fill"
          style={{
            background: cfg.color,
            animationDuration: `${duration}ms`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}
