import { useState, useContext, useRef } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";
import { isRestaurantOpen, mergeRestaurantFromDirectory } from "../../utils/restaurantHours";
import "./SmartSearch.css";

const SmartSearch = () => {
  const { url, restaurantsById = {} } = useContext(StoreContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef(null);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); setParsed(null); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await axios.post(url + "/api/ai/smart-search", { query: q });
      if (res.data.success) {
        setResults(res.data.data);
        setParsed(res.data.parsed);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(val), 400);
  };

  const suggestions = [
    "Spicy chicken under 30",
    "Healthy salad",
    "Vegan options",
    "Burger above 20",
    "Quick sandwich budget",
    "Keto grilled",
  ];

  return (
    <div className="ss-wrap">
      <div className="ss-header">
        <h2 className="ss-title">Smart Search</h2>
        <p className="ss-sub">Search naturally — "spicy chicken under 30", "healthy vegan", "keto grilled"</p>
      </div>

      <div className="ss-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="What are you craving? Try 'spicy pasta under 25'..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
        />
        {query && (
          <button className="ss-clear" onClick={() => { setQuery(""); setResults([]); setParsed(null); setSearched(false); }}>✕</button>
        )}
      </div>

      {!searched && (
        <div className="ss-suggestions">
          {suggestions.map((s) => (
            <button key={s} className="ss-chip" onClick={() => { setQuery(s); doSearch(s); }}>{s}</button>
          ))}
        </div>
      )}

      {parsed && (parsed.maxPrice || parsed.minPrice || parsed.category || parsed.dietary?.length > 0) && (
        <div className="ss-parsed">
          <span className="ss-parsed-label">🧠 AI understood:</span>
          {parsed.maxPrice && <span className="ss-tag">Under AED {parsed.maxPrice}</span>}
          {parsed.minPrice && <span className="ss-tag">Above AED {parsed.minPrice}</span>}
          {parsed.category && <span className="ss-tag">{parsed.category}</span>}
          {parsed.dietary?.map((d) => <span key={d} className="ss-tag ss-tag-diet">{d}</span>)}
        </div>
      )}

      {loading && <div className="ss-loading">Searching...</div>}

      {searched && !loading && results.length === 0 && (
        <div className="ss-empty">No items match your search. Try different keywords!</div>
      )}

      {results.length > 0 && (
        <div className="ss-results">
          <p className="ss-count">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
          <div className="ss-grid">
            {results.map((item) => (
              <div key={item._id} className="ss-item-wrap">
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
                <div className="ss-item-tags">
                  {item.dietaryTags?.map((t) => (
                    <span key={t} className={`ss-dtag ss-dtag-${t}`}>{t}</span>
                  ))}
                  {item.calories && <span className="ss-cal">{item.calories.label}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
