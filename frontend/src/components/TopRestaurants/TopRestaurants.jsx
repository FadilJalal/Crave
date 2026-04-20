import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen } from '../../utils/restaurantHours';
import './TopRestaurants.css';

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const TopRestaurants = () => {
    const { t } = useTranslation();
    const { url, restaurantsById } = useContext(StoreContext);
    const [restaurants, setRestaurants] = useState([]);
    const navigate = useNavigate();

    // Get saved user location
    const userLocation = (() => {
        try { return JSON.parse(localStorage.getItem('crave_location')); } catch { return null; }
    })();

    const fmtDist = (d) => d === null ? null : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)} km`;

    useEffect(() => {
        const list = Object.values(restaurantsById)
            .filter(r => r.isActive !== false)
            .map(r => ({
                ...r,
                distance: (userLocation && r.location?.lat && r.location?.lng)
                    ? haversine(userLocation.lat, userLocation.lng, r.location.lat, r.location.lng)
                    : null
            }))
            .sort((a, b) => {
                if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
                return 0;
            });
        
        setRestaurants(list.slice(0, 8)); // Showing 8 for more options
    }, [restaurantsById]);

    if (restaurants.length === 0) return null;

    return (
        <section className="top-restaurants" id="top-restaurants">
            <div className="tr-container">
                <div className="tr-header">
                    <div className="tr-title-wrap">
                        <span className="tr-badge">{t('local_favorites')}</span>
                        <h2 className="tr-title">TOP <span style={{ color: '#ff0000' }}>RESTAURANTS</span> NEAR ME</h2>
                    </div>
                    <Link to="/restaurants" className="tr-view-all">
                        <span>{t('view_all')}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                <div className="tr-grid">
                    {restaurants.map((r) => {
                        const isOpen = isRestaurantOpen(r);
                        return (
                            <div 
                                key={r._id} 
                                className="tr-card" 
                                onClick={() => navigate(`/restaurants/${r._id}`)}
                            >
                                <div className="tr-card-media">
                                    <div className={`tr-status-badge ${isOpen ? 'open' : 'closed'}`}>
                                        {isOpen ? t('open_now') : t('closed')}
                                    </div>
                                    {fmtDist(r.distance) && (
                                        <div className="tr-distance-badge">
                                            <span>{fmtDist(r.distance)}</span>
                                        </div>
                                    )}
                                    <img 
                                        src={r.logo ? `${url}/images/${r.logo}` : '/default-restaurant.jpg'} 
                                        alt={r.name} 
                                        className="tr-card-img" 
                                    />
                                    <div className="tr-card-overlay" />
                                    <div className="tr-rating">
                                        <i className="fa-solid fa-star"></i>
                                        <span>4.8</span>
                                    </div>
                                </div>
                                
                                <div className="tr-card-content">
                                    <div className="tr-card-info">
                                        <h3 className="tr-card-name">{r.name}</h3>
                                    </div>
                                    <p className="tr-card-cuisine">{r.cuisineType || 'International • Fusion'}</p>
                                    
                                    <div className="tr-card-footer">
                                        <div className="tr-stat">
                                            <div className="tr-stat-icon">🕒</div>
                                            <span>20-30 {t('min')}</span>
                                        </div>
                                        <div className="tr-stat">
                                            <div className="tr-stat-icon">🚲</div>
                                            <span>{t('free_delivery')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default TopRestaurants;
