// frontend/src/components/HeaderMarquee/HeaderMarquee.jsx
import React from 'react';
import './HeaderMarquee.css';

const HeaderMarquee = () => {
    const items = [
        "FASTEST DELIVERY",
        "TRENDING RESTAURANTS",
        "FRESH INGREDIENTS",
        "ORDER 24/7",
        "BEST PRICES",
        "CRAVE EXCELLENCE",
        "TOP RATED PARTNERS"
    ];

    // Double the items for seamless infinite scroll
    const marqueeList = [...items, ...items, ...items];

    return (
        <div className="header-marquee">
            <div className="marquee-content">
                {marqueeList.map((text, index) => (
                    <div key={index} className="marquee-item">
                        <span>{text}</span>
                        <div className="marquee-dot" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeaderMarquee;
