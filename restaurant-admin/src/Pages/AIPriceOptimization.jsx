import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

export default function AIPriceOptimization() {
  const [items, setItems] = useState([]);
  const [optimizations, setOptimizations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [applyingOptimization, setApplyingOptimization] = useState(null);

  useEffect(() => {
    loadPriceOptimization();
  }, []);

  const loadPriceOptimization = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/ai/restaurant/price-optimization");
      if (res.data.success) {
        setItems(res.data.items || []);
        setOptimizations(res.data.optimizations || []);
      }
    } catch (error) {
      console.error("Failed to load price optimization:", error);
    }
    setLoading(false);
  };

  const applyOptimization = async (itemId, newPrice) => {
    setApplyingOptimization(itemId);
    try {
      const res = await api.put(`/api/food/${itemId}`, {
        price: newPrice
      });
      
      if (res.data.success) {
        // Update local state
        setItems(items.map(item => 
          item._id === itemId 
            ? { ...item, price: newPrice, optimized: true }
            : item
        ));
        
        // Update optimization status
        setOptimizations(optimizations.map(opt => 
          opt.itemId === itemId 
            ? { ...opt, applied: true }
            : opt
        ));
      }
    } catch (error) {
      console.error("Failed to apply optimization:", error);
    }
    setApplyingOptimization(null);
  };

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const categories = [...new Set(items.map(item => item.category))];

  const getOptimizationType = (type) => {
    const types = {
      "increase": { color: "#16a34a", emoji: "📈", label: "Increase" },
      "decrease": { color: "#dc2626", emoji: "📉", label: "Decrease" },
      "maintain": { color: "#6b7280", emoji: "➡️", label: "Maintain" }
    };
    return types[type] || types.maintain;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "#16a34a";
    if (confidence >= 60) return "#f59e0b";
    return "#dc2626";
  };

  const calculatePotentialRevenue = () => {
    return optimizations
      .filter(opt => !opt.applied)
      .reduce((total, opt) => {
        const item = items.find(i => i._id === opt.itemId);
        if (!item) return total;
        const revenueIncrease = (opt.recommendedPrice - item.price) * item.monthlyOrders;
        return total + revenueIncrease;
      }, 0);
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1400 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px" }}>💰 AI Price Optimization</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 32px" }}>
          AI-powered pricing recommendations to maximize revenue and customer satisfaction
        </p>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)" }}>
              Analyzing pricing data...
            </p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid-4" style={{ marginBottom: 32 }}>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Items Analyzed</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--primary)" }}>
                  {items.length}
                </p>
              </div>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Optimizations</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--warning)" }}>
                  {optimizations.filter(opt => !opt.applied).length}
                </p>
              </div>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Potential Revenue</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--success)" }}>
                  AED {Math.round(calculatePotentialRevenue())}
                </p>
              </div>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Avg Confidence</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--info)" }}>
                  {Math.round(optimizations.reduce((sum, opt) => sum + opt.confidence, 0) / optimizations.length)}%
                </p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Filter by Category:</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button 
                    className={`btn ${selectedCategory === "all" ? "" : "btn-outline"}`}
                    onClick={() => setSelectedCategory("all")}
                    style={{ fontSize: 12 }}
                  >
                    All ({items.length})
                  </button>
                  {categories.map(category => (
                    <button 
                      key={category}
                      className={`btn ${selectedCategory === category ? "" : "btn-outline"}`}
                      onClick={() => setSelectedCategory(category)}
                      style={{ fontSize: 12 }}
                    >
                      {category} ({items.filter(item => item.category === category).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Optimization Items */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 20px" }}>
                📊 Price Recommendations
              </h3>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Current Price</th>
                      <th>Recommended</th>
                      <th>Change</th>
                      <th>Confidence</th>
                      <th>Impact</th>
                      <th>Reason</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => {
                      const optimization = optimizations.find(opt => opt.itemId === item._id);
                      const optType = getOptimizationType(optimization?.type);
                      
                      return (
                        <tr key={index} style={{
                          opacity: optimization?.applied ? 0.6 : 1,
                          background: optimization?.applied ? "var(--bg-secondary)" : "transparent"
                        }}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                background: `linear-gradient(135deg, ${item.color || "#667eea"}, ${item.color2 || "#764ba2"})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16
                              }}>
                                {item.emoji || "🍽️"}
                              </div>
                              <div>
                                <span style={{ fontWeight: 700 }}>{item.name}</span>
                                {item.optimized && (
                                  <div>
                                    <span className="badge badge-success" style={{ fontSize: 10 }}>Optimized</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{item.category}</td>
                          <td>
                            <span style={{ fontSize: 16, fontWeight: 700 }}>AED {item.price}</span>
                          </td>
                          <td>
                            <span style={{ 
                              fontSize: 16, 
                              fontWeight: 700, 
                              color: optType.color 
                            }}>
                              AED {optimization?.recommendedPrice || item.price}
                            </span>
                          </td>
                          <td>
                            {optimization && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 16 }}>{optType.emoji}</span>
                                <span style={{ 
                                  fontSize: 14, 
                                  fontWeight: 700, 
                                  color: optType.color 
                                }}>
                                  {optimization.type === "increase" ? "+" : ""}{optimization.percentageChange}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            {optimization && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: getConfidenceColor(optimization.confidence)
                                }} />
                                <span style={{ 
                                  fontSize: 14, 
                                  fontWeight: 700,
                                  color: getConfidenceColor(optimization.confidence)
                                }}>
                                  {optimization.confidence}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            {optimization && (
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>
                                  AED {optimization.revenueImpact}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                  per month
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            {optimization && (
                              <div style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200 }}>
                                {optimization.reason}
                              </div>
                            )}
                          </td>
                          <td>
                            {optimization && !optimization.applied && (
                              <button 
                                className="btn btn-success"
                                onClick={() => applyOptimization(item._id, optimization.recommendedPrice)}
                                disabled={applyingOptimization === item._id}
                                style={{ fontSize: 12, padding: "6px 12px" }}
                              >
                                {applyingOptimization === item._id ? "⏳" : "✓ Apply"}
                              </button>
                            )}
                            {optimization?.applied && (
                              <span className="badge badge-success">Applied</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Insights */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>🧠 AI Pricing Insights</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: 16, background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#166534" }}>
                    💡 <strong>Opportunity:</strong> {optimizations.filter(opt => opt.type === "increase" && !opt.applied).length} items can be priced higher based on demand and customer satisfaction.
                  </p>
                </div>
                <div style={{ padding: 16, background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: 12, border: "1px solid #fbbf24" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#92400e" }}>
                    ⚠️ <strong>Competitive Alert:</strong> {optimizations.filter(opt => opt.type === "decrease" && !opt.applied).length} items are priced above market rates.
                  </p>
                </div>
                <div style={{ padding: 16, background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", borderRadius: 12, border: "1px solid #93c5fd" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e40af" }}>
                    📈 <strong>Revenue Impact:</strong> Applying all recommendations could increase monthly revenue by AED {Math.round(calculatePotentialRevenue())}.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
