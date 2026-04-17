import React, { useState, useEffect, useRef, useContext } from 'react';
import { StoreContext } from '../../Context/StoreContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './LiveDeliveryMap.css';

const statusConfig = (t) => ({
  'food processing': { label: t('preparing'),    icon: '👨‍🍳', color: '#f59e0b', step: 1, progress: 0   },
  'out for delivery':{ label: t('on_the_way'),   icon: '🛵',  color: '#3b82f6', step: 2, progress: 0.5 },
  'delivered':       { label: t('status_delivered'),    icon: '✅',  color: '#22c55e', step: 3, progress: 1   },
  'default':         { label: t("my_orders_title").replace('طلباتي', 'تم الطلب').replace('My Orders', 'Order Placed'), icon: '📋',  color: '#FF3008', step: 0, progress: 0   },
});

function getStatusConfig(status, t) {
  return statusConfig(t)[(status || '').toLowerCase().trim()] || statusConfig(t)['default'];
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

function pathDistance(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return total;
}

async function fetchSharedRoadRoute(restaurantPoint, firstOrderPoint, customerPoint) {
  const leg1 = await fetchRoadRoute(restaurantPoint, firstOrderPoint);
  const leg2 = await fetchRoadRoute(firstOrderPoint, customerPoint);
  const d1 = pathDistance(leg1);
  const d2 = pathDistance(leg2);
  const splitT = d1 + d2 > 0 ? d1 / (d1 + d2) : 0.5;
  return { points: [...leg1, ...leg2.slice(1)], splitT };
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
    html: `<div style="display:flex;align-items:center;justify-content:center;position:relative;width:44px;height:44px;">
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
  const { t } = useTranslation();
  const [customerCoords, setCustomerCoords] = useState(null);
  const [firstOrderCoords, setFirstOrderCoords] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const mapRef      = useRef(null); // Leaflet map instance
  const mapDivRef   = useRef(null); // DOM div
  const markersRef  = useRef({});
  const lineRef     = useRef(null);
  const doneLineRef = useRef(null);
  const routeRef    = useRef(null); // full road route points
  const firstStopProgressRef = useRef(null);
  const firstStopNotifiedRef = useRef(false);
  const [renderedProgress, setRenderedProgress] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const statusInfo       = getStatusConfig(order?.status, t);
  const displayAddress   = buildDisplayAddress(order?.address);
  const firstOrderAddress = order?.isSharedDelivery ? order?.sharedMatchedOrderId?.address : null;
  const restaurantCoords = order?.restaurantId?.location
    ? [order.restaurantId.location.lat, order.restaurantId.location.lng]
    : null;

  const extractCoordsFromAddress = (address) => {
    const lat = Number(address?.lat ?? address?.latitude ?? address?.location?.lat ?? address?.coords?.lat);
    const lon = Number(address?.lng ?? address?.lon ?? address?.longitude ?? address?.location?.lng ?? address?.coords?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
    return null;
  };

  // Geocode address only if the actual address fields change
  const addressKey = JSON.stringify(order?.address || {});
  const firstAddressKey = JSON.stringify(firstOrderAddress || {});

  useEffect(() => {
    if (!order?.address) { setError(true); setLoading(false); return; }
    setLoading(true); setError(false); setCustomerCoords(null); setFirstOrderCoords(null);

    const geocodeAddress = async (address) => {
      const fromPayload = extractCoordsFromAddress(address);
      if (fromPayload) return fromPayload;

      try {
        const resp = await fetch(`${url}/api/geocode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await resp.json();
        return data?.success ? [data.lat, data.lon] : null;
      } catch (e) {
        return null;
      }
    };

    (async () => {
      try {
        const [customer, firstOrder] = await Promise.all([
          geocodeAddress(order.address),
          firstOrderAddress ? geocodeAddress(firstOrderAddress) : Promise.resolve(null),
        ]);

        if (!customer) {
          setError(true);
        } else {
          setCustomerCoords(customer);
          setFirstOrderCoords(firstOrder);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [addressKey, firstAddressKey, url]);

  // Handle window resizing to prevent map clipping
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) mapRef.current.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const allPoints = [
        customerCoords,
        ...(restaurantCoords ? [restaurantCoords] : []),
        ...(firstOrderCoords ? [firstOrderCoords] : []),
      ];
      const lats = allPoints.map(p => p[0]);
      const lons = allPoints.map(p => p[1]);
      const center = [(Math.min(...lats)+Math.max(...lats))/2, (Math.min(...lons)+Math.max(...lons))/2];

      const map = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, 13);
      if (!mountedRef.current) { map.remove(); return; }
      mapRef.current = map;

      // Force map to recalculate its size after mounting in a flex/grid container
      const invalidate = () => {
        if (mountedRef.current && mapRef.current) {
          try { mapRef.current.invalidateSize(); } catch(e) {}
        }
      };
      invalidate();
      setTimeout(invalidate, 100);
      setTimeout(invalidate, 500);
      setTimeout(invalidate, 1000); 

      L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png?language=en', {
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map);

      // Fit bounds to show all points — tighter padding so it zooms in on the route
      const fitAll = () => {
        if (!mountedRef.current || !mapRef.current || !mapRef.current._container) return;
        try {
          const bounds = L.latLngBounds(allPoints);
          if (routeRef.current && routeRef.current.length > 1) {
            bounds.extend(routeRef.current);
          }
          mapRef.current.fitBounds(bounds.pad(0.15), { animate: false });
        } catch (e) {}
      };

      if (allPoints.length > 1) {
        fitAll();
        setTimeout(fitAll, 600); // Ensure fit after layout settles
        setTimeout(fitAll, 1200); // Final check
      }

      // ── Road routing via OSRM ──────────────────────────────────────────
      let routePoints = null;
      if (restaurantCoords) {
        try {
          if (firstOrderCoords) {
            const sharedRoute = await fetchSharedRoadRoute(restaurantCoords, firstOrderCoords, customerCoords);
            routePoints = sharedRoute.points;
            firstStopProgressRef.current = sharedRoute.splitT;
          } else {
            routePoints = await fetchRoadRoute(restaurantCoords, customerCoords);
            firstStopProgressRef.current = null;
          }
        } catch (e) {
          console.warn('OSRM routing failed, falling back to straight line:', e);
        }
        if (!mountedRef.current) return;
        routeRef.current = routePoints;

        if (routePoints && routePoints.length > 1) {
          // Draw full road route as a solid red line
          lineRef.current = L.polyline(routePoints, {
            color: '#e53935', weight: 5, opacity: 0.85,
          }).addTo(mapRef.current);

          // Rider position along the actual road
          const riderPos = interpolateAlongRoute(routePoints, statusInfo.progress);

          // Rider marker
          markersRef.current.rider = L.marker(riderPos || routePoints[0], {
            icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
            zIndexOffset: 200,
          }).addTo(mapRef.current).bindPopup(`<b>${statusInfo.label}</b>`);

        } else {
          // Fallback: straight line if OSRM failed
          const fallbackPoints = firstOrderCoords
            ? [restaurantCoords, firstOrderCoords, customerCoords]
            : [restaurantCoords, customerCoords];

          if (firstOrderCoords) {
            const d1 = haversine(
              restaurantCoords[0], restaurantCoords[1],
              firstOrderCoords[0], firstOrderCoords[1]
            );
            const d2 = haversine(
              firstOrderCoords[0], firstOrderCoords[1],
              customerCoords[0], customerCoords[1]
            );
            firstStopProgressRef.current = d1 + d2 > 0 ? d1 / (d1 + d2) : 0.5;
          } else {
            firstStopProgressRef.current = null;
          }

          if (!mountedRef.current || !mapRef.current) return;

          lineRef.current = L.polyline(fallbackPoints, {
            color: '#e53935', weight: 5, opacity: 0.85,
          }).addTo(mapRef.current);

          const riderPos = [
            restaurantCoords[0] + (customerCoords[0] - restaurantCoords[0]) * statusInfo.progress,
            restaurantCoords[1] + (customerCoords[1] - restaurantCoords[1]) * statusInfo.progress,
          ];

          markersRef.current.rider = L.marker(riderPos, {
            icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
            zIndexOffset: 200,
          }).addTo(mapRef.current).bindPopup(`<b>${statusInfo.label}</b>`);
        }

        // Restaurant marker
        const logoUrl = order?.restaurantId?.logo
          ? `${url}/images/${order.restaurantId.logo}`
          : null;
        
        if (mountedRef.current && mapRef.current) {
          markersRef.current.restaurant = L.marker(restaurantCoords, {
            icon: logoUrl
              ? makeLogoIcon(L, logoUrl, '#f59e0b')
              : makeEmojiIcon(L, '🏪', '#f59e0b'),
            zIndexOffset: 100,
          }).addTo(mapRef.current).bindPopup(`<b>${order?.restaurantId?.name || 'Restaurant'}</b>`);
        }

      } else {
        // No restaurant coords — just show rider at customer location
        if (mountedRef.current && mapRef.current) {
          markersRef.current.rider = L.marker(customerCoords, {
            icon: makePulseIcon(L, statusInfo.step === 3 ? '✅' : '🛵', statusInfo.color),
            zIndexOffset: 200,
          }).addTo(mapRef.current).bindPopup(`<b>${statusInfo.label}</b>`);
        }
      }

      // Customer / delivery marker (always shown)
      if (mountedRef.current && mapRef.current) {
        markersRef.current.customer = L.marker(customerCoords, {
          icon: makeEmojiIcon(L, '🏠', '#22c55e'),
          zIndexOffset: 100,
        }).addTo(mapRef.current).bindPopup(`<b>${t("your_delivery_address")}</b>`);

        // Shared first-order drop marker
        if (firstOrderCoords) {
          markersRef.current.firstOrder = L.marker(firstOrderCoords, {
            icon: makeEmojiIcon(L, '📦', '#8b5cf6'),
            zIndexOffset: 110,
          }).addTo(mapRef.current).bindPopup(`<b>${t("first_order_drop")}</b>`);
        }
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        lineRef.current = null;
        doneLineRef.current = null;
        routeRef.current = null;
        firstStopProgressRef.current = null;
        firstStopNotifiedRef.current = false;
        setRenderedProgress(0);
      }
    };
  }, [customerCoords, firstOrderCoords, order?.status]);

  // Logic to animate progress slowly from 0 to a target point when "Out for Delivery"
  useEffect(() => {
    if (!order?.status) return;
    const s = order.status.toLowerCase().trim();
    
    if (s === 'delivered') {
      setRenderedProgress(1);
      return;
    }

    if (s === 'out for delivery') {
      let start = null;
      let frameId = null;
      const duration = 180000; // 3 minutes to go through the route
      
      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const rawProgress = elapsed / duration;
        
        let progress;
        if (rawProgress < 0.85) {
          // Normal speed for most of the way
          progress = rawProgress;
        } else if (rawProgress < 1.0) {
          // Simulate the rider slowing down as they enter the neighborhood
          // This makes the transition to the house feel more "live" and intentional
          progress = 0.85 + (rawProgress - 0.85) * 0.4;
        } else {
          // Once it reaches the end, it stays at the door
          progress = 1;
        }
        
        const finalProgress = Math.min(1, progress);
        setRenderedProgress(finalProgress);
        
        // Keep animating until we hit the destination
        if (finalProgress < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };
      
      frameId = requestAnimationFrame(animate);
      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      };
    } else {
      setRenderedProgress(0);
    }
  }, [order?.status]);

  useEffect(() => {
    if (!order?.isSharedDelivery || !firstOrderCoords) return;
    if (firstStopNotifiedRef.current) return;

    const splitT = firstStopProgressRef.current;
    if (splitT == null) return;

    if (statusInfo.progress >= splitT) {
      firstStopNotifiedRef.current = true;
      toast.info(t("first_order_delivered_msg"));
    }
  }, [order?.isSharedDelivery, order?.status, firstOrderCoords, statusInfo.progress]);

  // Update rider position when status or renderedProgress changes
  useEffect(() => {
    if (!mapRef.current || !customerCoords || !markersRef.current.rider) return;
    import('leaflet').then(L => {
      L = L.default || L;

      let riderPos;
      let donePortion;

      if (routeRef.current && routeRef.current.length > 1) {
        // Move rider along the actual road route
        riderPos = interpolateAlongRoute(routeRef.current, renderedProgress);
        const splitIndex = Math.round(renderedProgress * (routeRef.current.length - 1));
        donePortion = routeRef.current.slice(0, splitIndex + 1);
      } else if (restaurantCoords) {
        // Fallback straight-line interpolation
        riderPos = [
          restaurantCoords[0] + (customerCoords[0] - restaurantCoords[0]) * renderedProgress,
          restaurantCoords[1] + (customerCoords[1] - restaurantCoords[1]) * renderedProgress,
        ];
        donePortion = [restaurantCoords, riderPos];
      } else {
        return;
      }

      markersRef.current.rider.setLatLng(riderPos);
      if (mountedRef.current) {
        // Icon stays as a bike until the official status is 'delivered' (step 3)
        const iconEmoji = statusInfo.step === 3 ? '✅' : '🛵';
        markersRef.current.rider.setIcon(makePulseIcon(L, iconEmoji, statusInfo.color));
      }

      if (doneLineRef.current) {
        doneLineRef.current.setLatLngs(donePortion.length > 1 ? donePortion : [riderPos, riderPos]);
        doneLineRef.current.setStyle({ color: statusInfo.color });
      }
    });
  }, [renderedProgress, customerCoords]);

  const distanceKm = customerCoords && restaurantCoords
    ? haversine(customerCoords[0], customerCoords[1], restaurantCoords[0], restaurantCoords[1])
    : null;

  const isDelivered = statusInfo.step === 3;

  return (
    <div className="ldm-wrap ldm-expanded">

      {/* Legend + distance bar */}
      <div className="ldm-info-bar">
        {restaurantCoords && <><div className="ldm-legend-item"><span className="ldm-dot-restaurant"/>{t("restaurant")}</div><div className="ldm-legend-sep"/></>}
        <div className="ldm-legend-item"><span className="ldm-dot-rider"/>{isDelivered?t("status_delivered"):t("rider")}</div>
        {firstOrderCoords && <><div className="ldm-legend-sep"/><div className="ldm-legend-item"><span className="ldm-dot-first-order"/>{t("first_order")}</div></>}
        <div className="ldm-legend-sep"/>
        <div className="ldm-legend-item"><span className="ldm-dot-customer"/>{t("your_location")}</div>
        {distanceKm && <>
          <div className="ldm-legend-sep"/>
          <div className="ldm-legend-item ldm-distance-text">
            {t("distance")}: <strong>{distanceKm<1?`${Math.round(distanceKm*1000)} m`:`${distanceKm.toFixed(2)} km`}</strong>
          </div>
        </>}
      </div>

      {/* Map */}
      <div className="ldm-map-container">
        {loading && (
          <div className="ldm-map-placeholder skeleton">
            <div className="ldm-map-loading"><div className="ldm-spinner"/><p>{t("locating_address")}</p></div>
          </div>
        )}
        {!loading && error && (
          <div className="ldm-map-placeholder ldm-map-error">
            <span>📍</span><p>{t("couldnt_pin_address")}</p>
            <small>{displayAddress||t("no_address_provided")}</small>
          </div>
        )}
        {!loading && !error && (
          <div className="ldm-leaflet-wrap">
            <div ref={mapDivRef} className="ldm-leaflet-map"/>
            {!isDelivered && <div className="ldm-map-badge"><span className="ldm-live-dot"/>{t("live")}</div>}
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