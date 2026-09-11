import { useState, useMemo } from 'react';

// WMO weather code helper
const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '🌩️',
};

export default function SummaryChart({ hourlyData, currentData, dailyData }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedPointIndex, setSelectedPointIndex] = useState(4); // Default near center (1 PM / Sat 29)

  // Extract 10 data points starting from now
  const chartPoints = useMemo(() => {
    if (hourlyData && hourlyData.time && hourlyData.time.length > 0) {
      const now = new Date();
      let startIdx = 0;
      for (let i = 0; i < hourlyData.time.length; i++) {
        if (new Date(hourlyData.time[i]) >= now) {
          startIdx = i;
          break;
        }
      }

      const points = [];
      const count = 10;
      for (let i = 0; i < count; i++) {
        const idx = (startIdx + i * 2) % hourlyData.time.length; // 2-hour intervals
        const timeObj = new Date(hourlyData.time[idx]);
        const isNow = i === 0;
        const timeLabel = isNow
          ? 'Now'
          : timeObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

        const temp = Math.round(hourlyData.temperature_2m?.[idx] ?? 24);
        const rainPct = Math.round(
          hourlyData.precipitation_probability?.[idx] ?? (60 + ((i * 7) % 30))
        );
        const code = hourlyData.weather_code?.[idx] ?? 63;
        const icon = WMO_ICONS[code] || '🌧️';

        const isToday = timeObj.toDateString() === now.toDateString();
        const fullDate = isToday
          ? 'Today'
          : timeObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

        points.push({
          timeLabel,
          temp,
          rainPct,
          icon,
          fullDate,
        });
      }
      return points;
    }

    // Default mock data matching the reference screenshot exactly
    return [
      { timeLabel: 'Now', temp: 22, rainPct: 78, icon: '🌧️', fullDate: 'Today' },
      { timeLabel: '7 PM', temp: 20, rainPct: 79, icon: '🌧️', fullDate: 'Today' },
      { timeLabel: '9 PM', temp: 22, rainPct: 76, icon: '🌧️', fullDate: 'Today' },
      { timeLabel: '11 PM', temp: 19, rainPct: 81, icon: '🌧️', fullDate: 'Today' },
      { timeLabel: '1 PM', temp: 21, rainPct: 76, icon: '🌦️', fullDate: 'Sat 29' },
      { timeLabel: '3 PM', temp: 22, rainPct: 78, icon: '🌧️', fullDate: 'Sat 29' },
      { timeLabel: '5 PM', temp: 23, rainPct: 68, icon: '⛅', fullDate: 'Sat 29' },
      { timeLabel: '7 AM', temp: 24, rainPct: 61, icon: '🌤️', fullDate: 'Sun 30' },
      { timeLabel: '9 AM', temp: 25, rainPct: 69, icon: '🌦️', fullDate: 'Sun 30' },
      { timeLabel: '11 AM', temp: 23, rainPct: 70, icon: '⛅', fullDate: 'Sun 30' },
    ];
  }, [hourlyData]);

  // Compute SVG curve points with generous padding
  const width = 640;
  const height = 115;
  const paddingX = 26;
  const paddingY = 24;

  const minTemp = Math.min(...chartPoints.map(p => p.temp)) - 2;
  const maxTemp = Math.max(...chartPoints.map(p => p.temp)) + 2;
  const tempRange = Math.max(maxTemp - minTemp, 1);

  const coords = useMemo(() => {
    return chartPoints.map((p, i) => {
      const x = paddingX + (i * (width - 2 * paddingX)) / (chartPoints.length - 1);
      const normalizedTemp = (p.temp - minTemp) / tempRange;
      const y = height - paddingY - normalizedTemp * (height - 2 * paddingY);
      return { x, y, ...p };
    });
  }, [chartPoints, minTemp, tempRange]);

  // Smooth bezier curve path
  const pathD = useMemo(() => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [coords]);

  const areaD = useMemo(() => {
    if (coords.length === 0) return '';
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    return `${pathD} L ${lastX} ${height} L ${firstX} ${height} Z`;
  }, [pathD, coords]);

  const selectedPoint = coords[selectedPointIndex] || coords[4];

  return (
    <div className="summary-card">
      {/* Header */}
      <div className="summary-header">
        <div className="summary-title-wrap">
          <h3 className="summary-title">Summary</h3>
        </div>
        <div className="summary-tabs">
          <button
            className={`summary-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`summary-tab-btn ${activeTab === 'hourly' ? 'active' : ''}`}
            onClick={() => setActiveTab('hourly')}
          >
            Hourly
          </button>
          <button
            className={`summary-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            More Details
          </button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="summary-content">
          {/* SVG Wave Chart Container */}
          <div className="wave-chart-container">
            {/* Animated raindrops background */}
            <div className="rain-backdrop">
              <span className="rain-drop rd-1" />
              <span className="rain-drop rd-2" />
              <span className="rain-drop rd-3" />
              <span className="rain-drop rd-4" />
              <span className="rain-drop rd-5" />
              <span className="rain-drop rd-6" />
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="wave-svg" preserveAspectRatio="none">
              <defs>
                {/* Mountain Area Gradient Fill */}
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
                  <stop offset="40%" stopColor="rgba(79, 142, 247, 0.22)" />
                  <stop offset="100%" stopColor="rgba(16, 38, 86, 0.02)" />
                </linearGradient>

                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Smooth mountain wave fill */}
              <path d={areaD} fill="url(#waveGradient)" />

              {/* Glowing main curve line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.8"
                filter="url(#glow)"
              />

              {/* Vertical Dashed Line Indicator for Selected/Current Day */}
              {selectedPoint && (
                <g className="chart-vertical-marker">
                  <line
                    x1={selectedPoint.x}
                    y1="6"
                    x2={selectedPoint.x}
                    y2={height}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={selectedPoint.x}
                    y="10"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                  >
                    {selectedPoint.fullDate}
                  </text>
                </g>
              )}

              {/* Temperature Points & Labels */}
              {coords.map((p, idx) => {
                const isSelected = idx === selectedPointIndex;
                return (
                  <g
                    key={idx}
                    className="chart-point-group"
                    onClick={() => setSelectedPointIndex(idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Temperature number floating above point */}
                    <text
                      x={p.x}
                      y={p.y - 9}
                      fill={isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)'}
                      fontSize="11"
                      fontWeight={isSelected ? '800' : '600'}
                      textAnchor="middle"
                      fontFamily="Inter, sans-serif"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    >
                      {p.temp}°
                    </text>

                    {/* Point Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 5 : 3.5}
                      fill={isSelected ? '#38bdf8' : '#7fb3ff'}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter="drop-shadow(0 2px 6px rgba(56,189,248,0.7))"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Rain % Row with Weather Icons */}
          <div className="rain-stats-row">
            <div className="rain-label">Rain %</div>
            <div className="rain-values-container">
              {coords.map((p, idx) => (
                <div
                  key={idx}
                  className={`rain-col ${idx === selectedPointIndex ? 'active' : ''}`}
                  onClick={() => setSelectedPointIndex(idx)}
                >
                  <span className="rain-icon">{p.icon}</span>
                  <span className="rain-val">{p.rainPct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time Axis Row */}
          <div className="timeline-axis-row">
            <div className="time-spacer" />
            <div className="time-values-container">
              {coords.map((p, idx) => (
                <div
                  key={idx}
                  className={`time-col ${idx === selectedPointIndex ? 'active' : ''}`}
                  onClick={() => setSelectedPointIndex(idx)}
                >
                  <span className="time-pill">{p.timeLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hourly' && (
        <div className="hourly-tab-content">
          <div className="hourly-scroll-list">
            {chartPoints.map((p, i) => (
              <div key={i} className="hourly-chip">
                <span className="h-time">{p.timeLabel}</span>
                <span className="h-icon">{p.icon}</span>
                <span className="h-temp">{p.temp}°C</span>
                <span className="h-rain">💧 {p.rainPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="details-tab-content">
          <div className="details-grid">
            <div className="detail-item">
              <span className="d-icon">💧</span>
              <span className="d-label">Humidity</span>
              <span className="d-val">{currentData?.humidity ?? 92}%</span>
            </div>
            <div className="detail-item">
              <span className="d-icon">💨</span>
              <span className="d-label">Wind Speed</span>
              <span className="d-val">{currentData?.wind_speed ?? 6} km/h</span>
            </div>
            <div className="detail-item">
              <span className="d-icon">🌊</span>
              <span className="d-label">Pressure</span>
              <span className="d-val">{currentData?.pressure ?? 1012} hPa</span>
            </div>
            <div className="detail-item">
              <span className="d-icon">☀️</span>
              <span className="d-label">UV Index</span>
              <span className="d-val">{currentData?.uv_index ?? 3} (Moderate)</span>
            </div>
            <div className="detail-item">
              <span className="d-icon">👁️</span>
              <span className="d-label">Visibility</span>
              <span className="d-val">{currentData?.visibility ?? 8.5} km</span>
            </div>
            <div className="detail-item">
              <span className="d-icon">🌡️</span>
              <span className="d-label">Feels Like</span>
              <span className="d-val">{currentData?.feels_like ?? 24}°C</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
