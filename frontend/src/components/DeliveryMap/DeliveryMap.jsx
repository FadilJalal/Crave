import { useEffect, useRef, useState } from 'react';
import './DeliveryMap.css';

// ── How far along the route the bike is per status ──────────────────────────
const STATUS_PROGRESS = {
  'order placed':    0,      // at restaurant
  'food processing': 0,      // still at restaurant
  'out for delivery': 0.5,   // halfway
  'delivered':       1,      // at customer
};

// ── Geocode a text address → { lat, lng } via OpenStreetMap Nominatim ────────
const geocodeAddress = async (address) => {
  const q = [address.street, address.area, address.city, address.country]
    .filter(Boolean).join(', ');
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
};

// ── Interpolate between two points ──────────────────────────────────────────
const lerp = (a, b, t) => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

// ── Bearing between two coords (for rotating the bike) ──────────────────────
const bearing = (from, to) => {
  const dLng = (to.lng - from.lng) * (Math.PI / 180);
  const lat1 = from.lat * (Math.PI / 180);
  const lat2 = to.lat  * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

// ── SVG Bike icon builder ────────────────────────────────────────────────────
const makeBikeIcon = (angle, delivered) => {
  const color = delivered ? '#16a34a' : '#f97316';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="20" fill="${color}" opacity="0.15"/>
      <circle cx="22" cy="22" r="20" fill="none" stroke="${color}" stroke-width="2"/>
      <text x="22" y="28" text-anchor="middle" font-size="20"
        transform="rotate(${angle - 90}, 22, 22)">🛵</text>
    </svg>`;
  return window.L.divIcon({
    html: svg,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const makeRestaurantIcon = () => window.L.divIcon({
  html: `<div class="dm-map-pin dm-pin-rest">🏪</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const makeCustomerIcon = () => window.L.divIcon({
  html: `<div class="dm-map-pin dm-pin-customer">🏠</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// ── Component ────────────────────────────────────────────────────────────────
const DeliveryMap = ({ order, status }) => {
  const mapRef     = useRef(null);   // DOM node
  const leafletRef = useRef(null);   // L.Map instance
  const bikeRef    = useRef(null);   // bike marker
  const lineRef    = useRef(null);   // route polyline
  const restRef    = useRef(null);   // restaurant marker
  const custRef    = useRef(null);   // customer marker
  const animRef    = useRef(null);   // animation frame

  const [customerCoords, setCustomerCoords] = useState(null);
  const [geocoding, setGeocoding]           = useState(true);
  const [geoError, setGeoError]             = useState(false);

  // Restaurant coords come from the populated restaurantId field
  const restaurantCoords = order?.restaurantId?.location || null;

  // ── Geocode the customer address once ──────────────────────────────────────
  useEffect(() => {
    if (!order?.address) return;
    setGeocoding(true);
    geocodeAddress(order.address).then(coords => {
      if (coords) {
        setCustomerCoords(coords);
        setGeoError(false);
      } else {
        setGeoError(true);
      }
      setGeocoding(false);
    });
  }, [order?._id]);

  // ── Init / update map whenever coords or status change ────────────────────
  useEffect(() => {
    if (!restaurantCoords || !customerCoords || !window.L || !mapRef.current) return;

    const L = window.L;
    const progress = STATUS_PROGRESS[(status || '').toLowerCase().trim()] ?? 0;
    const bikePos  = lerp(restaurantCoords, customerCoords, progress);
    const delivered = progress === 1;
    const angle    = bearing(restaurantCoords, customerCoords);

    // ── Init map once ────────────────────────────────────────────────────────
    if (!leafletRef.current) {
      leafletRef.current = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletRef.current);
    }

    const map = leafletRef.current;

    // ── Route line ───────────────────────────────────────────────────────────
    if (lineRef.current) map.removeLayer(lineRef.current);
    lineRef.current = L.polyline(
      [[restaurantCoords.lat, restaurantCoords.lng], [customerCoords.lat, customerCoords.lng]],
      { color: '#f97316', weight: 3, dashArray: '8 6', opacity: 0.7 }
    ).addTo(map);

    // ── Restaurant marker ───────────────────────────────────────────────────
    if (restRef.current) map.removeLayer(restRef.current);
    restRef.current = L.marker([restaurantCoords.lat, restaurantCoords.lng], { icon: makeRestaurantIcon() })
      .addTo(map)
      .bindPopup(`<b>${order.restaurantId?.name || 'Restaurant'}</b><br>${order.restaurantId?.address || ''}`);

    // ── Customer marker ─────────────────────────────────────────────────────
    if (custRef.current) map.removeLayer(custRef.current);
    custRef.current = L.marker([customerCoords.lat, customerCoords.lng], { icon: makeCustomerIcon() })
      .addTo(map)
      .bindPopup(`<b>Your Location</b><br>${order.address?.street || ''}`);

    // ── Animate bike smoothly to new position ───────────────────────────────
    const targetLat = bikePos.lat;
    const targetLng = bikePos.lng;

    if (!bikeRef.current) {
      bikeRef.current = L.marker([targetLat, targetLng], { icon: makeBikeIcon(angle, delivered), zIndexOffset: 1000 }).addTo(map);
    }

    const startPos = bikeRef.current.getLatLng();
    const startLat = startPos.lat;
    const startLng = startPos.lng;
    const duration = 1800; // ms
    const startTime = performance.now();

    cancelAnimationFrame(animRef.current);
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad
      const curLat = startLat + (targetLat - startLat) * ease;
      const curLng = startLng + (targetLng - startLng) * ease;
      bikeRef.current.setLatLng([curLat, curLng]);
      bikeRef.current.setIcon(makeBikeIcon(angle, delivered));
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    // ── Fit map to show all markers ─────────────────────────────────────────
    const bounds = L.latLngBounds([
      [restaurantCoords.lat, restaurantCoords.lng],
      [customerCoords.lat, customerCoords.lng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60] });

    return () => cancelAnimationFrame(animRef.current);
  }, [restaurantCoords, customerCoords, status]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!restaurantCoords) return (
    <div className="dm-unavailable">
      <span>🗺️</span> Map unavailable — restaurant location not set.
    </div>
  );

  if (geocoding) return (
    <div className="dm-loading">
      <div className="dm-spinner" />
      <span>Finding your location…</span>
    </div>
  );

  if (geoError) return (
    <div className="dm-unavailable">
      <span>📍</span> Couldn't pin your address on the map.
    </div>
  );

  return (
    <div className="dm-wrap">
      <div className="dm-legend">
        <span>🏪 Restaurant</span>
        <span>🛵 Driver</span>
        <span>🏠 You</span>
      </div>
      <div ref={mapRef} className="dm-map" />
    </div>
  );
};

export default DeliveryMap;