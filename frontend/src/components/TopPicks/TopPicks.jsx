import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen } from '../../utils/restaurantHours';
import './TopPicks.css';

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TopPicks = () => {
    const { t } = useTranslation();
    const { restaurantsById, url } = useContext(StoreContext);
    const navigate = useNavigate();

    const userLocation = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('crave_location')); } catch { return null; }
    }, []);

    const topRestaurants = useMemo(() => {
        const list = Object.values(restaurantsById);
        if (!list.length) return [];

        return list.map(r => ({
            ...r,
            distance: (userLocation && r.location?.lat && r.location?.lng)
                ? haversine(userLocation.lat, userLocation.lng, r.location.lat, r.location.lng)
                : null,
            isOpen: isRestaurantOpen(r)
        }))
        .filter(r => r.isActive !== false)
        .sort(() => Math.random() - 0.5); // Random shuffle
    }, [restaurantsById, userLocation]);

    if (topRestaurants.length === 0) return null;

    return (
        <section className="top-picks">
            <div className="tp-inner">
                <div className="tp-header">
                    <div className="tp-title-group">
                        <span className="tp-badge">Nearby</span>
                        <h2 className="tp-title">Top Restaurants Near You</h2>
                    </div>
                </div>

                <div className="tp-grid">
                    {topRestaurants.map((res) => (
                        <div 
                            key={res._id} 
                            className={`tp-card ${res.isOpen ? '' : 'tp-card--closed'}`}
                            onClick={() => navigate(`/restaurants/${res._id}`)}
                        >
                            <div className="tp-card-img-wrap">
                                {res.logo ? (
                                    <img src={`${url}/images/${res.logo}`} alt={res.name} className="tp-card-img" />
                                ) : (
                                    <div className="tp-card-placeholder">{res.name[0]}</div>
                                )}
                                <div className="tp-card-overlay" />
                                <div className="tp-card-badges">
                                    <span className="tp-rating">⭐ 4.5</span>
                                    {res.distance && (
                                        <span className="tp-distance">
                                            {res.distance < 1 ? `${Math.round(res.distance * 1000)}m` : `${res.distance.toFixed(1)}km`}
                                        </span>
                                    )}
                                </div>
                                {!res.isOpen && <div className="tp-closed-tag">Closed</div>}
                            </div>
                        </div>
                    ))}
                    <div className="tp-view-all-card" onClick={() => navigate('/restaurants')}>
                        <div className="tp-view-all-circle">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </div>
                        <span>Explore All</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TopPicks;
