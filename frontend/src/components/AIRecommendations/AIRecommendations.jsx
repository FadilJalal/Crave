import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import './AIRecommendations.css';

const AIRecommendations = () => {
    const { url, token, currency, addToCart } = useContext(StoreContext);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecs = async () => {
            try {
                // Determine mock weather
                const weather = new Date().getHours() > 18 ? 'Cool Evening' : 'Sunny & Warm';
                
                const res = await axios.post(
                    url + '/api/ai/recommendations', 
                    { weather, budget: 'medium', token }, 
                    { headers: { token } }
                );
                if (res.data.success) {
                    setSections(res.data.sections);
                }
            } catch (err) {
                console.error("AI Recommendations Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecs();
    }, [token, url]);

    if (loading || sections.length === 0) return null;

    return (
        <div className="air-container">
            {sections.map((section, sIdx) => (
                <div key={sIdx} className="air-section">
                    <div className="air-header">
                        <h2 className="air-title">{section.title}</h2>
                        <div className="air-sparkle">✨ AI Curated</div>
                    </div>
                    
                    <div className="air-grid">
                        {section.items.map((item) => (
                            <div key={item._id} className="air-card">
                                <div className="air-img-wrap">
                                    <img src={`${url}/images/${item.image}`} alt={item.name} />
                                    <div className="air-price-tag">{currency}{item.price}</div>
                                </div>
                                <div className="air-info">
                                    <div className="air-top">
                                        <h3 className="air-name">{item.name}</h3>
                                        <span className="air-rating">⭐ {item.rating}</span>
                                    </div>
                                    <p className="air-rest">{item.restaurant.name}</p>
                                    
                                    <div className="air-reason-box">
                                        <span className="air-reason-icon">💭</span>
                                        <p className="air-reason-text">{item.reason}</p>
                                    </div>
                                    
                                    <button className="air-add-btn" onClick={() => addToCart(item._id)}>
                                        ADD TO CART
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AIRecommendations;