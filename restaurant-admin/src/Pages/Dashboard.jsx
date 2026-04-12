import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { hasFeatureAccess } from "../utils/featureAccess";
import { useTheme } from "../ThemeContext";
import QuickActions from "../components/QuickActions";
import AlertSection from "../components/AlertSection";
import ActivityFeed from "../components/ActivityFeed";
import MiniInsights from "../components/MiniInsights";
import TopItems from "../components/TopItems";
import ReviewsPreview from "../components/ReviewsPreview";
import "./Dashboard.css";

const STATUS_COLOR = {
  "Food Processing": { bg: "#fef3c7", color: "#92400e" },
  "Out for Delivery": { bg: "#dbeafe", color: "#1e40af" },
  "Delivered": { bg: "#dcfce7", color: "#166534" },
  "Cancelled": { bg: "#fee2e2", color: "#991b1b" },
};

function HeroChip({ icon, label, value, sub, tint = "rgba(255,255,255,0.12)", badge }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 20,
      background: tint,
      border: "1px solid rgba(255,255,255,0.14)",
      backdropFilter: "blur(14px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      minWidth: 0,
      transition: "transform .2s ease, box-shadow .2s ease, background .2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</span>
        </div>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: badge.positive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)", color: badge.positive ? "#86efac" : "#fca5a5" }}>
            {badge.text}
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-0.8px", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

