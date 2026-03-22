import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './Navbar.css';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';
import { NotificationContext } from '../../Context/NotificationContext';

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Navbar = ({ setShowLogin }) => {
  const { token, setToken, setCartItems, food_list, cartItems, url } = useContext(StoreContext);
  const { notifications, unreadCount, markAllRead, clearAll } = useContext(NotificationContext);
  const navigate = useNavigate();
  
  const [openProfile, setOpenProfile] = useState(false);
  const [openBell, setOpenBell] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  const [location, setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('crave_location');
      return saved ? JSON.parse(saved) : { label: 'Sharjah, UAE', lat: 25.3463, lng: 55.4209 };
    } catch { return { label: 'Sharjah, UAE', lat: 25.3463, lng: 55.4209 }; }
  });

  const [locOpen, setLocOpen] = useState(false);
  const [locTab, setLocTab] = useState('search');
  const [locQuery, setLocQuery] = useState('');
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);

  const bellRef = useRef(null);
  const mapPickerRef = useRef(null);
  const mapPickerInstance = useRef(null);
  const mapPickerMarker = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const locRef = useRef(null);
  const locDebounce = useRef(null);

  // Optimized cart count
  const cartCount = useMemo(() => 
    Object.values(cartItems || {}).reduce((a, b) => a + (b?.quantity || 0), 0)
  , [cartItems]);

  useEffect(() => {
    try { 
      localStorage.setItem('crave_location', JSON.stringify(location)); 
      window.dispatchEvent(new Event('crave_location_changed')); 
    } catch {}
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // FIXED: Consolidated Click-Outside Handler
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpenBell(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (locRef.current && !locRef.current.contains(e.target)) setLocOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const results = (food_list || []).filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
    setSearchResults(results);
  }, [searchQuery, food_list]);

  const loadNearby = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`${url}/api/restaurant/list`);
      const data = await res.json();
      if (data.success) {
        const withDist = (data.data || [])
          .filter(r => r.isActive && r.location?.lat && r.location?.lng)
          .map(r => ({ ...r, distance: haversine(lat, lng, r.location.lat, r.location.lng) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4);
        setNearbyRestaurants(withDist);
      }
    } catch {}
  }, [url]);

  useEffect(() => {
    if (location.lat && location.lng) loadNearby(location.lat, location.lng);
  }, [location, loadNearby]);

  const handleLocInput = (e) => {
    const q = e.target.value;
    setLocQuery(q);
    clearTimeout(locDebounce.current);
    if (!q.trim()) { setLocSuggestions([]); return; }
    locDebounce.current = setTimeout(async () => {
      setLocLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setLocSuggestions(data.map(d => ({
          label: d.display_name.split(',').slice(0, 3).join(',').trim(),
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        })));
      } catch {} finally { setLocLoading(false); }
    }, 350);
  };

  const pickLocation = (sug) => {
    setLocation({ label: sug.label, lat: sug.lat, lng: sug.lng });
    setLocQuery(''); setLocSuggestions([]); setLocOpen(false);
  };

  const detectGPS = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || 'Here';
        const country = data.address?.country || '';
        setLocation({ label: `${city}, ${country}`, lat: latitude, lng: longitude });
        setLocOpen(false);
      } catch {
        setLocation({ label: 'Current location', lat: pos.coords.latitude, lng: pos.coords.longitude });
      } finally { setLocLoading(false); }
    }, () => setLocLoading(false));
  };

  useEffect(() => {
    if (!locOpen || locTab !== 'map' || !mapPickerRef.current) return;
    if (mapPickerInstance.current) return;
    let isMounted = true;

    import('leaflet').then(L => {
      if (!isMounted || !mapPickerRef.current) return;
      L = L.default || L;
      const center = [location.lat || 25.3463, location.lng || 55.4209];
      const map = L.map(mapPickerRef.current, { zoomControl: true }).setView(center, 13);
      mapPickerInstance.current = map;

      L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png?language=en', {
        attribution: '© Stadia Maps © OpenStreetMap', maxZoom: 20,
      }).addTo(map);

      const marker = L.marker(center, { draggable: true }).addTo(map);
      mapPickerMarker.current = marker;

      const updateMarkerData = async (lat, lng) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || '';
          const city = data.address?.city || data.address?.town || data.address?.state || '';
          marker._pendingLabel = [area, city].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch {
          marker._pendingLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        marker._pendingLat = lat;
        marker._pendingLng = lng;
      };

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        updateMarkerData(lat, lng);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updateMarkerData(lat, lng);
      });

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      isMounted = false;
      if (mapPickerInstance.current) {
        mapPickerInstance.current.remove();
        mapPickerInstance.current = null;
        mapPickerMarker.current = null;
      }
    };
  }, [locOpen, locTab]);

  const confirmMapLocation = () => {
    const marker = mapPickerMarker.current;
    if (!marker) return;
    const lat = marker._pendingLat || marker.getLatLng().lat;
    const lng = marker._pendingLng || marker.getLatLng().lng;
    const label = marker._pendingLabel || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setLocation({ label, lat, lng });
    setLocOpen(false);
    setLocTab('search');
    if (mapPickerInstance.current) {
      mapPickerInstance.current.remove();
      mapPickerInstance.current = null;
      mapPickerMarker.current = null;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCartItems({});
    setOpenProfile(false);
    navigate('/');
  };

  // JSX returns here (unchanged but syntax error-free)
  return (
    <nav className={`nb-wrap ${scrolled ? 'nb-scrolled' : ''}`}>
      <div className='nb-inner'>
        <Link to='/' className='nb-logo'>
          <span className='nb-brand-name'>Crave.</span>
        </Link>

        {/* Location picker */}
        <div className='nb-loc-wrap' ref={locRef}>
          <button className='nb-location' onClick={() => { setLocOpen(p => !p); setLocQuery(''); setLocSuggestions([]); }}>
            {locLoading ? <span className='nb-loc-spinner' /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            )}
            <span className='nb-loc-text'>{location.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: locOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {locOpen && (
            <div className='nb-loc-dropdown'>
              <div className='nb-loc-tabs'>
                <button className={`nb-loc-tab ${locTab === 'search' ? 'nb-loc-tab-active' : ''}`} onClick={() => setLocTab('search')}>🔍 Search</button>
                <button className={`nb-loc-tab ${locTab === 'map' ? 'nb-loc-tab-active' : ''}`} onClick={() => setLocTab('map')}>🗺️ Pick on Map</button>
              </div>

              {locTab === 'search' && (<>
                <div className='nb-loc-search'>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input autoFocus placeholder="Search for your area, city..." value={locQuery} onChange={handleLocInput} />
                  {locLoading && <span className='nb-loc-spinner' style={{ flexShrink: 0 }} />}
                </div>
                <button className='nb-loc-gps' onClick={detectGPS}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    <path d="M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                  </svg>
                  Use my current location
                </button>
                {locSuggestions.length > 0 && (
                  <div className='nb-loc-suggestions'>
                    <div className='nb-loc-section-label'>📍 Address results</div>
                    {locSuggestions.map((s, i) => (
                      <button key={i} className='nb-loc-suggestion' onClick={() => pickLocation(s)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, color: '#9ca3af' }}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {nearbyRestaurants.length > 0 && (
                  <div className='nb-loc-nearby'>
                    <div className='nb-loc-section-label'>🍽️ Nearby restaurants</div>
                    {nearbyRestaurants.map(r => (
                      <button key={r._id} className='nb-loc-restaurant' onClick={() => { setLocOpen(false); navigate(`/restaurants/${r._id}`); }}>
                        <div className='nb-loc-rest-avatar'>
                          {r.logo ? <img src={`${url}/images/${r.logo}`} alt={r.name} onError={e => e.target.style.display='none'} /> : <span>{r.name[0]}</span>}
                        </div>
                        <div className='nb-loc-rest-info'>
                          <span className='nb-loc-rest-name'>{r.name}</span>
                          <span className='nb-loc-rest-dist'>{r.distance < 1 ? `${Math.round(r.distance * 1000)}m` : `${r.distance.toFixed(1)} km`} away</span>
                        </div>
                        <span className={`nb-loc-rest-status ${r.isActive ? 'open' : 'closed'}`}>{r.isActive ? 'Open' : 'Closed'}</span>
                      </button>
                    ))}
                    <button className='nb-loc-view-all' onClick={() => { setLocOpen(false); navigate('/restaurants'); }}>View all restaurants →</button>
                  </div>
                )}
              </>)}

              {locTab === 'map' && (
                <div className='nb-loc-map-wrap'>
                  <p className='nb-loc-map-hint'>📍 Click anywhere or drag the pin to set your location</p>
                  <div ref={mapPickerRef} className='nb-loc-map' />
                  <button className='nb-loc-map-confirm' onClick={confirmMapLocation}>✓ Confirm this location</button>
                </div>
              )}
            </div>
          )}
        </div>

        <Link to='/restaurants' className='nb-restaurants-link'>🍽️ Restaurants</Link>

        {/* Search */}
        <div className='nb-search-wrap' ref={searchRef}>
          <div className={`nb-search ${searchOpen ? 'nb-search-open' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type='text' placeholder='Search food, restaurants...' value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} onFocus={() => setSearchOpen(true)} />
            {searchQuery && <button className='nb-search-clear' onClick={() => { setSearchQuery(''); setSearchResults([]); }}>✕</button>}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className='nb-search-results'>
              {searchResults.map(item => (
                <div key={item._id} className='nb-search-item' onClick={() => {
                  setSearchQuery(''); setSearchResults([]); setSearchOpen(false);
                  document.getElementById('food-display')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  <img src={`${item.image}`} alt={item.name} onError={e => e.target.style.display = 'none'} />
                  <div><p className='nb-si-name'>{item.name}</p><p className='nb-si-cat'>{item.category}</p></div>
                  <span className='nb-si-price'>${item.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='nb-actions'>
          {/* Notification Bell */}
          {token && (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setOpenBell(p => !p); if (!openBell) markAllRead(); }}
                className='nb-avatar'
                style={{ position: 'relative' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#ff4e2a', borderRadius: '50%', fontSize: 9, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {openBell && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 320, background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)', border: '1px solid #f3f4f6', zIndex: 9999, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>Order Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
                    )}
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>No notifications yet</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>Order updates will appear here</div>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => { navigate('/myorders'); setOpenBell(false); }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {n.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(n.time).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Link to='/cart' className='nb-cart-btn'>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <span className='nb-cart-label'>Cart</span>
            {cartCount > 0 && <span className='nb-cart-badge'>{cartCount}</span>}
          </Link>

          {!token ? (
            <button className='nb-signin' onClick={() => setShowLogin(true)}>Sign in</button>
          ) : (
            <div className='nb-profile' ref={profileRef}>
              <button className='nb-avatar' onClick={() => setOpenProfile(!openProfile)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              {openProfile && (
                <div className='nb-dropdown'>
                  <div className='nb-dd-header'>
                    <div className='nb-dd-avatar'>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span>My Account</span>
                  </div>
                  <hr className='nb-dd-hr' />
                  <button className='nb-dd-item' onClick={() => { navigate('/myorders'); setOpenProfile(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    My Orders
                  </button>
                  <button className='nb-dd-item nb-dd-logout' onMouseDown={e => { e.preventDefault(); logout(); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;