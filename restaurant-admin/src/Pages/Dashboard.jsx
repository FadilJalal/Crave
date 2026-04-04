import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { hasFeatureAccess } from "../utils/featureAccess";

const STATUS_COLOR = {
  "Food Processing": { bg: "#fef3c7", color: "#92400e" },
  "Out for Delivery": { bg: "#dbeafe", color: "#1e40af" },
  "Delivered": { bg: "#dcfce7", color: "#166534" },
};

function BarChart({ data, color = "#ff4e2a", height = 120, labelKey = "date", valueKey = "revenue", formatLabel, formatValue }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return null;
  const values = data.map(d => d[valueKey]);
  const max = Math.max(...values, 1);
  const barW = 100 / data.length;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        <defs>
          <linearGradient id="bargrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const val = d[valueKey];
          const barH = (val / max) * (height - 8);
          const x = i * barW + barW * 0.1;
          const w = barW * 0.8;
          const y = height - barH;
          return (
            <rect key={i} x={x} y={y} width={w} height={barH}
              fill="url(#bargrad)" rx="1.5"
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={() => setTooltip({ i, val, label: d[labelKey] })}
              onMouseLeave={() => setTooltip(null)}
              opacity={tooltip && tooltip.i !== i ? 0.5 : 1}
            />
          );
        })}
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute", top: 0,
          left: `${(tooltip.i / data.length) * 100}%`,
          transform: "translateX(-50%)",
          background: "#111", color: "white", borderRadius: 8,
          padding: "5px 10px", fontSize: 11, fontWeight: 700,
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 10,
        }}>
          {formatLabel ? formatLabel(tooltip.label) : tooltip.label}<br />
          {formatValue ? formatValue(tooltip.val) : tooltip.val}
        </div>
      )}
    </div>
  );
}

