import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './RestaurantMenu.css';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';
import FoodItem from '../../components/FoodItem/FoodItem';

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function isOpenNow(restaurant) {
  if (!restaurant?.isActive) return false;
  const hours = restaurant.openingHours;
  if (!hours) return true; 

  const now = new Date();
  // Adjust getDay() so Monday is 0 and Sunday is 6
  const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const day = DAYS[dayIndex];
  const h = hours[day];

  if (!h || h.closed) return false;

  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

const RestaurantMenu = () => {
  const { id } = useParams();
  const { url, food_list } = useContext(StoreContext);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await axios.get(`${url}/api/restaurant/list`);
        if (res.data.success) {
          const found = res.data.data.find(r => r._id === id);
          setRestaurant(found || null);
        } else {
          toast.error(res.data.message || 'Failed to load restaurant');
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not connect to server.');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id, url]);

  const menuItems = food_list.filter(item => {
    const resId = item.restaurantId?._id || item.restaurantId;
    return String(resId) === String(id);
  });

  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const filtered = category === 'All' ? menuItems : menuItems.filter(i => i.category === category);

  if (loading) return (
    <div className='rm-page'>
      <div className='rm-hero-skeleton skeleton' style={{ height: '200px', borderRadius: '20px', marginBottom: '20px' }} />
      <div className='rm-grid'>
        {[1, 2, 3, 4].map(i => <div key={i} className='rm-item-skeleton skeleton' style={{ height: '300px', borderRadius: '15px' }} />)}
      </div>
    </div>
  );

  if (!restaurant) return (
    <div className='rm-page'>
      <div className='rm-not-found'>
        <p>🍽️ Restaurant not found.</p>
        <button onClick={() => navigate('/restaurants')}>← Back to Restaurants</button>
      </div>
    </div>
  );

  const openStatus = isOpenNow(restaurant);

  return (
    <div className='rm-page'>
      {/* Hero Section */}
      <div className='rm-hero'>
        <button className='rm-back' onClick={() => navigate('/restaurants')}>
          ← Back
        </button>
        <div className='rm-hero-content'>
          <div className='rm-logo-wrap'>
            {restaurant.logo
              ? <img src={`${url}/images/${restaurant.logo}`} alt={restaurant.name} className='rm-logo' onError={e => e.target.style.display = 'none'} />
              : <div className='rm-logo-initial'>{restaurant.name[0]}</div>
            }
          </div>
          <div className='rm-info'>
            <h1 className='rm-name'>{restaurant.name}</h1>
            <p className='rm-address'>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              {restaurant.address}
            </p>
            <div className='rm-meta'>
              <span className={`rm-status ${openStatus ? 'rm-open' : 'rm-closed'}`}>
                {openStatus ? '● Open Now' : '● Closed'}
              </span>
              <span>🕐 {restaurant.avgPrepTime || 30} min prep</span>
              <span>⭐ 4.5 rating</span>
              <span>🍽️ {menuItems.length} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      {categories.length > 1 && (
        <div className='rm-cats'>
          {categories.map(cat => (
            <button
              key={cat}
              className={`rm-cat-pill ${category === cat ? 'rm-cat-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className='rm-menu-header'>
        <h2 className='rm-menu-title'>Menu</h2>
        <span className='rm-menu-count'>{filtered.length} items</span>
      </div>

      {/* Closed / Unavailable Banner */}
      {!openStatus && (
        <div style={{
          position: 'relative', marginBottom: 24,
          background: 'linear-gradient(135deg, #1f2937, #111827)',
          borderRadius: 20, padding: '32px 28px',
          display: 'flex', alignItems: 'center', gap: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          <div style={{ fontSize: 52, flexShrink: 0 }}>🔒</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 6 }}>
              {restaurant.isActive ? "We're Closed Right Now" : "Restaurant Unavailable"}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              {restaurant.isActive
                ? 'This restaurant is currently outside its opening hours. Check back later to place an order.'
                : 'This restaurant is temporarily unavailable and not accepting orders.'}
            </div>
            {restaurant.isActive && restaurant.openingHours && (() => {
              const tomorrowIndex = new Date().getDay(); // getDay() is already "tomorrow" if we consider 0=Sun
              const tomorrowName = DAYS[tomorrowIndex === 0 ? 6 : tomorrowIndex - 1]; 
              const th = restaurant.openingHours[tomorrowName];
              
              if (th && !th.closed) return (
                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 14px' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    🕐 Opens next at <strong style={{ color: 'white' }}>{th.open}</strong>
                  </span>
                </div>
              );
              return null;
            })()}
          </div>
        </div>
      )}

      {/* Menu Grid */}
      {filtered.length === 0 ? (
        <div className='rm-empty'>
          <p>🍽️ No menu items found for this category.</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className='rm-grid' style={{
            filter: openStatus ? 'none' : 'blur(3px)',
            opacity: openStatus ? 1 : 0.45,
            pointerEvents: openStatus ? 'auto' : 'none',
            userSelect: openStatus ? 'auto' : 'none',
            transition: 'filter 0.3s, opacity 0.3s',
          }}>
            {filtered.map(item => (
              <FoodItem
                key={item._id}
                id={item._id}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image}
                restaurantId={item.restaurantId}
                customizations={item.customizations || []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;