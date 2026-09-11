import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '🌩️',
};

const WMO_LABELS = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle',
  55: 'Heavy Drizzle', 61: 'Slight Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Slight Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Rain Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Heavy Thunderstorm',
};

const SVG_WIDTH = 700;
const SVG_HEIGHT = 120;
const PAD_X = 30;
const PAD_Y = 28;

export default function SummaryChart({ hourlyData, currentData, dailyData }) {
  const { convertTemp, convertWind, tempUnitSymbol } = useSettings();
  const [activeTab, setActiveTab] = useState('summary');

  // Mouse / Pointer interaction state
  const [hoverIndex, setHoverIndex] = useState(null);
  const [pointerX, setPointerX] = useState(null); // Continuous SVG x-coord
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, flipLeft: false });
  
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const hourlyScrollRef = useRef(null);

  // ─── Build chart data points ───────────────────────────────────────
  const chartPoints = useMemo(() => {
    if (hourlyData?.time?.length > 0) {
      const now = new Date();
      let startIdx = 0;
      for (let i = 0; i < hourlyData.time.length; i++) {
        if (new Date(hourlyData.time[i]) >= now) {
          startIdx = i;
          break;
        }
      }
      const points = [];
      const totalLen = hourlyData.time.length;
      for (let i = 0; i < 10; i++) {
        const idx = (startIdx + i * 2) % totalLen;
        const timeObj = new Date(hourlyData.time[idx]);
        const isNow = i === 0;
        const timeLabel = isNow
          ? 'Now'
          : timeObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const rawC = hourlyData.temperature_2m?.[idx] ?? 24;
        const temp = convertTemp(rawC);
        const rainPct = Math.round(hourlyData.precipitation_probability?.[idx] ?? 60);
        const code = hourlyData.weather_code?.[idx] ?? 63;
        const icon = WMO_ICONS[code] || '🌧️';
        const label = WMO_LABELS[code] || 'Rain';
        const isToday = timeObj.toDateString() === now.toDateString();
        const fullDate = isToday
          ? 'Today'
          : timeObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        const windRaw = hourlyData.wind_speed_10m?.[idx] ?? 10;
        points.push({ timeLabel, temp, rainPct, icon, label, fullDate, windRaw, timeObj });
      }
      return points;
    }
    return [
      { timeLabel: 'Now',   temp: convertTemp(27), rainPct: 98,  icon: '🌧️', label: 'Rain',         fullDate: 'Today', windRaw: 12 },
      { timeLabel: '12 PM', temp: convertTemp(27), rainPct: 100, icon: '🌧️', label: 'Heavy Rain',    fullDate: 'Today', windRaw: 14 },
      { timeLabel: '2 PM',  temp: convertTemp(27), rainPct: 100, icon: '🌧️', label: 'Rain',         fullDate: 'Today', windRaw: 11 },
      { timeLabel: '4 PM',  temp: convertTemp(27), rainPct: 100, icon: '🌧️', label: 'Rain',         fullDate: 'Today', windRaw: 10 },
      { timeLabel: '6 PM',  temp: convertTemp(27), rainPct: 93,  icon: '🌦️', label: 'Rain Showers', fullDate: 'Today', windRaw: 9  },
      { timeLabel: '8 PM',  temp: convertTemp(26), rainPct: 75,  icon: '🌦️', label: 'Drizzle',      fullDate: 'Today', windRaw: 8  },
      { timeLabel: '10 PM', temp: convertTemp(26), rainPct: 75,  icon: '🌦️', label: 'Drizzle',      fullDate: 'Today', windRaw: 7  },
      { timeLabel: '12 AM', temp: convertTemp(26), rainPct: 76,  icon: '🌦️', label: 'Drizzle',      fullDate: 'Tomorrow', windRaw: 8 },
      { timeLabel: '2 AM',  temp: convertTemp(25), rainPct: 76,  icon: '⛅',  label: 'Partly Cloudy',fullDate: 'Tomorrow', windRaw: 6 },
      { timeLabel: '4 AM',  temp: convertTemp(25), rainPct: 78,  icon: '⛅',  label: 'Partly Cloudy',fullDate: 'Tomorrow', windRaw: 5 },
    ];
  }, [hourlyData, convertTemp]);

  // ─── SVG coordinates ───────────────────────────────────────────────
  const temps = chartPoints.map(p => p.temp);
  const minTemp = Math.min(...temps) - 1.5;
  const maxTemp = Math.max(...temps) + 1.5;
  const tempRange = Math.max(maxTemp - minTemp, 1);

  const coords = useMemo(() => chartPoints.map((p, i) => {
    const x = PAD_X + (i * (SVG_WIDTH - 2 * PAD_X)) / Math.max(chartPoints.length - 1, 1);
    const normalizedTemp = (p.temp - minTemp) / tempRange;
    const y = SVG_HEIGHT - PAD_Y - normalizedTemp * (SVG_HEIGHT - 2 * PAD_Y);
    return { x, y, ...p };
  }), [chartPoints, minTemp, tempRange]);

  // ─── Smooth bezier path ────────────────────────────────────────────
  const pathD = useMemo(() => {
    if (!coords.length) return '';
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(i - 1, 0)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(i + 2, coords.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [coords]);

  const areaD = useMemo(() => {
    if (!coords.length) return '';
    const lastX = coords[coords.length - 1]?.x ?? SVG_WIDTH;
    const firstX = coords[0]?.x ?? 0;
    return `${pathD} L ${lastX} ${SVG_HEIGHT} L ${firstX} ${SVG_HEIGHT} Z`;
  }, [pathD, coords]);

  // ─── Continuous Sliding Pointer tracking ───────────────────────────
  const updatePointerState = useCallback((clientX) => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || !coords.length) return;

    const rect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const boundedClientX = Math.max(rect.left, Math.min(rect.right, clientX));
    const ratio = (boundedClientX - rect.left) / rect.width;
    const rawSvgX = ratio * SVG_WIDTH;

    // Find nearest data point
    let nearestIdx = 0;
    let minDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - rawSvgX);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    });

    const activePoint = coords[nearestIdx];
    const pointScreenX = (activePoint.x / SVG_WIDTH) * containerRect.width;
    const pointScreenY = (activePoint.y / SVG_HEIGHT) * containerRect.height;

    const flipLeft = pointScreenX > containerRect.width - 165;
    const posX = flipLeft ? pointScreenX - 165 : pointScreenX + 16;
    const posY = Math.max(4, Math.min(containerRect.height - 85, pointScreenY - 55));

    setPointerX(rawSvgX);
    setHoverIndex(nearestIdx);
    setTooltipPos({ x: posX, y: posY, flipLeft });
    setShowTooltip(true);
  }, [coords]);

  const handleMouseMove = useCallback((e) => {
    updatePointerState(e.clientX);
  }, [updatePointerState]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches && e.touches.length > 0) {
      updatePointerState(e.touches[0].clientX);
    }
  }, [updatePointerState]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    setHoverIndex(null);
    setPointerX(null);
  }, []);

  const hoveredPoint = hoverIndex !== null ? coords[hoverIndex] : null;

  // Scroll controls for hourly list
  const slideHourly = (direction) => {
    if (hourlyScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      hourlyScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="summary-card">
      {/* Header */}
      <div className="summary-header">
        <h3 className="summary-title">Summary</h3>
        <div className="summary-tabs-container">
          <div className="summary-tabs">
            {['summary', 'hourly', 'details'].map(tab => (
              <button
                key={tab}
                className={`summary-tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' ? 'More Details' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SUMMARY TAB ── */}
      {activeTab === 'summary' && (
        <div className="summary-content tab-fade-in">
          {/* SVG Chart & Tooltip Stage */}
          <div
            className="wave-chart-container sc-interactive"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
          >
            {/* Ambient rain animation backdrop */}
            <div className="rain-backdrop">
              {[1, 2, 3, 4, 5, 6].map(n => <span key={n} className={`rain-drop rd-${n}`} />)}
            </div>

            {/* Smooth sliding floating tooltip */}
            {showTooltip && hoveredPoint && (
              <div
                className="sc-tooltip sc-tooltip-smooth"
                style={{
                  transform: `translate3d(${tooltipPos.x}px, ${tooltipPos.y}px, 0)`,
                }}
              >
                <div className="sc-tooltip-header">
                  <span className="sc-tooltip-icon">{hoveredPoint.icon}</span>
                  <span className="sc-tooltip-time">{hoveredPoint.timeLabel}</span>
                  <span className="sc-tooltip-date">{hoveredPoint.fullDate}</span>
                </div>
                <div className="sc-tooltip-body">
                  <div className="sc-tooltip-row">
                    <span>🌡️</span>
                    <span>{hoveredPoint.temp}{tempUnitSymbol}</span>
                  </div>
                  <div className="sc-tooltip-row">
                    <span>💧</span>
                    <span>Rain {hoveredPoint.rainPct}%</span>
                  </div>
                  <div className="sc-tooltip-row sc-tooltip-cond">
                    {hoveredPoint.label}
                  </div>
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="wave-svg"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="rgba(56,189,248,0.50)" />
                  <stop offset="45%"  stopColor="rgba(79,142,247,0.20)" />
                  <stop offset="100%" stopColor="rgba(16,38,86,0.02)" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#38bdf8" />
                  <stop offset="50%"  stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="dotGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Shaded Area fill */}
              <path d={areaD} fill="url(#waveGradient)" />

              {/* Main Bezier curve line */}
              <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="2.5" filter="url(#glow)" />

              {/* Continuous Smooth Sliding Crosshair */}
              {pointerX !== null && (
                <line
                  x1={pointerX}
                  y1={4}
                  x2={pointerX}
                  y2={SVG_HEIGHT}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  className="sc-smooth-crosshair"
                />
              )}

              {/* Magnetic Point Snap Halo & Active Target */}
              {hoveredPoint && (
                <g className="sc-active-indicator" style={{ transition: 'all 0.15s cubic-bezier(0.2, 0.9, 0.3, 1)' }}>
                  {/* Vertical guide anchor line */}
                  <line
                    x1={hoveredPoint.x}
                    y1={4}
                    x2={hoveredPoint.x}
                    y2={SVG_HEIGHT}
                    stroke="rgba(56,189,248,0.7)"
                    strokeWidth="1.5"
                  />
                  {/* Pulsing Outer Ring */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="10"
                    fill="rgba(56,189,248,0.22)"
                    stroke="rgba(56,189,248,0.65)"
                    strokeWidth="1.2"
                  />
                  {/* Inner Solid Glow Dot */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    filter="url(#dotGlow)"
                  />
                  {/* Temperature Floating Label */}
                  <text
                    x={hoveredPoint.x}
                    y={hoveredPoint.y - 14}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="800"
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                    filter="drop-shadow(0 2px 5px rgba(0,0,0,0.8))"
                  >
                    {hoveredPoint.temp}{tempUnitSymbol}
                  </text>
                </g>
              )}

              {/* Static point nodes (dimmed when hovering elsewhere) */}
              {coords.map((p, idx) => {
                const isHovered = idx === hoverIndex;
                return (
                  <g key={idx} className="chart-point-group">
                    {!isHovered && (
                      <>
                        <text
                          x={p.x}
                          y={p.y - 9}
                          fill="rgba(255,255,255,0.75)"
                          fontSize="10"
                          fontWeight="600"
                          textAnchor="middle"
                          fontFamily="Inter, sans-serif"
                          filter="drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
                        >
                          {p.temp}°
                        </text>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="3.5"
                          fill="#7fb3ff"
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth="1.5"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Rain % Row with interactive highlight slide */}
          <div className="rain-stats-row">
            <div className="rain-label">Rain %</div>
            <div className="rain-values-container">
              {coords.map((p, idx) => (
                <div
                  key={idx}
                  className={`rain-col ${idx === hoverIndex ? 'active' : ''}`}
                  onMouseEnter={() => setHoverIndex(idx)}
                >
                  <span className="rain-icon">{p.icon}</span>
                  <span className="rain-val">{p.rainPct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time axis with animated glow pill */}
          <div className="timeline-axis-row">
            <div className="time-spacer" />
            <div className="time-values-container">
              {coords.map((p, idx) => (
                <div
                  key={idx}
                  className={`time-col ${idx === hoverIndex ? 'active' : ''}`}
                  onMouseEnter={() => setHoverIndex(idx)}
                >
                  <span className="time-pill">{p.timeLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HOURLY TAB WITH SMOOTH SLIDER CONTROLS ── */}
      {activeTab === 'hourly' && (
        <div className="hourly-tab-content tab-fade-in">
          <div className="hourly-slider-wrapper">
            <button className="slider-arrow-btn prev" onClick={() => slideHourly('left')} aria-label="Slide Left">
              ‹
            </button>
            <div className="hourly-scroll-list" ref={hourlyScrollRef}>
              {chartPoints.map((p, i) => (
                <div key={i} className="hourly-chip">
                  <span className="h-time">{p.timeLabel}</span>
                  <span className="h-icon">{p.icon}</span>
                  <span className="h-temp">{p.temp}{tempUnitSymbol}</span>
                  <span className="h-rain">💧 {p.rainPct}%</span>
                </div>
              ))}
            </div>
            <button className="slider-arrow-btn next" onClick={() => slideHourly('right')} aria-label="Slide Right">
              ›
            </button>
          </div>
        </div>
      )}

      {/* ── MORE DETAILS TAB ── */}
      {activeTab === 'details' && (
        <div className="details-tab-content tab-fade-in">
          <div className="details-grid">
            {[
              { icon: '💧', label: 'Humidity',    val: `${currentData?.relative_humidity_2m ?? currentData?.humidity ?? 88}%` },
              { icon: '💨', label: 'Wind', val: (() => { const w = convertWind(currentData?.wind_speed_10m ?? currentData?.wind_speed ?? 13); return `${w.val} ${w.unit}`; })() },
              { icon: '🌊', label: 'Pressure',    val: `${currentData?.surface_pressure ?? currentData?.pressure ?? 1012} hPa` },
              { icon: '☀️', label: 'UV Index',    val: `${currentData?.uv_index ?? 3}` },
              { icon: '🌡️', label: 'Feels Like',  val: `${convertTemp(currentData?.apparent_temperature ?? currentData?.feels_like ?? 24)}${tempUnitSymbol}` },
              { icon: '👁️', label: 'Visibility',  val: `${currentData?.visibility ?? 10} km` },
            ].map(({ icon, label, val }) => (
              <div key={label} className="detail-item">
                <span className="d-icon">{icon}</span>
                <span className="d-label">{label}</span>
                <span className="d-val">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
