import React, { useState, useEffect, useContext } from 'react';
import './CraveLivePulse.css';
import { StoreContext } from '../../Context/StoreContext';
import { useTranslation } from 'react-i18next';

const CraveLivePulse = () => {
    const { t } = useTranslation();
    const { currency } = useContext(StoreContext);
    
    const [matchingCount, setMatchingCount] = useState(12);
    const [totalSaved, setTotalSaved] = useState(4825.50);
    const [activePioneers, setActivePioneers] = useState(8);

    // Simulate live data fluctuations
    useEffect(() => {
        const interval = setInterval(() => {
            setMatchingCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            setTotalSaved(prev => prev + (Math.random() * 5));
            setActivePioneers(prev => Math.max(2, prev + (Math.random() > 0.7 ? 1 : -1)));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="clp-section">
            <div className="clp-container">
                <div className="clp-grid">
                    
                    {/* Live Radar Hub */}
                    <div className="clp-card clp-card--main glass-item">
                        <div className="clp-radar-wrap">
                            <div className="clp-radar">
                                <div className="radar-circle radar-1" />
                                <div className="radar-circle radar-2" />
                                <div className="radar-circle radar-3" />
                                <div className="radar-sweep" />
                                {Array.from({ length: activePioneers }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="radar-blip" 
                                        style={{ 
                                            top: `${15 + Math.random() * 70}%`, 
                                            left: `${15 + Math.random() * 70}%`,
                                            animationDelay: `${Math.random() * 2}s`
                                        }} 
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="clp-info">
                            <div className="clp-badge-live">
                                <span className="clp-live-dot" />
                                {t('live_on_radar')}
                            </div>
                            <h3 className="clp-title">{t('matching_nearby')}</h3>
                            <div className="clp-stats">
                                <div className="clp-stat">
                                    <span className="clp-stat-val">{matchingCount}</span>
                                    <span className="clp-stat-lbl">{t('active_pools')}</span>
                                </div>
                                <div className="clp-stat-sep" />
                                <div className="clp-stat">
                                    <span className="clp-stat-val">{activePioneers}</span>
                                    <span className="clp-stat-lbl">{t('pioneers')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community Savings Hub */}
                    <div className="clp-card clp-card--stats glass-item">
                        <div className="clp-card-top">
                            <div className="clp-icon-circle">💰</div>
                            <div className="clp-trend">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                                </svg>
                                +12%
                            </div>
                        </div>
                        <div className="clp-card-body">
                            <p className="clp-stat-desc">{t('community_saved_today')}</p>
                            <h4 className="clp-big-num">
                                <span className="clp-currency">{currency}</span>
                                {totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h4>
                        </div>
                        <div className="clp-card-footer">
                            <div className="clp-avatars">
                                <div className="clp-avatar">👤</div>
                                <div className="clp-avatar">👤</div>
                                <div className="clp-avatar">👤</div>
                                <div className="clp-avatar-plus">+142</div>
                            </div>
                            <span>{t('saving_now')}</span>
                        </div>
                    </div>

                    {/* Flash Deal Command */}
                    <div className="clp-card clp-card--action glass-item">
                        <div className="clp-action-bg">🔥</div>
                        <div className="clp-card-content">
                            <span className="clp-action-label">{t('emergency_deals')}</span>
                            <h4 className="clp-action-title">{t('flash_deals_active')}</h4>
                            <div className="clp-countdown">
                                <div className="clp-cd-unit">04<small>h</small></div>
                                <span>:</span>
                                <div className="clp-cd-unit">12<small>m</small></div>
                                <span>:</span>
                                <div className="clp-cd-unit pulse-sec">55<small>s</small></div>
                            </div>
                            <button className="clp-action-btn" onClick={() => {
                                document.getElementById('food-display')?.scrollIntoView({ behavior: 'smooth' });
                            }}>
                                {t('claim_offer')}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default CraveLivePulse;
