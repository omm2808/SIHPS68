import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Wind,
  Droplets,
  Gauge,
  Eye,
  Sunrise,
  Sunset,
  Thermometer,
  Sparkles,
  Zap,
} from 'lucide-react';

/**
 * Maps standard condition strings or WMO weather codes to Lucide icons.
 */
export function WeatherConditionIcon({ condition, code, size = 24, className = '', color }) {
  const condLower = String(condition || '').toLowerCase();

  // Check WMO codes if passed
  if (typeof code === 'number') {
    if (code === 0) return <Sun size={size} className={className} color={color || '#fbbf24'} />;
    if (code === 1 || code === 2) return <CloudSun size={size} className={className} color={color || '#93c5fd'} />;
    if (code === 3) return <Cloud size={size} className={className} color={color || '#cbd5e1'} />;
    if (code === 45 || code === 48) return <CloudFog size={size} className={className} color={color || '#94a3b8'} />;
    if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle size={size} className={className} color={color || '#60a5fa'} />;
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain size={size} className={className} color={color || '#38bdf8'} />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow size={size} className={className} color={color || '#e0f2fe'} />;
    if ([95, 96, 99].includes(code)) return <CloudLightning size={size} className={className} color={color || '#a78bfa'} />;
  }

  // Text condition matching
  if (condLower.includes('thunder') || condLower.includes('storm')) {
    return <CloudLightning size={size} className={className} color={color || '#a78bfa'} />;
  }
  if (condLower.includes('drizzle')) {
    return <CloudDrizzle size={size} className={className} color={color || '#60a5fa'} />;
  }
  if (condLower.includes('rain') || condLower.includes('shower')) {
    return <CloudRain size={size} className={className} color={color || '#38bdf8'} />;
  }
  if (condLower.includes('snow') || condLower.includes('ice') || condLower.includes('flurr')) {
    return <CloudSnow size={size} className={className} color={color || '#e0f2fe'} />;
  }
  if (condLower.includes('fog') || condLower.includes('mist') || condLower.includes('haze') || condLower.includes('smoke')) {
    return <CloudFog size={size} className={className} color={color || '#94a3b8'} />;
  }
  if (condLower.includes('partly') || condLower.includes('scatter') || condLower.includes('few')) {
    return <CloudSun size={size} className={className} color={color || '#93c5fd'} />;
  }
  if (condLower.includes('cloud') || condLower.includes('overcast')) {
    return <Cloud size={size} className={className} color={color || '#cbd5e1'} />;
  }
  if (condLower.includes('wind') || condLower.includes('breeze') || condLower.includes('gust')) {
    return <Wind size={size} className={className} color={color || '#67e8f9'} />;
  }

  // Default: Clear / Sunny
  return <Sun size={size} className={className} color={color || '#fbbf24'} />;
}
