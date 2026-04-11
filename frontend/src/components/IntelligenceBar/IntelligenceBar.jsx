import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';
import './IntelligenceBar.css';

const GREETINGS = {
    morning: { text: 'Good morning', emoji: '☀️' },
    afternoon: { text: 'Good afternoon', emoji: '🌤️' },
    evening: { text: 'Good evening', emoji: '🌙' },
};

const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
};

const IntelligenceBar = () => {
    const { url, token, currency, food_list } = useContext(StoreContext);
    const [stats, setStats] = useState({ spent: 0, count: 0, name: '' });
    const [nudge, setNudge] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) { setLoading(false); return; }

        const fetchData = async () => {
            try {
                // Fetch stats (spending/count)
                const ordersRes = await axios.post(url + '/api/order/userorders', {}, { headers: { token } });
                if (ordersRes.data.success) {
                    const paid = (ordersRes.data.data || []).filter(o => o.payment);
                    const spent = paid.reduce((sum, o) => sum + (o.amount || 0), 0);
                    let name = '';
                    try { name = JSON.parse(atob(token.split('.')[1])).name?.split(' ')[0] || ''; } catch {}
                    setStats({ spent, count: paid.length, name });
                }

                // Fetch reorder nudge
                const nudgeRes = await axios.post(url + "/api/ai/reorder-nudge", {}, { headers: { token } });
                if (nudgeRes.data.success && nudgeRes.data.data?.shouldNudge) {
                    setNudge(nudgeRes.data.data);
                }
            } catch (err) {
                console.error('IntelligenceBar error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, url]);

    if (!token || loading || stats.count === 0) return null;

    const { text: greeting, emoji } = GREETINGS[getTimeOfDay()];

    return (
        <div className="intelligence-bar animate-fade-in">
            <div className="bar-container">
                <div className="bar-section bar-section--user">
                    <span className="bar-emoji">{emoji}</span>
                    <span className="bar-greeting">{greeting}{stats.name ? `, ${stats.name}` : ''}!</span>
                    <div className="bar-stats">
                        <span className="stat-item"><b>{stats.count}</b> orders</span>
                        <span className="stat-separator">•</span>
                        <span className="stat-item"><b>{currency}{stats.spent.toFixed(0)}</b> spent</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntelligenceBar;