const DashboardSummary = ({ stats, dark }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 28, position: "relative", zIndex: 1 }}>
    <HeroChip icon="📦" label="TODAY'S ORDERS" value={`${stats.todayOrdersCount}`} sub="orders placed today" tint={dark ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.08)"} />
    <HeroChip icon="⏳" label="PENDING" value={`${stats.pendingOrdersCount}`} sub={stats.pendingOrdersCount === 0 ? "all clear right now" : "awaiting preparation"} tint={dark ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)"} badge={stats.pendingOrdersCount === 0 ? { text: "Clear", positive: true } : null} />
    <HeroChip icon="💰" label="TODAY'S REVENUE" value={`AED ${stats.todayRevenue}`} sub="Real-time today" tint={dark ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)"} />
    <HeroChip icon="✅" label="COMPLETION" value={`${stats.completionRate}%`} sub="Processed orders" tint={dark ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.08)"} />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
   const [foods, setFoods] = useState([]);
   const [inventory, setInventory] = useState([]);
   const [orders, setOrders] = useState([]);
   const [reviews, setReviews] = useState({ data: [], avgRating: 0, total: 0 });
   const [analytics, setAnalytics] = useState(null);
   const [loading, setLoading] = useState(true);
   const [analyticsLoading, setAnalyticsLoading] = useState(true);
   const [sub, setSub] = useState(null);
 
   useEffect(() => {
     const loadData = async () => {
       try {
         setLoading(true);
         const [f, i, o, s, r] = await Promise.all([
           api.get("/api/restaurantadmin/foods"),
           api.get("/api/inventory"),
           api.get("/api/order/restaurant/list"),
           api.get("/api/subscription/mine"),
           api.get("/api/review/restaurant-admin/list"),
         ]);
         if (f.data?.success) setFoods(f.data.data || []);
         if (i.data?.success) setInventory(i.data.data || []);
         if (o.data?.success) setOrders(o.data.data || []);
         if (s.data?.success) setSub(s.data.data);
         if (r.data?.success) setReviews({
           data: r.data.data || [],
           avgRating: r.data.avgRating || 0,
           total: r.data.total || 0
         });
       } catch (err) { console.error(err); } finally { setLoading(false); }
     };
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const res = await api.get("/api/restaurantadmin/analytics");
        if (res.data?.success) setAnalytics(res.data.data);
      } catch (err) { console.error(err); } finally { setAnalyticsLoading(false); }
    };
    loadData(); loadAnalytics();
  }, []);

  const today = new Date().toDateString();
  const activeOrders = useMemo(() => orders.filter(o => (o.status || "").toLowerCase() !== "cancelled"), [orders]);
  const todayOrders = useMemo(() => activeOrders.filter(o => new Date(o.createdAt).toDateString() === today), [activeOrders, today]);
  const pendingOrders = useMemo(() => activeOrders.filter(o => o.status === "Food Processing"), [activeOrders]);
  const todayRevenue = useMemo(() => todayOrders.reduce((s, o) => s + (o.amount || 0), 0), [todayOrders]);
  const completedOrders = useMemo(() => activeOrders.filter(o => o.status === "Delivered").length, [activeOrders]);
  const completionRate = activeOrders.length === 0 ? 0 : Math.round((completedOrders / activeOrders.length) * 100);

  // --- Derive Real Activity Feed ---
  const activityData = useMemo(() => {
    const list = [];
    
    // Add Latest Orders
    orders.slice(0, 5).forEach(o => {
      list.push({
        id: `order-${o._id}`,
        type: "order",
        title: o.status === "Delivered" ? "Order Delivered" : "New Order Received",
        desc: `Order #${(o._id || "").slice(-6).toUpperCase()} ${o.userName ? `by ${o.userName}` : ""} (AED ${o.amount || 0})`,
        time: o.createdAt,
        color: o.status === "Delivered" ? "#10b981" : "#3b82f6",
        icon: o.status === "Delivered" ? "✅" : "📦"
      });
    });

    // Add Latest Reviews
    reviews.data.slice(0, 3).forEach(rv => {
      list.push({
        id: `review-${rv._id}`,
        type: "review",
        title: `${rv.rating}-Star Review`,
        desc: rv.comment ? `"${rv.comment.slice(0, 60)}${rv.comment.length > 60 ? '...' : ''}"` : `Received a ${rv.rating} star rating from ${rv.userName || 'Customer'}`,
        time: rv.createdAt,
        color: "#f59e0b",
        icon: "⭐"
      });
    });

    // Sort by true date desc
    return list.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  }, [orders, reviews.data]);
  
  const goAddFoodOrBilling = () => { navigate("/add-food"); };

  const pageBg = dark ? "var(--bg)" : "#f8fafc";
  const heroBg = dark ? "linear-gradient(135deg, #111827 0%, #172033 52%, #1f2937 100%)" : "linear-gradient(135deg, #1e293b 0%, #334155 42%, #ff5a1f 100%)";
  const heroText = "white";
  const heroSubText = "rgba(255,255,255,0.76)";

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1300, margin: "0 auto", padding: "0 20px 40px", background: pageBg, minHeight: "100vh" }}>

        {/* Header Section Only */}
        <div style={{
          position: "relative", overflow: "hidden", borderRadius: 32, padding: "32px 32px 28px",
          background: heroBg, boxShadow: dark ? "0 24px 60px rgba(2,6,23,0.45)" : "0 18px 42px rgba(15,23,42,0.10)", border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(226,232,240,0.8)",
        }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.05)", filter: "blur(40px)", pointerEvents: "none" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: heroText, border: "1px solid rgba(255,255,255,0.14)", fontSize: 12, fontWeight: 800, letterSpacing: "0.4px", marginBottom: 16, backdropFilter: "blur(12px)" }}>
                <span>⚡</span> Restaurant Control Center
              </div>
              <h1 style={{ margin: 0, fontSize: 44, fontWeight: 900, letterSpacing: "-1.8px", color: heroText, lineHeight: 1.05 }}>
                {(() => {
                  const h = new Date().getHours();
                  if (h >= 5 && h < 12) return "Good morning.";
                  if (h >= 12 && h < 17) return "Good afternoon.";
                  return "Good evening.";
                })()}
              </h1>
              <p style={{ margin: "14px 0 0", fontSize: 16, color: heroSubText, fontWeight: 500, maxWidth: 640 }}>
                {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })} · {todayOrders.length} orders today · AED {todayRevenue} revenue so far
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={toggle} style={{ padding: "12px 18px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(12px)" }}>
                {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
              </button>
              <button onClick={() => navigate("/orders")} style={{ padding: "12px 18px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(12px)" }}>
                🧾 Orders
              </button>
              <button onClick={goAddFoodOrBilling} style={{ padding: "12px 20px", borderRadius: 16, border: "none", background: "var(--orange)", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 25px rgba(255,90,31,0.3)" }}>
                + Add Food
              </button>
            </div>
          </div>

          <DashboardSummary 
          stats={{ 
            todayRevenue, 
            pendingOrdersCount: pendingOrders.length, 
            completionRate,
            todayOrdersCount: todayOrders.length 
          }} 
          dark={dark} 
        />
        </div>

        {/* Full Width Quick Management Row */}
        <QuickActions dark={dark} />

        {/* Full Width Priorities Row */}
        <div style={{ marginTop: 32 }}>
          <AlertSection 
            foods={foods} 
            inventory={inventory} 
            pendingOrders={pendingOrders} 
            restaurantStatus={sub?.restaurantStatus || "open"} 
            dark={dark} 
          />
        </div>

        {/* Row 3: 3 Equals (Insight Strip) */}
        <div style={{ marginTop: 24 }}>
          <MiniInsights analytics={analytics} orders={orders} dark={dark} />
        </div>

        {/* Row 4: Wide/Narrow Split (Result Row) */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginTop: 24 }}>
           <TopItems foods={foods} bestSellers={analytics?.bestSellers || []} dark={dark} />
           <ReviewsPreview 
            reviews={reviews.data} 
            avgRating={reviews.avgRating} 
            total={reviews.total} 
            dark={dark} 
          />
        </div>

        {/* Row 5: Full Width (Activity Log) */}
        <ActivityFeed activities={activityData} dark={dark} />

      </div>
    </RestaurantLayout>
  );
}