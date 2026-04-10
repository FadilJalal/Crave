import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Restaurants.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';

import { isRestaurantOpen, nextOpeningTime } from '../../utils/restaurantHours';

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const Restaurants = () => {
  const { t, i18n } = useTranslation();
  const { url } = useContext(StoreContext);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search,  setSearch]          = useState('');
  const [error,   setError]           = useState('');
  const navigate = useNavigate();

  // Get saved user location
  const userLocation = (() => {
    try { return JSON.parse(localStorage.getItem('crave_location')); } catch { return null; }
  })();

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true); setError('');
        const res = await axios.get(`${url}/api/restaurant/list`);
        if (res.data.success) {
          setRestaurants(res.data.data || []);
        } else {
          setError(res.data.message || 'Failed to load restaurants');
        }
      } catch {
        setError('Could not connect to server. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, [url]);

  // Attach distance + sort
  const withDistance = restaurants.map(r => ({
    ...r,
    distance: (userLocation && r.location?.lat && r.location?.lng)
      ? haversine(userLocation.lat, userLocation.lng, r.location.lat, r.location.lng)
      : null,
  })).sort((a, b) => {
    // Active first, then open, then by distance
    const aActive = a.isActive !== false, bActive = b.isActive !== false;
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aOpen = isRestaurantOpen(a), bOpen = isRestaurantOpen(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    return 0;
  });

  const filtered = withDistance.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.address.toLowerCase().includes(search.toLowerCase())
  );

  const fmtDist = (d) => d === null ? null : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)} km`;

  // Check if user is outside the restaurant's delivery radius
  const isOutOfRange = (r) => {
    if (!userLocation || r.distance === null) return false;
    const radius = r.deliveryRadius ?? 10;
    if (radius === 0) return false; // unlimited
    return r.distance > radius;
  };

  return (
    <div className='rp-page'>
      <div className='rp-header'>
        <div>
          <h1 className='rp-title'>{t("restaurants")}</h1>
          <p className='rp-sub'>
            {loading ? t("loading") : (
              <>
                {t("n_restaurants", { count: restaurants.length })}
                {userLocation && <span style={{ color: '#ff4e2a', fontWeight: 700 }}>{t("near_location", { location: userLocation.label })}</span>}
              </>
            )}
          </p>
        </div>
        <div className='rp-search'>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder={t("search_restaurants")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className='rp-error'>⚠️ {error}</div>}

      {loading ? (
        <div className='rp-grid'>
          {[1,2,3,4,5,6].map(i => <div key={i} className='rp-skeleton skeleton' />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className='rp-empty'>
          <div className='rp-empty-icon'>🍽️</div>
          <p>{restaurants.length === 0 ? t("no_restaurants_added") : t("no_restaurants_match_search")}</p>
        </div>
      ) : (
        <div className='rp-grid'>
          {filtered.map(r => {
            const active = r.isActive !== false;
            const open = active && isRestaurantOpen(r);
            const dist = fmtDist(r.distance);
            const outOfRange = isOutOfRange(r);
            const radius = r.deliveryRadius ?? 10;
            const closedNow = !open && !outOfRange;
            const nextTxt = closedNow ? nextOpeningTime(r) : null;
            return (
              <div
                key={r._id}
                className={`rp-card ${outOfRange ? 'rp-card-disabled' : ''} ${closedNow ? 'rp-card-closed' : ''}`}
                onClick={() => !outOfRange && navigate(`/restaurants/${r._id}`)}
                title={
                  outOfRange
                    ? t("delivery_only_within", { km: radius })
                    : closedNow
                      ? (nextTxt || t("closed_browse_menu"))
                      : ''
                }
              >
                <div className='rp-card-img'>
                  {r.logo ? (
                    <img
                      src={`${url}/images/${r.logo}`}
                      alt={r.name}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.parentNode.querySelector('.rp-card-initial').style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className='rp-card-initial' style={{ display: r.logo ? 'none' : 'flex' }}>
                    {r.name[0]}
                  </div>
                  <span className={`rp-status ${open ? 'rp-open' : 'rp-closed'}`}>
                    {!active ? t("status_unavailable") : open ? t("status_open") : t("status_closed")}
                  </span>
                  {closedNow && (
                    <div className="rp-closed-overlay" aria-hidden>
                      <span className="rp-closed-overlay-icon">🔒</span>
                      <span className="rp-closed-overlay-text">{t("not_taking_orders")}</span>
                    </div>
                  )}
                  {dist && (
                    <span className='rp-distance'>📍 {dist}</span>
                  )}
                  {outOfRange && (
                    <span className='rp-out-of-range'>🚫 {t("too_far")}</span>
                  )}
                </div>
                <div className='rp-card-body'>
                  <h3 className='rp-card-name'>{r.name}</h3>
                  <p className='rp-card-address'>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {r.address}
                  </p>
                  <div className='rp-card-meta'>
                    <span>🕐 {r.avgPrepTime} min</span>
                    <span>⭐ 4.5</span>
                    {dist && <span style={{ color: outOfRange ? '#ef4444' : '#ff4e2a', fontWeight: 700 }}>📍 {dist}</span>}
                  </div>
                  {outOfRange && (
                    <p className='rp-range-warning'>
                      {t("delivers_only_within_distance", { radius: radius, distance: r.distance?.toFixed(1) })}
                    </p>
                  )}
                </div>
                <div className='rp-card-footer'>
                  {closedNow && nextTxt && (
                    <p className="rp-next-open">{nextTxt}</p>
                  )}
                  <button
                    type="button"
                    className={`rp-view-btn ${outOfRange ? 'rp-view-btn-disabled' : ''} ${closedNow ? 'rp-view-btn-muted' : ''}`}
                    disabled={outOfRange}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!outOfRange) navigate(`/restaurants/${r._id}`);
                    }}
                  >
                    {outOfRange
                      ? t("out_of_delivery_range")
                      : closedNow
                        ? (i18n.language === 'ar' ? t("browse_menu_arrow").replace("→", "←") : t("browse_menu_arrow"))
                        : (i18n.language === 'ar' ? t("view_menu_arrow").replace("→", "←") : t("view_menu_arrow"))}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Restaurants;