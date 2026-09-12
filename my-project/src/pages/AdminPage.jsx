import { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import ClimateTrends from '../components/ClimateTrends';
import { getAdminStats } from '../api/weatherApi';
import { BarChart3, AlertTriangle } from 'lucide-react';

export default function AdminPage({ location }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAdminStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={24} color="#38bdf8" /> Admin Dashboard
        </h2>
        <p>Usage statistics and climate data</p>
      </div>

      {loading && (
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Loading stats…</p>
        </div>
      )}

      {error && (
        <div className="page-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <StatsCard stats={stats} />
          <ClimateTrends location={location} />
        </>
      )}
    </div>
  );
}
