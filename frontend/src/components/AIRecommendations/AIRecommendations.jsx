// frontend/src/components/AIRecommendations/AIRecommendations.jsx
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import { isRestaurantOpen } from "../../utils/restaurantHours";
import "./AIRecommendations.css";

// ── Per-card reason tag ───────────────────────────────────────────
const CardTag = ({ tag }) => {
  if (!tag) return null;
  const colors = {
    blue:   { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    orange: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    red:    { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
    green:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  };
  const c = colors[tag.color] || colors.green;
  return (
    <span className="ai-card-tag"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {tag.label}
    </span>
  );
};

// ── Taste Profile bars ────────────────────────────────────────────
const TasteProfile = ({ profile, totalOrders }) => {
  if (!profile || profile.length === 0) return null;
  const emojis = {
    Burger:"🍔", Pizza:"🍕", Biryani:"🍛", Pasta:"🍝", Sushi:"🍱",
    Salad:"🥗", Dessert:"🍰", Sandwich:"🥪", Chicken:"🍗", Rolls:"🌯",
    Noodles:"🍜", Soup:"🍲", Seafood:"🦐", Cake:"🎂", Coffee:"☕",
  };
  return (
    <div className="taste-wrap">
      <div className="taste-header">
        <span className="taste-icon">📊</span>
        <div>
          <h3 className="taste-title">Your Taste Profile</h3>
          <p className="taste-sub">Based on {totalOrders} order{totalOrders !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="taste-bars">
        {profile.map((item, i) => (
          <div key={item.category} className="taste-row" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="taste-label">
              <span>{emojis[item.category] || "🍽️"}</span>
              <span className="taste-cat">{item.category}</span>
            </div>
            <div className="taste-track">
              <div className="taste-fill" style={{ width: `${item.percent}%` }} />
            </div>
            <span className="taste-pct">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Order Again ───────────────────────────────────────────────────
const OrderAgain = ({ items, url, currency, addToCart, getItemCount, removeFromCart, cartItems }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="oa-wrap">
      <div className="oa-header">
        <span className="oa-icon">🔁</span>
        <div>
          <h3 className="oa-title">Order Again</h3>
          <p className="oa-sub">Your recent favourites</p>
        </div>
      </div>
      <div className="oa-list">
        {items.map((food, i) => {
          const count  = getItemCount(food._id);
          const isOpen = isRestaurantOpen(food.restaurantId);
          return (
            <div key={food._id} className="oa-card" style={{ animationDelay: `${i * 60}ms` }}>
              <img
                src={url + "/images/" + food.image}
                alt={food.name}
                className="oa-img"
                onError={e => { e.target.src = "https://via.placeholder.com/80?text=Food"; }}
              />
              <div className="oa-info">
                <p className="oa-name">{food.name}</p>
                <p className="oa-price">{currency}{food.price}</p>
              </div>
              {!isOpen ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444",
                  background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 20, padding: "4px 10px" }}>Closed</span>
              ) : count === 0 ? (
                <button className="oa-add" onClick={() => addToCart(food._id)}>+ Add</button>
              ) : (
                <div className="oa-counter">
                  <button onClick={() => {
                    const keys = Object.keys(cartItems).filter(k => cartItems[k].itemId === food._id);
                    if (keys.length) removeFromCart(keys[keys.length - 1]);
                  }}>−</button>
                  <span>{count}</span>
                  <button onClick={() => addToCart(food._id)}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────
const AIRecommendations = () => {
  const { url, token, addToCart, getItemCount, removeFromCart, cartItems, currency } =
    useContext(StoreContext);

  const [recommendations, setRecommendations] = useState([]);
  const [orderAgain,      setOrderAgain]       = useState([]);
  const [tasteProfile,    setTasteProfile]     = useState([]);
  const [reason,          setReason]           = useState("");
  const [totalOrders,     setTotalOrders]      = useState(0);
  const [hasHistory,      setHasHistory]       = useState(false);
  const [loading,         setLoading]          = useState(true);
  const [errorMsg,        setErrorMsg]         = useState("");
  const [likes,           setLikes]            = useState({});

  const fetchRecommendations = async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.post(url + "/api/recommend", {}, { headers: { token } });
      console.log("[AI] response:", res.data);
      if (res.data.success) {
        setRecommendations(res.data.recommendations || []);
        setOrderAgain(res.data.orderAgain || []);
        setTasteProfile(res.data.tasteProfile || []);
        setReason(res.data.reason || "");
        setHasHistory(res.data.hasHistory);
        setTotalOrders(res.data.totalOrders || 0);
      } else {
        setErrorMsg(res.data.message || "Could not load recommendations");
      }
    } catch (err) {
      console.error("[AI] fetch error:", err);
      setErrorMsg("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecommendations(); }, [token]);

  const handleLike = (id, val) =>
    setLikes(prev => ({ ...prev, [id]: prev[id] === val ? null : val }));

  // Not logged in
  if (!token) return (
    <section className="ai-section ai-visible">
      <div className="ai-login-prompt">
        <span>✨</span>
        <p>Sign in to see personalised recommendations just for you</p>
      </div>
    </section>
  );

  // Error state — now visible instead of null
  if (errorMsg) return (
    <section className="ai-section ai-visible">
      <div className="ai-error-box">
        <p>⚠️ {errorMsg}</p>
        <button onClick={fetchRecommendations} className="ai-refresh">Try Again</button>
      </div>
    </section>
  );

  return (
    <section className="ai-section ai-visible">

      {/* Top row: Taste Profile + Order Again */}
      {!loading && (tasteProfile.length > 0 || orderAgain.length > 0) && (
        <div className="ai-top-row">
          <TasteProfile profile={tasteProfile} totalOrders={totalOrders} />
          <OrderAgain
            items={orderAgain} url={url} currency={currency}
            addToCart={addToCart} getItemCount={getItemCount}
            removeFromCart={removeFromCart} cartItems={cartItems}
          />
        </div>
      )}

      {/* Header */}
      <div className="ai-header">
        <div className="ai-title-wrap">
          <div className="ai-spark">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill="currentColor"/>
              <path d="M19 15L19.9 17.1L22 18L19.9 18.9L19 21L18.1 18.9L16 18L18.1 17.1L19 15Z" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <h2 className="ai-title">Picked Just for You</h2>
            <p className="ai-subtitle">
              {loading ? "Analysing your taste..." : hasHistory ? "Based on your order history" : "Popular picks to get you started"}
            </p>
          </div>
        </div>
        <button className="ai-refresh" onClick={fetchRecommendations} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            width="14" height="14" className={loading ? "ai-spin" : ""}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Reason pill */}
      {reason && !loading && (
        <div className="ai-reason">
          <span className="ai-reason-dot" />
          {reason}
        </div>
      )}

      {/* Cards */}
      <div className="ai-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ai-skeleton">
                <div className="ai-skel-img skeleton" />
                <div className="ai-skel-body">
                  <div className="skeleton" style={{ height: 12, width: "70%", borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: "50%", borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 6 }} />
                </div>
              </div>
            ))
          : recommendations.length === 0
            ? (
              <div className="ai-empty">
                <p>🍽️ No recommendations yet — start ordering to unlock personalised picks!</p>
              </div>
            )
          : recommendations.map((food, i) => {
              const count  = getItemCount(food._id);
              const liked  = likes[food._id];
              const isNew  = food.tag?.color === "green";
              const isOpen = isRestaurantOpen(food.restaurantId);

              return (
                <div key={food._id} className="ai-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="ai-img-wrap">
                    <img
                      src={url + "/images/" + food.image}
                      alt={food.name}
                      className="ai-img"
                      onError={e => { e.target.src = "https://via.placeholder.com/300x200?text=Food"; }}
                    />
                    <div className="ai-img-overlay" />
                    <div className="ai-badge">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="9" height="9">
                        <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"/>
                      </svg>
                      AI Pick
                    </div>
                    {isNew && <div className="ai-new-badge">NEW</div>}
                    {!isOpen && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.52)",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", gap: 6, backdropFilter: "blur(2px)" }}>
                        <div style={{ fontSize: 24 }}>🔒</div>
                        <span style={{ color: "white", fontWeight: 800, fontSize: 12,
                          background: "rgba(0,0,0,0.5)", padding: "3px 12px", borderRadius: 20 }}>
                          Closed
                        </span>
                      </div>
                    )}
                    <div className="ai-like-row">
                      <button className={`ai-like-btn ${liked === "like" ? "ai-liked" : ""}`}
                        onClick={() => handleLike(food._id, "like")}>👍</button>
                      <button className={`ai-like-btn ${liked === "dislike" ? "ai-disliked" : ""}`}
                        onClick={() => handleLike(food._id, "dislike")}>👎</button>
                    </div>
                  </div>

                  <div className="ai-body">
                    <div className="ai-top-row-card">
                      <p className="ai-name">{food.name}</p>
                      <span className="ai-cat">{food.category}</span>
                    </div>
                    <CardTag tag={food.tag} />
                    {food.restaurantId?.name && (
                      <p className="ai-rest">🏪 {food.restaurantId.name}</p>
                    )}
                    <p className="ai-desc">{food.description}</p>
                    <div className="ai-footer">
                      <p className="ai-price">{currency}{food.price}</p>
                      {!isOpen ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444",
                          background: "#fef2f2", border: "1px solid #fecaca",
                          borderRadius: 20, padding: "5px 12px" }}>Closed</span>
                      ) : count === 0 ? (
                        <button className="ai-add" onClick={() => addToCart(food._id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Add
                        </button>
                      ) : (
                        <div className="ai-counter">
                          <button onClick={() => {
                            const keys = Object.keys(cartItems).filter(k => cartItems[k].itemId === food._id);
                            if (keys.length) removeFromCart(keys[keys.length - 1]);
                          }}>−</button>
                          <span>{count}</span>
                          <button onClick={() => addToCart(food._id)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
};

export default AIRecommendations;