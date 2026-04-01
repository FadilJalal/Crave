import React from 'react';
import './Header.css';

const Header = () => (
  <section className='hero'>
    {/* Animated mesh background */}
    <div className='hero-mesh'>
      <div className='hero-orb hero-orb-1'/>
      <div className='hero-orb hero-orb-2'/>
      <div className='hero-orb hero-orb-3'/>
      <div className='hero-grain'/>
    </div>

    <div className='hero-inner'>
      {/* ── Left ── */}
      <div className='hero-left'>
        <div className='hero-chips'>
          <span className='hero-chip'>
            <span className='hero-chip-dot'/>
            Free delivery on first order
          </span>
          <span className='hero-chip hero-chip-alt'>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            20 min avg
          </span>
        </div>

        <h1 className='hero-headline'>
          <span className='hero-line-1'>Craving</span>
          <span className='hero-line-2'>
            something
            <span className='hero-highlight'>
              <span className='hero-highlight-text'>delicious</span>
              <svg className='hero-highlight-svg' viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M2 8 C50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
            ?
          </span>
        </h1>

        <p className='hero-desc'>
          Skip the hassle. Order from the best restaurants around you and get it delivered fresh to your door.
        </p>

        <div className='hero-cta-row'>
          <a href='#explore-menu' className='hero-cta'>
            <span>Order Now</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <a href='#food-display' className='hero-cta-ghost'>
            See what's trending
          </a>
        </div>

        <div className='hero-trust'>
          <div className='hero-trust-avatars'>
            <div className='hero-ta' style={{background:'#FFD5CC'}}>😋</div>
            <div className='hero-ta' style={{background:'#D1FAE5'}}>🤤</div>
            <div className='hero-ta' style={{background:'#DBEAFE'}}>😍</div>
            <div className='hero-ta' style={{background:'#FEF3C7'}}>🥰</div>
          </div>
          <div className='hero-trust-text'>
            <span className='hero-trust-bold'>10k+ happy foodies</span>
            <span className='hero-trust-stars'>★★★★★ <span>4.8</span></span>
          </div>
        </div>
      </div>

      {/* ── Right: Bento grid ── */}
      <div className='hero-bento'>
        {/* How it works */}
        <div className='hb-card hb-how'>
          <p className='hb-how-label'>How It Works</p>
          <div className='hb-steps'>
            <div className='hb-step'>
              <span className='hb-step-num'>1</span>
              <div>
                <p className='hb-step-title'>Pick your food</p>
                <p className='hb-step-desc'>Browse menus & customize</p>
              </div>
            </div>
            <div className='hb-step'>
              <span className='hb-step-num'>2</span>
              <div>
                <p className='hb-step-title'>Place your order</p>
                <p className='hb-step-desc'>Pay online or cash on delivery</p>
              </div>
            </div>
            <div className='hb-step'>
              <span className='hb-step-num'>3</span>
              <div>
                <p className='hb-step-title'>Enjoy your meal</p>
                <p className='hb-step-desc'>Track it live to your door</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cuisine tiles */}
        <div className='hb-card hb-cuisines'>
          <p className='hb-cuisines-label'>Browse Cuisines</p>
          <div className='hb-cuisine-grid'>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍕</span>
              <span className='hb-cuisine-name'>Pizza</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍔</span>
              <span className='hb-cuisine-name'>Burgers</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍣</span>
              <span className='hb-cuisine-name'>Sushi</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🌮</span>
              <span className='hb-cuisine-name'>Tacos</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍜</span>
              <span className='hb-cuisine-name'>Noodles</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🥗</span>
              <span className='hb-cuisine-name'>Healthy</span>
            </a>
          </div>
        </div>

        {/* Match Your Mood */}
        <div className='hb-card hb-mood'>
          <p className='hb-mood-label'>Match Your Mood</p>
          <p className='hb-mood-sub'>Pick a vibe, get matched</p>
          <div className='hb-mood-pills'>
            <a href='#mood-picker' className='hb-pill'><span>🎉</span> Celebration</a>
            <a href='#mood-picker' className='hb-pill'><span>🛋️</span> Comfort</a>
            <a href='#mood-picker' className='hb-pill'><span>🥗</span> Healthy</a>
            <a href='#mood-picker' className='hb-pill'><span>🌶️</span> Adventurous</a>
            <a href='#mood-picker' className='hb-pill'><span>⚡</span> Quick Bite</a>
            <a href='#mood-picker' className='hb-pill'><span>🍰</span> Sweet Tooth</a>
          </div>
        </div>

        {/* Promo banner */}
        <div className='hb-card hb-promo'>
          <span className='hb-promo-emoji'>🎁</span>
          <div className='hb-promo-text'>
            <p className='hb-promo-title'>First order? It's on us.</p>
            <p className='hb-promo-desc'>Free delivery + 20% off with code <strong>CRAVE20</strong></p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Header;