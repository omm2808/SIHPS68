import { useState, useEffect } from 'react';
import { getClimateTrends } from '../api/weatherApi';
import { TrendingUp, CloudRain, Thermometer, Info } from 'lucide-react';

export default function ClimateTrends({ location }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('rainfall'); // 'rainfall' or 'temperature'

  useEffect(() => {
    setLoading(true);
    getClimateTrends(location || 'Indore')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [location]);

  if (loading) return <div className="trends-loading">Loading climate trends…</div>;
  if (!data) return null;

  const values = mode === 'rainfall' ? data.monthly_rainfall_mm : data.monthly_avg_temp_c;
  const maxVal = Math.max(...values, 1);
  const unit = mode === 'rainfall' ? 'mm' : '°C';
  const barColor = mode === 'rainfall' ? 'var(--accent-blue)' : 'var(--accent-orange)';

  return (
    <div className="climate-trends">
      <div className="trends-header">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="#38bdf8" /> Climate Trends — {data.location}
        </h3>
        <div className="trends-toggle">
          <button
            className={`toggle-btn ${mode === 'rainfall' ? 'active' : ''}`}
            onClick={() => setMode('rainfall')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CloudRain size={14} /> Rainfall
          </button>
          <button
            className={`toggle-btn ${mode === 'temperature' ? 'active' : ''}`}
            onClick={() => setMode('temperature')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Thermometer size={14} /> Temperature
          </button>
        </div>
      </div>

      <div className="trends-chart">
        {data.months.map((month, i) => {
          const pct = (values[i] / maxVal) * 100;
          return (
            <div className="trend-col" key={month} style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="trend-value">{values[i]}{unit}</span>
              <div className="trend-bar-track">
                <div
                  className="trend-bar"
                  style={{ height: `${Math.max(pct, 3)}%`, background: barColor }}
                />
              </div>
              <span className="trend-month">{month}</span>
            </div>
          );
        })}
      </div>

      {mode === 'rainfall' && (
        <p className="trends-total">
          Total yearly rainfall: <strong>{data.yearly_total_rainfall_mm} mm</strong>
        </p>
      )}
      <p className="trends-disclaimer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Info size={14} color="#38bdf8" /> {data.data_source}
      </p>
    </div>
  );
}
