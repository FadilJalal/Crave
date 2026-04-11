import React from 'react';
import { useTranslation } from 'react-i18next';
import './HighlightGrid.css';

const HighlightGrid = () => {
  const { t } = useTranslation();

  return (
    <section className="highlight-grid">
      <div className="grid-container">
        {/* Main Bento Card */}
        <div className="bento-card bento-card--large bento-animate-1">
          <div className="bento-content">
            <span className="bento-tag">Trending Now</span>
            <h3 className="bento-title">Elite Picks <br/>for the weekend</h3>
            <p className="bento-desc">Curated by our top foodies, specifically for you.</p>
            <button className="bento-btn">Explore Live Heatmap</button>
          </div>
          <div className="bento-visual">
            <div className="bento-blob bento-blob--1" />
          </div>
        </div>

        {/* Small Bento Card 1 */}
        <div className="bento-card bento-card--small bento-animate-2">
          <div className="bento-content">
            <span className="bento-tag bento-tag--green">Health</span>
            <h3 className="bento-title">Healthy <br/>Habits</h3>
            <p className="bento-desc">Low calorie, high taste.</p>
          </div>
          <div className="bento-visual-icon">🥗</div>
        </div>

        {/* Small Bento Card 2 */}
        <div className="bento-card bento-card--small bento-card--deals bento-animate-3">
          <div className="bento-content">
            <span className="bento-tag bento-tag--orange">Hot</span>
            <h3 className="bento-title">Crave <br/>Flash Deals</h3>
            <p className="bento-desc">Up to 60% OFF right now.</p>
          </div>
          <div className="bento-visual-icon">⚡</div>
        </div>
      </div>
    </section>
  );
};

export default HighlightGrid;
