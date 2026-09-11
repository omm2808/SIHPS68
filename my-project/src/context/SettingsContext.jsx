import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'weathersphere_settings';

const DEFAULT_SETTINGS = {
  unit: 'celsius', // 'celsius' | 'fahrenheit'
  speedUnit: 'kmh', // 'kmh' | 'mph' | 'ms'
  notifications: true, // boolean
  voiceSpeed: 'normal', // 'slow' | 'normal' | 'fast'
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save to localStorage on any change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Convert Celsius temperature to active unit (°C or °F)
   */
  const convertTemp = (celsiusVal) => {
    if (celsiusVal === null || celsiusVal === undefined || celsiusVal === '—' || isNaN(Number(celsiusVal))) {
      return '—';
    }
    const num = Number(celsiusVal);
    if (settings.unit === 'fahrenheit') {
      return Math.round((num * 9) / 5 + 32);
    }
    return Math.round(num);
  };

  /**
   * Convert km/h wind speed to active wind speed unit
   */
  const convertWind = (kmhVal) => {
    const fallbackUnit = settings.speedUnit === 'mph' ? 'mph' : settings.speedUnit === 'ms' ? 'm/s' : 'km/h';
    if (kmhVal === null || kmhVal === undefined || kmhVal === '—' || isNaN(Number(kmhVal))) {
      return { val: '—', unit: fallbackUnit };
    }
    const num = Number(kmhVal);
    if (settings.speedUnit === 'mph') {
      return { val: Math.round(num * 0.621371), unit: 'mph' };
    }
    if (settings.speedUnit === 'ms') {
      return { val: Math.round((num / 3.6) * 10) / 10, unit: 'm/s' };
    }
    return { val: Math.round(num), unit: 'km/h' };
  };

  const tempUnitSymbol = settings.unit === 'fahrenheit' ? '°F' : '°C';

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        settings,
        updateSetting,
        convertTemp,
        convertWind,
        tempUnitSymbol,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
