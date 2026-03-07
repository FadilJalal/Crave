// frontend/src/pages/RestaurantMenu/RestaurantMenu.jsx
import React, { useContext, useEffect, useState } from 'react';
import './RestaurantMenu.css';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';
import FoodItem from '../../components/FoodItem/FoodItem';

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
        }
      } finally { setLoading(false); }
    };
    fetchRestaurant();
  }, [id]);

  const menuItems = food_list.filter(item => {
    const resId = item.restaurantId?._id || item.restaurantId;
    return String(resId) === String(id);
  });

  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const filtered = category === 'All' ? menuItems : menuItems.filter(i => i.category === category);

  if (loading) return (
    <div className='rm-page'>
      <div className='rm-hero-skeleton skeleton' />
      <div className='rm-grid'>
        {[1, 2, 3, 4].map(i => <div key={i} className='rm-item-skeleton skeleton' />)}
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

  return (
    <div className='rm-page'>
      {/* Hero */}
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
              <span className={`rm-status ${restaurant.isActive ? 'rm-open' : 'rm-closed'}`}>
                {restaurant.isActive ? '● Open Now' : '● Closed'}
              </span>
              <span>🕐 {restaurant.avgPrepTime} min prep</span>
              <span>⭐ 4.5 rating</span>
              <span>🍽️ {menuItems.length} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category pills */}
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

      {/* Menu */}
      <div className='rm-menu-header'>
        <h2 className='rm-menu-title'>Menu</h2>
        <span className='rm-menu-count'>{filtered.length} items</span>
      </div>

      {filtered.length === 0 ? (
        <div className='rm-empty'>
          <p>🍽️ No menu items yet for this restaurant.</p>
        </div>
      ) : (
        <div className='rm-grid'>
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
      )}
    </div>
  );
};

export default RestaurantMenu;