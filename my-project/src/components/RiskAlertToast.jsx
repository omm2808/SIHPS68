import { useState, useEffect, useRef } from 'react';
import {
  Info,
  AlertTriangle,
  Zap,
  OctagonAlert,
  Shield,
  ShieldAlert,
  CloudRain,
  CloudLightning,
  Wind,
  Sun,
  Snowflake,
  MapPin,
  X,
  Bell,
  ArrowRight,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  LOW: {
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.35)',
    border: 'rgba(56, 189, 248, 0.5)',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    badgeText: '#bae6fd',
    label: 'Advisory Watch',
    BadgeIcon: Info,
  },
  MODERATE: {
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.35)',
    border: 'rgba(251, 191, 36, 0.5)',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
    badgeText: '#fde68a',
    label: 'Moderate Risk',
    BadgeIcon: AlertTriangle,
  },
  HIGH: {
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.45)',
    border: 'rgba(249, 115, 22, 0.65)',
    badgeBg: 'rgba(249, 115, 22, 0.25)',
    badgeText: '#ffedd5',
    label: 'High Alert',
    BadgeIcon: Zap,
  },
  SEVERE: {
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.5)',
    border: 'rgba(239, 68, 68, 0.7)',
    badgeBg: 'rgba(239, 68, 68, 0.25)',
    badgeText: '#fee2e2',
    label: 'Severe Warning',
    BadgeIcon: AlertTriangle,
  },
  EXTREME: {
    color: '#dc2626',
    glow: 'rgba(220, 38, 38, 0.6)',
    border: 'rgba(220, 38, 38, 0.8)',
    badgeBg: 'rgba(220, 38, 38, 0.35)',
    badgeText: '#ffffff',
    label: 'Extreme Danger',
    BadgeIcon: OctagonAlert,
  },
};

function HazardIcon({ type, size = 20, color = '#fbbf24' }) {
  const t = (type || '').toLowerCase();
  if (t.includes('rain') || t.includes('flood') || t.includes('monsoon')) {
    return <CloudRain size={size} color={color} />;
  }
  if (t.includes('thunder') || t.includes('lightning')) {
    return <CloudLightning size={size} color={color} />;
  }
  if (t.includes('wind') || t.includes('gale') || t.includes('storm')) {
    return <Wind size={size} color={color} />;
  }
  if (t.includes('heat') || t.includes('warm')) {
    return <Sun size={size} color={color} />;
  }
  if (t.includes('cold') || t.includes('frost') || t.includes('snow')) {
    return <Snowflake size={size} color={color} />;
  }
  return <AlertTriangle size={size} color={color} />;
}

/**
 * RiskAlertToast
 * 
 * Floating right-top corner popup toast for active weather hazards.
 * Automatically disappears after `duration` ms with smooth animations,
 * without pausing on pointer hover.
 */
export default function RiskAlertToast({
  alert,
  totalAlerts = 1,
  duration = 6500,
  onClose,
  onOpenPanel,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);

  const cfg = SEVERITY_CONFIG[alert?.severity] || SEVERITY_CONFIG.HIGH;
  const BadgeIcon = cfg.BadgeIcon;
  const location = alert?.location || 'Current Area';

  // Continuous auto-close timer without pausing on hover
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerExit();
    }, duration);

    timerRef.current = timer;
    return () => clearTimeout(timer);
  }, [duration]);

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
      style={{
        '--alert-color': cfg.color,
        '--alert-glow': cfg.glow,
        '--alert-border': cfg.border,
        '--toast-duration': `${duration}ms`,
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span className="toast-badge-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <BadgeIcon size={13} color={cfg.badgeText} />
            </span>
            <span>{cfg.label}</span>
          </span>
          <span className="toast-location-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <MapPin size={12} color="rgba(255,255,255,0.7)" />
            {location}
          </span>
        </div>

        <button
          className="toast-close-btn"
          onClick={triggerExit}
          title="Dismiss popup (alert remains saved in notification bell)"
          aria-label="Close alert popup"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Body */}
      <div className="toast-body">
        <div className="toast-title-row">
          <span className="toast-hazard-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <HazardIcon type={alert.type} size={20} color={cfg.color} />
          </span>
          <h4 className="toast-title">{alert.type}</h4>
        </div>

        <p className="toast-message">{alert.message}</p>

        {alert.recommendation && (
          <div className="toast-protocol-box">
            <span className="protocol-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <Shield size={14} color="#38bdf8" />
            </span>
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Bell size={13} />
          <span>View in Notification Panel</span>
          {totalAlerts > 1 && (
            <span className="toast-extra-count">+{totalAlerts - 1} more</span>
          )}
          <ArrowRight size={13} className="toast-arrow" />
        </button>

        <span className="toast-timer-hint">Auto-closing</span>
      </div>

      {/* Shrinking Countdown Progress Bar */}
      <div className="toast-progress-bar-wrap">
        <div
          className="toast-progress-bar-fill"
          style={{
            background: cfg.color,
            animationDuration: `${duration}ms`,
          }}
        />
      </div>
    </div>
  );
}
