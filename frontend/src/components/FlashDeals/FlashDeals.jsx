import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import './FlashDeals.css';

const FlashDeals = () => {
  const { t } = useTranslation();
  const { food_list, currency, url, addToCart } = useContext(StoreContext);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (n) => n.toString().padStart(2, '0');

  const calculateTimeLeft = (expiresAt) => {
    if (!expiresAt) return null; // no timer set
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    return {
      h: Math.floor(diff / (1000 * 60 * 60)),
      m: Math.floor((diff / 1000 / 60) % 60),
      s: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  };

  // Only show active, non-expired deals
  const deals = useMemo(() => {
    return (food_list || []).filter(item => {
      const isActive = item.isFlashDeal === true || item.isFlashDeal === "true";
      if (!isActive) return false;
      
      // If there is an expiry, only hide if it's REALLY old (e.g. over 1 hour ago)
      // This prevents timezone flickers from hiding your work.
      if (item.flashDealExpiresAt) {
        const gracePeriod = 60 * 60 * 1000; // 1 hour
        return new Date(item.flashDealExpiresAt).getTime() + gracePeriod > now;
      }
      return true; 
    });
  }, [food_list, now]);

  if (!deals.length) return null;

  return (
    <section className="ld-section" id="flash-deals">
      <div className="ld-container">
        <div className="ld-header">
          <div className="ld-title-wrap">

            <h2 className="ld-title">
              Flash Deals <span style={{ color: '#FF3008' }}>near you</span>
            </h2>
          </div>
        </div>

        <div className="ld-grid">
          {deals.map((item) => {
            const discount = item.salePrice
              ? Math.round((1 - item.salePrice / item.price) * 100)
              : 0;
            const timeLeft = calculateTimeLeft(item.flashDealExpiresAt);
            const totalStock = item.flashDealTotalStock || 0;
            const claimed = item.flashDealClaimed || 0;
            const stockLeft = totalStock ? Math.max(0, totalStock - claimed) : null;

            // Get distance from restaurant if available
            const savedLoc = JSON.parse(localStorage.getItem('crave_location') || '{}');
            const restLoc = item.restaurantId?.location;
            let dist = null;
            if (savedLoc.lat && restLoc?.lat) {
              const R = 6371;
              const dLat = (savedLoc.lat - restLoc.lat) * Math.PI / 180;
              const dLng = (savedLoc.lng - restLoc.lng) * Math.PI / 180;
              const a = Math.sin(dLat/2)**2 + Math.cos(restLoc.lat * Math.PI/180) * Math.cos(savedLoc.lat * Math.PI/180) * Math.sin(dLng/2)**2;
              dist = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
            }

            return (
              <div key={item._id} className="ld-card">
                {/* Image Area with Badges */}
                <div className="ld-img-wrap">
                  <img src={`${url}/images/${item.image}`} alt={item.name} className="ld-img" />
                  <div className="ld-badge-left">FLASH DEAL</div>
                  {dist && <div className="ld-badge-right">{dist} km</div>}
                  {discount > 0 && <div className="ld-badge-score">-{discount}%</div>}
                </div>

                {/* Info Container */}
                <div className="ld-info">
                  <div className="ld-main-meta">
                    <h3 className="ld-name">{item.name}</h3>
                    <p className="ld-rest-sub">{item.restaurantId?.name || "Premium Restaurant"}</p>
                  </div>

                  <div className="ld-price-row">
                    <span className="ld-price-new">
                      {currency}{item.salePrice ? item.salePrice.toFixed(2) : item.price.toFixed(2)}
                    </span>
                    {item.salePrice && <span className="ld-price-old">{currency}{item.price.toFixed(2)}</span>}
                  </div>

                  {/* Dual Column Meta Footer */}
                  <div className="ld-meta-footer">
                    <div className="ld-meta-col">
                      <div className="ld-meta-icon-wrap">⏱</div>
                      <div className="ld-meta-text">
                        <span className="ld-meta-label">Time Left</span>
                        <span className="ld-meta-val">
                          {timeLeft ? (timeLeft.expired ? 'Expired' : `${format(timeLeft.h)}:${format(timeLeft.m)}`) : '24h+'}
                        </span>
                      </div>
                    </div>
                    <div className="ld-meta-col">
                      <div className="ld-meta-icon-wrap" style={{ background: '#fff3f0' }}>🔥</div>
                      <div className="ld-meta-text">
                        <span className="ld-meta-label">Stock</span>
                        <span className="ld-meta-val">{stockLeft !== null ? `${stockLeft} Left` : 'In Stock'}</span>
                      </div>
                    </div>
                  </div>

                  <button className="ld-add-btn-v2" onClick={() => addToCart(item._id)}>
                    ADD TO CART
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlashDeals;
