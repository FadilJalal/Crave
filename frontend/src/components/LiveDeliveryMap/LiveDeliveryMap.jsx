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

function interpolate(lat1, lon1, lat2, lon2, t) {
  return [lat1+(lat2-lat1)*t, lon1+(lon2-lon1)*t];
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
  const [expanded, setExpanded] = useState(true); // open by default
  const mapRef     = useRef(null); // Leaflet map instance
  const mapDivRef  = useRef(null); // DOM div
  const markersRef = useRef({});
  const lineRef    = useRef(null);
  const doneLineRef= useRef(null);

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
    if (!customerCoords || !mapDivRef.current || !expanded) return;
    if (mapRef.current) return; // already initialized

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then(L => {
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Fit bounds to show all points
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.2));
      }

      // Route line (dashed gray = full route)
      if (restaurantCoords) {
        lineRef.current = L.polyline([restaurantCoords, customerCoords], {
          color: '#94a3b8', weight: 3, dashArray: '8 6', opacity: 0.7,
        }).addTo(map);
      }

      // Rider position
      const riderPos = restaurantCoords
        ? interpolate(...restaurantCoords, ...customerCoords, statusInfo.progress)
        : customerCoords;

      // Completed portion line (colored)
      if (restaurantCoords) {
        doneLineRef.current = L.polyline([restaurantCoords, riderPos], {
          color: statusInfo.color, weight: 4, opacity: 0.95,
        }).addTo(map);
      }

      // Markers
      if (restaurantCoords) {
        markersRef.current.restaurant = L.marker(restaurantCoords, {
          icon: makeEmojiIcon(L, '🏪', '#f59e0b'),
          zIndexOffset: 100,
        }).addTo(map).bindPopup('<b>Restaurant</b>');
      }

      markersRef.current.customer = L.marker(customerCoords, {
        icon: makeEmojiIcon(L, '🏠', '#22c55e'),
        zIndexOffset: 100,
      }).addTo(map).bindPopup('<b>Your delivery address</b>');

      markersRef.current.rider = L.marker(riderPos, {
        icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
        zIndexOffset: 200,
      }).addTo(map).bindPopup(`<b>${statusInfo.label}</b>`);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        lineRef.current = null;
        doneLineRef.current = null;
      }
    };
  }, [customerCoords, expanded]);

  // Update rider position when status changes
  useEffect(() => {
    if (!mapRef.current || !customerCoords || !markersRef.current.rider) return;
    import('leaflet').then(L => {
      L = L.default || L;
      const riderPos = restaurantCoords
        ? interpolate(...restaurantCoords, ...customerCoords, statusInfo.progress)
        : customerCoords;

      markersRef.current.rider.setLatLng(riderPos);
      markersRef.current.rider.setIcon(makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color));

      if (doneLineRef.current && restaurantCoords) {
        doneLineRef.current.setLatLngs([restaurantCoords, riderPos]);
        doneLineRef.current.setStyle({ color: statusInfo.color });
      }
    });
  }, [order?.status, customerCoords]);

  // Invalidate map size when panel expands
  useEffect(() => {
    if (expanded && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 300);
    }
  }, [expanded]);

  const distanceKm = customerCoords && restaurantCoords
    ? haversine(customerCoords[0], customerCoords[1], restaurantCoords[0], restaurantCoords[1])
    : null;

  const isDelivered = statusInfo.step === 3;

  return (
    <div className={`ldm-wrap ${expanded ? 'ldm-expanded' : ''}`}>
      <div className="ldm-header" onClick={() => setExpanded(v => !v)}>
        <div className="ldm-header-left">
          <span className="ldm-pin-icon">📍</span>
          <div>
            <p className="ldm-title">Live Delivery Map</p>
            {displayAddress && <p className="ldm-address">{displayAddress}</p>}
          </div>
        </div>
        <div className="ldm-header-right">
          {distanceKm && (
            <span className="ldm-distance-pill">
              📏 {distanceKm < 1 ? `${Math.round(distanceKm*1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
          <span className="ldm-status-pill" style={{'--status-color': statusInfo.color}}>
            <span className="ldm-status-dot" style={{'--status-color': statusInfo.color}}/>
            {statusInfo.icon} {statusInfo.label}
          </span>
          <svg className={`ldm-chevron ${expanded?'ldm-chevron-up':''}`}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <div className="ldm-body">
        {/* Steps */}
        <div className="ldm-steps">
          {['Order Placed','Preparing','On the Way','Delivered'].map((s, i) => (
            <React.Fragment key={s}>
              <div className="ldm-step">
                <div className={`ldm-step-dot ${i<=statusInfo.step?'ldm-step-done':''} ${i===statusInfo.step?'ldm-step-current':''}`}
                  style={i<=statusInfo.step?{'--status-color':statusInfo.color}:{}}>
                  {i<statusInfo.step?'✓':i===statusInfo.step?['📋','👨‍🍳','🛵','✅'][i]:''}
                  {i>statusInfo.step?i+1:''}
                </div>
                <p className={`ldm-step-label ${i<=statusInfo.step?'ldm-step-label-done':''}`}
                   style={i<=statusInfo.step?{color:statusInfo.color}:{}}>{s}</p>
              </div>
              {i<3 && <div className={`ldm-step-line ${i<statusInfo.step?'ldm-step-line-done':''}`}
                           style={i<statusInfo.step?{background:statusInfo.color}:{}}/>}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
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
    </div>
  );
}