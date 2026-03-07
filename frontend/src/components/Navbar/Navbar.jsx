import React, { useContext, useEffect, useRef, useState } from 'react';
import './Navbar.css';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';

const Navbar = ({ setShowLogin }) => {
  const { getTotalCartAmount, token, setToken, setCartItems, food_list, cartItems } = useContext(StoreContext);
  const navigate = useNavigate();
  const [openProfile, setOpenProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [location, setLocation] = useState('Dubai, UAE');
  const [locLoading, setLocLoading] = useState(false);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const cartCount = Object.values(cartItems || {}).reduce((a, b) => a + (b?.quantity || 0), 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
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

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCartItems({});        // ✅ clear cart from state
    setOpenProfile(false);
    navigate('/');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            'Unknown';
          const country = data.address?.country || '';
          setLocation(`${city}, ${country}`);
        } catch {
          setLocation('Location detected');
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        alert('Unable to get your location. Please allow location access.');
        setLocLoading(false);
      }
    );
  };

  return (
    <nav className={`nb-wrap ${scrolled ? 'nb-scrolled' : ''}`}>
      <div className='nb-inner'>
        <Link to='/' className='nb-logo'>
          <span className='nb-brand-name'>Crave.</span>
        </Link>

        {/* ✅ Live location pill */}
        <button className='nb-location' onClick={detectLocation} title='Click to detect your location'>
          {locLoading ? (
            <span className='nb-loc-spinner' />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
          )}
          <span className='nb-loc-text'>{location}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

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