import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import './RestaurantMenu.css';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';
import FoodItem from '../../components/FoodItem/FoodItem';
import { isRestaurantOpen, nextOpeningTime } from '../../utils/restaurantHours';
import RestaurantReviews from '../../components/RestaurantReviews/RestaurantReviews';
import SurgeIndicator from '../../components/SurgeIndicator/SurgeIndicator';
import SentimentSummary from '../../components/SentimentSummary/SentimentSummary';
import ReviewSummary from '../../components/ReviewSummary/ReviewSummary';

const RestaurantMenu = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { url, food_list, fetchFoodList, cartItems, currency } = useContext(StoreContext);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [restaurantAvgRating, setRestaurantAvgRating] = useState(null);
  const [restaurantReviewCount, setRestaurantReviewCount] = useState(0);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const navigate = useNavigate();

  // ✅ Force refresh when admin toggles food (detects ?refresh= param from Menu.jsx hack)
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam) {
      fetchFoodList();
      
      // Also refetch restaurant data
      const fetchRestaurant = async () => {
        try {
          const [restRes, reviewRes] = await Promise.all([
            axios.get(`${url}/api/restaurant/list`),
            axios.get(`${url}/api/review/restaurant/${id}`),
          ]);
          if (restRes.data.success) {
            const found = restRes.data.data.find((r) => String(r._id) === String(id));
            setRestaurant(found || null);
          }
          if (reviewRes.data.success) {
            setRestaurantAvgRating(reviewRes.data.avgRating || 0);
            setRestaurantReviewCount(reviewRes.data.total || 0);
          }
        } catch (err) {
          console.error('Restaurant refetch failed:', err);
        }
      };
      fetchRestaurant();
      
      // Clean URL param without reload
      const urlObj = new URL(window.location);
      urlObj.searchParams.delete('refresh');
      window.history.replaceState({}, '', urlObj.toString());
    }
  }, [searchParams, fetchFoodList, url, id]);

  // Refresh food list when page loads and periodically to catch updates
  useEffect(() => {
    fetchFoodList();
    // Poll for updates every 5 seconds while viewing menu
    const interval = setInterval(() => {
      fetchFoodList();
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const [restRes, reviewRes] = await Promise.all([
          axios.get(`${url}/api/restaurant/list`),
          axios.get(`${url}/api/review/restaurant/${id}`),
        ]);
        if (restRes.data.success) {
          const found = restRes.data.data.find((r) => String(r._id) === String(id));
          setRestaurant(found || null);
        } else {
          toast.error(restRes.data.message || 'Failed to load restaurant');
        }
        if (reviewRes.data.success) {
          setRestaurantAvgRating(reviewRes.data.avgRating || 0);
          setRestaurantReviewCount(reviewRes.data.total || 0);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not connect to server.');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id, url]);

  useEffect(() => {
    if (!id) return;
    axios.get(`${url}/api/review/restaurant/${id}`)
      .then((res) => {
        if (res.data.success) {
          setRestaurantAvgRating(res.data.avgRating || 0);
          setRestaurantReviewCount(res.data.total || 0);
        }
      })
      .catch(() => {});
  }, [id, url, reviewsRefreshKey]);

  useEffect(() => {
    const onReviewUpdated = () => setReviewsRefreshKey((prev) => prev + 1);
    window.addEventListener('review:updated', onReviewUpdated);

    const interval = setInterval(() => {
      setReviewsRefreshKey((prev) => prev + 1);
    }, 15000);

    return () => {
      window.removeEventListener('review:updated', onReviewUpdated);
      clearInterval(interval);
    };
  }, []);

  const menuItems = food_list.filter(item => {
    const resId = item.restaurantId?._id || item.restaurantId;
    return String(resId) === String(id);
  });

  const restaurantCartSummary = useMemo(() => {
    let count = 0;
    let total = 0;

    Object.values(cartItems || {}).forEach((entry) => {
      const food = food_list.find((f) => String(f._id) === String(entry.itemId));
      const foodRestaurantId = food?.restaurantId?._id || food?.restaurantId;
      if (food && String(foodRestaurantId) === String(id) && entry.quantity > 0) {
        count += entry.quantity;
        total += (food.price + (entry.extraPrice || 0)) * entry.quantity;
      }
    });

    return { count, total: Math.round(total * 100) / 100 };
  }, [cartItems, food_list, id]);




  // Use i18n for categories if translation keys exist
  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const getCategoryLabel = (cat) => {
    if (cat === 'All') return t('all_categories') || 'All';
    // Try translation key: category_<cat>
    const key = `category_${cat.replace(/\s+/g, '_').toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : cat;
  };
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
        <p>🍽️ {t('restaurant_not_found')}</p>
        <button onClick={() => navigate('/restaurants')}>← {t('back_to_restaurants')}</button>
      </div>
    </div>
  );

  const restaurantActive = restaurant.isActive !== false;
  const openStatus = isRestaurantOpen(restaurant);

  // Restaurant deactivated by admin — show clear message, no menu items
  if (!restaurantActive) return (
    <div className='rm-page'>
      <div className='rm-hero'>
        <button className='rm-back' onClick={() => navigate('/restaurants')}>← {t('back')}</button>
      </div>
      <div style={{
        background: 'linear-gradient(135deg, #1f2937, #111827)',
        borderRadius: 20, padding: '48px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 56 }}>🚫</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{t('menu_not_available')}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 340, lineHeight: 1.7 }}>
          {t('menu_unavailable_desc')}
        </div>
        <button onClick={() => navigate('/restaurants')} style={{
          marginTop: 12, padding: '12px 28px',
          background: '#ff4e2a', color: '#fff', border: 'none',
          borderRadius: 50, fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>← {t('browse_other_restaurants')}</button>
      </div>
    </div>
  );

  return (
    <div className='rm-page'>
      <div className='rm-hero'>
        <button className='rm-back' onClick={() => navigate('/restaurants')}>
          ← {t('back')}
        </button>
        <div className='rm-hero-content'>
          <div className='rm-logo-wrap'>
            {restaurant.logo
              ? <img src={restaurant.logo?.startsWith('http') ? restaurant.logo : `${url}/images/${restaurant.logo}`} alt={restaurant.name} className='rm-logo' onError={e => e.target.style.display = 'none'} />
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
                {openStatus ? t('open_now') : t('closed')}
              </span>
              <span>🕐 {restaurant.avgPrepTime || 30} {t('min_prep')}</span>
              {restaurantAvgRating > 0
                ? <span>⭐ {restaurantAvgRating.toFixed(1)} ({restaurantReviewCount} {t('review')})</span>
                : <span>⭐ {t('no_reviews_yet')}</span>
              }
              <span>🍽️ {menuItems.length} {t('items')}</span>
            </div>
          </div>
        </div>
      </div>

      {categories.length > 1 && (
        <div className='rm-cats'>
          {categories.map(cat => (
            <button
              key={cat}
              className={`rm-cat-pill ${category === cat ? 'rm-cat-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      <SurgeIndicator restaurantId={id} />

      <div className='rm-menu-header'>
        <h2 className='rm-menu-title'>{t('menu')}</h2>
        <span className='rm-menu-count'>{filtered.length} {t('items')}</span>
      </div>

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
              {restaurant.isActive ? t('closed_now') : t('restaurant_unavailable')}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              {restaurant.isActive
                ? t('outside_opening_hours')
                : t('restaurant_temp_unavailable')}
            </div>
            {restaurant.isActive && (() => {
              const next = nextOpeningTime(restaurant);
              if (!next) return null;
              return (
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 14px'
                }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    🕐 <strong style={{ color: 'white' }}>{next}</strong>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className='rm-empty'>
          <p>🍽️ {t('no_menu_items_found')}</p>
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
            {filtered.map(item => {
                // Use i18n keys for food name/desc if present
                const foodNameKey = `food_${item._id}`;
                const foodDescKey = `desc_${item._id}`;
                const name = t(foodNameKey) !== foodNameKey ? t(foodNameKey) : item.name;
                const description = t(foodDescKey) !== foodDescKey ? t(foodDescKey) : item.description;

                // ⚡ FLASH DEAL LOGIC
                // Resolve flash deal state based on expiration
                const now = Date.now();
                const expiry = item.flashDealExpiresAt ? new Date(item.flashDealExpiresAt) : null;
                
                const isManualFlash = item.isFlashDeal === true || item.isFlashDeal === "true" || item.isFlashDeal === 1;
                const isCategoricalFlash = item.category && /flash/i.test(item.category);
                const hasDiscount = item.salePrice && item.salePrice < item.price;
                const isCandidate = isManualFlash || isCategoricalFlash || hasDiscount;

                // Add 1 hour buffer like in StoreContext/FlashDeals components
                const isExpired = expiry && (expiry.getTime() + 3600000) <= now;
                const isOngoingDeal = isCandidate && !isExpired;
                
                let dealTag = null;
                let currentPrice = item.price;

                if (isOngoingDeal) {
                    currentPrice = item.salePrice || item.price;
                    const discount = Math.round(((item.price - currentPrice) / item.price) * 100);
                    dealTag = {
                        label: `⚡ ${discount}% OFF`,
                        bg: 'linear-gradient(135deg, #ff3008, #ff6b35)',
                        color: 'white',
                        border: 'none'
                    };
                }

                return (
                  <FoodItem
                    key={item._id}
                    id={item._id}
                    name={name}
                    description={description}
                    price={currentPrice}
                    regularPrice={item.price}
                    image={item.image}
                    restaurantId={item.restaurantId}
                    customizations={item.customizations || []}
                    avgRating={item.avgRating || 0}
                    ratingCount={item.ratingCount || 0}
                    inStock={item.inStock !== false}
                    restaurantOpen={openStatus}
                    restaurantActive={restaurantActive}
                    dealTag={dealTag}
                    isFlashDeal={isOngoingDeal}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* AI Sentiment Summary */}
      <SentimentSummary restaurantId={id} />

      {/* Reviews Section - Two Column Layout */}
      <div className='rm-reviews-container'>
        <div className='rm-reviews-left'>
          <RestaurantReviews restaurantId={id} restaurantName={restaurant?.name} refreshKey={reviewsRefreshKey} />
        </div>
        <div className='rm-reviews-right'>
          <ReviewSummary restaurantId={id} refreshKey={reviewsRefreshKey} />
        </div>
      </div>

      {restaurantCartSummary.count > 0 && (
        <div className='rm-mini-cart'>
          <div className='rm-mini-cart-info'>
            <p className='rm-mini-cart-count'>
              {t('items_in_cart', { count: restaurantCartSummary.count })}
            </p>
            <p className='rm-mini-cart-total'>{t('subtotal')}: {currency}{restaurantCartSummary.total.toFixed(2)}</p>
          </div>
          <button
            className='rm-mini-cart-btn'
            onClick={() => navigate('/cart')}
          >
            {t('view_cart')}
          </button>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;