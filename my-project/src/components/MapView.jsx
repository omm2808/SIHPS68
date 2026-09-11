import { useEffect, useRef, useState } from 'react';
import { KNOWN_COORDS, geocodeLocation } from '../utils/knownCoords';

const SATELLITE_PROVIDER = {
  base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 18,
};

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const linkEl = document.createElement('link');
      linkEl.id = 'leaflet-css';
      linkEl.rel = 'stylesheet';
      linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkEl);
    }

    const scriptEl = document.createElement('script');
    scriptEl.id = 'leaflet-js';
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.onload = () => resolve(window.L);
    scriptEl.onerror = () => resolve(null);
    document.head.appendChild(scriptEl);
  });
}

export default function MapView({ coords, locationName, onLocateMe }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const markerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);

  // Resolved coordinate state
  const [activeCoords, setActiveCoords] = useState(() => {
    if (coords && coords.lat && coords.lon) {
      return { lat: Number(coords.lat), lon: Number(coords.lon) };
    }
    return { lat: 20.4795, lon: 86.1306 };
  });

  // Sync coords from props or resolve by location name
  useEffect(() => {
    if (coords && coords.lat && coords.lon) {
      setActiveCoords({ lat: Number(coords.lat), lon: Number(coords.lon) });
      return;
    }

    if (locationName && locationName !== 'Locating…') {
      const clean = locationName.trim().toLowerCase().replace(/\s+/g, '');
      if (KNOWN_COORDS[clean]) {
        setActiveCoords(KNOWN_COORDS[clean]);
        return;
      }

      let isMounted = true;
      geocodeLocation(locationName).then((resolved) => {
        if (isMounted && resolved) {
          setActiveCoords({ lat: resolved.lat, lon: resolved.lon });
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [coords, locationName]);

  // Load Leaflet library
  useEffect(() => {
    loadLeaflet().then((L) => {
      if (L) setMapReady(true);
    });
  }, []);

  // Initialize and Update Satellite Map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;

    const lat = activeCoords.lat;
    const lon = activeCoords.lon;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
      }).setView([lat, lon], 12);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.flyTo([lat, lon], 12, { duration: 0.8 });
    }

    // Apply High-Resolution Satellite Base Layer
    if (!baseLayerRef.current) {
      baseLayerRef.current = L.tileLayer(SATELLITE_PROVIDER.base, {
        maxZoom: SATELLITE_PROVIDER.maxZoom,
        opacity: 0.98,
      }).addTo(mapInstanceRef.current);
    }

    // Apply Boundaries and Places Label Overlay
    if (!labelLayerRef.current && SATELLITE_PROVIDER.labels) {
      labelLayerRef.current = L.tileLayer(SATELLITE_PROVIDER.labels, {
        maxZoom: SATELLITE_PROVIDER.maxZoom,
        opacity: 0.95,
      }).addTo(mapInstanceRef.current);
    }

    // Custom Glowing Pulse Radar Marker
    const customIcon = L.divIcon({
      className: '',
      html: `
        <div class="map-pulse-marker">
          <div class="map-pulse-ring"></div>
          <div class="map-pulse-core"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      markerRef.current = L.marker([lat, lon], { icon: customIcon }).addTo(
        mapInstanceRef.current
      );
    }
  }, [mapReady, activeCoords.lat, activeCoords.lon]);

  const displayLocation =
    !locationName || locationName === 'Locating…'
      ? `${activeCoords.lat.toFixed(2)}°, ${activeCoords.lon.toFixed(2)}°`
      : locationName;

  return (
    <div className="map-card">
      {/* Top-right action button for instant GPS recenter */}
      <div className="map-overlay-top">
        <button
          className="map-btn map-locate-btn"
          title="Go to my GPS location"
          onClick={(e) => {
            e.stopPropagation();
            if (onLocateMe) onLocateMe();
          }}
          type="button"
        >
          📍
        </button>
      </div>

      {/* Pure High-Res Satellite Map View Canvas */}
      <div ref={mapRef} className="map-container" />

      {/* Bottom-left location & satellite indicator badge */}
      <div className="map-label">
        <span className="map-label-dot" />
        <span className="map-label-text">🛰️ {displayLocation} (Satellite)</span>
      </div>
    </div>
  );
}
