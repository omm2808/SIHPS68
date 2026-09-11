import { useEffect, useRef, useState } from 'react';

export default function MapView({ coords, locationName, onLocateMe }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileMode, setTileMode] = useState('osm');
  const [menuOpen, setMenuOpen] = useState(false);

  // Load leaflet
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const linkEl = document.createElement('link');
      linkEl.id = 'leaflet-css';
      linkEl.rel = 'stylesheet';
      linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkEl);
    }

    if (window.L) {
      setMapReady(true);
    } else {
      const scriptEl = document.createElement('script');
      scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      scriptEl.onload = () => setMapReady(true);
      document.head.appendChild(scriptEl);
    }
  }, []);

  // Tile URL helper
  const getTileUrl = (mode) =>
    mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Init or update map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;

    const lat = coords?.lat ?? 17.385;
    const lon = coords?.lon ?? 78.4867;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lon], 11);

      tileLayerRef.current = window.L.tileLayer(getTileUrl(tileMode), { maxZoom: 18 }).addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lon], 11, { animate: true });
    }

    // Custom pulsing marker
    const customIcon = window.L.divIcon({
      className: '',
      html: `
        <div class="map-pulse-marker">
          <div class="map-pulse-ring"></div>
          <div class="map-pulse-core"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = window.L.marker([lat, lon], { icon: customIcon }).addTo(
      mapInstanceRef.current
    );
  }, [mapReady, coords]);

  // Swap tile layer when mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(getTileUrl(tileMode));
  }, [tileMode]);

  return (
    <div className="map-card">
      {/* Top-right action buttons */}
      <div className="map-overlay-top">
        <button
          className="map-btn"
          title="Go to my GPS location"
          onClick={(e) => {
            e.stopPropagation();
            if (onLocateMe) onLocateMe();
          }}
        >
          🎯
        </button>
        <button
          className="map-btn"
          title="Map options"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          ⋯
        </button>

        {menuOpen && (
          <div className="map-menu-dropdown">
            <div
              className={`map-menu-item ${tileMode === 'osm' ? 'active' : ''}`}
              onClick={() => { setTileMode('osm'); setMenuOpen(false); }}
            >
              🗺️ Standard Map
            </div>
            <div
              className={`map-menu-item ${tileMode === 'dark' ? 'active' : ''}`}
              onClick={() => { setTileMode('dark'); setMenuOpen(false); }}
            >
              🌙 Dark Map
            </div>
          </div>
        )}
      </div>

      {/* Map canvas */}
      <div ref={mapRef} className="map-container" />

      {/* Bottom-left location label */}
      <div className="map-label">
        <span className="map-label-dot" />
        <span className="map-label-text">{locationName || 'Your Location'}</span>
      </div>
    </div>
  );
}
