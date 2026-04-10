import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { assets } from '../../assets/assets';
import './Header.css';

const Header = () => {
  const { t } = useTranslation();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    // Normalize coordinates from -1 to 1 for parallax calculation
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = (clientY / window.innerHeight) * 2 - 1;
    setMouse({ x, y });
  };

  return (
    <section className="cinematic-hero" onMouseMove={handleMouseMove}>
      {/* Background & Lighting Engine */}
      <div className="ch-glow-1" style={{ transform: `translate(${mouse.x * -40}px, ${mouse.y * -40}px)` }}></div>
      <div className="ch-glow-2" style={{ transform: `translate(${mouse.x * 50}px, ${mouse.y * 50}px)` }}></div>
      <div className="ch-grid"></div>
      <div className="ch-noise"></div>

      <div className="ch-content">
        {/* Massive Background Burger Image */}
        <div className="ch-mega-img-wrap" style={{ transform: `translate(-50%, -50%) translate(${mouse.x * 20}px, ${mouse.y * 15}px)` }}>
          <img src={assets.hero_burger_bg} alt="Delicious burger background" className="ch-mega-bg-img" />
        </div>

        {/* Foreground Content */}
        <div className="ch-foreground">
          <div className="ch-text-container">
            <h1 className="ch-title">
              <span className="ch-line-up">{t('hero_line_1')}</span>
              <br />
              <span className="ch-line-up delay-1">
                {t('hero_line_2')} <span className="ch-accent">{t('hero_highlight')}</span>?
              </span>
            </h1>
            <p className="ch-subtitle delay-2">
              {t("hero_desc")}
            </p>
            <div className="ch-cta-group delay-3">
              <a href="#explore-menu" className="ch-btn-primary">
                {t('order_now')} <span className="ch-arrow">→</span>
              </a>
              <a href="#food-display" className="ch-btn-ghost">
                {t('see_trending')}
              </a>
            </div>
          </div>


        </div>
      </div>
      
      {/* Interactive 3D Glass Objects Layer */}
      <div className="ch-float-layer">
        <div className="ch-glass-card ch-float-1" style={{ transform: `translate(${mouse.x * 70}px, ${mouse.y * 50}px) rotate(${mouse.x * 12}deg)` }}>
          <div className="ch-g-emoji">🍔</div>
          <div className="ch-g-text">Epic Burgers</div>
        </div>
        <div className="ch-glass-card ch-float-2" style={{ transform: `translate(${mouse.x * -60}px, ${mouse.y * -80}px) rotate(${mouse.y * -15}deg)` }}>
          <div className="ch-g-emoji">🔥</div>
          <div className="ch-g-text">Hot Deals</div>
        </div>
        <div className="ch-glass-card ch-float-3" style={{ transform: `translate(${mouse.x * 50}px, ${mouse.y * -40}px) rotate(${mouse.x * -8}deg)` }}>
          <div className="ch-g-emoji">🥗</div>
          <div className="ch-g-text">Fresh & Healthy</div>
        </div>
        <div className="ch-glass-card ch-float-4" style={{ transform: `translate(${mouse.x * -40}px, ${mouse.y * 60}px) rotate(${mouse.y * 10}deg)` }}>
          <div className="ch-g-emoji">🍱</div>
          <div className="ch-g-text">Sushi Rolls</div>
        </div>
      </div>

    </section>
  );
};

export default Header;