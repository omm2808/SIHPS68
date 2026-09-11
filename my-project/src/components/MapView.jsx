import { useEffect, useRef, useState } from 'react';

const KNOWN_COORDS = {
  delhi: { lat: 28.6139, lon: 77.2090 },
  newdelhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  pune: { lat: 18.5204, lon: 73.8567 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  indore: { lat: 22.7196, lon: 75.8577 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  patna: { lat: 25.5941, lon: 85.1376 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
  surat: { lat: 21.1702, lon: 72.8311 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  visakhapatnam: { lat: 17.6868, lon: 83.2185 },
  varanasi: { lat: 25.3176, lon: 82.9739 },
  srinagar: { lat: 34.0837, lon: 74.7973 },
  amritsar: { lat: 31.6340, lon: 74.8723 },
  goa: { lat: 15.2993, lon: 74.1240 },
};

export default function MapView({ coords, locationName, onLocateMe }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileMode, setTileMode] = useState('osm');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCoords, setActiveCoords] = useState(coords || null);

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

  // Sync coords from prop or resolve by locationName
  useEffect(() => {
    if (coords && coords.lat && coords.lon) {
      setActiveCoords(coords);
      return;
    }

    if (!locationName) return;
    const clean = locationName.trim().toLowerCase().replace(/\s+/g, '');
    if (KNOWN_COORDS[clean]) {
      setActiveCoords(KNOWN_COORDS[clean]);
      return;
    }

    // Geocode via Open-Meteo
    let isMounted = true;
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName.trim())}&count=1`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.results && data.results.length > 0) {
          setActiveCoords({
            lat: data.results[0].latitude,
            lon: data.results[0].longitude,
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [coords, locationName]);

  // Tile URL helper
  const getTileUrl = (mode) =>
    mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Init or update map view
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;

    const lat = activeCoords?.lat ?? (locationName && KNOWN_COORDS[locationName.toLowerCase().replace(/\s+/g, '')]?.lat) ?? 28.6139;
    const lon = activeCoords?.lon ?? (locationName && KNOWN_COORDS[locationName.toLowerCase().replace(/\s+/g, '')]?.lon) ?? 77.2090;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lon], 11);

      tileLayerRef.current = window.L.tileLayer(getTileUrl(tileMode), { maxZoom: 18 }).addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.flyTo([lat, lon], 11, { duration: 1.0 });
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

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      markerRef.current = window.L.marker([lat, lon], { icon: customIcon }).addTo(
        mapInstanceRef.current
      );
    }
  }, [mapReady, activeCoords?.lat, activeCoords?.lon]);

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
