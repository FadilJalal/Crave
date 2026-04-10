import React from 'react';
import { useTranslation } from 'react-i18next';
import './Header.css';

const Header = () => {
  const { t } = useTranslation();
  return (
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
            {t("free_delivery_first")}
          </span>
          <span className='hero-chip hero-chip-alt'>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            {t("avg_min")}
          </span>
        </div>

        <h1 className='hero-headline'>
          <span className='hero-line-1'>{t("hero_line_1")}</span>
          <span className='hero-line-2'>
            {t("hero_line_2")}
            <span className='hero-highlight'>
              <span className='hero-highlight-text'>{t("hero_highlight")}</span>
              <svg className='hero-highlight-svg' viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M2 8 C50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
            ?
          </span>
        </h1>

        <p className='hero-desc'>
          {t("hero_desc")}
        </p>

        <div className='hero-cta-row'>
          <a href='#explore-menu' className='hero-cta'>
            <span>{t("order_now")}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <a href='#food-display' className='hero-cta-ghost'>
            {t("see_trending")}
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
            <span className='hero-trust-bold'>{t("happy_foodies")}</span>
            <span className='hero-trust-stars'>★★★★★ <span>4.8</span></span>
          </div>
        </div>
      </div>

      {/* ── Right: Bento grid ── */}
      <div className='hero-bento'>
        {/* Cuisine tiles */}
        <div className='hb-card hb-cuisines'>
          <p className='hb-cuisines-label'>{t("browse_cuisines")}</p>
          <div className='hb-cuisine-grid'>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍕</span>
              <span className='hb-cuisine-name'>{t("pizza")}</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍔</span>
              <span className='hb-cuisine-name'>{t("burgers")}</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍣</span>
              <span className='hb-cuisine-name'>{t("sushi")}</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🌮</span>
              <span className='hb-cuisine-name'>{t("tacos")}</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🍜</span>
              <span className='hb-cuisine-name'>{t("noodles")}</span>
            </a>
            <a href='#explore-menu' className='hb-cuisine'>
              <span className='hb-cuisine-emoji'>🥗</span>
              <span className='hb-cuisine-name'>{t("healthy")}</span>
            </a>
          </div>
        </div>

        {/* Match Your Mood */}
        <div className='hb-card hb-mood'>
          <p className='hb-mood-label'>{t("match_mood")}</p>
          <p className='hb-mood-sub'>{t("pick_vibe")}</p>
          <div className='hb-mood-pills'>
            <a href='#mood-picker' className='hb-pill'><span>🎉</span> {t("celebration")}</a>
            <a href='#mood-picker' className='hb-pill'><span>🛋️</span> {t("comfort")}</a>
            <a href='#mood-picker' className='hb-pill'><span>🥗</span> {t("healthy")}</a>
            <a href='#mood-picker' className='hb-pill'><span>🌶️</span> {t("adventurous")}</a>
            <a href='#mood-picker' className='hb-pill'><span>⚡</span> {t("quick_bite")}</a>
            <a href='#mood-picker' className='hb-pill'><span>🍰</span> {t("sweet_tooth")}</a>
          </div>
        </div>

        {/* Promo banner */}
        <div className='hb-card hb-promo'>
          <span className='hb-promo-emoji'>🎁</span>
          <div className='hb-promo-text'>
            <p className='hb-promo-title'>{t("first_order_promo")}</p>
            <p className='hb-promo-desc'>{t("free_delivery_code")} <strong>CRAVE20</strong></p>
          </div>
        </div>
      </div>
    </div>
  </section>
)};

export default Header;