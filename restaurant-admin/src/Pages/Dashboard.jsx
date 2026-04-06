import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { hasFeatureAccess } from "../utils/featureAccess";
import { useTheme } from "../ThemeContext";

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

function InsightChip({ label, value, tone = "default", dark = false }) {
  const tones = {
    default: { bg: dark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.04)", border: dark ? "rgba(255,255,255,0.22)" : "rgba(17,24,39,0.08)", color: dark ? "#ffffff" : "#111827", label: dark ? "rgba(255,255,255,0.78)" : "#6b7280" },
    warm: { bg: dark ? "rgba(251,146,60,0.16)" : "rgba(251,146,60,0.12)", border: dark ? "rgba(254,215,170,0.34)" : "rgba(245,158,11,0.25)", color: dark ? "#fff7ed" : "#92400e", label: dark ? "rgba(255,243,224,0.82)" : "#a16207" },
    cool: { bg: dark ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.12)", border: dark ? "rgba(191,219,254,0.34)" : "rgba(59,130,246,0.22)", color: dark ? "#eff6ff" : "#1e3a8a", label: dark ? "rgba(219,234,254,0.82)" : "#1d4ed8" },
    mint: { bg: dark ? "rgba(16,185,129,0.16)" : "rgba(16,185,129,0.12)", border: dark ? "rgba(167,243,208,0.34)" : "rgba(16,185,129,0.25)", color: dark ? "#ecfdf5" : "#065f46", label: dark ? "rgba(209,250,229,0.84)" : "#047857" },
  };
  const active = tones[tone] || tones.default;
  return (
    <div style={{ padding: "14px 16px", borderRadius: 20, background: active.bg, border: `1px solid ${active.border}`, minWidth: 0, color: active.color, backdropFilter: "blur(14px)", boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px", color: active.label, fontWeight: 900, marginBottom: 8, textShadow: dark ? "0 1px 10px rgba(0,0,0,0.22)" : "none" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: active.color, lineHeight: 1.35, textShadow: dark ? "0 2px 16px rgba(0,0,0,0.24)" : "none" }}>{value}</div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent, loading, badge, dark = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      background: dark ? (hovered ? "linear-gradient(135deg, #1e2536 0%, #252d3d 100%)" : "linear-gradient(135deg, #181f2e 0%, #1f2740 100%)") : "#ffffff",
      borderRadius: 20, padding: "20px 22px",
      border: `1px solid ${hovered ? accent + "55" : (dark ? "rgba(255,255,255,0.07)" : "#e5e7eb")}`,
      boxShadow: hovered ? (dark ? `0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px ${accent}33` : `0 12px 30px ${accent}1a`) : (dark ? "0 4px 20px rgba(0,0,0,0.22)" : "0 4px 18px rgba(17,24,39,0.06)"),
      position: "relative", overflow: "hidden", transition: "all 0.25s ease", cursor: "pointer",
      transform: hovered ? "translateY(-4px)" : "translateY(0)", minHeight: 148, display: "flex", flexDirection: "column", justifyContent: "space-between"
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: accent, borderRadius: "20px 20px 0 0", opacity: hovered ? 1 : 0.7 }} />
      <div style={{ position: "absolute", bottom: -28, right: -18, width: 80, height: 80, borderRadius: "50%", background: accent + (dark ? "12" : "10"), pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: dark ? "rgba(255,255,255,0.45)" : "#6b7280", letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: dark ? "white" : "#111827", letterSpacing: "-0.8px", lineHeight: 1.05 }}>
            {loading ? <span style={{ opacity: 0.25 }}>—</span> : value}
          </div>
          {sub && <div style={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.4)" : "#6b7280", marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0, marginLeft: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: accent + (dark ? "22" : "14"), border: `1px solid ${accent}${dark ? "33" : "2b"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {icon}
          </div>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
              background: badge.positive ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
              color: badge.positive ? "#86efac" : "#fca5a5",
              border: badge.positive ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(239,68,68,0.28)",
            }}>
              {badge.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

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

function QuickLinkTile({ icon, label, sub, onClick, accent = "#ff4e2a", dark = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "16px 16px 15px",
        borderRadius: 18,
        border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e7eb",
        background: dark ? "linear-gradient(135deg, #181f2e 0%, #1f2740 100%)" : "#ffffff",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.22)" : "0 4px 14px rgba(17,24,39,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 18px 34px ${accent}33`;
        e.currentTarget.style.borderColor = `${accent}44`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = dark ? "0 4px 16px rgba(0,0,0,0.22)" : "0 4px 14px rgba(17,24,39,0.06)";
        e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 14, background: `${accent}${dark ? "22" : "14"}`, border: `1px solid ${accent}${dark ? "33" : "2b"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, color: dark ? "white" : "#111827" }}>{label}</div>
      <div style={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.42)" : "#6b7280", fontWeight: 600, marginTop: 5, lineHeight: 1.45 }}>{sub}</div>
    </button>
  );
}

function MoodPanel({ title, value, sub, emoji, tone, dark = false }) {
  const palette = {
    green: { accent: "#22c55e", glow: "rgba(34,197,94,0.15)" },
    amber: { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
    violet: { accent: "#8b5cf6", glow: "rgba(139,92,246,0.15)" },
    red: { accent: "#ef4444", glow: "rgba(239,68,68,0.15)" },
  };
  const active = palette[tone] || palette.green;

  return (
    <div
      style={{ background: dark ? "linear-gradient(135deg, #181f2e 0%, #1f2740 100%)" : "#ffffff", borderRadius: 20, border: `1px solid ${active.accent}33`, padding: 20, minHeight: 158, boxShadow: dark ? `0 4px 20px rgba(0,0,0,0.22)` : `0 4px 18px rgba(17,24,39,0.06)`, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform .22s ease, box-shadow .22s ease", position: "relative", overflow: "hidden" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = dark ? `0 18px 38px rgba(0,0,0,0.32), 0 0 0 1px ${active.accent}44` : `0 16px 30px ${active.accent}1f`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = dark ? "0 4px 20px rgba(0,0,0,0.22)" : "0 4px 18px rgba(17,24,39,0.06)";
      }}
    >
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: active.glow, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 10, color: dark ? "rgba(255,255,255,0.45)" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: active.accent, letterSpacing: "-0.8px", lineHeight: 1.05 }}>{value}</div>
          <div style={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#6b7280", fontWeight: 600, marginTop: 7 }}>{sub}</div>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: 18, background: active.accent + (dark ? "18" : "12"), border: `1px solid ${active.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{emoji}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { dark } = useTheme();
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
  const statusTone = healthScore > 75 ? "green" : healthScore > 50 ? "amber" : "red";
  const revenueTone = revenueTrend >= 0 ? "green" : "red";
  const panelBg = dark ? "linear-gradient(135deg, #181f2e 0%, #1f2740 100%)" : "#ffffff";
  const panelBorder = dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e7eb";
  const panelShadow = dark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 4px 18px rgba(17,24,39,0.06)";
  const titleColor = dark ? "white" : "#111827";
  const mutedColor = dark ? "rgba(255,255,255,0.4)" : "#6b7280";
  const rowHover = dark ? "rgba(255,255,255,0.04)" : "#f9fafb";
  const heroBg = dark
    ? "radial-gradient(circle at top left, rgba(251,146,60,0.45), transparent 28%), radial-gradient(circle at top right, rgba(59,130,246,0.24), transparent 30%), linear-gradient(135deg, #111827 0%, #1f2937 45%, #312e81 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)";
  const heroText = dark ? "white" : "#111827";
  const heroSubText = dark ? "rgba(255,255,255,0.76)" : "#6b7280";

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 1240, margin: "0 auto", padding: "0 10px 40px", background: "#ffffff", minHeight: "100vh", borderRadius: 0 }}>

        {/* Header */}
        <div style={{
          position: "relative",
          overflow: "hidden",
          marginBottom: 24,
          borderRadius: 28,
          padding: "28px 28px 24px",
          background: heroBg,
          boxShadow: dark ? "0 24px 60px rgba(15,23,42,0.18)" : "0 12px 32px rgba(17,24,39,0.08)",
          border: dark ? "none" : "1px solid #e5e7eb",
        }}>
          <div style={{ position: "absolute", top: -24, right: -18, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(2px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -46, left: 40, width: 120, height: 120, borderRadius: "50%", background: "rgba(251,191,36,0.05)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: dark ? "rgba(255,255,255,0.1)" : "rgba(17,24,39,0.05)", color: heroText, border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(17,24,39,0.08)", fontSize: 12, fontWeight: 800, letterSpacing: "0.4px", marginBottom: 14 }}>
                <span>⚡</span>
                Restaurant Control Center
              </div>
              <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900, letterSpacing: "-1.4px", color: heroText, lineHeight: 1.02 }}>
                {new Date().getHours() < 12 ? "Good morning." : new Date().getHours() < 17 ? "Good afternoon." : "Good evening."}
              </h1>
              <p style={{ margin: "12px 0 0", fontSize: 15, color: heroSubText, fontWeight: 500, maxWidth: 640, lineHeight: 1.6 }}>
                {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {todayOrders.length} orders today · AED {todayRevenue} revenue so far
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/orders")} style={{ padding: "11px 16px", borderRadius: 14, border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(17,24,39,0.12)", background: dark ? "rgba(255,255,255,0.1)" : "#ffffff", color: dark ? "white" : "#111827", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(10px)" }}>
                🧾 Orders {pendingOrders.length > 0 && (
                  <span style={{ marginLeft: 5, background: "#ff4e2a", color: "white", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>
                    {pendingOrders.length}
                  </span>
                )}
              </button>
              <button onClick={goAddFoodOrBilling} style={{ padding: "11px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "white", color: "#111827", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }}>
                + Add Food
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 22, position: "relative", zIndex: 1 }}>
            {[
              { label: "Today's Orders", value: loading ? "—" : String(todayOrders.length), tone: "cool" },
              { label: "Pending", value: loading ? "—" : String(pendingOrders.length), tone: "warm" },
              { label: "Today's Revenue", value: loading ? "—" : `AED ${todayRevenue}`, tone: "mint" },
              { label: "Completion Rate", value: loading ? "—" : `${completionRate}%`, tone: "default" },
            ].map((chip, i) => (
              <InsightChip key={i} label={chip.label} value={chip.value} tone={chip.tone} dark={dark} />
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { icon: "📦", label: "Today's Orders", value: todayOrders.length, sub: "orders placed today", accent: "#3b82f6" },
            { icon: "⏳", label: "Pending", value: pendingOrders.length, sub: "awaiting processing", accent: "#ef4444",
              badge: pendingOrders.length > 3 ? { text: "High", positive: false } : pendingOrders.length === 0 ? { text: "Clear ✓", positive: true } : null },
            { icon: "💰", label: "Today's Revenue", value: `AED ${todayRevenue}`, sub: `This week: AED ${analytics?.thisWeekRevenue || 0}`, accent: "#22c55e",
              badge: growth !== null && growth !== undefined ? { text: `${growth >= 0 ? "+" : ""}${growth}%`, positive: growth >= 0 } : null },
            { icon: "🚚", label: "Avg Delivery", value: analytics?.avgDeliveryMins ? `${analytics.avgDeliveryMins} min` : "—", sub: analytics?.avgDeliveryMins ? "based on real deliveries" : "no data yet", accent: "#8b5cf6" },
            { icon: "✅", label: "Completion", value: `${completionRate}%`, sub: `${completedOrders} of ${activeOrders.length} delivered`, accent: "#10b981",
              badge: completionRate > 90 ? { text: "Excellent", positive: true } : completionRate > 70 ? { text: "Good", positive: true } : { text: "Needs work", positive: false } },
            { icon: "⭐", label: "Avg Rating", value: avgRating > 0 ? `${avgRating}★` : "—", sub: foods.length > 0 ? `Across ${foods.length} items` : "no ratings yet", accent: "#f59e0b" },
            { icon: "🍽️", label: "Menu Items", value: foods.length, sub: outOfStockCount > 0 ? `${outOfStockCount} out of stock` : "All in stock", accent: "#6366f1",
              badge: outOfStockCount > 0 ? { text: `${outOfStockCount} out`, positive: false } : { text: "All ready", positive: true } },
            { icon: "💡", label: "Health Score", value: `${healthScore}/100`, sub: healthScore > 75 ? "Excellent shape" : healthScore > 50 ? "Mostly solid" : "Needs attention", accent: healthScore > 75 ? "#10b981" : healthScore > 50 ? "#f59e0b" : "#ef4444" },
          ].map((s, i) => (
            <StatCard key={i} icon={s.icon} label={s.label} value={loading || (s.label === "Avg Delivery" && analyticsLoading) ? "—" : s.value} sub={s.sub} accent={s.accent} loading={false} badge={s.badge} dark={dark} />
          ))}
        </div>



        {/* Alerts & Quick Actions */}
        {(outOfStockCount > 0 || pendingOrders.length > 3) && (
          <div style={{ display: "grid", gridTemplateColumns: outOfStockCount > 0 && pendingOrders.length > 3 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 24 }}>
            {outOfStockCount > 0 && (
              <div style={{ background: dark ? "linear-gradient(135deg, #1f1a0e 0%, #241e0f 100%)" : "#fffaf0", borderRadius: 14, border: "1px solid rgba(245,158,11,0.3)", padding: 18, transition: "all 0.3s ease", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(245,158,11,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "#fbbf24", marginBottom: 4 }}>⚠️ {outOfStockCount} Items Out of Stock</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(251,191,36,0.7)" : "#a16207", marginBottom: 12 }}>Update availability to maintain customer satisfaction</div>
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
              <div style={{ background: dark ? "linear-gradient(135deg, #1f0e0e 0%, #240f0f 100%)" : "#fff5f5", borderRadius: 14, border: "1px solid rgba(239,68,68,0.3)", padding: 18, transition: "all 0.3s ease", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(239,68,68,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "#f87171", marginBottom: 4 }}>🔥 {pendingOrders.length} Orders Pending</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(248,113,113,0.7)" : "#b91c1c", marginBottom: 12 }}>Process these to reduce delivery time and improve ratings</div>
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
        <div style={{ background: dark ? "linear-gradient(135deg, #161d2c 0%, #1b2236 100%)" : "#ffffff", borderRadius: 22, border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e7eb", boxShadow: dark ? "0 12px 30px rgba(0,0,0,0.25)" : "0 8px 24px rgba(17,24,39,0.08)", padding: 20, marginBottom: 24, transition: "transform .22s ease, box-shadow .22s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 22px 40px rgba(0,0,0,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)"; }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: titleColor }}>Quick Access</div>
              <div style={{ fontSize: 12, color: mutedColor, marginTop: 3 }}>The pages you actually open when service gets busy.</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <QuickLinkTile icon="📦" label="Inventory" sub="Check stock and ingredient levels" onClick={() => navigate("/inventory")} accent="#f59e0b" dark={dark} />
            <QuickLinkTile icon="🏷️" label="Promos" sub="Launch offers and boost slower days" onClick={() => navigate("/promos")} accent="#ec4899" dark={dark} />
            <QuickLinkTile icon="🤖" label="AI Insights" sub="See smart suggestions and trends" onClick={() => navigate("/ai-insights")} accent="#6366f1" dark={dark} />
            <QuickLinkTile icon="👥" label="Customers" sub="Track regulars and re-engagement" onClick={() => navigate("/customers")} accent="#06b6d4" dark={dark} />
            <QuickLinkTile icon="💰" label="Revenue" sub="Watch revenue mood and payment mix" onClick={() => navigate("/revenue")} accent="#10b981" dark={dark} />
            <QuickLinkTile icon={canMenu ? "🍽️" : "🔒"} label={canMenu ? "Menu" : "Menu Locked"} sub={canMenu ? "Update items and availability" : "Upgrade to unlock menu tools"} onClick={goMenuOrBilling} accent={canMenu ? "#ff4e2a" : "#6b7280"} dark={dark} />
          </div>
        </div>

        {/* Health Score & Predictions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
          <MoodPanel title="Restaurant Health" value={`${healthScore}`} sub={healthScore > 75 ? "Excellent shape right now" : healthScore > 50 ? "Mostly solid with room to tighten ops" : "Needs attention before service slips"} emoji={healthScore > 75 ? "😊" : healthScore > 50 ? "😐" : "😟"} tone={statusTone} dark={dark} />
          <MoodPanel title="Revenue vs Yesterday" value={`${revenueTrend >= 0 ? "+" : ""}${revenueTrend}%`} sub={`Yesterday closed at AED ${yesterdayRevenue}`} emoji={revenueTrend >= 0 ? "📈" : "📉"} tone={revenueTone} dark={dark} />
          <MoodPanel title="Rest of Day Forecast" value={`AED ${predictedRevenue}`} sub={`${predictedOrders} more orders projected before close`} emoji="🔮" tone="violet" dark={dark} />
        </div>

        
        <div style={{ background: panelBg, borderRadius: 20, border: panelBorder, boxShadow: panelShadow, padding: "22px 24px", marginBottom: 20, transition: "transform .22s ease, box-shadow .22s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 18px 38px rgba(255,78,42,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)"; }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: titleColor }}>Revenue — Last 30 Days</div>
              <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>Total: AED {analytics?.totalRevenue?.toLocaleString() || 0}</div>
            </div>
            {growth !== null && growth !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 999, background: growth >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)", color: growth >= 0 ? "#86efac" : "#fca5a5", border: growth >= 0 ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(239,68,68,0.28)" }}>
                {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% vs last week
              </span>
            )}
          </div>
          {analyticsLoading ? (
            <div style={{ height: 120, background: dark ? "rgba(255,255,255,0.04)" : "#f3f4f6", borderRadius: 12 }} />
          ) : (
            <>
              <BarChart data={analytics?.revenueChart || []} color="#ff4e2a" height={120}
                labelKey="date" valueKey="revenue"
                formatLabel={fmtDate} formatValue={(v) => `AED ${v}`}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {(analytics?.revenueChart || []).filter((_, i) => i % 5 === 0).map(d => (
                  <span key={d.date} style={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.35)" : "#9ca3af" }}>{fmtDate(d.date)}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Recommendations */}
        {analytics && (
          <div style={{ background: dark ? "linear-gradient(135deg, #111e30 0%, #0f1d2e 100%)" : "#eff6ff", borderRadius: 14, border: "1px solid rgba(59,130,246,0.25)", padding: 18, marginBottom: 20, transition: "all 0.3s ease", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(59,130,246,0.12)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: dark ? "#93c5fd" : "#1d4ed8", marginBottom: 12 }}>💡 AI Recommendations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completionRate < 70 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📈</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: dark ? "#bfdbfe" : "#1e3a8a" }}>Improve Completion Rate</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(191,219,254,0.7)" : "#1d4ed8", marginTop: 2 }}>Your {completionRate}% completion rate is below average. Focus on faster processing to boost customer satisfaction.</div>
                  </div>
                </div>
              )}
              {pendingOrders.length > activeOrders.length * 0.3 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⏱️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: dark ? "#bfdbfe" : "#1e3a8a" }}>High Pending Volume</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(191,219,254,0.7)" : "#1d4ed8", marginTop: 2 }}>{pendingOrders.length} orders are waiting. Clear these quickly to reduce avg delivery time.</div>
                  </div>
                </div>
              )}
              {avgRating > 0 && avgRating < 4 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⭐</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: dark ? "#bfdbfe" : "#1e3a8a" }}>Improve Menu Quality</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(191,219,254,0.7)" : "#1d4ed8", marginTop: 2 }}>Your {avgRating}★ rating needs work. Review low-rated items and consider improving recipes or presentation.</div>
                  </div>
                </div>
              )}
              {growth !== null && growth < 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📉</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: dark ? "#bfdbfe" : "#1e3a8a" }}>Revenue Declining</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(191,219,254,0.7)" : "#1d4ed8", marginTop: 2 }}>Revenue is down {Math.abs(growth)}% vs last week. Consider running a promotion or launching new menu items.</div>
                  </div>
                </div>
              )}
              {completionRate > 80 && avgRating > 4.5 && growth > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🌟</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: dark ? "#bfdbfe" : "#1e3a8a" }}>Great Performance!</div>
                    <div style={{ fontSize: 12, color: dark ? "rgba(191,219,254,0.7)" : "#1d4ed8", marginTop: 2 }}>You're doing excellent! Keep maintaining quality and consider expanding your menu to capitalize on momentum.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          <div style={{ background: panelBg, borderRadius: 20, border: panelBorder, boxShadow: panelShadow, padding: "22px 24px", transition: "transform .22s ease, box-shadow .22s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 18px 38px rgba(255,78,42,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)"; }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: titleColor, marginBottom: 4 }}>Peak Hours</div>
            <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>When your orders come in</div>
            {analyticsLoading ? (
              <div style={{ height: 60, background: dark ? "rgba(255,255,255,0.04)" : "#f3f4f6", borderRadius: 12 }} />
            ) : (
              <>
                <PeakHoursChart data={analytics?.peakHours || []} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {[0, 4, 8, 12, 16, 20, 23].map(h => (
                    <span key={h} style={{ fontSize: 9, color: dark ? "rgba(255,255,255,0.35)" : "#9ca3af" }}>{fmtHour(h)}</span>
                  ))}
                </div>
                {analytics?.peakHours && (() => {
                  const peak = analytics.peakHours.reduce((a, b) => b.count > a.count ? b : a, { count: 0, hour: 0 });
                  return peak.count > 0 ? (
                      <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(251,146,60,0.12)", borderRadius: 10, fontSize: 12, color: "#fbbf24", fontWeight: 700, border: "1px solid rgba(251,146,60,0.22)" }}>
                      🔥 Busiest: {fmtHour(peak.hour)} ({peak.count} orders)
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>

          <div style={{ background: panelBg, borderRadius: 20, border: panelBorder, boxShadow: panelShadow, padding: "22px 24px", transition: "transform .22s ease, box-shadow .22s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 18px 38px rgba(245,158,11,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)"; }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: titleColor, marginBottom: 4 }}>Best Sellers</div>
            <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>Top items by quantity sold</div>
            {analyticsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 32, background: dark ? "rgba(255,255,255,0.04)" : "#f3f4f6", borderRadius: 8 }} />)}
              </div>
            ) : !analytics?.bestSellers?.length ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: dark ? "rgba(255,255,255,0.3)" : "#9ca3af", fontSize: 13 }}>No sales data yet</div>
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
                          <span style={{ fontSize: 12, fontWeight: 700, color: titleColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{item.name}</span>
                          <span style={{ fontSize: 11, color: mutedColor, flexShrink: 0 }}>{item.qty} sold</span>
                        </div>
                        <div style={{ height: 4, background: dark ? "rgba(255,255,255,0.08)" : "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
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

          <div style={{ background: panelBg, borderRadius: 20, border: panelBorder, boxShadow: panelShadow, overflow: "hidden", transition: "transform .22s ease, box-shadow .22s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 18px 38px rgba(15,23,42,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)"; }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: titleColor }}>Recent Orders</div>
                <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{orders.length} total</div>
              </div>
              <button onClick={() => navigate("/orders")} style={{ fontSize: 12, fontWeight: 700, color: "#ff4e2a", background: "#fff1ee", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                View all →
              </button>
            </div>
            {loading ? (
              <div style={{ padding: 22 }}>{[1,2,3].map(i => <div key={i} style={{ height: 52, background: dark ? "rgba(255,255,255,0.04)" : "#f3f4f6", borderRadius: 12, marginBottom: 8 }} />)}</div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: 32 }}>📭</div><div style={{ fontWeight: 600, marginTop: 8 }}>No orders yet</div></div>
            ) : (
              <div style={{ padding: "10px 14px" }}>
                {recentOrders.map((order) => {
                  const sc = STATUS_COLOR[order.status] || STATUS_COLOR["Food Processing"];
                  return (
                    <div key={order._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderRadius: 12 }}
                      onMouseEnter={e => e.currentTarget.style.background = rowHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: dark ? "rgba(255,255,255,0.08)" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.address?.firstName} {order.address?.lastName}
                          </div>
                          <div style={{ fontSize: 11, color: mutedColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.items?.map(i => `${i.name} x${i.quantity}`).join(", ")}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: titleColor }}>AED {order.amount}</div>
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
            <div style={{ background: panelBg, borderRadius: 20, border: panelBorder, boxShadow: panelShadow, padding: "20px 22px", transition: "transform .22s ease, box-shadow .22s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 18px 38px rgba(139,92,246,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)"; }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: titleColor, marginBottom: 4 }}>🚚 Delivery Time Tracking</div>
              <div style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
                Auto-calculate avg delivery time from real orders and update what customers see.
              </div>
              {analytics?.avgDeliveryMins && (
                <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.1)", borderRadius: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(34,197,94,0.2)" }}>
                  <span style={{ fontSize: 20 }}>⏱️</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#86efac" }}>Current avg: {analytics.avgDeliveryMins} min</div>
                    <div style={{ fontSize: 11, color: "rgba(134,239,172,0.7)" }}>Shown to customers on your restaurant page</div>
                  </div>
                </div>
              )}
              <button onClick={updateDeliveryTime} disabled={updatingTime}
                style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: updatingTime ? "#f3f4f6" : "#8b5cf6", color: updatingTime ? "#9ca3af" : "white", fontWeight: 800, fontSize: 13, cursor: updatingTime ? "wait" : "pointer", fontFamily: "inherit" }}
              >
                {updatingTime ? "Calculating…" : "🔄 Recalculate from Real Data"}
              </button>
              {timeMsg && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: timeMsg.startsWith("✅") ? "#86efac" : "#fbbf24", padding: "8px 12px", background: timeMsg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(251,191,36,0.1)", borderRadius: 10, border: timeMsg.startsWith("✅") ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(251,191,36,0.2)" }}>
                  {timeMsg}
                </div>
              )}
            </div>

            {/* Re-engagement */}
            <div style={{ background: dark ? "linear-gradient(135deg, #1f2937, #111827)" : "#ffffff", borderRadius: 20, padding: "20px 22px", boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.18)" : "0 4px 18px rgba(17,24,39,0.06)", border: dark ? "none" : "1px solid #e5e7eb", flex: 1, transition: "transform .22s ease, box-shadow .22s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 44px rgba(17,24,39,0.28)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)"; }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: titleColor, marginBottom: 4 }}>💌 Re-engage Customers</div>
              <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>
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
                      <div style={{ fontSize: 11, fontWeight: 700, color: dark ? "#9ca3af" : "#6b7280", marginBottom: 4 }}>{label}</div>
                      {type === "textarea" ? (
                        <textarea value={reengageForm[key]}
                          onChange={e => setReengageForm(f => ({ ...f, [key]: e.target.value }))}
                          rows={3}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: dark ? "1px solid #374151" : "1px solid #d1d5db", background: dark ? "#1f2937" : "#ffffff", color: dark ? "white" : "#111827", fontFamily: "inherit", fontSize: 12, resize: "none", outline: "none" }}
                        />
                      ) : (
                        <input type={type} value={reengageForm[key]}
                          onChange={e => setReengageForm(f => ({ ...f, [key]: e.target.value }))}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: dark ? "1px solid #374151" : "1px solid #d1d5db", background: dark ? "#1f2937" : "#ffffff", color: dark ? "white" : "#111827", fontFamily: "inherit", fontSize: 12, outline: "none" }}
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
                      style={{ flex: 1, padding: "10px", borderRadius: 10, border: dark ? "1px solid #374151" : "1px solid #d1d5db", background: "none", color: dark ? "#9ca3af" : "#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
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