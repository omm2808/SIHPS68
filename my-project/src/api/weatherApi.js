/**
 * weatherApi.js
 * Centralized API client for the WeatherGPT backend.
 * All fetch calls go through here — single place to handle errors,
 * base URL, and response parsing.
 */

const BASE = '/api';

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `API error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot reach the server. Is the backend running on port 8000?');
    }
    throw err;
  }
}

// ── Health ──────────────────────────────────────────────
export const getHealth = () => request('/health');

// ── Weather ─────────────────────────────────────────────
export const getCurrentWeather = (location = 'Indore') =>
  request(`/weather/current?location=${encodeURIComponent(location)}`);

export const getForecast = (location = 'Indore', days = 7) =>
  request(`/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`);

export const getHourly = (location = 'Indore', hours = 12) =>
  request(`/weather/hourly?location=${encodeURIComponent(location)}&hours=${hours}`);

// ── Chat ────────────────────────────────────────────────
export const sendChat = (message, language = 'en') =>
  request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, language }),
  });

// ── Alerts ──────────────────────────────────────────────
export const getAlerts = (location = 'Indore') =>
  request(`/alerts?location=${encodeURIComponent(location)}`);

// ── Agriculture ─────────────────────────────────────────
export const getAgricultureAdvisory = (crop, location, language = 'en') =>
  request('/agriculture/advisory', {
    method: 'POST',
    body: JSON.stringify({ crop, location, language }),
  });

// ── Climate Trends ──────────────────────────────────────
export const getClimateTrends = (location = 'Indore') =>
  request(`/climate/trends?location=${encodeURIComponent(location)}`);

// ── Admin ───────────────────────────────────────────────
export const getAdminStats = () => request('/admin/stats');
