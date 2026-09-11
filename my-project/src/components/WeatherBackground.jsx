import { memo } from 'react';
import { useGlobalWeather } from '../context/WeatherContext';

function WeatherBackground() {
  const { weatherScene } = useGlobalWeather();
  const scene = weatherScene || { bg: '/weather-bg/clear.jpg', type: 'clear' };

  return (
    <div className="global-weather-bg-container" aria-hidden="true">
      {/* Dynamic Background Image with subtle Ken-Burns effect */}
      <div
        key={scene.bg}
        className="global-weather-bg-image"
        style={{ backgroundImage: `url(${scene.bg})` }}
      />

      {/* Atmospheric Overlays */}
      <div className={`global-weather-overlay overlay-${scene.type}`} />

      {/* Realistic atmospheric particle effects */}
      {scene.type === 'rain' && (
        <div className="bg-rain-particle-layer">
          {[...Array(24)].map((_, i) => (
            <span
              key={i}
              className="bg-rain-streak"
              style={{
                left: `${(i * 4.2 + 2) % 98}%`,
                animationDelay: `${(i * 0.11) % 1.5}s`,
                animationDuration: `${0.85 + (i % 5) * 0.12}s`,
                opacity: 0.35 + (i % 4) * 0.15,
              }}
            />
          ))}
        </div>
      )}

      {scene.type === 'thunderstorm' && (
        <>
          <div className="bg-lightning-flash" />
          <div className="bg-rain-particle-layer">
            {[...Array(28)].map((_, i) => (
              <span
                key={i}
                className="bg-rain-streak heavy"
                style={{
                  left: `${(i * 3.6 + 1) % 98}%`,
                  animationDelay: `${(i * 0.08) % 1.2}s`,
                  animationDuration: `${0.65 + (i % 4) * 0.1}s`,
                  opacity: 0.45 + (i % 3) * 0.2,
                }}
              />
            ))}
          </div>
        </>
      )}

      {scene.type === 'clear' && (
        <div className="bg-sunbeam-layer">
          <div className="bg-sunbeam-glow" />
          <div className="bg-cloud-drift-1" />
        </div>
      )}

      {scene.type === 'sunset' && (
        <div className="bg-sunset-glow-layer">
          <div className="bg-sunset-amber-shimmer" />
        </div>
      )}

      {(scene.type === 'cloudy' || scene.type === 'night') && (
        <div className="bg-cloud-drift-layer">
          <div className="bg-cloud-drift-1" />
          <div className="bg-cloud-drift-2" />
        </div>
      )}
    </div>
  );
}

export default memo(WeatherBackground);
