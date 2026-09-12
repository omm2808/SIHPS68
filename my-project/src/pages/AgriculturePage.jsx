import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import WeatherCard from '../components/WeatherCard';
import AgriculturePanel from '../components/AgriculturePanel';
import AlertBanner from '../components/AlertBanner';
import MapView from '../components/MapView';
import useWeather from '../hooks/useWeather';
import { useGlobalWeather } from '../context/WeatherContext';
import {
  Sprout,
  Wheat,
  Leaf,
  Banknote,
  Carrot,
  CloudRain,
  Snowflake,
  SunMedium,
} from 'lucide-react';

const SEASON_INFO = {
  Kharif:  { months: 'Jun – Nov', Icon: CloudRain, color: '#34d399', desc: 'Monsoon sowing crops' },
  Rabi:    { months: 'Nov – Apr', Icon: Snowflake, color: '#60a5fa', desc: 'Winter harvesting crops' },
  Zaid:    { months: 'Mar – Jun', Icon: SunMedium, color: '#fbbf24', desc: 'Summer fast-growing crops' },
};

const CROP_CATEGORIES = [
  { label: 'Cereals', Icon: Wheat, color: '#f59e0b', crops: ['Wheat', 'Rice', 'Maize', 'Bajra', 'Jowar', 'Barley'] },
  { label: 'Pulses', Icon: Leaf, color: '#10b981', crops: ['Lentil (Masoor)', 'Gram (Chana)', 'Moong', 'Soybean', 'Arhar'] },
  { label: 'Cash Crops', Icon: Banknote, color: '#38bdf8', crops: ['Cotton', 'Sugarcane', 'Jute', 'Tobacco', 'Groundnut'] },
  { label: 'Vegetables', Icon: Carrot, color: '#f97316', crops: ['Tomato', 'Onion', 'Potato', 'Brinjal', 'Chilli', 'Garlic'] },
];

export default function AgriculturePage() {
  const { fetchWeatherForLocation, locationName: globalLocationName } = useGlobalWeather();
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(globalLocationName || '');

  const { current, alerts, loading } = useWeather(submitted);

  const handleSearch = val => {
    if (val.trim()) {
      setSubmitted(val.trim());
      fetchWeatherForLocation(val.trim());
    }
  };

  // Detect current month for season
  const month = new Date().getMonth() + 1; // 1-12
  const currentSeason =
    month >= 6 && month <= 10 ? 'Kharif' :
    month >= 11 || month <= 3  ? 'Rabi'  : 'Zaid';

  const CurrentSeasonIcon = SEASON_INFO[currentSeason].Icon;

  return (
    <div className="page agri-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="page-title-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <Sprout size={24} color="#10b981" />
            </span>
            <span>Agriculture Advisory</span>
          </h1>
          <p className="page-subtitle">Weather-based crop guidance and agronomy insights for your region</p>
        </div>
        <div className="season-badge" style={{ borderColor: SEASON_INFO[currentSeason].color, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span className="season-badge-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <CurrentSeasonIcon size={16} color={SEASON_INFO[currentSeason].color} />
          </span>
          <span className="season-badge-name">{currentSeason} Season</span>
          <span className="season-badge-months">{SEASON_INFO[currentSeason].months}</span>
        </div>
      </div>

      {/* Season Cards */}
      <div className="season-cards">
        {Object.entries(SEASON_INFO).map(([name, info]) => {
          const SeasonIcon = info.Icon;
          return (
            <div
              key={name}
              className={`season-card ${currentSeason === name ? 'season-active' : ''}`}
              style={{ '--season-color': info.color }}
            >
              <span className="season-card-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <SeasonIcon size={24} color={info.color} />
              </span>
              <div className="season-card-content">
                <span className="season-card-name">{name} Season</span>
                <span className="season-card-months">{info.months}</span>
                <span className="season-card-desc">{info.desc}</span>
              </div>
              {currentSeason === name && <span className="season-current-tag">Active Season</span>}
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="agri-search-wrapper">
        <SearchBar
          value={location}
          onChange={setLocation}
          onSearch={handleSearch}
          placeholder="Search farm location — e.g. Indore, Punjab, Maharashtra…"
        />
      </div>

      {/* Crop categories overview */}
      <div className="crop-overview">
        {CROP_CATEGORIES.map(cat => {
          const CatIcon = cat.Icon;
          return (
            <div key={cat.label} className="crop-category-card">
              <div className="crop-category-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="crop-category-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <CatIcon size={18} color={cat.color} />
                </span>
                <span className="crop-category-label">{cat.label}</span>
              </div>
              <div className="crop-category-chips">
                {cat.crops.map(crop => (
                  <span key={crop} className="crop-tag">{crop}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="empty-state">
          <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <Sprout size={48} color="#10b981" />
          </div>
          <h3>Enter your farm or village location</h3>
          <p>Get personalized meteorological crop advisories, soil moisture insights, and disease warnings.</p>
        </div>
      )}

      {submitted && loading && (
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Analyzing weather data for {submitted}…</p>
        </div>
      )}

      {submitted && !loading && (
        <div className="agri-results">
          {alerts && alerts.alerts && alerts.alerts.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <AlertBanner alerts={alerts} />
            </div>
          )}

          <div className="agri-top-row">
            <WeatherCard data={current} />
            <MapView locationName={submitted} />
          </div>

          <AgriculturePanel location={submitted} />
        </div>
      )}
    </div>
  );
}
