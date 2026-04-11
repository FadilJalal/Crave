import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { assets } from '../../assets/assets';
import './Header.css';

const Header = () => {
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const raf = useRef(null);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;

    mouse.current = {
      x: (clientX / window.innerWidth) * 2 - 1,
      y: (clientY / window.innerHeight) * 2 - 1,
    };

    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        applyParallax();
        raf.current = null;
      });
    }
  };

  const applyParallax = () => {
    const elements = heroRef.current.querySelectorAll('[data-speed]');
    elements.forEach((el) => {
      const speed = el.getAttribute('data-speed');
      const x = mouse.current.x * speed;
      const y = mouse.current.y * speed;

      el.style.transform = `translate(${x}px, ${y}px)`;
    });
  };

  return (
    <section
      className="cinematic-hero"
      ref={heroRef}
      onMouseMove={handleMouseMove}
    >
      {/* Background Glow */}
      <div className="ch-glow ch-glow-1" data-speed="-20" />
      <div className="ch-glow ch-glow-2" data-speed="30" />

      {/* Background Image */}
      <div className="ch-bg" data-speed="15">
        <img src={assets.hero_burger_bg} alt="" />
      </div>

      {/* Floating Food */}
      <img src={assets.pizza_hero} className="ch-float pizza" data-speed="40" />
      <img src={assets.fries_hero} className="ch-float fries" data-speed="-50" />

      {/* Content */}
      <div className="ch-content">
        <h1 className="ch-title">
          CRAVE <br />
          <span>GALAXY VIBES</span>
        </h1>

        <p className="ch-subtitle">
          {t('hero_desc')}
        </p>

        <div className="ch-cta">
          <a href="#explore-menu" className="btn-primary">
            ORDER NOW →
          </a>
          <a href="#food-display" className="btn-secondary">
            SEE TRENDING
          </a>
        </div>
      </div>
    </section>
  );
};

export default Header;