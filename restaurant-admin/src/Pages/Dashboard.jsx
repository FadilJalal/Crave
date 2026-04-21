import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import QuickActions from "../components/QuickActions";
import AlertSection from "../components/AlertSection";
import ActivityFeed from "../components/ActivityFeed";
import MiniInsights from "../components/MiniInsights";
import TopItems from "../components/TopItems";
import ReviewsPreview from "../components/ReviewsPreview";
import NotificationCenter from "../components/NotificationCenter";
import { toast } from "react-toastify";
import "./Dashboard.css";

const STATUS_CONFIG = {
  "Order Placed": { color: "#EF4444", bg: "#fef2f2", label: "New Order", icon: "🔔" },
  "Order Accepted": { color: "#059669", bg: "#ecfdf5", label: "Accepted", icon: "✅" },
  "Food Processing": { color: "#EAB308", bg: "#FEFCE8", label: "Preparing", icon: "🍳" },
  "Out for Delivery": { color: "#3B82F6", bg: "#EFF6FF", label: "On the way", icon: "🛵" },
  "Ready": { color: "#3B82F6", bg: "#EFF6FF", label: "Ready", icon: "📦" },
  "Delivered": { color: "#22C55E", bg: "#F0FDF4", label: "Delivered", icon: "🏁" },
  "Pending": { color: "#6B7280", bg: "#F3F4F6", label: "Pending", icon: "🔔" },
};

