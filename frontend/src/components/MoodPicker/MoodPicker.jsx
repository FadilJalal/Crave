import { useState, useContext, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";
import { isRestaurantOpen, mergeRestaurantFromDirectory } from "../../utils/restaurantHours";
import { Activity, ShieldCheck, Search, X } from 'lucide-react';
import "./MoodPicker.css";

const MOODS = [
  { key: "celebrating", emoji: "🎉", labelKey: "celebration", color: "#ec4899" },
  { key: "comfort", emoji: "🛋️", labelKey: "comfort", color: "#f59e0b" },
  { key: "Keto", emoji: "🥩", labelKey: "KETO", color: "#f59e0b", isHealth: true },
  { key: "Vegan", emoji: "🌿", labelKey: "VEGAN", color: "#10b981", isHealth: true },
  { key: "High Protein", emoji: "💪", labelKey: "PROTEIN+", color: "#3b82f6", isHealth: true },
  { key: "Low Carb", emoji: "🥣", labelKey: "LOW CARB", color: "#8b5cf6", isHealth: true },
  { key: "budget", emoji: "💰", labelKey: "budget", color: "#8b5cf6" },
  { key: "sharing", emoji: "👨‍👩‍👧‍👦", labelKey: "sharing", color: "#f43f5e" },
];

const MoodPicker = () => {
  const { t } = useTranslation();
  const { url, restaurantsById = {}, updateHealthProfile, healthGoal } = useContext(StoreContext);
  const [activeMood, setActiveMood] = useState(null);
  const [customMood, setCustomMood] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const resultsRef = useRef(null);

  const handleCustomSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!customMood.trim()) return;
    updateHealthProfile(customMood.trim());
    performMatch({ customMood: customMood.trim() });
  };

  const pickMood = (mood) => {
    if (activeMood === mood) {
      clearAll();
      return;
    }
    setCustomMood("");
    updateHealthProfile(mood);
    performMatch({ mood });
  };

  const clearAll = () => {
    setCustomMood("");
    setActiveMood(null);
    setResults([]);
    updateHealthProfile("None");
  };

  const performMatch = async (params) => {
    setActiveMood(params.mood || "custom");
    setLoading(true);
    try {
      const res = await axios.post(url + "/api/ai/mood", params);
      if (res.data.success) {
        setResults(res.data.data || []);
        setUsedAi(Boolean(res.data?.meta?.aiUsed));
        
        // Smooth scroll to results
        setTimeout(() => {
            if (resultsRef.current) {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const renderedResults = useMemo(() => results.map((item) => (
      <div key={item._id} className="mp-item-card">
          <FoodItem
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
              restaurantId={item.restaurantId}
              customizations={item.customizations || []}
              avgRating={item.avgRating || 0}
              ratingCount={item.ratingCount || 0}
              inStock={item.inStock !== false}
              restaurantOpen={isRestaurantOpen(mergeRestaurantFromDirectory(item, restaurantsById))}
              restaurantActive={mergeRestaurantFromDirectory(item, restaurantsById)?.isActive !== false}
          />
          {item.aiReason && (
              <div className="mp-match-reason">
                  {item.aiReason}
              </div>
          )}
      </div>
  )), [results, restaurantsById]);

  return (
    <section className="mp-section" id="mood-discovery">
      <div className="mp-container">
        
        <div className="mp-header">
            <div className="mp-badge-ai">
                <span className="mp-ai-icon">✨</span> {t('crave_ai_engine')}
            </div>
            <h2 className="mp-title">
                {t('match_mood_title')} <span className="brand-text">{t('mood_word')}</span>
            </h2>
            <p className="mp-sub">
                {t('mood_desc')}
            </p>
        </div>

        <div className="mp-card-main">
            <form onSubmit={handleCustomSubmit} className="mp-search-box">
                <div className="mp-input-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="text" 
                        className="mp-input" 
                        placeholder={t('mood_placeholder')}
                        value={customMood}
                        onChange={(e) => setCustomMood(e.target.value)}
                        style={{ width: '100%' }}
                    />
                    {(customMood || (activeMood && !MOODS.some(m => m.key === activeMood))) && (
                        <button 
                            type="button" 
                            className="mp-clear-btn" 
                            onClick={clearAll}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748b',
                                transition: 'all 0.2s'
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button type="submit" className="mp-match-btn" disabled={!customMood.trim() || loading}>
                    {loading ? t('analyzing') : t('find_match')}
                </button>
            </form>

            <div className="mp-moods-grid">
                {MOODS.map((m) => (
                    <button
                        key={m.key}
                        className={`mp-mood-chip ${activeMood === m.key ? "active" : ""}`}
                        style={{ "--hover-color": m.color }}
                        onClick={() => pickMood(m.key)}
                    >
                        <span className="mood-emoji">{m.emoji}</span>
                        <span className="mood-label">{t(m.labelKey)}</span>
                    </button>
                ))}
            </div>
        </div>

        {!loading && results.length === 0 && activeMood && (
            <div className="mp-no-results">
                <div className="no-res-icon">🔍</div>
                <h3>{t('no_perfect_match')}</h3>
                <p>{t('try_different_mood')}</p>
                <button className="clear-vibe-btn" onClick={clearAll}>{t('clear_vibe')}</button>
            </div>
        )}

        {!loading && results.length > 0 && (
            <div className="mp-results-area" ref={resultsRef}>
                <div className="mp-results-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '40px' }}>
                    <div className="fd-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        ✨ {usedAi ? t('engine_synced') : t('curated_selection')}
                    </div>
                    <h2 className="fd-title">
                        {t('mood_match_results').split(' ')[0].toUpperCase()} <span style={{ color: '#6366f1' }}>{t('mood_match_results').split(' ').slice(1).join(' ').toUpperCase()}</span>
                    </h2>
                    <p className="fd-count">{results.length} {t("items_available")}</p>
                </div>
                
                <div className="mp-grid-display">
                    {renderedResults}
                </div>
            </div>
        )}
      </div>
    </section>
  );
};

export default MoodPicker;
