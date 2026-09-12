import { useState } from 'react';
import { getAgricultureAdvisory } from '../api/weatherApi';
import {
  Sprout,
  Wheat,
  Leaf,
  Flower2,
  TreeDeciduous,
  Lightbulb,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';

const CROPS = [
  { id: 'wheat', name: 'Wheat', Icon: Wheat, color: '#f59e0b' },
  { id: 'rice', name: 'Rice', Icon: Sprout, color: '#10b981' },
  { id: 'soybean', name: 'Soybean', Icon: Leaf, color: '#84cc16' },
  { id: 'cotton', name: 'Cotton', Icon: Flower2, color: '#38bdf8' },
  { id: 'maize', name: 'Maize', Icon: TreeDeciduous, color: '#eab308' },
];

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

  const selectedCropObj = CROPS.find(c => c.id === crop) || CROPS[0];
  const ActiveCropIcon = selectedCropObj.Icon;

  return (
    <div className="agri-panel">
      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sprout size={20} color="#10b981" /> Agriculture Advisory
      </h3>

      <div className="agri-controls">
        <div className="crop-selector">
          {CROPS.map(c => {
            const IconComp = c.Icon;
            return (
              <button
                key={c.id}
                className={`crop-btn ${crop === c.id ? 'active' : ''}`}
                onClick={() => setCrop(c.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="crop-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <IconComp size={16} color={crop === c.id ? '#ffffff' : c.color} />
                </span>
                <span className="crop-name">{c.name}</span>
              </button>
            );
          })}
        </div>
        <button className="fetch-btn" onClick={fetchAdvisory} disabled={loading}>
          {loading ? 'Loading…' : `Get Advisory for ${selectedCropObj.name}`}
        </button>
      </div>

      {error && (
        <div className="agri-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <XCircle size={16} color="#ef4444" /> {error}
        </div>
      )}

      {result && (
        <div className="agri-result">
          <div className="agri-header">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ActiveCropIcon size={18} color="#10b981" /> {result.crop} — {result.location}
            </h4>
          </div>
          <ul className="advisory-list">
            {result.advisories.map((a, i) => (
              <li key={i} className="advisory-item">
                <span className="advisory-bullet" style={{ display: 'flex', alignItems: 'center' }}>
                  <Lightbulb size={15} color="#fbbf24" />
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <p className="agri-disclaimer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} color="#f59e0b" /> {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
