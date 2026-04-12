import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import './SmartTopPick.css';

const SmartTopPick = () => {
    const { url, token, currency, addToCart } = useContext(StoreContext);
    const [pick, setPick] = useState(null);
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
                    // Grab the single best pick (first item of first section)
                    const topItem = res.data.sections[0].items[0];
                    setPick({ ...topItem, sectionTitle: res.data.sections[0].title });
                }
            } catch (err) {
                console.error("Smart Top Pick Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTopPick();
    }, [token, url]);

    if (loading || !pick) return null;

    return (
        <div className="stp-wrap animate-fade-in">
            <div className="stp-inner">
                <div className="stp-card">
                    <div className="stp-img-side">
                        <img src={`${url}/images/${pick.image}`} alt={pick.name} />
                        <div className="stp-badge">✨ {pick.sectionTitle}</div>
                    </div>
                    
                    <div className="stp-content">
                        <div className="stp-header">
                            <div>
                                <h3 className="stp-name">{pick.name}</h3>
                                <p className="stp-rest">from {pick.restaurant.name}</p>
                            </div>
                            <span className="stp-price">{currency}{pick.price}</span>
                        </div>
                        
                        <div className="stp-reason-box">
                           <span className="stp-reason-icon">💭</span>
                           <p className="stp-reason-text">{pick.reason}</p>
                        </div>
                        
                        <button className="stp-add-btn" onClick={() => addToCart(pick._id)}>
                             REORDER FAVORITE →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartTopPick;
