import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen } from '../../utils/restaurantHours';

// Assets
import burger from '../../assets/burger.png';
import pizza from '../../assets/pizza.png';
import fries from '../../assets/fries.png';
import shawarma from '../../assets/shawarma.png';
import chickenbucket from '../../assets/chickenbucket.png';
import chicken from '../../assets/chicken.png';
import noodles from '../../assets/noodles.png';
import sandwich from '../../assets/sandwich.png';
import biriyani from '../../assets/biriyani.png';

import './Header.css';

const DEFAULT_LOCATION = 'Sharjah, UAE';

const SLIDES = [
    { img: burger, name: 'Burger', color: '#FF3008' },
    { img: pizza, name: 'Pizza', color: '#FFB800' },
    { img: fries, name: 'Fries', color: '#FF3008' },
    { img: chicken, name: 'Chicken', color: '#FFB800' },
    { img: chickenbucket, name: 'Chicken Bucket', color: '#FFB800' },
    { img: shawarma, name: 'Shawarma', color: '#FF3008' },
    { img: noodles, name: 'Noodles', color: '#FFB800' },
    { img: sandwich, name: 'Sandwich', color: '#FF3008' },
    { img: biriyani, name: 'Biriyani', color: '#FFB800' },
];

const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const readSavedLocation = () => {
    try {
        const saved = JSON.parse(localStorage.getItem('crave_location') || 'null');
        return saved?.label || DEFAULT_LOCATION;
    } catch {
        return DEFAULT_LOCATION;
    }
};

const useCountUp = (target, duration = 1800, startDelay = 800) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!target) return;
        const timeout = setTimeout(() => {
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                setCount(Math.round(eased * target));
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, startDelay);
        return () => clearTimeout(timeout);
    }, [target, duration, startDelay]);
    return count;
};

const Header = () => {
    const { t } = useTranslation();
    const { restaurantsById = {} } = useContext(StoreContext);

    const [locationLabel, setLocationLabel] = useState(() => readSavedLocation());
    const [shuffledSlides, setShuffledSlides] = useState(() => shuffleArray(SLIDES));
    const [currentIndex, setCurrentIndex] = useState(0);

    const restaurantCount = useMemo(() => Object.keys(restaurantsById).length, [restaurantsById]);
    const openNowCount = useMemo(() => Object.values(restaurantsById).filter(isRestaurantOpen).length, [restaurantsById]);

    const countRestaurants = useCountUp(restaurantCount || 120);
    const countOpen = useCountUp(openNowCount || 85);

    // Auto-advance slides with shuffle
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= shuffledSlides.length - 1) {
                    setShuffledSlides(shuffleArray(SLIDES));
                    return 0;
                }
                return prev + 1;
            });
        }, 4500);
        return () => clearInterval(timer);
    }, [shuffledSlides]);

    // Update location from global storage events
    useEffect(() => {
        const syncLocation = () => setLocationLabel(readSavedLocation());
        syncLocation();
        window.addEventListener('crave_location_changed', syncLocation);
        return () => window.removeEventListener('crave_location_changed', syncLocation);
    }, []);

    const text = useCallback(
        (key, fallback) => {
            const value = t(key);
            return value && value !== key ? value : fallback;
        },
        [t]
    );

    return (
        <header className="crave-hero">
            {/* Ambient Background Layer */}
            <div className="hero-aura">
                <div className="aura-blob aura-blob--1" />
                <div className="aura-blob aura-blob--2" />
            </div>
            <div className="hero-bg-accent" />
            <div className="hero-mesh" />

            <div className="crave-hero__inner">
                {/* Text Content Area */}
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot" />
                        <span>{t('delivery_in')} {locationLabel}</span>
                    </div>

                    <h1 className="hero-title">
                        <span className="title-line-1">{t('crave')}</span>
                        <span className="title-line-2">
                            <em className="accent-text">{t('excellence')}</em>
                        </span>
                    </h1>

                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat__num">{countRestaurants}<sup>+</sup></span>
                            <span className="hero-stat__lbl">{t('restaurants')}</span>
                        </div>
                        <div className="hero-stat__sep" />
                        <div className="hero-stat">
                            <span className="hero-stat__num hero-stat__num--accent">{countOpen}</span>
                            <span className="hero-stat__lbl">{t('open_now')}</span>
                        </div>
                        <div className="hero-stat__sep" />
                        <div className="hero-stat">
                            <span className="hero-stat__num">
                                20<small>{t('min')}</small>
                            </span>
                            <span className="hero-stat__lbl">{t('avg_delivery_label')}</span>
                        </div>
                    </div>

                    <div className="hero-actions">
                        <a href="#food-display" className="hero-btn hero-btn--primary">
                            <span>{text('order_now', 'Order Now')}</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </a>

                        <Link to="/restaurants" className="hero-btn hero-btn--secondary">
                            {text('restaurants', 'Restaurants')}
                        </Link>
                    </div>






                </div>

                {/* Visual Media Area */}
                <div className="hero-visual">
                    <div className="hero-slider-wrap">
                        {shuffledSlides.map((slide, index) => (
                            <div
                                key={`${slide.name}-${index}`}
                                className={`hero-slide-item ${index === currentIndex ? 'active' : ''}`}
                                style={{ '--slide-accent': slide.color }}
                            >
                                <img
                                    src={slide.img}
                                    alt={slide.name}
                                    className="hero-slide-img"
                                    draggable="false"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Fun Floating Elements */}
                    <div className="floating-ingredients">
                        <div className="ingredient-item ing-1">✨</div>
                        <div className="ingredient-item ing-2">🔥</div>
                        <div className="ingredient-item ing-3">🥗</div>
                        <div className="ingredient-item ing-4">🍕</div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;