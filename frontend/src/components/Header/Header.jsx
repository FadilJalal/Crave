import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen } from '../../utils/restaurantHours';
import burger from '../../assets/burger.png';
import pizza from '../../assets/pizza.png';
import fries from '../../assets/fries.png';
import shawarma from '../../assets/shawarma.png';
import chicken from '../../assets/chicken.png';
import './Header.css';

const DEFAULT_LOCATION = 'Sharjah, UAE';
const SLIDES = [
    { img: burger, name: 'Burger', color: '#FF3008' },
    { img: pizza, name: 'Pizza', color: '#FFB800' },
    { img: fries, name: 'Fries', color: '#FF3008' },
    { img: chicken, name: 'Chicken', color: '#FFB800' },
    { img: shawarma, name: 'Shawarma', color: '#FF3008' }
];

const readSavedLocation = () => {
    try {
        const saved = JSON.parse(localStorage.getItem('crave_location') || 'null');
        return saved?.label || DEFAULT_LOCATION;
    } catch {
        return DEFAULT_LOCATION;
    }
};

const Header = () => {
    const { t } = useTranslation();
    const { restaurantsById = {} } = useContext(StoreContext);
    const [locationLabel, setLocationLabel] = useState(() => readSavedLocation());
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-slide every 4 seconds for better reading time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const syncLocation = () => setLocationLabel(readSavedLocation());
        syncLocation();
        window.addEventListener('crave_location_changed', syncLocation);
        return () => window.removeEventListener('crave_location_changed', syncLocation);
    }, []);

    const text = useCallback((key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    }, [t]);

    const restaurantCount = useMemo(() => Object.keys(restaurantsById).length, [restaurantsById]);
    const openNowCount = useMemo(() => {
        return Object.values(restaurantsById).filter((restaurant) => isRestaurantOpen(restaurant)).length;
    }, [restaurantsById]);

    return (
        <header className="crave-hero">
            <div className="hero-bg-accent" />
            <div className="hero-mesh" />
            
            <div className="crave-hero__inner">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot" />
                        <span>Delivery in {locationLabel}</span>
                    </div>

                    <h1 className="hero-title">
                        <span>Elevated Eats.</span>
                        <span className="title-accent">Delivered <em>Fast</em>.</span>
                    </h1>

                    <p className="hero-description">
                        {text('hero_desc', 'Get the best meals from your local neighborhood favorites delivered fresh and fast to your doorstep.')}
                    </p>

                    <div className="hero-actions">
                        <a href="#explore-menu" className="hero-btn hero-btn--primary">
                            {text('order_now', 'Order Now')}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </a>
                        <Link to="/restaurants" className="hero-btn hero-btn--secondary">
                            {text('restaurants', 'Restaurants')}
                        </Link>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="hero-slider-wrap">
                        {SLIDES.map((slide, index) => (
                            <div 
                                key={index} 
                                className={`hero-slide-item ${index === currentSlide ? 'active' : ''}`}
                                style={{ '--slide-accent': slide.color }}
                            >
                                <img
                                    src={slide.img}
                                    alt={slide.name}
                                    className="hero-slide-img"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="hero-floating-elements">
                        <div className="glass-tag tag--delivery">
                            <div className="tag-icon">🚀</div>
                            <div className="tag-text">
                                <span className="tag-label">Avg. Delivery</span>
                                <span className="tag-val">25 min</span>
                            </div>
                        </div>

                        <div className="glass-tag tag--rating">
                            <div className="tag-icon">🔥</div>
                            <div className="tag-text">
                                <span className="tag-label">Hyped spots</span>
                                <span className="tag-val">{openNowCount || restaurantCount || "50+"} Live</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
