import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import './FlashDeals.css';

const FlashDeals = () => {
  const { t } = useTranslation();
  const { food_list, foodListLoading, currency, url, addToCart } = useContext(StoreContext);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (n) => n.toString().padStart(2, '0');

  const calculateTimeLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    return {
      h: Math.floor(diff / (1000 * 60 * 60)),
      m: Math.floor((diff / 1000 / 60) % 60),
      s: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  };

  const deals = useMemo(() => {
    console.group("⚡ [FLASH DEBUG]");
    console.log("1. Raw food_list length:", food_list?.length || 0);

    if (!food_list || food_list.length === 0) {
      console.log("❌ No food list data available yet.");
      console.groupEnd();
      return [];
    }

    const filtered = food_list.filter(item => {
      // Identity Check
      const isManualFlash = item.isFlashDeal === true || item.isFlashDeal === "true" || item.isFlashDeal === 1;
      const hasDiscount = item.salePrice && item.salePrice < item.price;
      
      const isCandidate = isManualFlash || hasDiscount;
      
      // Expiry Check
      let isExpired = false;
      if (item.flashDealExpiresAt && new Date(item.flashDealExpiresAt).getTime() <= now) {
        isExpired = true;
      }
      
      const FINAL_DECISION = isCandidate && !isExpired;

      if (isCandidate) {
        console.log(`🔍 Potential Deal Found: "${item.name}" | isFlashDeal: ${item.isFlashDeal} | salePrice: ${item.salePrice} | Expired: ${isExpired}`);
      }

      return FINAL_DECISION;
    });

    console.log("2. Final Deals count after filtering:", filtered.length);
    console.groupEnd();
    return filtered;
  }, [food_list, now]);

  // Shimmer effect while loading or waiting for data sync
  if (foodListLoading) {
    return (
      <section className="ld-section">
        <div className="ld-container">
          <div className="ld-header">
            <h2 className="ld-title">Flash Deals <span style={{ color: '#FF3008' }}>near you</span></h2>
          </div>
          <div className="ld-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ld-card-skeleton" style={{ height: '320px', background: '#f0f0f0', borderRadius: '24px', animation: 'shimmer 1.5s infinite' }}></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If sync finished and NO deals found, hide gracefully
  // If sync finished and NO deals found, show debug info instead of null
  if (!deals.length && !foodListLoading) {
    return (
      <section className="ld-section" style={{ border: '10px solid red', padding: '50px', textAlign: 'center', margin: '50px 0' }}>
        <h1 style={{ color: 'red' }}>⚡ FLASH DEAL DEBUG: 0 DEALS FOUND</h1>
        <p>Raw items on server: {food_list?.length}</p>
        <p>Check console (F12) for [FLASH DEBUG] logs</p>
      </section>
    );
  }

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
            const discount = item.salePrice ? Math.round((1 - item.salePrice / item.price) * 100) : 0;
            const timeLeft = calculateTimeLeft(item.flashDealExpiresAt);
            const stockLeft = item.flashDealTotalStock ? Math.max(0, item.flashDealTotalStock - (item.flashDealClaimed || 0)) : null;

            let dist = null;
            try {
              const savedLoc = JSON.parse(localStorage.getItem('crave_location') || '{}');
              const restLoc = item.restaurantId?.location;
              if (savedLoc?.lat && restLoc?.lat) {
                const R = 6371;
                const dLat = (savedLoc.lat - restLoc.lat) * Math.PI / 180;
                const dLng = (savedLoc.lng - restLoc.lng) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(restLoc.lat * Math.PI/180) * Math.cos(savedLoc.lat * Math.PI/180) * Math.sin(dLng/2)**2;
                dist = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
              }
            } catch (e) {
              console.warn("Location check failed", e);
            }

            return (
              <div key={item._id} className="ld-card">
                <div className="ld-img-wrap">
                  <img src={`${url}/images/${item.image}`} alt={item.name} className="ld-img" />
                  <div className="ld-badge-left">FLASH DEAL</div>
                  {dist && <div className="ld-badge-right">{dist} km</div>}
                  {discount > 0 && <div className="ld-badge-score">-{discount}%</div>}
                </div>
                <div className="ld-info">
                  <div className="ld-main-meta">
                    <h3 className="ld-name">{item.name}</h3>
                    <p className="ld-rest-sub">{item.restaurantId?.name || "Premium Restaurant"}</p>
                  </div>
                  <div className="ld-price-row">
                    <span className="ld-price-new">{currency}{item.salePrice ? item.salePrice.toFixed(2) : item.price.toFixed(2)}</span>
                    {item.salePrice && <span className="ld-price-old">{currency}{item.price.toFixed(2)}</span>}
                  </div>
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
                  <button className="ld-add-btn-v2" onClick={() => addToCart(item._id)}>ADD TO CART</button>
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
