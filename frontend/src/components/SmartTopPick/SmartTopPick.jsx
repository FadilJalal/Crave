import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import './SmartTopPick.css';

const SmartTopPick = () => {
    const { url, token, currency, addToCart } = useContext(StoreContext);
    const [picks, setPicks] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopPick = async () => {
            try {
                const weather = new Date().getHours() > 18 ? 'Cool Evening' : 'Sunny & Warm';
                const res = await axios.post(
                    url + '/api/ai/recommendations', 
                    { weather, budget: 'medium', token }
                );
                
                if (res.data.success && res.data.sections?.length > 0) {
                    // Grab up to 3 top items from the first section
                    const section = res.data.sections[0];
                    const topItems = section.items.slice(0, 3).map(item => ({
                        ...item,
                        sectionTitle: section.title
                    }));
                    setPicks(topItems);
                }
            } catch (err) {
                console.error("Smart Top Pick Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTopPick();
    }, [token, url]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % picks.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + picks.length) % picks.length);
    };

    if (loading || picks.length === 0) return null;

    const currentPick = picks[currentIndex];

    return (
        <div className="stp-wrap animate-fade-in">
            <div className="stp-section-header">
                <div className="stp-section-badge">🎯 PROCESSED BY CRAVE AI</div>
                <h2 className="stp-section-title">TODAY'S <span style={{ color: '#ff5a1f' }}>TOP PICKS</span></h2>
            </div>
            
            <div className="stp-inner">
                {picks.length > 1 && (
                    <>
                        <button className="stp-nav-btn stp-nav-prev" onClick={prevSlide}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button className="stp-nav-btn stp-nav-next" onClick={nextSlide}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </>
                )}

                <div className="stp-card" key={currentPick._id}>
                    <div className="stp-img-side">
                        <img src={`${url}/images/${currentPick.image}`} alt={currentPick.name} />
                        <div className="stp-badge">✨ {currentPick.sectionTitle}</div>
                    </div>
                    
                    <div className="stp-content">
                        <div className="stp-header">
                            <div>
                                <h3 className="stp-name">{currentPick.name}</h3>
                                <p className="stp-rest">from {currentPick.restaurant.name}</p>
                            </div>
                            <span className="stp-price">{currency}{currentPick.price}</span>
                        </div>
                        
                        <div className="stp-reason-box">
                           <span className="stp-reason-icon">💭</span>
                           <p className="stp-reason-text">{currentPick.reason}</p>
                        </div>
                        
                        <div className="stp-footer">
                            <button className="stp-add-btn" onClick={() => addToCart(currentPick._id)}>
                                 REORDER FAVORITE →
                            </button>
                            {picks.length > 1 && (
                                <div className="stp-dots">
                                    {picks.map((_, idx) => (
                                        <div key={idx} className={`stp-dot ${idx === currentIndex ? 'active' : ''}`} onClick={() => setCurrentIndex(idx)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartTopPick;
