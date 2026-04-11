import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import './FlashDeals.css';

const FlashDeals = () => {
  const { t } = useTranslation();
  const { food_list, currency } = useContext(StoreContext);
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 59, s: 59 });

  // Select 4 high-fidelity deals (mocking for unique professional look)
  const deals = food_list.slice(0, 4);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        if (s > 0) s--;
        else if (m > 0) { m--; s = 59; }
        else if (h > 0) { h--; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (n) => n.toString().padStart(2, '0');

  if (!deals.length) return null;

  return (
    <section className="fd-container">
      <div className="fd-header">
        <div className="fd-title-group">
          <span className="fd-icon">⚡</span>
          <h2 className="fd-title">Flash Deals</h2>
        </div>
        <div className="fd-timer">
          <span className="fd-timer-label">Ends in:</span>
          <div className="fd-timer-chips">
            <span className="fd-chip">{format(timeLeft.h)}</span>
            <span className="fd-sep">:</span>
            <span className="fd-chip">{format(timeLeft.m)}</span>
            <span className="fd-sep">:</span>
            <span className="fd-chip">{format(timeLeft.s)}</span>
          </div>
        </div>
      </div>

      <div className="fd-grid">
        {deals.map((item, index) => (
          <div key={item._id} className="fd-card">
            <div className="fd-img-wrap">
              <img src={item.image} alt={item.name} className="fd-img" />
              <div className="fd-badge">-{((index + 1) * 10)}%</div>
            </div>
            <div className="fd-info">
              <h3 className="fd-name">{item.name}</h3>
              <div className="fd-price-row">
                <span className="fd-price-new">{currency}{(item.price * 0.8).toFixed(2)}</span>
                <span className="fd-price-old">{currency}{item.price.toFixed(2)}</span>
              </div>
              <div className="fd-progress-bar">
                <div className="fd-progress-fill" style={{ width: `${85 - (index * 15)}%` }}></div>
              </div>
              <p className="fd-stock">{t('items_left', { count: 5 - index })}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FlashDeals;
