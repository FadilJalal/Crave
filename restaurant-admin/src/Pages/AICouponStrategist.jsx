import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";

const SEGMENT_META = {
  VIP:      { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  icon: "👑", label: "VIP" },
  Loyal:    { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)",  icon: "💎", label: "Loyal" },
  Regular:  { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.25)",  icon: "🧑", label: "Regular" },
  "At Risk":{ color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)",  icon: "⚠️", label: "At Risk" },
  Lost:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   icon: "💔", label: "Lost" },
  New:      { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  icon: "🌱", label: "New" },
  All:      { color: "#06b6d4", bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.25)",   icon: "🌐", label: "All" },
};

const QUICK_GOALS = [
  { label: "Reactivate lost customers",  icon: "💔" },
  { label: "Boost weekend sales",         icon: "🔥" },
  { label: "Reward VIP customers",        icon: "👑" },
  { label: "Clear slow-moving inventory", icon: "📦" },
  { label: "Win back At Risk buyers",     icon: "⚠️" },
];

const Spinner = () => (
  <span style={{ display:"inline-block", width:16, height:16, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", animation:"cgl-spin 0.6s linear infinite" }} />
);

export default function AICouponStrategist() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [metrics, setMetrics]             = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [strategies, setStrategies]       = useState([]);
  const [generating, setGenerating]       = useState(false);
  const [customGoal, setCustomGoal]       = useState("");
  const [customStrategy, setCustomStrategy] = useState(null);
  const [building, setBuilding]           = useState(false);
  const [selected, setSelected]           = useState(null); // expanded strategy

  useEffect(() => { fetchMetrics(); }, []);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await api.get("/api/ai/restaurant/coupon-data");
      if (res.data?.success) setMetrics(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoadingMetrics(false); }
  };

  const runAnalysis = async () => {
    setGenerating(true);
    setStrategies([]);
    setCustomStrategy(null);
    setSelected(null);
    try {
      const res = await api.post("/api/ai/restaurant/coupon-strategies");
      if (res.data?.success) setStrategies(res.data.strategies || []);
      else toast.error("AI analysis failed. Try again.");
    } catch { toast.error("Network error during analysis."); }
    finally { setGenerating(false); }
  };

  const buildCustom = async () => {
    if (!customGoal.trim()) return;
    setBuilding(true);
    setCustomStrategy(null);
    try {
      const res = await api.post("/api/ai/restaurant/custom-coupon-strategy", { goal: customGoal });
      if (res.data?.success) setCustomStrategy(res.data.strategy);
      else toast.error("Could not generate custom strategy.");
    } catch { toast.error("Network error."); }
    finally { setBuilding(false); }
  };

  const pushToStorefront = (strategy) => {
    navigate("/coupons", { state: { suggestedDiscount: strategy.discount, suggestedTitle: strategy.title } });
  };

  // ── Theme ──
  const bg    = dark ? "#05070a" : "#f8fafc";
  const card  = dark ? "rgba(255,255,255,0.025)" : "#ffffff";
  const bord  = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const txt   = dark ? "#f1f5f9" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#64748b";
  const surf  = dark ? "rgba(255,255,255,0.04)" : "#f8fafc";

  const KPI = [
    { icon: "👥", label: "Active Customers", value: metrics?.totalCustomers ?? "—", color: "#3b82f6" },
    { icon: "💰", label: "Avg Ticket (AED)",  value: metrics?.avgOrderValue  ?? "—", color: "#f59e0b" },
    { icon: "⚠️", label: "At-Risk Count",     value: metrics?.atRiskCount    ?? "—", color: "#f97316", alert: true },
    { icon: "⚡", label: "Top Category",      value: metrics?.mostOrderedCategory ?? "—", color: "#10b981" },
  ];

  return (
    <RestaurantLayout>
      <div style={{ background: bg, color: txt, minHeight: "100vh", fontFamily: "'Outfit', sans-serif", padding: "40px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#10b981", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
            Neural Growth Engine · Growth &amp; AI
          </div>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 950, letterSpacing: "-1.5px" }}>
            Coupon <span style={{ color: "#10b981" }}>Growth Lab</span>
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: muted, fontWeight: 500, maxWidth: 580 }}>
            AI analyzes your order data and synthesizes targeted coupon strategies designed to boost retention, reactivate churn, and unlock new revenue.
          </p>
        </div>

        {/* ── KPI Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          {KPI.map((k, i) => (
            <div key={i} style={{ background: card, border: `1px solid ${k.alert ? k.color + "44" : bord}`, borderRadius: 20, padding: "20px 22px", boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.25)" : "0 2px 12px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
              {k.alert && <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: k.color, boxShadow: `0 0 8px ${k.color}` }} />}
              <div style={{ fontSize: 26, marginBottom: 10 }}>{k.icon}</div>
              {loadingMetrics
                ? <div style={{ height: 28, width: "60%", borderRadius: 8, background: surf, marginBottom: 6 }} />
                : <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.5px", color: k.color }}>{k.value}</div>
              }
              <div style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: "uppercase", letterSpacing: 1 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── Main Grid: Custom Goal + Strategy Results ── */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, marginBottom: 28, alignItems: "start" }}>

          {/* Left: AI Command Center */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Run Analysis */}
            <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 24, padding: 24, boxShadow: dark ? "0 12px 30px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Auto-Analysis</div>
              <p style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
                Let the AI scan your order history and generate 5 ready-to-deploy coupon strategies.
              </p>
              <button
                onClick={runAnalysis}
                disabled={generating}
                style={{ width: "100%", padding: "14px", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #10b981, #3b82f6)", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 10px 28px rgba(16,185,129,0.25)", opacity: generating ? 0.7 : 1 }}
              >
                {generating ? <><Spinner /> Analyzing...</> : "✨ Run Strategic Analysis"}
              </button>
            </div>

            {/* Custom Goal */}
            <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 24, padding: 24, boxShadow: dark ? "0 12px 30px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧠</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>Custom Goal</div>
                  <div style={{ fontSize: 12, color: muted }}>Describe your objective</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {QUICK_GOALS.map((g, i) => (
                  <button key={i} onClick={() => setCustomGoal(g.label)}
                    style={{ padding: "6px 12px", borderRadius: 10, border: `1px solid ${customGoal === g.label ? "#8b5cf6" : bord}`, background: customGoal === g.label ? "#8b5cf620" : "transparent", color: customGoal === g.label ? "#8b5cf6" : muted, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    {g.icon} {g.label}
                  </button>
                ))}
              </div>

              <textarea
                value={customGoal}
                onChange={e => setCustomGoal(e.target.value)}
                placeholder="e.g. 'I want to win back customers who haven't ordered in 3 weeks with a surprise offer'"
                style={{ width: "100%", minHeight: 90, background: surf, border: `1px solid ${bord}`, borderRadius: 14, padding: "14px", color: txt, fontSize: 13, fontWeight: 600, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
              />
              <button
                onClick={buildCustom}
                disabled={building || !customGoal.trim()}
                style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 14, border: "none", background: dark ? "#1e293b" : "#0f172a", color: "#fff", fontWeight: 900, fontSize: 14, cursor: building || !customGoal.trim() ? "not-allowed" : "pointer", opacity: building || !customGoal.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {building ? <><Spinner /> Synthesizing...</> : "⚡ Execute Request"}
              </button>
            </div>

            {/* Custom Strategy Result */}
            {customStrategy && (
              <StrategyCard s={customStrategy} dark={dark} card={card} bord={bord} muted={muted} surf={surf} highlighted onApply={pushToStorefront} />
            )}
          </div>

          {/* Right: Strategy Results */}
          <div>
            {generating ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 280, borderRadius: 24, background: card, border: `1px solid ${bord}`, animation: "cgl-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : strategies.length > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Generated Strategies</h2>
                  <div style={{ flex: 1, height: 1, background: bord }} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(16,185,129,0.25)" }}>
                    {strategies.length} READY
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {strategies.map((s, i) => (
                    <StrategyCard key={i} s={s} dark={dark} card={card} bord={bord} muted={muted} surf={surf} onApply={pushToStorefront}
                      isExpanded={selected === i} onExpand={() => setSelected(selected === i ? null : i)} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 360, background: card, border: `2px dashed ${bord}`, borderRadius: 28, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🧬</div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Laboratory Idle</h3>
                <p style={{ color: muted, marginTop: 10, fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
                  Click <strong>"✨ Run Strategic Analysis"</strong> to generate AI-crafted coupon strategies based on your real order data.
                </p>
                <button onClick={runAnalysis} style={{ marginTop: 24, padding: "13px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #10b981, #3b82f6)", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 25px rgba(16,185,129,0.2)" }}>
                  ✨ Start Analysis
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900;950&display=swap');
          @keyframes cgl-spin { to { transform: rotate(360deg); } }
          @keyframes cgl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .cgl-card:hover { transform: translateY(-4px); }
        `}</style>
      </div>
    </RestaurantLayout>
  );
}

// ── Strategy Card ────────────────────────────────────────────────────────────
function StrategyCard({ s, dark, card, bord, muted, surf, highlighted, onApply, isExpanded, onExpand }) {
  const meta = SEGMENT_META[s?.segment] || SEGMENT_META.All;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="cgl-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: highlighted ? meta.bg : card,
        border: `1.5px solid ${highlighted || hovered ? meta.color + "60" : bord}`,
        borderRadius: 24, padding: 24,
        cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: hovered ? `0 20px 40px rgba(0,0,0,${dark ? "0.4" : "0.08"}), 0 0 0 1px ${meta.color}22` : (dark ? "0 4px 16px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.04)"),
        display: "flex", flexDirection: "column", gap: 16,
        position: "relative", overflow: "hidden"
      }}
    >
      {/* Accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}44)` }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 4 }}>
        <span style={{ padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 900, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {meta.icon} {s?.segment || "All"}
        </span>
        {highlighted && (
          <span style={{ fontSize: 10, fontWeight: 900, color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "3px 10px", borderRadius: 99 }}>CUSTOM</span>
        )}
      </div>

      {/* Title */}
      <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, lineHeight: 1.3 }}>{s?.title || "Untitled Strategy"}</h4>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: surf, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Discount</div>
          <div style={{ fontSize: 18, fontWeight: 950, color: "#10b981" }}>{s?.discount || "—"}</div>
        </div>
        <div style={{ background: surf, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Best Window</div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{s?.bestTime || "Anytime"}</div>
        </div>
      </div>

      {/* Reason */}
      <div style={{ background: surf, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
        <p style={{ margin: 0, fontSize: 13, color: muted, fontWeight: 600, lineHeight: 1.6 }}>{s?.reason || "AI-recommended strategy based on customer behavior."}</p>
      </div>

      {/* CTA */}
      <button
        onClick={() => onApply(s)}
        style={{ width: "100%", padding: "14px", borderRadius: 16, border: "none", background: meta.color, color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", boxShadow: `0 8px 20px ${meta.color}33`, transition: "opacity 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        🚀 Push to Storefront
      </button>
    </div>
  );
}
