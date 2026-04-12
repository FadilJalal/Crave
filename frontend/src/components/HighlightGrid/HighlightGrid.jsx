import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './HighlightGrid.css';

const HighlightGrid = ({ setCategory }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleHeatmapClick = () => {
    navigate('/restaurants');
  };

  const handleHealthClick = () => {
    if (setCategory) {
      setCategory('Salad');
      setTimeout(() => {
        document.getElementById('explore-menu')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleDealsClick = () => {
    document.getElementById('flash-deals')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="highlight-grid">
      <div className="grid-container">
        {/* Main Bento Card */}
        <div className="bento-card bento-card--large bento-animate-1" onClick={handleHeatmapClick}>
          <div className="bento-content">
            <span className="bento-tag">Trending Now</span>
            <h3 className="bento-title">Elite Picks <br/>for the weekend</h3>
            <p className="bento-desc">Curated by our top foodies, specifically for you.</p>
            <button className="bento-btn" onClick={(e) => { e.stopPropagation(); handleHeatmapClick(); }}>
              Explore Live Heatmap
            </button>
          </div>
          <div className="bento-visual">
            <div className="bento-blob bento-blob--1" />
          </div>
        </div>

        {/* Small Bento Card 1 */}
        <div className="bento-card bento-card--small bento-animate-2" onClick={handleHealthClick}>
          <div className="bento-content">
            <span className="bento-tag bento-tag--green">Health</span>
            <h3 className="bento-title">Healthy <br/>Habits</h3>
            <p className="bento-desc">Low calorie, high taste.</p>
          </div>
          <div className="bento-visual-icon">🥗</div>
        </div>

        {/* Small Bento Card 2 */}
        <div className="bento-card bento-card--small bento-card--deals bento-animate-3" onClick={handleDealsClick}>
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
