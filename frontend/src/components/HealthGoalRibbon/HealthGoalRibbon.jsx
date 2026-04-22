import React, { useContext, useState } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { Activity, ShieldCheck, Search } from 'lucide-react';
import { useTranslation } from "react-i18next";
import './HealthGoalRibbon.css';

const HealthGoalRibbon = () => {
    const { t } = useTranslation();
    const { healthGoal, updateHealthProfile, token } = useContext(StoreContext);
    const [customQuery, setCustomQuery] = useState("");

    if (!token) return null;

    const GOALS = [
        { id: "None", label: "GENERAL", emoji: "🍱", color: "#64748b" },
        { id: "Keto", label: "KETO", emoji: "🥩", color: "#f59e0b" },
        { id: "Vegan", label: "VEGAN", emoji: "🌿", color: "#10b981" },
        { id: "High Protein", label: "PROTEIN+", emoji: "💪", color: "#3b82f6" },
        { id: "Low Carb", label: "LOW CARB", emoji: "🥣", color: "#8b5cf6" },
        { id: "Weight Loss", label: "WEIGHT LOSS", emoji: "📉", color: "#ec4899" },
    ];

    const handleSearch = (e) => {
        e.preventDefault();
        // Custom query logic if needed, for now just a UI match
    };

    return (
        <section className="hr-section">
            <div className="hr-container">
                <div className="hr-header">
                    <div className="hr-badge-ai">
                        <Activity size={14} className="hr-ai-icon-pulse" /> AI Health-Sync™
                    </div>
                    <h2 className="hr-title">
                        Sync Your <span className="brand-text">Dietary Goal</span>
                    </h2>
                    <p className="hr-sub">
                        Our AI engine will scan menus and highlight the best items for your metabolic profile.
                    </p>
                </div>

                <div className="hr-card-main">
                    <form className="hr-search-bar" onSubmit={handleSearch}>
                        <input 
                            type="text" 
                            placeholder="e.g. Low sodium, gluten free, or zero sugar options..." 
                            value={customQuery}
                            onChange={(e) => setCustomQuery(e.target.value)}
                        />
                        <button type="submit" className="hr-find-btn">FIND MATCH</button>
                    </form>

                    <div className="hr-goals-grid">
                        {GOALS.map((g) => (
                            <button
                                key={g.id}
                                className={`hr-goal-card ${healthGoal === g.id ? "active" : ""}`}
                                style={{ "--accent": g.color }}
                                onClick={() => updateHealthProfile(g.id)}
                            >
                                <span className="goal-emoji">{g.emoji}</span>
                                <span className="goal-label">{g.label}</span>
                                {healthGoal === g.id && <ShieldCheck size={14} className="goal-check" />}
                            </button>
                        ))}
                    </div>
                    
                    <div className="hr-footer">
                        <div className="hr-status-pill">
                            <span className="hr-pulse-dot"></span>
                            {healthGoal === 'None' 
                                ? "AI SCANNING STANDBY" 
                                : `AI LIVE SCANNING ACTIVE: ${healthGoal.toUpperCase()}`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HealthGoalRibbon;
