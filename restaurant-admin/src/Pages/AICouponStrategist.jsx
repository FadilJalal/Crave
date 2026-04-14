import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

const SEGMENT_PALETTE = {
  VIP: { main: "#fbbf24", soft: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  "At Risk": { main: "#f43f5e", soft: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.3)" },
  New: { main: "#a855f7", soft: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.3)" },
  Loyal: { main: "#3b82f6", soft: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
  Regular: { main: "#64748b", soft: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)" },
  All: { main: "#06b6d4", soft: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.3)" },
};

export default function AICouponStrategist() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [customGoal, setCustomGoal] = useState("");
  const [customStrategy, setCustomStrategy] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get("/api/ai/restaurant/coupon-data");
      if (res.data.success) setMetrics(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const generateStrategies = async () => {
    setGenerating(true);
    setStrategies([]);
    try {
      const res = await api.post("/api/ai/restaurant/coupon-strategies");
      if (res.data.success) setStrategies(res.data.strategies);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const buildCustomStrategy = async () => {
    if (!customGoal.trim()) return;
    setBuilding(true);
    setCustomStrategy(null);
    try {
      const res = await api.post("/api/ai/restaurant/custom-coupon-strategy", { goal: customGoal });
      if (res.data.success) setCustomStrategy(res.data.strategy);
    } catch (err) {
      console.error(err);
    } finally {
      setBuilding(false);
    }
  };

  const applyCoupon = (strategy) => {
    navigate("/coupons", { state: { suggestedDiscount: strategy.discount, suggestedTitle: strategy.title } });
  };

  const pageBg = dark ? "#0a0a0c" : "#f8fafc";
  const heroBg = "radial-gradient(circle at top right, rgba(242, 78, 30, 0.15), transparent 70%), linear-gradient(135deg, #111827 0%, #0f172a 100%)";

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 1200, margin: "0 auto", padding: "0 24px 60px" }}>
        
        {/* Header Hero */}
        <div style={{
          position: "relative", borderRadius: 36, padding: "48px 48px 40px",
          background: heroBg, marginBottom: 32,
          boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.4)" : "0 10px 30px rgba(0,0,0,0.05)",
          border: dark ? "1px solid rgba(255,255,255,0.05)" : "none",
          overflow: "hidden"
        }}>
          {dark && <div style={{ position: "absolute", top: -50, right: -50, width: 250, height: 250, background: "rgba(242, 78, 30, 0.1)", filter: "blur(60px)", borderRadius: "50%" }} />}
          
          <div style={{ position: "relative", zIndex: 1 }}>
            <h4 style={{ fontSize: 13, fontWeight: 900, color: "#ff4e2a", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>Neural Growth Engine</h4>
            <h1 style={{ fontSize: 38, fontWeight: 900, margin: 0, letterSpacing: "-1.5px", color: dark ? "#f8fafc" : "#0f172a" }}>
              Coupon Growth Lab
            </h1>
            <p style={{ color: dark ? "rgba(248,250,252,0.6)" : "#64748b", fontSize: 16, marginTop: 8, maxWidth: 600 }}>
              AI analyzes your customers and suggests high-impact coupon strategies 
              designed to boost retention and order frequency.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button 
                onClick={generateStrategies} 
                disabled={generating}
                style={{
                  padding: "14px 28px", borderRadius: 16, border: "none",
                  background: "linear-gradient(135deg, #10b981, #3b82f6)",
                  color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10
                }}
              >
                {generating ? <Spinner /> : "✨ Run Strategic Analysis"}
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Metrics Bento Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 48 }}>
          {loadingMetrics ? (
            Array(4).fill(0).map((_, i) => <SkeletonCard key={i} dark={dark} />)
          ) : (
            <>
              <MetricBox title="Active Customers" value={metrics?.totalCustomers || 0} unit="Unique" icon="👥" dark={dark} />
              <MetricBox title="Avg Ticket Size" value={metrics?.avgOrderValue || 0} unit="AED" icon="💰" dark={dark} />
              <MetricBox title="Retention Alert" value={metrics?.atRiskCount || 0} unit="At Risk" icon="⚠️" danger dark={dark} />
              <MetricBox title="Engine Core" value={metrics?.mostOrderedCategory || "N/A"} unit="Popular" icon="⚡" dark={dark} />
            </>
          )}
        </div>

        {/* 📑 Strategies Results */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Proposed Strategies</h2>
            <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.5 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {generating ? (
              Array(4).fill(0).map((_, i) => <SkeletonStrategy dark={dark} key={i} />)
            ) : strategies.length > 0 ? (
              strategies.map((s, i) => (
                <PremiumStrategyCard key={i} strategy={s} onApply={applyCoupon} dark={dark} />
              ))
            ) : (
              <div style={{ 
                gridColumn: "1 / -1", padding: "80px 20px", textAlign: "center", 
                background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                borderRadius: 32, border: "2px dashed var(--border)"
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🧬</div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Laboratory Idle</h3>
                <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>Select 'Run Strategic Analysis' to begin data harvesting.</p>
              </div>
            )}
          </div>
        </div>

        {/* 🛠️ AI Command Center (Custom Builder) */}
        <div style={{
          background: dark ? "#111827" : "#fff",
          borderRadius: 32, padding: "32px",
          border: "1.5px solid var(--border)",
          boxShadow: dark ? "0 30px 60px rgba(0,0,0,0.5)" : "0 15px 40px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 14, 
              background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>🧠</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>AI Command Center</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Inject specific business goals into the strategy engine.</p>
            </div>
          </div>

          <div style={{ 
            background: dark ? "rgba(0,0,0,0.3)" : "#f9fafb", 
            borderRadius: 20, padding: "8px", border: "1px solid var(--border)",
            display: "flex", gap: 8 
          }}>
            <input 
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="Request specific strategy (e.g. 'Drive weekend breakfast orders' or 'Reactivate VIPs')"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "16px 20px", color: "inherit", fontSize: 15, fontWeight: 600
              }}
            />
            <button 
              onClick={buildCustomStrategy}
              disabled={building || !customGoal.trim()}
              style={{
                background: dark ? "#f8fafc" : "#0f172a",
                color: dark ? "#0f172a" : "#fff",
                padding: "0 32px", borderRadius: 14, border: "none",
                fontWeight: 800, cursor: "pointer", fontSize: 14,
                opacity: (building || !customGoal.trim()) ? 0.5 : 1
              }}
            >
              {building ? "Synthesizing..." : "Execute Request"}
            </button>
          </div>

          {customStrategy && (
            <div style={{ marginTop: 32, animation: "fadeIn 0.5s ease-out" }}>
              <PremiumStrategyCard strategy={customStrategy} onApply={applyCoupon} dark={dark} highlighted />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .strategy-hover:hover { transform: translateY(-8px); boxShadow: 0 20px 40px rgba(0,0,0,0.12) !important; }
      `}</style>
    </RestaurantLayout>
  );
}

function MetricBox({ title, value, unit, icon, danger, dark }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.03)" : "white",
      borderRadius: 24, padding: "24px", 
      border: `1px solid ${danger ? "rgba(244,63,94,0.3)" : "var(--border)"}`,
      boxShadow: dark ? "0 8px 30px rgba(0,0,0,0.2)" : "0 4px 15px rgba(0,0,0,0.02)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        {danger && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" }} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-1px", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {title} <span style={{ opacity: 0.5, fontSize: 10 }}>({unit})</span>
      </div>
    </div>
  );
}

function PremiumStrategyCard({ strategy, onApply, dark, highlighted }) {
  const palette = SEGMENT_PALETTE[strategy.segment] || SEGMENT_PALETTE.Regular;
  
  return (
    <div className="strategy-hover" style={{
      background: dark ? (highlighted ? "rgba(139, 92, 246, 0.08)" : "rgba(255,255,255,0.03)") : (highlighted ? "#f5f3ff" : "white"),
      borderRadius: 28, padding: "28px",
      border: `1px solid ${highlighted ? "#8B5CF6" : "var(--border)"}`,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex", flexDirection: "column", height: "100%",
      boxShadow: highlighted ? "0 20px 40px rgba(139, 92, 246, 0.15)" : "0 4px 15px rgba(0,0,0,0.03)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ 
          padding: "6px 16px", borderRadius: 99, fontSize: 11, fontWeight: 900,
          background: palette.soft, color: palette.main, border: `1px solid ${palette.border}`,
          textTransform: "uppercase", letterSpacing: "0.5px"
        }}>{strategy.segment}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", opacity: 0.5 }}>COUPON_STRAT_v1</span>
      </div>

      <h4 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 16px", lineHeight: 1.2 }}>{strategy.title}</h4>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: dark ? "rgba(0,0,0,0.2)" : "#f9fafb", padding: "12px", borderRadius: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>DISCOUNT</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#10b981" }}>{strategy.discount}</div>
        </div>
        <div style={{ background: dark ? "rgba(0,0,0,0.2)" : "#f9fafb", padding: "12px", borderRadius: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>OPTIMAL WINDOW</div>
          <div style={{ fontSize: 14, fontWeight: 900 }}>{strategy.bestTime}</div>
        </div>
      </div>

      <div style={{ 
        flex: 1, padding: "16px", borderRadius: 18, 
        background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc",
        border: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #edf2f7",
        marginBottom: 24, display: "flex", gap: 12
      }}>
        <span style={{ fontSize: 18 }}>💡</span>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.5 }}>
          {strategy.reason}
        </p>
      </div>

      <button 
        onClick={() => onApply(strategy)}
        style={{
          width: "100%", padding: "16px", borderRadius: 18, 
          border: "none",
          background: dark ? "#334155" : "#0f172a",
          color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer",
          transition: "background 0.2s"
        }}
      >
        Push to Storefront
      </button>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>;
}

function SkeletonCard({ dark }) {
  return (
    <div style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f5f5f5", borderRadius: 24, padding: "24px", height: 140 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: dark ? "rgba(255,255,255,0.05)" : "#eee", marginBottom: 20 }}></div>
      <div style={{ width: "60%", height: 30, borderRadius: 6, background: dark ? "rgba(255,255,255,0.05)" : "#eee", marginBottom: 8 }}></div>
      <div style={{ width: "40%", height: 12, borderRadius: 4, background: dark ? "rgba(255,255,255,0.05)" : "#eee" }}></div>
    </div>
  );
}

function SkeletonStrategy({ dark }) {
  return (
    <div style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f5f5f5", borderRadius: 28, padding: "28px", height: 320, border: "1px solid var(--border)" }}>
      <div style={{ width: "30%", height: 20, borderRadius: 99, background: dark ? "rgba(255,255,255,0.05)" : "#eee", marginBottom: 24 }}></div>
      <div style={{ width: "90%", height: 32, borderRadius: 8, background: dark ? "rgba(255,255,255,0.05)" : "#eee", marginBottom: 24 }}></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ height: 50, borderRadius: 16, background: dark ? "rgba(255,255,255,0.05)" : "#eee" }}></div>
        <div style={{ height: 50, borderRadius: 16, background: dark ? "rgba(255,255,255,0.05)" : "#eee" }}></div>
      </div>
      <div style={{ width: "100%", height: 80, borderRadius: 18, background: dark ? "rgba(255,255,255,0.05)" : "#eee" }}></div>
    </div>
  );
}
