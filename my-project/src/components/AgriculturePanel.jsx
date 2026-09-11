import { useState } from 'react';
import { getAgricultureAdvisory } from '../api/weatherApi';

const CROPS = ['wheat', 'rice', 'soybean', 'cotton', 'maize'];
const CROP_ICONS = { wheat: '🌾', rice: '🍚', soybean: '🫘', cotton: '🏳️', maize: '🌽' };

export default function AgriculturePanel({ location }) {
  const [crop, setCrop] = useState('wheat');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdvisory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgricultureAdvisory(crop, location || 'Indore');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agri-panel">
      <h3 className="section-title">
        <span className="section-icon">🌾</span> Agriculture Advisory
      </h3>

      <div className="agri-controls">
        <div className="crop-selector">
          {CROPS.map(c => (
            <button
              key={c}
              className={`crop-btn ${crop === c ? 'active' : ''}`}
              onClick={() => setCrop(c)}
            >
              <span className="crop-icon">{CROP_ICONS[c]}</span>
              <span className="crop-name">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
            </button>
          ))}
        </div>
        <button className="fetch-btn" onClick={fetchAdvisory} disabled={loading}>
          {loading ? 'Loading…' : `Get Advisory for ${crop.charAt(0).toUpperCase() + crop.slice(1)}`}
        </button>
      </div>

      {error && <div className="agri-error">❌ {error}</div>}

      {result && (
        <div className="agri-result">
          <div className="agri-header">
            <h4>{CROP_ICONS[result.crop?.toLowerCase()] || '🌱'} {result.crop} — {result.location}</h4>
          </div>
          <ul className="advisory-list">
            {result.advisories.map((a, i) => (
              <li key={i} className="advisory-item">
                <span className="advisory-bullet">💡</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <p className="agri-disclaimer">⚠️ {result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