const QuickOrderStatus = ({ orders, onUpdate, dark }) => {
  const [updatingId, setUpdatingId] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const activeOrders = useMemo(() => {
    return orders
      .filter(o => o.status !== "Delivered" && o.status !== "Cancelled")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [orders]);

  const handleUpdate = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    const success = await onUpdate(orderId, newStatus);
    setUpdatingId(null);
    if (success) {
      setSuccessId(orderId);
      setTimeout(() => setSuccessId(null), 1500);
    }
  };

  const getActionButton = (order) => {
    const status = order.status;
    if (status === "Order Placed") return { label: "Accept Order", next: "Order Accepted", color: "#059669", icon: "✅" };
    if (status === "Order Accepted") return { label: "Start Prep", next: "Food Processing", color: "#EAB308", icon: "🍳" };
    if (status === "Food Processing") return { label: "Start Delivery", next: "Out for Delivery", color: "#3b82f6", icon: "🛵" };
    if (status === "Out for Delivery") return { label: "Complete Order", next: "Delivered", color: "#10b981", icon: "🏁" };
    return null;
  };

  return (
    <div style={{ marginTop: 40, paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: dark ? "white" : "#111827", letterSpacing: "-0.5px" }}>
            Quick Order Status
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
            Manage active orders in real-time
          </p>
        </div>
        <button 
          onClick={() => window.location.href='/orders'}
          style={{ background: "none", border: "none", color: "#ff4e2a", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          View All Orders <span style={{ fontSize: 18 }}>→</span>
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div style={{ 
          padding: "40px", textAlign: "center", borderRadius: 24, 
          background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
          border: "1px dashed var(--border)", color: "var(--muted)"
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>All caught up!</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>New orders will appear here for rapid status updates.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {activeOrders.map(order => {
            const status = order.status || "Pending";
            const config = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
            const timeAgo = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
            const isUpdating = updatingId === order._id;
            const isSuccess = successId === order._id;

            return (
              <div key={order._id} style={{ 
                background: dark ? "var(--sidebar-bg)" : "white", 
                borderRadius: 20, padding: "16px 24px", border: "1px solid var(--border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "default"
              }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.04)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.02)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 14, background: config.bg, color: config.color,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900
                  }}>
                    {config.icon}
                  </div>
                  
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 900, fontSize: 15 }}>#{order._id.slice(-6).toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>• {timeAgo < 1 ? 'Just now' : `${timeAgo} mins ago`}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      {order.address?.firstName || "Customer"} <span style={{ color: "var(--muted)", fontWeight: 500, margin: "0 4px" }}>•</span> AED {order.amount}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Status Badge */}
                  <div style={{ 
                    padding: "6px 14px", borderRadius: 10, background: config.bg, color: config.color,
                    fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px"
                  }}>
                    {config.label}
                  </div>

                  {/* Dropdown Action */}
                <div style={{ position: "relative" }}>
                  {isUpdating ? (
                    <div className="spinner" style={{ width: 24, height: 24, border: "3px solid #f3f3f3", borderTop: "3px solid #ff4e2a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  ) : isSuccess ? (
                    <div style={{ color: "#22c55e", fontSize: 24, fontWeight: 900 }}>✓</div>
                  ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                      {(() => {
                        const action = getActionButton(order);
                        if (!action) return null;
                        return (
                          <button 
                            onClick={() => handleUpdate(order._id, action.next)}
                            style={{
                              padding: "10px 20px", borderRadius: 12, border: "none",
                              background: action.color, color: "white", fontWeight: 900, 
                              fontSize: 12, cursor: "pointer", boxShadow: `0 4px 12px ${action.color}33`,
                              transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                            onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                          >
                            <span>{action.icon}</span> {action.label}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

function HeroChip({ icon, label, value, sub, dark, badge }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 18,
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.12)",
      border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.18)",
      backdropFilter: "blur(20px)", boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.05)" : "0 4px 12px rgba(0,0,0,0.02)",
      transition: "all .3s ease", position: "relative"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{label}</span>
        </div>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 900, padding: "3px 8px", borderRadius: 6, background: badge.positive ? "#10B981" : "#EF4444", color: "white" }}>
            {badge.text}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 950, color: "white", letterSpacing: "-0.8px", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const DashboardSummary = ({ stats, orders, dark }) => {
  const pendingCount = orders.filter(o => o.status === "Order Placed").length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 28, position: "relative", zIndex: 1 }}>
      <HeroChip icon="📦" label="TODAY'S ORDERS" value={`${stats.todayOrdersCount}`} sub="orders placed today" dark={dark} />
      <HeroChip icon="⏳" label="PENDING" value={`${pendingCount}`} sub={pendingCount === 0 ? "all clear right now" : "awaiting acceptance"} dark={dark} badge={pendingCount === 0 ? { text: "Clear", positive: true } : null} />
      <HeroChip icon="💰" label="REVENUE" value={`AED ${stats.todayRevenue}`} sub="Real-time today" dark={dark} />
      <HeroChip icon="✅" label="COMPLETION" value={`${stats.completionRate}%`} sub="Processed today" dark={dark} />
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [foods, setFoods] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState({ data: [], avgRating: 0, total: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const knownIdsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const playAlert = useCallback(() => {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(880, 0, 0.12);
      beep(1100, 0.15, 0.12);
      beep(1320, 0.30, 0.18);
    } catch { }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [f, i, o, s, r] = await Promise.all([
        api.get("/api/restaurantadmin/foods"),
        api.get("/api/inventory"),
        api.get("/api/order/restaurant/list"),
        api.get("/api/subscription/mine"),
        api.get("/api/review/restaurant-admin/list"),
      ]);
      if (f.data?.success) setFoods(f.data.data || []);
      if (i.data?.success) setInventory(i.data.data || []);
      if (o.data?.success) {
        const incoming = o.data.data || [];
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(incoming.map(ord => ord._id));
        } else {
          const brandNew = incoming.filter(ord => !knownIdsRef.current.has(ord._id));
          if (brandNew.length > 0) {
            knownIdsRef.current = new Set(incoming.map(ord => ord._id));
            playAlert();
            toast.success(`🛎️ New order arrived!`, { autoClose: 6000 });
          }
        }
        setOrders(incoming || []);
      }
      if (s.data?.success) setSub(s.data.data);
      if (r.data?.success) setReviews({
        data: r.data.data || [],
        avgRating: r.data.avgRating || 0,
        total: r.data.total || 0
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(), 10000); // 10s auto-sync

    const loadAnalytics = async () => {
      try {
        const res = await api.get("/api/restaurantadmin/analytics");
        if (res.data?.success) setAnalytics(res.data.data);
      } catch (err) { console.error(err); }
    };
    loadAnalytics();
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await api.post("/api/order/restaurant/status", { orderId, status });
      if (res.data?.success) {
        toast.success(`Updated to ${status}`);
        loadData();
        return true;
      }
      return false;
    } catch (err) { 
      toast.error("Failed to update status"); 
      return false;
    }
  };

  const today = new Date().toDateString();
  const activeOrders = useMemo(() => orders.filter(o => (o.status || "").toLowerCase() !== "cancelled"), [orders]);
  const todayOrders = useMemo(() => activeOrders.filter(o => new Date(o.createdAt).toDateString() === today), [activeOrders, today]);
  const pendingOrders = useMemo(() => activeOrders.filter(o => o.status === "Food Processing" || o.status === "Pending"), [activeOrders]);
  const todayRevenue = useMemo(() => todayOrders.reduce((s, o) => s + (o.amount || 0), 0), [todayOrders]);
  const completedOrders = useMemo(() => activeOrders.filter(o => o.status === "Delivered").length, [activeOrders]);
  const completionRate = activeOrders.length === 0 ? 0 : Math.round((completedOrders / activeOrders.length) * 100);

  const activityData = useMemo(() => {
    const list = [];
    orders.slice(0, 5).forEach(o => {
      list.push({
        id: `order-${o._id}`, type: "order", 
        title: o.status === "Delivered" ? "Order Delivered" : "New Order Received",
        desc: `Order #${(o._id || "").slice(-6).toUpperCase()} ${o.userName ? `by ${o.userName}` : ""} (AED ${o.amount || 0})`,
        time: o.createdAt, color: o.status === "Delivered" ? "#10b981" : "#3b82f6", icon: o.status === "Delivered" ? "✅" : "📦"
      });
    });
    reviews.data.slice(0, 3).forEach(rv => {
      list.push({
        id: `review-${rv._id}`, type: "review", title: `${rv.rating}-Star Review`,
        desc: rv.comment ? `"${rv.comment.slice(0, 60)}..."` : `Received rating from ${rv.userName || 'Customer'}`,
        time: rv.createdAt, color: "#f59e0b", icon: "⭐"
      });
    });
    return list.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  }, [orders, reviews.data]);

  const calculatedAlerts = useMemo(() => {
    const arr = [];
    if (sub?.isActive === false) arr.push({ id: "status", type: "danger", title: "Restaurant Offline", desc: "No new orders can be received.", icon: "🏪", action: () => navigate("/settings"), cta: "Fix" });
    const lowStock = inventory.filter(i => i.currentStock <= i.minimumStock && i.isActive);
    if (lowStock.length > 0) arr.push({ id: "stock", type: "warning", title: "Low Stock Alert", desc: `${lowStock.length} items running low`, icon: "📉", action: () => navigate("/inventory"), cta: "Items" });
    if (pendingOrders.length > 5) arr.push({ id: "orders", type: "danger", title: "Order Backlog", desc: `${pendingOrders.length} pending orders.`, icon: "🔥", action: () => navigate("/orders"), cta: "Queue" });
    return arr;
  }, [sub, inventory, pendingOrders, navigate]);

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 1100, margin: "0 auto", padding: "24px 20px 40px", background: dark ? "#0a0a0c" : "#f8fafc", minHeight: "100vh" }}>

        <div style={{ position: "relative", borderRadius: 32, padding: "20px 40px 32px", background: "radial-gradient(circle at top right, rgba(255, 78, 42, 0.15), transparent 60%), linear-gradient(135deg, #111827 0%, #0f172a 100%)", boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.4)" : "0 10px 30px rgba(0,0,0,0.05)", border: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)", overflow: "visible", zIndex: 50 }}>
          {dark && <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, background: "rgba(255, 78, 42, 0.1)", filter: "blur(70px)", borderRadius: "50%", pointerEvents: "none" }} />}
          <div style={{ position: "absolute", top: 32, right: 32, display: "flex", gap: 10, alignItems: "center", zIndex: 10 }}>
            <button onClick={() => navigate("/orders")} style={{ 
              position: "relative",
              padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", 
              background: "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, 
              cursor: "pointer", backdropFilter: "blur(12px)" 
            }}>
              🧾 Orders
              {pendingOrders.length > 0 && (
                <span style={{
                  position: "absolute", top: -8, right: -8, width: 22, height: 22,
                  background: "#ff4e2a", color: "white", borderRadius: "50%",
                  fontSize: 10, fontWeight: 950, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(255,78,42,0.4)", border: "2px solid #111827",
                  animation: "pulse 2s infinite"
                }}>
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button onClick={() => navigate("/add-food")} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#ff4e2a", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 25px rgba(255,78,42,0.3)" }}>+ Add Food</button>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.14)", fontSize: 11, fontWeight: 800, letterSpacing: "0.4px", marginBottom: 12, backdropFilter: "blur(12px)" }}><span>⚡</span> Control Center</div>
              <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", color: "white", lineHeight: 1.05 }}>{new Date().getHours() < 12 ? "Good morning." : new Date().getHours() < 17 ? "Good afternoon." : "Good evening."}</h1>
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 500, maxWidth: 640 }}>{new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long" })} · {todayOrders.length} orders today · AED {todayRevenue} revenue so far</p>
            </div>
          </div>
          <DashboardSummary stats={{ todayRevenue, todayOrdersCount: todayOrders.length, completionRate }} orders={orders} dark={dark} />
        </div>

        <QuickActions dark={dark} />

        <div style={{ marginTop: 32 }}>
          <AlertSection alerts={calculatedAlerts} dark={dark} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          <TopItems foods={foods} bestSellers={analytics?.bestSellers || []} dark={dark} />
          <ActivityFeed activities={activityData} dark={dark} />
        </div>

        {/* --- Quick Order Management --- */}
        <QuickOrderStatus orders={orders} onUpdate={updateStatus} dark={dark} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          <ReviewsPreview reviews={reviews.data} avgRating={reviews.avgRating} total={reviews.total} dark={dark} />
          <MiniInsights analytics={analytics} orders={orders} dark={dark} />
        </div>

      </div>
    </RestaurantLayout>
  );
}