function PeakHoursChart({ data }) {
  if (!data) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
      {data.map(({ hour, count }) => {
        const intensity = count / max;
        const h = Math.round(intensity * 80);
        return (
          <div key={hour}
            title={`${hour < 12 ? (hour === 0 ? "12am" : `${hour}am`) : (hour === 12 ? "12pm" : `${hour - 12}pm`)}: ${count} orders`}
            style={{
              flex: 1, height: Math.max(h, 3),
              background: `rgba(255, 78, 42, ${0.15 + intensity * 0.85})`,
              borderRadius: "3px 3px 0 0", cursor: "default",
            }}
          />
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent, loading, badge }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      background: "white", borderRadius: 20, padding: "22px 24px",
      border: "1px solid rgba(0,0,0,0.06)", boxShadow: hovered ? `0 12px 32px ${accent}30` : "0 4px 24px rgba(0,0,0,0.06)",
      position: "relative", overflow: "hidden", transition: "all 0.3s ease", cursor: "pointer",
      transform: hovered ? "translateY(-4px)" : "translateY(0)", minHeight: 160, display: "flex", flexDirection: "column", justifyContent: "space-between"
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "20px 20px 0 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#111827", letterSpacing: "-1px", lineHeight: 1 }}>
            {loading ? <span style={{ opacity: 0.3 }}>—</span> : value}
          </div>
          {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {icon}
          </div>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
              background: badge.positive ? "#dcfce7" : "#fee2e2",
              color: badge.positive ? "#166534" : "#991b1b",
            }}>
              {badge.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [updatingTime, setUpdatingTime] = useState(false);
  const [timeMsg, setTimeMsg] = useState(null);
  const [reengageOpen, setReengageOpen] = useState(false);
  const [reengageForm, setReengageForm] = useState({
    daysSince: 7,
    subject: "We miss you! 🍽️",
    heading: "It's been a while...",
    body: "We haven't seen you in a while and we miss you! Come back and enjoy your favourite meals.",
    ctaText: "Order Now",
    ctaUrl: "",
    promoCode: "",
  });
  const [reengageSending, setReengageSending] = useState(false);
  const [reengageResult, setReengageResult] = useState(null);
  const [sub, setSub] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [foodRes, orderRes, subRes] = await Promise.all([
        api.get("/api/restaurantadmin/foods"),
        api.get("/api/order/restaurant/list"),
        api.get("/api/subscription/mine"),
      ]);
      if (foodRes.data?.success) setFoods(foodRes.data.data || []);
      if (orderRes.data?.success) setOrders(orderRes.data.data || []);
      if (subRes.data?.success) setSub(subRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await api.get("/api/restaurantadmin/analytics");
      if (res.data?.success) setAnalytics(res.data.data);
    } catch (err) { console.error(err); }
    finally { setAnalyticsLoading(false); }
  };

  useEffect(() => { load(); loadAnalytics(); }, []);

  const updateDeliveryTime = async () => {
    setUpdatingTime(true); setTimeMsg(null);
    try {
      const res = await api.post("/api/restaurantadmin/update-delivery-time");
      setTimeMsg(res.data.success
        ? `✅ Updated to ${res.data.avgPrepTime} min (based on ${res.data.basedOn} deliveries)`
        : `⚠️ ${res.data.message}`);
    } catch { setTimeMsg("⚠️ Error updating."); }
    setUpdatingTime(false);
  };

  const sendReengage = async () => {
    setReengageSending(true); setReengageResult(null);
    try {
      const res = await api.post("/api/restaurantadmin/re-engagement", reengageForm);
      setReengageResult(res.data);
    } catch { setReengageResult({ success: false, message: "Network error." }); }
    setReengageSending(false);
  };

  const today = new Date().toDateString();
  const activeOrders = orders.filter(o => (o.status || "").toLowerCase() !== "cancelled");
  const todayOrders = activeOrders.filter(o => new Date(o.createdAt).toDateString() === today);
  const pendingOrders = activeOrders.filter(o => o.status === "Food Processing");
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.amount || 0), 0);
  const recentOrders = activeOrders.slice(0, 6);
  const growth = analytics?.revenueGrowth;
  
  // Calculate performance metrics
  const completedOrders = activeOrders.filter(o => o.status === "Delivered").length;
  const completionRate = activeOrders.length > 0 ? Math.round((completedOrders / activeOrders.length) * 100) : 0;
  const avgRating = foods.length > 0 
    ? Math.round((foods.reduce((sum, f) => sum + (f.avgRating || 0), 0) / foods.length) * 10) / 10 
    : 0;
  const outOfStockCount = foods.filter(f => !f.inStock).length;
  
  // Advanced metrics
  const healthScore = Math.min(100, Math.round(
    (completionRate * 0.35) + 
    (avgRating > 0 ? (avgRating / 5) * 100 * 0.35 : 0) + 
    ((1 - (outOfStockCount / Math.max(foods.length, 1))) * 100 * 0.2) +
    (pendingOrders.length < 5 ? 10 : 0)
  ));
  
  const yesterdayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return orderDate.toDateString() === yesterday.toDateString() && (o.status || "").toLowerCase() !== "cancelled";
  });
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + (o.amount || 0), 0);
  const revenueTrend = yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0;
  
  const avgOrderValue = activeOrders.length > 0 ? Math.round(orders.reduce((s, o) => s + (o.amount || 0), 0) / activeOrders.length) : 0;
  const todayAvgOrder = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
  
  // Predict rest of day
  const currentHour = new Date().getHours();
  const hoursLeft = 24 - currentHour;
  const predictedOrders = Math.max(0, activeOrders.length > 0 ? Math.round((activeOrders.length / (currentHour || 1)) * hoursLeft) : 0);
  const predictedRevenue = Math.max(0, Math.round((todayRevenue / (currentHour || 1)) * hoursLeft));

  const fmtDate = (d) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; };
  const fmtHour = (h) => h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;

  const subForFeatures = sub ? { status: sub.status || "trial", features: sub.features } : null;
  const canMenu = !subForFeatures || hasFeatureAccess(subForFeatures, "menu");
  const goMenuOrBilling = () => { if (canMenu) navigate("/menu"); else navigate("/subscription"); };
  const goAddFoodOrBilling = () => { if (canMenu) navigate("/add-food"); else navigate("/subscription"); };

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 40 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#111827", letterSpacing: "-0.8px" }}>Dashboard</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af", fontWeight: 500 }}>
              {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => navigate("/orders")} style={{ padding: "10px 18px", borderRadius: 12, border: "1px solid #e5e7eb", background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13, color: "#374151" }}>
              🧾 Orders {pendingOrders.length > 0 && (
                <span style={{ marginLeft: 6, background: "#ff4e2a", color: "white", borderRadius: 999, padding: "2px 7px", fontSize: 11 }}>
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={goAddFoodOrBilling}
              title={canMenu ? "" : "Menu management is off — open Subscription to upgrade"}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "none",
                background: canMenu ? "linear-gradient(135deg, #ff4e2a, #ff6a3d)" : "linear-gradient(135deg, #9ca3af, #6b7280)",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 13,
                boxShadow: canMenu ? "0 4px 14px rgba(255,78,42,0.35)" : "0 2px 8px rgba(0,0,0,0.12)",
                opacity: canMenu ? 1 : 0.95,
              }}
            >
              {canMenu ? "+ Add Food" : "+ Add Food (plan)"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard icon="📦" label="Today's Orders" value={todayOrders.length} sub="orders placed today" accent="#f59e0b" loading={loading} />
          <StatCard icon="⏳" label="Pending" value={pendingOrders.length} sub="awaiting processing" accent="#ef4444" loading={loading} />
          <StatCard icon="💰" label="Today's Revenue" value={`AED ${todayRevenue}`} sub={`This week: AED ${analytics?.thisWeekRevenue || 0}`} accent="#22c55e" loading={loading}
            badge={growth !== null && growth !== undefined ? { text: `${growth >= 0 ? "+" : ""}${growth}% vs last week`, positive: growth >= 0 } : null}
          />
          <StatCard icon="🚚" label="Avg Delivery Time"
            value={analytics?.avgDeliveryMins ? `${analytics.avgDeliveryMins} min` : "—"}
            sub={analytics?.avgDeliveryMins ? "based on real deliveries" : "no data yet"}
            accent="#8b5cf6" loading={analyticsLoading}
          />
        </div>

        {/* Performance & Health */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard icon="✅" label="Completion Rate" value={`${completionRate}%`} sub={`${completedOrders} of ${activeOrders.length} delivered`} accent="#10b981" loading={loading} 
            badge={completionRate > 90 ? { text: "Excellent!", positive: true } : completionRate > 70 ? { text: "Good", positive: true } : { text: "Needs work", positive: false }}
          />
          <StatCard icon="⭐" label="Avg Rating" value={avgRating > 0 ? `${avgRating}★` : "—"} sub={foods.length > 0 ? `Across ${foods.length} items` : "no ratings yet"} accent="#f59e0b" loading={loading} />
          <StatCard icon="🍽️" label="Menu Items" value={foods.length} sub={outOfStockCount > 0 ? `${outOfStockCount} out of stock` : "All in stock"} accent="#3b82f6" loading={loading}
            badge={outOfStockCount > 0 ? { text: `${outOfStockCount} out`, positive: false } : { text: "All ready", positive: true }}
          />
        </div>

        {/* Alerts & Quick Actions */}
        {(outOfStockCount > 0 || pendingOrders.length > 3) && (
          <div style={{ display: "grid", gridTemplateColumns: outOfStockCount > 0 && pendingOrders.length > 3 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 24 }}>
            {outOfStockCount > 0 && (
              <div style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)", borderRadius: 14, border: "1px solid #fde68a", padding: 18, transition: "all 0.3s ease", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(245,158,11,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "#92400e", marginBottom: 4 }}>⚠️ {outOfStockCount} Items Out of Stock</div>
                    <div style={{ fontSize: 12, color: "#b45309", marginBottom: 12 }}>Update availability to maintain customer satisfaction</div>
                    <button
                      onClick={goMenuOrBilling}
                      title={canMenu ? "" : "Menu management is off — open Subscription to upgrade"}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "none",
                        background: canMenu ? "#f59e0b" : "#9ca3af",
                        color: "white",
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {canMenu ? "📝 Update Menu →" : "🔒 Menu — view plans"}
                    </button>
                  </div>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>📦</div>
                </div>
              </div>
            )}
            {pendingOrders.length > 3 && (
              <div style={{ background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)", borderRadius: 14, border: "1px solid #fecaca", padding: 18, transition: "all 0.3s ease", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(239,68,68,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "#991b1b", marginBottom: 4 }}>🔥 {pendingOrders.length} Orders Pending</div>
                    <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 12 }}>Process these to reduce delivery time and improve ratings</div>
                    <button onClick={() => navigate("/orders")} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#ef4444", color: "white", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      ⏳ View Orders →
                    </button>
                  </div>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>⏰</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Access */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 18, marginBottom: 24, transition: "all 0.3s ease" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)"; }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#111827", marginBottom: 12 }}>⚡ Quick Access</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <button onClick={() => navigate("/inventory")} style={{ padding: "14px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "all 0.2s", fontSize: 12, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "scale(1.05) translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 20 }}>📦</span>
              Inventory
            </button>
            <button onClick={() => navigate("/promos")} style={{ padding: "14px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "all 0.2s", fontSize: 12, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "scale(1.05) translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 20 }}>🏷️</span>
              Promos
            </button>
            <button onClick={() => navigate("/ai-insights")} style={{ padding: "14px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "all 0.2s", fontSize: 12, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "scale(1.05) translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 20 }}>🤖</span>
              AI Insights
            </button>
            <button onClick={() => navigate("/customers")} style={{ padding: "14px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "all 0.2s", fontSize: 12, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "scale(1.05) translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 20 }}>👥</span>
              Customers
            </button>
            <button
              onClick={goMenuOrBilling}
              title={canMenu ? "" : "Menu management is off — open Subscription to upgrade"}
              style={{
                padding: "14px 12px",
                borderRadius: 10,
                border: `1px solid ${canMenu ? "#e5e7eb" : "#e5e7eb"}`,
                background: canMenu ? "white" : "#f9fafb",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
                transition: "all 0.2s",
                fontSize: 12,
                fontWeight: 700,
                opacity: canMenu ? 1 : 0.75,
              }}
              onMouseEnter={e => {
                if (!canMenu) return;
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.transform = "scale(1.05) translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = canMenu ? "white" : "#f9fafb";
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{ fontSize: 20 }}>{canMenu ? "🍽️" : "🔒"}</span>
              {canMenu ? "Menu" : "Menu (locked)"}
            </button>
          </div>
        </div>

        {/* Health Score & Predictions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 18, transition: "all 0.3s ease", cursor: "pointer", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(22,163,74,0.15)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }}>Restaurant Health</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: healthScore > 75 ? "#16a34a" : healthScore > 50 ? "#f59e0b" : "#ef4444", letterSpacing: "-0.6px" }}>
                  {healthScore}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {healthScore > 75 ? "Excellent" : healthScore > 50 ? "Good" : "Needs attention"}
                </div>
              </div>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: healthScore > 75 ? "#f0fdf4" : healthScore > 50 ? "#fffbeb" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                {healthScore > 75 ? "😊" : healthScore > 50 ? "😐" : "😟"}
              </div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 18, transition: "all 0.3s ease", cursor: "pointer", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(245,158,11,0.15)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }}>Revenue vs Yesterday</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: revenueTrend >= 0 ? "#16a34a" : "#ef4444", letterSpacing: "-0.6px" }}>
                  {revenueTrend >= 0 ? "+" : ""}{revenueTrend}%
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  Yesterday: AED {yesterdayRevenue}
                </div>
              </div>
              <div style={{ fontSize: 28, flexShrink: 0 }}>
                {revenueTrend >= 0 ? "📈" : "📉"}
              </div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 18, transition: "all 0.3s ease", cursor: "pointer", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(139,92,246,0.15)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }}>Rest of Day Forecast</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#8b5cf6", letterSpacing: "-0.4px" }}>
                  ~AED {predictedRevenue}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {predictedOrders} more orders expected
                </div>
              </div>
              <div style={{ fontSize: 28, flexShrink: 0 }}>🔮</div>
            </div>
          </div>
        </div>

        
        <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "22px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#111827" }}>Revenue — Last 30 Days</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Total: AED {analytics?.totalRevenue?.toLocaleString() || 0}</div>
            </div>
            {growth !== null && growth !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 999, background: growth >= 0 ? "#dcfce7" : "#fee2e2", color: growth >= 0 ? "#166534" : "#991b1b" }}>
                {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% vs last week
              </span>
            )}
          </div>
          {analyticsLoading ? (
            <div style={{ height: 120, background: "#f9fafb", borderRadius: 12 }} />
          ) : (
            <>
              <BarChart data={analytics?.revenueChart || []} color="#ff4e2a" height={120}
                labelKey="date" valueKey="revenue"
                formatLabel={fmtDate} formatValue={(v) => `AED ${v}`}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {(analytics?.revenueChart || []).filter((_, i) => i % 5 === 0).map(d => (
                  <span key={d.date} style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDate(d.date)}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Recommendations */}
        {analytics && (
          <div style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", borderRadius: 14, border: "1px solid #7dd3fc", padding: 18, marginBottom: 20, transition: "all 0.3s ease", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(3,105,161,0.15)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: "#0369a1", marginBottom: 12 }}>💡 AI Recommendations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completionRate < 70 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📈</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#075985" }}>Improve Completion Rate</div>
                    <div style={{ fontSize: 12, color: "#0c4a6e", marginTop: 2 }}>Your {completionRate}% completion rate is below average. Focus on faster processing to boost customer satisfaction.</div>
                  </div>
                </div>
              )}
              {pendingOrders.length > activeOrders.length * 0.3 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#075985" }}>High Pending Volume</div>
                    <div style={{ fontSize: 12, color: "#0c4a6e", marginTop: 2 }}>{pendingOrders.length} orders are waiting. Clear these quickly to reduce avg delivery time.</div>
                  </div>
                </div>
              )}
              {avgRating > 0 && avgRating < 4 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⭐</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#075985" }}>Improve Menu Quality</div>
                    <div style={{ fontSize: 12, color: "#0c4a6e", marginTop: 2 }}>Your {avgRating}★ rating needs work. Review low-rated items and consider improving recipes or presentation.</div>
                  </div>
                </div>
              )}
              {growth !== null && growth < 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📉</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#075985" }}>Revenue Declining</div>
                    <div style={{ fontSize: 12, color: "#0c4a6e", marginTop: 2 }}>Revenue is down {Math.abs(growth)}% vs last week. Consider running a promotion or launching new menu items.</div>
                  </div>
                </div>
              )}
              {completionRate > 80 && avgRating > 4.5 && growth > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🌟</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#075985" }}>Great Performance!</div>
                    <div style={{ fontSize: 12, color: "#0c4a6e", marginTop: 2 }}>You're doing excellent! Keep maintaining quality and consider expanding your menu to capitalize on momentum.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "22px 24px" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#111827", marginBottom: 4 }}>Peak Hours</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>When your orders come in</div>
            {analyticsLoading ? (
              <div style={{ height: 60, background: "#f9fafb", borderRadius: 12 }} />
            ) : (
              <>
                <PeakHoursChart data={analytics?.peakHours || []} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {[0, 4, 8, 12, 16, 20, 23].map(h => (
                    <span key={h} style={{ fontSize: 9, color: "#9ca3af" }}>{fmtHour(h)}</span>
                  ))}
                </div>
                {analytics?.peakHours && (() => {
                  const peak = analytics.peakHours.reduce((a, b) => b.count > a.count ? b : a, { count: 0, hour: 0 });
                  return peak.count > 0 ? (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "#fff7ed", borderRadius: 10, fontSize: 12, color: "#92400e", fontWeight: 700 }}>
                      🔥 Busiest: {fmtHour(peak.hour)} ({peak.count} orders)
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>

          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "22px 24px" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#111827", marginBottom: 4 }}>Best Sellers</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>Top items by quantity sold</div>
            {analyticsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 32, background: "#f9fafb", borderRadius: 8 }} />)}
              </div>
            ) : !analytics?.bestSellers?.length ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 13 }}>No sales data yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analytics.bestSellers.map((item, i) => {
                  const maxQty = analytics.bestSellers[0].qty;
                  const pct = (item.qty / maxQty) * 100;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: i === 0 ? "#f59e0b" : "#9ca3af", width: 16, flexShrink: 0 }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{item.name}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{item.qty} sold</span>
                        </div>
                        <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#f59e0b" : "#ff4e2a", borderRadius: 99 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent orders + Tools */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#111827" }}>Recent Orders</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{orders.length} total</div>
              </div>
              <button onClick={() => navigate("/orders")} style={{ fontSize: 12, fontWeight: 700, color: "#ff4e2a", background: "#fff1ee", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                View all →
              </button>
            </div>
            {loading ? (
              <div style={{ padding: 22 }}>{[1,2,3].map(i => <div key={i} style={{ height: 52, background: "#f9fafb", borderRadius: 12, marginBottom: 8 }} />)}</div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: 32 }}>📭</div><div style={{ fontWeight: 600, marginTop: 8 }}>No orders yet</div></div>
            ) : (
              <div style={{ padding: "10px 14px" }}>
                {recentOrders.map((order) => {
                  const sc = STATUS_COLOR[order.status] || STATUS_COLOR["Food Processing"];
                  return (
                    <div key={order._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderRadius: 12 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.address?.firstName} {order.address?.lastName}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.items?.map(i => `${i.name} x${i.quantity}`).join(", ")}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: "#111827" }}>AED {order.amount}</div>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color, marginTop: 3 }}>{order.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Delivery time */}
            <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "20px 22px" }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: "#111827", marginBottom: 4 }}>🚚 Delivery Time Tracking</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>
                Auto-calculate avg delivery time from real orders and update what customers see.
              </div>
              {analytics?.avgDeliveryMins && (
                <div style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>⏱️</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>Current avg: {analytics.avgDeliveryMins} min</div>
                    <div style={{ fontSize: 11, color: "#16a34a" }}>Shown to customers on your restaurant page</div>
                  </div>
                </div>
              )}
              <button onClick={updateDeliveryTime} disabled={updatingTime}
                style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: updatingTime ? "#f3f4f6" : "#8b5cf6", color: updatingTime ? "#9ca3af" : "white", fontWeight: 800, fontSize: 13, cursor: updatingTime ? "wait" : "pointer", fontFamily: "inherit" }}
              >
                {updatingTime ? "Calculating…" : "🔄 Recalculate from Real Data"}
              </button>
              {timeMsg && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: timeMsg.startsWith("✅") ? "#166534" : "#92400e", padding: "8px 12px", background: timeMsg.startsWith("✅") ? "#f0fdf4" : "#fffbeb", borderRadius: 10 }}>
                  {timeMsg}
                </div>
              )}
            </div>

            {/* Re-engagement */}
            <div style={{ background: "linear-gradient(135deg, #1f2937, #111827)", borderRadius: 20, padding: "20px 22px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: "white", marginBottom: 4 }}>💌 Re-engage Customers</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
                Email customers who haven't ordered in a while with a personalised offer.
              </div>

              {!reengageOpen ? (
                <button onClick={() => setReengageOpen(true)}
                  style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: "#ff4e2a", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  📧 Set Up Campaign
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: "daysSince", label: "Target customers inactive for (days)", type: "number" },
                    { key: "subject", label: "Email subject", type: "text" },
                    { key: "heading", label: "Email heading", type: "text" },
                    { key: "body", label: "Message body", type: "textarea" },
                    { key: "promoCode", label: "Promo code (optional)", type: "text" },
                    { key: "ctaText", label: "Button text", type: "text" },
                    { key: "ctaUrl", label: "Button URL", type: "text" },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 4 }}>{label}</div>
                      {type === "textarea" ? (
                        <textarea value={reengageForm[key]}
                          onChange={e => setReengageForm(f => ({ ...f, [key]: e.target.value }))}
                          rows={3}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #374151", background: "#1f2937", color: "white", fontFamily: "inherit", fontSize: 12, resize: "none", outline: "none" }}
                        />
                      ) : (
                        <input type={type} value={reengageForm[key]}
                          onChange={e => setReengageForm(f => ({ ...f, [key]: e.target.value }))}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #374151", background: "#1f2937", color: "white", fontFamily: "inherit", fontSize: 12, outline: "none" }}
                        />
                      )}
                    </div>
                  ))}

                  {reengageResult && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: reengageResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", fontSize: 12, fontWeight: 700, color: reengageResult.success ? "#4ade80" : "#f87171" }}>
                      {reengageResult.success ? `✅ Sent to ${reengageResult.sent} customers!` : `⚠️ ${reengageResult.message}`}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setReengageOpen(false); setReengageResult(null); }}
                      style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #374151", background: "none", color: "#9ca3af", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Cancel
                    </button>
                    <button onClick={sendReengage} disabled={reengageSending}
                      style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: "#ff4e2a", color: "white", fontWeight: 800, fontSize: 12, cursor: reengageSending ? "wait" : "pointer", fontFamily: "inherit", opacity: reengageSending ? 0.7 : 1 }}
                    >
                      {reengageSending ? "Sending…" : "🚀 Send Campaign"}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}