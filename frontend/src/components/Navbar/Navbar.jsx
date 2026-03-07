import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import './Navbar.css';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';

// Haversine distance in km between two lat/lng points
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const Navbar = ({ setShowLogin }) => {
  const { getTotalCartAmount, token, setToken, setCartItems, food_list, cartItems, url } = useContext(StoreContext);
  const navigate = useNavigate();
  const [openProfile, setOpenProfile]   = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled]         = useState(false);

  // Location state
  const [location, setLocation]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('crave_location')) || { label: 'Sharjah, UAE', lat: 25.3463, lng: 55.4209 }; } catch { return { label: 'Sharjah, UAE', lat: 25.3463, lng: 55.4209 }; }
  });
  const [locOpen, setLocOpen]           = useState(false);
  const [locQuery, setLocQuery]         = useState('');
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [locLoading, setLocLoading]     = useState(false);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);

  const profileRef = useRef(null);
  const searchRef  = useRef(null);
  const locRef     = useRef(null);
  const locDebounce = useRef(null);

  const cartCount = Object.values(cartItems || {}).reduce((a, b) => a + (b?.quantity || 0), 0);

  // Persist location
  useEffect(() => {
    try { localStorage.setItem('crave_location', JSON.stringify(location)); } catch {}
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
      if (searchRef.current  && !searchRef.current.contains(e.target))  setSearchOpen(false);
      if (locRef.current     && !locRef.current.contains(e.target))     setLocOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Food search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const results = (food_list || []).filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
    setSearchResults(results);
  }, [searchQuery, food_list]);

  // Nearby restaurants based on current location
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

  // Nominatim address autocomplete
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
          fullLabel: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        })));
      } catch {}
      finally { setLocLoading(false); }
    }, 350);
  };

  const pickLocation = (sug) => {
    setLocation({ label: sug.label, lat: sug.lat, lng: sug.lng });
    setLocQuery('');
    setLocSuggestions([]);
    setLocOpen(false);
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
      } catch { setLocation({ label: 'Current location', lat: pos.coords.latitude, lng: pos.coords.longitude }); }
      finally { setLocLoading(false); }
    }, () => setLocLoading(false));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCartItems({});
    setOpenProfile(false);
    navigate('/');
  };

  return (
    <nav className={`nb-wrap ${scrolled ? 'nb-scrolled' : ''}`}>
      <div className='nb-inner'>
        <Link to='/' className='nb-logo'>
          <span className='nb-brand-name'>Crave.</span>
        </Link>

        {/* Location picker */}
        <div className='nb-loc-wrap' ref={locRef}>
          <button className='nb-location' onClick={() => { setLocOpen(p => !p); setLocQuery(''); setLocSuggestions([]); }}>
            {locLoading ? (
              <span className='nb-loc-spinner' />
            ) : (
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
              {/* Search input */}
              <div className='nb-loc-search'>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  autoFocus
                  placeholder="Search for your area, city..."
                  value={locQuery}
                  onChange={handleLocInput}
                />
                {locLoading && <span className='nb-loc-spinner' style={{ flexShrink: 0 }} />}
              </div>

              {/* GPS detect */}
              <button className='nb-loc-gps' onClick={detectGPS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  <path d="M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                </svg>
                Use my current location
              </button>

              {/* Address suggestions from Nominatim */}
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

              {/* Nearby restaurants */}
              {nearbyRestaurants.length > 0 && (
                <div className='nb-loc-nearby'>
                  <div className='nb-loc-section-label'>🍽️ Nearby restaurants</div>
                  {nearbyRestaurants.map(r => (
                    <button key={r._id} className='nb-loc-restaurant' onClick={() => { setLocOpen(false); navigate(`/restaurants/${r._id}`); }}>
                      <div className='nb-loc-rest-avatar'>
                        {r.logo
                          ? <img src={`${url}/images/${r.logo}`} alt={r.name} onError={e => e.target.style.display='none'} />
                          : <span>{r.name[0]}</span>
                        }
                      </div>
                      <div className='nb-loc-rest-info'>
                        <span className='nb-loc-rest-name'>{r.name}</span>
                        <span className='nb-loc-rest-dist'>{r.distance < 1 ? `${Math.round(r.distance * 1000)}m` : `${r.distance.toFixed(1)} km`} away</span>
                      </div>
                      <span className={`nb-loc-rest-status ${r.isActive ? 'open' : 'closed'}`}>
                        {r.isActive ? 'Open' : 'Closed'}
                      </span>
                    </button>
                  ))}
                  <button className='nb-loc-view-all' onClick={() => { setLocOpen(false); navigate('/restaurants'); }}>
                    View all restaurants →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Restaurants link */}
        <Link to='/restaurants' className='nb-restaurants-link'>
          🍽️ Restaurants
        </Link>

        {/* Search */}
        <div className='nb-search-wrap' ref={searchRef}>
          <div className={`nb-search ${searchOpen ? 'nb-search-open' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type='text'
              placeholder='Search food, restaurants...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            {searchQuery && (
              <button className='nb-search-clear' onClick={() => { setSearchQuery(''); setSearchResults([]); }}>✕</button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className='nb-search-results'>
              {searchResults.map(item => (
                <div key={item._id} className='nb-search-item' onClick={() => {
                  setSearchQuery(''); setSearchResults([]); setSearchOpen(false);
                  document.getElementById('food-display')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  <img src={`${item.image}`} alt={item.name} onError={e => e.target.style.display = 'none'} />
                  <div>
                    <p className='nb-si-name'>{item.name}</p>
                    <p className='nb-si-cat'>{item.category}</p>
                  </div>
                  <span className='nb-si-price'>${item.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='nb-actions'>
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