import { useState, useContext } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";
import { isRestaurantOpen, mergeRestaurantFromDirectory } from "../../utils/restaurantHours";
import "./MoodPicker.css";

const MOODS = [
  { key: "celebrating", emoji: "🎉", label: "Celebration" },
  { key: "comfort", emoji: "🛋️", label: "Comfort Food" },
  { key: "healthy", emoji: "🥗", label: "Healthy" },
  { key: "adventurous", emoji: "🌶️", label: "Adventurous" },
  { key: "quick", emoji: "⚡", label: "Quick Bite" },
  { key: "sweet", emoji: "🍰", label: "Sweet Tooth" },
  { key: "budget", emoji: "💰", label: "Budget" },
  { key: "postworkout", emoji: "💪", label: "Post-Workout" },
];

const MoodPicker = () => {
  const { url, restaurantsById = {} } = useContext(StoreContext);
  const [activeMood, setActiveMood] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickMood = async (mood) => {
    if (activeMood === mood) { setActiveMood(null); setResults([]); return; }
    setActiveMood(mood);
    setLoading(true);
    try {
      const res = await axios.post(url + "/api/ai/mood", { mood });
      if (res.data.success) setResults(res.data.data || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div className="mp-wrap" id="mood-picker">
      <div className="mp-header">
        <h2 className="mp-title">Match Your Mood</h2>
        <p className="mp-sub">Pick a vibe and we'll find the perfect food for you</p>
      </div>

      <div className="mp-moods">
        {MOODS.map((m) => (
          <button
            key={m.key}
            className={`mp-mood ${activeMood === m.key ? "mp-mood-active" : ""}`}
            onClick={() => pickMood(m.key)}
          >
            <span className="mp-emoji">{m.emoji}</span>
            <span className="mp-label">{m.label}</span>
          </button>
        ))}
      </div>

      {loading && <div className="mp-loading">Finding your perfect match...</div>}

      {activeMood && !loading && results.length === 0 && (
        <div className="mp-empty">No matches for this mood yet. Try another!</div>
      )}

      {results.length > 0 && (
        <div className="mp-results">
          <p className="mp-count">{results.length} items match your {MOODS.find(m => m.key === activeMood)?.label} mood</p>
          <div className="mp-grid">
            {results.map((item) => (
              <div key={item._id} className="mp-item-wrap">
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
                />
                <div className="mp-tags">
                  {item.dietaryTags?.map((t) => (
                    <span key={t} className={`mp-dtag mp-dtag-${t}`}>{t}</span>
                  ))}
                  {item.calories && <span className="mp-cal">{item.calories.label}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodPicker;
