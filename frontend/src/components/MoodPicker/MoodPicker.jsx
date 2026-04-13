import { useState, useContext, useRef, useMemo } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";
import { isRestaurantOpen, mergeRestaurantFromDirectory } from "../../utils/restaurantHours";
import "./MoodPicker.css";

const MOODS = [
  { key: "celebrating", emoji: "🎉", label: "Celebration", color: "#ec4899" },
  { key: "comfort", emoji: "🛋️", label: "Comfort", color: "#f59e0b" },
  { key: "healthy", emoji: "🥗", label: "Healthy", color: "#10b981" },
  { key: "adventurous", emoji: "🌶️", label: "Adventurous", color: "#ef4444" },
  { key: "quick", emoji: "⚡", label: "Quick", color: "#3b82f6" },
  { key: "sweet", emoji: "🍰", label: "Sweet", color: "#d946ef" },
  { key: "budget", emoji: "💰", label: "Budget", color: "#8b5cf6" },
  { key: "postworkout", emoji: "💪", label: "Gym", color: "#06b6d4" },
  { key: "sharing", emoji: "👨‍👩‍👧‍👦", label: "Sharing", color: "#f43f5e" },
];

const MoodPicker = () => {
  const { url, restaurantsById = {} } = useContext(StoreContext);
  const [activeMood, setActiveMood] = useState(null);
  const [customMood, setCustomMood] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const resultsRef = useRef(null);

  const handleCustomSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!customMood.trim()) return;
    performMatch({ customMood: customMood.trim() });
  };

  const pickMood = (mood) => {
    if (activeMood === mood) {
      setActiveMood(null);
      setResults([]);
      return;
    }
    performMatch({ mood });
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
                <span className="mp-ai-icon">✨</span> CRAVE AI ENGINE
            </div>
            <h2 className="mp-title">
                Match Your <span className="brand-text">Mood</span>
            </h2>
            <p className="mp-sub">
                Our AI analyzes your cravings to find the perfect meal match for your current vibe.
            </p>
        </div>

        <div className="mp-card-main">
            <form onSubmit={handleCustomSubmit} className="mp-search-box">
                <input 
                    type="text" 
                    className="mp-input" 
                    placeholder="e.g. Rough day at work, need huge comfort food..." 
                    value={customMood}
                    onChange={(e) => setCustomMood(e.target.value)}
                />
                <button type="submit" className="mp-match-btn" disabled={!customMood.trim() || loading}>
                    {loading ? "Analyzing..." : "Find Match"}
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
                        <span className="mood-label">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Loading screen removed as requested */}

        {!loading && results.length === 0 && activeMood && (
            <div className="mp-no-results">
                <div className="no-res-icon">🔍</div>
                <h3>No perfect match found</h3>
                <p>Try a different mood or type something specific above!</p>
                <button className="clear-vibe-btn" onClick={() => { setActiveMood(null); setCustomMood(""); }}>Clear vibe</button>
            </div>
        )}

        {!loading && results.length > 0 && (
            <div className="mp-results-area" ref={resultsRef}>
                <div className="mp-results-header">
                    <h3 className="mp-results-title">
                        {usedAi ? "AI Curated Selections" : "Mood Match Results"}
                        {usedAi && <span className="mp-ai-badge-inline" style={{ marginLeft: '15px' }}>✨ Engine Synced</span>}
                    </h3>
                    <span className="mp-results-count">{results.length} cravings identified</span>
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
