import React from 'react';
import './Header.css';

const Header = () => (
  <div className='hero'>
    <div className='hero-bg'>
      <div className='hero-blob hero-blob-1'/>
      <div className='hero-blob hero-blob-2'/>
      <div className='hero-blob hero-blob-3'/>
    </div>

    {/* ── Left: Content ── */}
    <div className='hero-content'>
      <div className='hero-badge'>
        <span className='hero-badge-dot'/>
        Free delivery on your first order
      </div>

      <h1 className='hero-title'>
        Hungry?<br/>
        <span className='hero-title-accent'>We've got you</span><br/>
        covered.
      </h1>

      <p className='hero-sub'>
        Order from top restaurants near you — fast, fresh, and delivered to your door.
      </p>

      <div className='hero-actions'>
        <a href='#explore-menu' className='hero-btn-primary'>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Browse Menu
        </a>
        <a href='#food-display' className='hero-btn-secondary'>
          Top Picks Today
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </div>

      <div className='hero-stats'>
        <div className='hero-stat'>
          <span className='hero-stat-num'>500+</span>
          <span className='hero-stat-lbl'>Restaurants</span>
        </div>
        <div className='hero-stat-div'/>
        <div className='hero-stat'>
          <span className='hero-stat-num'>30 min</span>
          <span className='hero-stat-lbl'>Avg. Delivery</span>
        </div>
        <div className='hero-stat-div'/>
        <div className='hero-stat'>
          <span className='hero-stat-num'>4.8★</span>
          <span className='hero-stat-lbl'>Rating</span>
        </div>
      </div>
    </div>

    {/* ── Right: Floating food cards ── */}
    <div className='hero-visual'>
      <div className='hero-card hero-card-1'>
        <div className='hc-icon'>🍕</div>
        <div><p className='hc-name'>Margherita Pizza</p><p className='hc-info'>25 min · $12.99</p></div>
      </div>
      <div className='hero-card hero-card-2'>
        <div className='hc-icon'>🍜</div>
        <div><p className='hc-name'>Ramen Bowl</p><p className='hc-info'>20 min · $14.50</p></div>
      </div>
      <div className='hero-card hero-card-3'>
        <div className='hc-icon'>🥗</div>
        <div><p className='hc-name'>Greek Salad</p><p className='hc-info'>15 min · $9.99</p></div>
      </div>
      <div className='hero-float hero-float-1'>🌮</div>
      <div className='hero-float hero-float-2'>🍔</div>
      <div className='hero-float hero-float-3'>🧁</div>
    </div>
  </div>
);

export default Header;