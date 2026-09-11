import { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import ClimateTrends from '../components/ClimateTrends';
import { getAdminStats } from '../api/weatherApi';

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
        <h2>📊 Admin Dashboard</h2>
        <p>Usage statistics and climate data</p>
      </div>

      {loading && (
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Loading stats…</p>
        </div>
      )}

      {error && <div className="page-error"><span>⚠️</span> {error}</div>}

      {!loading && !error && (
        <>
          <StatsCard stats={stats} />
          <ClimateTrends location={location} />
        </>
      )}
    </div>
  );
}
