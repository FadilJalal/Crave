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
      if (!item.isFlashDeal) return false;
      if (item.flashDealExpiresAt) {
        return new Date(item.flashDealExpiresAt).getTime() > now;
      }
      return true; // active deal with no expiry - still show it
    });
  }, [food_list, now]);

  if (!deals.length) return null;

  return (
    <section className="ld-container">
      <div className="ld-header">
        <div className="ld-title-group">
          <span className="ld-icon">⚡</span>
          <h2 className="ld-title">Lightning Deals</h2>
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
          const progressPercent = totalStock ? Math.min(100, (stockLeft / totalStock) * 100) : null;

          return (
            <div key={item._id} className="ld-card">
              {/* Image */}
              <div className="ld-img-wrap">
                <img src={`${url}/images/${item.image}`} alt={item.name} className="ld-img" />
                {discount > 0 && <div className="ld-badge">⚡ -{discount}%</div>}
              </div>

              {/* Info */}
              <div className="ld-info">
                <h3 className="ld-name">{item.name}</h3>

                <div className="ld-price-row">
                  <div className="ld-price-group">
                    <span className="ld-price-new">
                      {currency}{item.salePrice ? item.salePrice.toFixed(2) : item.price.toFixed(2)}
                    </span>
                    {item.salePrice && (
                      <span className="ld-price-old">{currency}{item.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* Timer — inside card, below prices */}
                {timeLeft && (
                  <div className={`ld-timer-row${timeLeft.expired ? ' ld-timer-expired' : ''}`}>
                    <span className="ld-timer-icon">⏱</span>
                    <span className="ld-timer-val">
                      {timeLeft.expired
                        ? 'Expired'
                        : `${format(timeLeft.h)}:${format(timeLeft.m)}:${format(timeLeft.s)}`}
                    </span>
                  </div>
                )}

                {/* Stock progress */}
                {stockLeft !== null && (
                  <div className="ld-footer">
                    <div className="ld-progress-bar">
                      <div className="ld-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="ld-stock-row">
                      <span>🔥</span>
                      <p className="ld-stock">Only {stockLeft} left!</p>
                    </div>
                  </div>
                )}

                <button className="ld-add-btn-full" onClick={() => addToCart(item._id)}>
                  ADD TO CART
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FlashDeals;
