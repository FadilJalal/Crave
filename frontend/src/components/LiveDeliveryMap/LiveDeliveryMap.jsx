import React, { useState, useEffect, useRef, useContext } from 'react';
import { StoreContext } from '../../Context/StoreContext';
import './LiveDeliveryMap.css';

const statusConfig = {
  'food processing': { label: 'Preparing',    icon: '👨‍🍳', color: '#f59e0b', step: 1, progress: 0   },
  'out for delivery':{ label: 'On the Way',   icon: '🛵',  color: '#3b82f6', step: 2, progress: 0.5 },
  'delivered':       { label: 'Delivered',    icon: '✅',  color: '#22c55e', step: 3, progress: 1   },
  'default':         { label: 'Order Placed', icon: '📋',  color: '#FF3008', step: 0, progress: 0   },
};

function getStatusConfig(status) {
  return statusConfig[(status || '').toLowerCase().trim()] || statusConfig['default'];
}

function buildDisplayAddress(address) {
  if (!address) return null;
  return [address.building, address.apartment, address.street,
          address.area, address.city, address.state, address.country]
    .filter(Boolean).join(', ');
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Fetch a real road route from OSRM (free, no API key required).
 * Returns an array of [lat, lng] waypoints along the actual road.
 */
async function fetchRoadRoute(from, to) {
  // OSRM expects coordinates as lng,lat
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OSRM request failed');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
  // GeoJSON coords are [lng, lat] — flip to [lat, lng] for Leaflet
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

/**
 * Given a route (array of [lat,lng]) and a progress fraction 0–1,
 * return the [lat, lng] point at that fraction of the total route length.
 */
function interpolateAlongRoute(routePoints, t) {
  if (!routePoints || routePoints.length === 0) return null;
  if (t <= 0) return routePoints[0];
  if (t >= 1) return routePoints[routePoints.length - 1];

  // Compute cumulative distances
  const dists = [0];
  for (let i = 1; i < routePoints.length; i++) {
    const [lat1, lon1] = routePoints[i - 1];
    const [lat2, lon2] = routePoints[i];
    const d = Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
    dists.push(dists[i - 1] + d);
  }
  const totalDist = dists[dists.length - 1];
  const target = t * totalDist;

  for (let i = 1; i < routePoints.length; i++) {
    if (dists[i] >= target) {
      const segFrac = (target - dists[i - 1]) / (dists[i] - dists[i - 1]);
      const [lat1, lon1] = routePoints[i - 1];
      const [lat2, lon2] = routePoints[i];
      return [lat1 + (lat2 - lat1) * segFrac, lon1 + (lon2 - lon1) * segFrac];
    }
  }
  return routePoints[routePoints.length - 1];
}

// Create a marker with the restaurant's actual logo image
function makeLogoIcon(L, logoUrl, borderColor) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:42px;height:42px;border-radius:50%;
      background:white;border:3px solid ${borderColor};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      overflow:hidden;flex-shrink:0;
    ">
      <img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
        onerror="this.parentNode.innerHTML='🏪';this.parentNode.style.fontSize='18px';" />
    </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

// Create a custom emoji marker for Leaflet
function makeEmojiIcon(L, emoji, borderColor) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:white;border:3px solid ${borderColor};
      display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.25);
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function makePulseIcon(L, emoji, borderColor) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;width:44px;height:44px;border-radius:50%;
        background:${borderColor};opacity:0.2;
        animation:ldm-pulse-ring 2s ease-out infinite;
      "></div>
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:white;border:3px solid ${borderColor};
        display:flex;align-items:center;justify-content:center;
        font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        position:relative;z-index:1;
      ">${emoji}</div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function LiveDeliveryMap({ order }) {
  const { url } = useContext(StoreContext);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const mapRef      = useRef(null); // Leaflet map instance
  const mapDivRef   = useRef(null); // DOM div
  const markersRef  = useRef({});
  const lineRef     = useRef(null);
  const doneLineRef = useRef(null);
  const routeRef    = useRef(null); // full road route points

  const statusInfo       = getStatusConfig(order?.status);
  const displayAddress   = buildDisplayAddress(order?.address);
  const restaurantCoords = order?.restaurantId?.location
    ? [order.restaurantId.location.lat, order.restaurantId.location.lng]
    : null;

  // Geocode
  useEffect(() => {
    if (!order?.address) { setError(true); setLoading(false); return; }
    setLoading(true); setError(false); setCustomerCoords(null);
    fetch(`${url}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: order.address }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setCustomerCoords([data.lat, data.lon]);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [order?.address, url]);

  // Init Leaflet map once coords are ready and panel is expanded
  useEffect(() => {
    if (!customerCoords || !mapDivRef.current) return;
    if (mapRef.current) return; // already initialized

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then(async L => {
      L = L.default || L;

      // Fix default icon path issue in Vite
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Compute center and zoom to fit all markers
      const allPoints = [customerCoords, ...(restaurantCoords ? [restaurantCoords] : [])];
      const lats = allPoints.map(p => p[0]);
      const lons = allPoints.map(p => p[1]);
      const center = [(Math.min(...lats)+Math.max(...lats))/2, (Math.min(...lons)+Math.max(...lons))/2];

      const map = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, 13);
      mapRef.current = map;

      // Force map to recalculate its size after mounting in a flex/grid container
      setTimeout(() => map.invalidateSize(), 100);

      L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png?language=en', {
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map);

      // Fit bounds to show all points — tighter padding so it zooms in on the route
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.15));
      }

      // ── Road routing via OSRM ──────────────────────────────────────────
      let routePoints = null;
      if (restaurantCoords) {
        try {
          routePoints = await fetchRoadRoute(restaurantCoords, customerCoords);
        } catch (e) {
          console.warn('OSRM routing failed, falling back to straight line:', e);
        }
        routeRef.current = routePoints;

        if (routePoints && routePoints.length > 1) {
          // Draw full road route as a solid red line
          lineRef.current = L.polyline(routePoints, {
            color: '#e53935', weight: 5, opacity: 0.85,
          }).addTo(map);

          // Re-fit bounds to the actual road route
          map.fitBounds(L.latLngBounds(routePoints).pad(0.15));

          // Rider position along the actual road
          const riderPos = interpolateAlongRoute(routePoints, statusInfo.progress);

          // Rider marker
          markersRef.current.rider = L.marker(riderPos || routePoints[0], {
            icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
            zIndexOffset: 200,
          }).addTo(map).bindPopup(`<b>${statusInfo.label}</b>`);

        } else {
          // Fallback: straight line if OSRM failed
          lineRef.current = L.polyline([restaurantCoords, customerCoords], {
            color: '#e53935', weight: 5, opacity: 0.85,
          }).addTo(map);

          const riderPos = [
            restaurantCoords[0] + (customerCoords[0] - restaurantCoords[0]) * statusInfo.progress,
            restaurantCoords[1] + (customerCoords[1] - restaurantCoords[1]) * statusInfo.progress,
          ];

          markersRef.current.rider = L.marker(riderPos, {
            icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
            zIndexOffset: 200,
          }).addTo(map).bindPopup(`<b>${statusInfo.label}</b>`);
        }

        // Restaurant marker
        // Restaurant marker — show actual logo
        const logoUrl = order?.restaurantId?.logo
          ? `${url}/images/${order.restaurantId.logo}`
          : null;
        markersRef.current.restaurant = L.marker(restaurantCoords, {
          icon: logoUrl
            ? makeLogoIcon(L, logoUrl, '#f59e0b')
            : makeEmojiIcon(L, '🏪', '#f59e0b'),
          zIndexOffset: 100,
        }).addTo(map).bindPopup(`<b>${order?.restaurantId?.name || 'Restaurant'}</b>`);

      } else {
        // No restaurant coords — just show rider at customer location
        markersRef.current.rider = L.marker(customerCoords, {
          icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
          zIndexOffset: 200,
        }).addTo(map).bindPopup(`<b>${statusInfo.label}</b>`);
      }

      // Customer / delivery marker (always shown)
      markersRef.current.customer = L.marker(customerCoords, {
        icon: makeEmojiIcon(L, '🏠', '#22c55e'),
        zIndexOffset: 100,
      }).addTo(map).bindPopup('<b>Your delivery address</b>');
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        lineRef.current = null;
        doneLineRef.current = null;
        routeRef.current = null;
      }
    };
  }, [customerCoords]);

  // Update rider position when status changes
  useEffect(() => {
    if (!mapRef.current || !customerCoords || !markersRef.current.rider) return;
    import('leaflet').then(L => {
      L = L.default || L;

      let riderPos;
      let donePortion;

      if (routeRef.current && routeRef.current.length > 1) {
        // Move rider along the actual road route
        riderPos = interpolateAlongRoute(routeRef.current, statusInfo.progress);
        const splitIndex = Math.round(statusInfo.progress * (routeRef.current.length - 1));
        donePortion = routeRef.current.slice(0, splitIndex + 1);
      } else if (restaurantCoords) {
        // Fallback straight-line interpolation
        riderPos = [
          restaurantCoords[0] + (customerCoords[0] - restaurantCoords[0]) * statusInfo.progress,
          restaurantCoords[1] + (customerCoords[1] - restaurantCoords[1]) * statusInfo.progress,
        ];
        donePortion = [restaurantCoords, riderPos];
      } else {
        return;
      }

      markersRef.current.rider.setLatLng(riderPos);
      markersRef.current.rider.setIcon(makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color));

      if (doneLineRef.current) {
        doneLineRef.current.setLatLngs(donePortion.length > 1 ? donePortion : [riderPos, riderPos]);
        doneLineRef.current.setStyle({ color: statusInfo.color });
      }
    });
  }, [order?.status, customerCoords]);

  const distanceKm = customerCoords && restaurantCoords
    ? haversine(customerCoords[0], customerCoords[1], restaurantCoords[0], restaurantCoords[1])
    : null;

  const isDelivered = statusInfo.step === 3;

  return (
    <div className="ldm-wrap ldm-expanded">

      {/* Legend + distance bar */}
      <div className="ldm-info-bar">
        {restaurantCoords && <><div className="ldm-legend-item"><span className="ldm-dot-restaurant"/>Restaurant</div><div className="ldm-legend-sep"/></>}
        <div className="ldm-legend-item"><span className="ldm-dot-rider"/>{isDelivered?'Delivered':'Rider'}</div>
        <div className="ldm-legend-sep"/>
        <div className="ldm-legend-item"><span className="ldm-dot-customer"/>Your location</div>
        {distanceKm && <>
          <div className="ldm-legend-sep"/>
          <div className="ldm-legend-item ldm-distance-text">
            Distance: <strong>{distanceKm<1?`${Math.round(distanceKm*1000)} m`:`${distanceKm.toFixed(2)} km`}</strong>
          </div>
        </>}
      </div>

      {/* Map */}
      <div className="ldm-map-container">
        {loading && (
          <div className="ldm-map-placeholder skeleton">
            <div className="ldm-map-loading"><div className="ldm-spinner"/><p>Locating your address…</p></div>
          </div>
        )}
        {!loading && error && (
          <div className="ldm-map-placeholder ldm-map-error">
            <span>📍</span><p>Couldn't pin your address on the map.</p>
            <small>{displayAddress||'No address provided'}</small>
          </div>
        )}
        {!loading && !error && (
          <div className="ldm-leaflet-wrap">
            <div ref={mapDivRef} className="ldm-leaflet-map"/>
            {!isDelivered && <div className="ldm-map-badge"><span className="ldm-live-dot"/>Live</div>}
          </div>
        )}
      </div>

      {/* Address row */}
      {order?.address && (
        <div className="ldm-addr-row">
          <div className="ldm-addr-icon">🏠</div>
          <div className="ldm-addr-detail">
            <p className="ldm-addr-name">{order.address.firstName} {order.address.lastName}</p>
            <p className="ldm-addr-text">{displayAddress}</p>
            {order.address.phone && <p className="ldm-addr-phone">📞 {order.address.phone}</p>}
            {order.address.deliveryNotes && <p className="ldm-addr-notes">📝 {order.address.deliveryNotes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}