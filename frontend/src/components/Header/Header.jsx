import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen } from '../../utils/restaurantHours';
import burger from '../../assets/burger.png';
import pizza from '../../assets/pizza.png';
import fries from '../../assets/fries.png';
import shawarma from '../../assets/shawarma.png';
import chickenbucket from '../../assets/chickenbucket.png';
import pepsi from '../../assets/pepsi.png';
import chicken from '../../assets/chicken.png';
import noodles from '../../assets/noodles.png';
import sandwich from '../../assets/sandwich.png';
import biriyani from '../../assets/biriyani.png';
import butterchicken from '../../assets/butterchicken.png';
import './Header.css';

const DEFAULT_LOCATION = 'Sharjah, UAE';

const SLIDES = [
    { img: burger, name: 'Burger', color: '#FF3008' },
    { img: pizza, name: 'Pizza', color: '#FFB800' },
    { img: fries, name: 'Fries', color: '#FF3008' },
    { img: chicken, name: 'Chicken', color: '#FFB800' },
    { img: pepsi, name: 'Pepsi', color: '#FF3008' },
    { img: chickenbucket, name: 'Chicken Bucket', color: '#FFB800' },
    { img: shawarma, name: 'Shawarma', color: '#FF3008' },
    { img: noodles, name: 'Noodles', color: '#FFB800' },
    { img: sandwich, name: 'Sandwich', color: '#FF3008' },
    { img: biriyani, name: 'Biriyani', color: '#FFB800' },
    { img: butterchicken, name: 'Butter Chicken', color: '#FF3008' },
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

const Header = () => {
    const { t } = useTranslation();
    const { restaurantsById = {} } = useContext(StoreContext);

    const [locationLabel, setLocationLabel] = useState(() => readSavedLocation());
    const [shuffledSlides, setShuffledSlides] = useState(() => shuffleArray(SLIDES));
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= shuffledSlides.length - 1) {
                    setShuffledSlides((oldSlides) => {
                        let nextSlides = shuffleArray(SLIDES);

                        if (
                            oldSlides.length > 1 &&
                            nextSlides[0]?.name === oldSlides[oldSlides.length - 1]?.name
                        ) {
                            nextSlides = [...nextSlides.slice(1), nextSlides[0]];
                        }

                        return nextSlides;
                    });

                    return 0;
                }

                return prev + 1;
            });
        }, 4000);

        return () => clearInterval(timer);
    }, [shuffledSlides]);

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

    const restaurantCount = useMemo(
        () => Object.keys(restaurantsById).length,
        [restaurantsById]
    );

    const openNowCount = useMemo(() => {
        return Object.values(restaurantsById).filter((restaurant) =>
            isRestaurantOpen(restaurant)
        ).length;
    }, [restaurantsById]);

    return (
        <header className="crave-hero">
            <div className="hero-aura">
                <div className="aura-blob aura-blob--1" />
                <div className="aura-blob aura-blob--2" />
            </div>
            <div className="hero-bg-accent" />
            <div className="hero-mesh" />

            <div className="crave-hero__inner">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot" />
                        <span>Delivery in {locationLabel}</span>
                    </div>

                    <h1 className="hero-title">
                        <span className="title-line-1">Crave <em>Excellence.</em></span>
                        <span className="title-line-2">Delivered <em className="accent-text">Faster.</em></span>
                    </h1>

                    <p className="hero-description">
                        {text(
                            'hero_desc',
                            'Get the best meals from your local neighborhood favorites delivered fresh and fast to your doorstep.'
                        )}
                    </p>

                    <div className="hero-actions">
                        <a href="#explore-menu" className="hero-btn hero-btn--primary">
                            {text('order_now', 'Order Now')}
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
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
                                />
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </header>
    );
};

export default Header;