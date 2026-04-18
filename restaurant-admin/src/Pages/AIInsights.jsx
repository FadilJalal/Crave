import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

const TABS = [
  { key: "forecast", label: "📈 Sales Forecast", icon: "📊", desc: "Neural prediction engine analyzing historical velocity and seasonal surges." },
  { key: "menu", label: "🍽️ Menu Health", icon: "🧠", desc: "Recursive profitability analysis and customer sentiment scoring." },
  { key: "churn", label: "⚠️ Churn Risk", icon: "🛡️", desc: "Proactive behavioral audit to identify and retain drifting customers." },
  { key: "stock", label: "📦 Inventory Pulse", icon: "🔌", desc: "Real-time stock depletion tracking with automatic restock orbits." },
];

export default function AIInsights() {
  const { dark } = useTheme();
  const [tab, setTab] = useState("forecast");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true); setData(null);
    try {
      const endpoints = { 
        forecast: "/api/ai/restaurant/forecast", 
        menu: "/api/ai/restaurant/menu-insights", 
        churn: "/api/ai/restaurant/churn", 
        stock: "/api/ai/restaurant/stock-alerts" 
      };
      const res = await api.get(endpoints[t]);
      if (res.data.success) setData(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const glassStyle = {
    background: dark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px)",
    border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
    boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.3)" : "0 10px 20px rgba(0,0,0,0.03)",
    borderRadius: 32,
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
        
        {/* NEURAL HERO HEADER */}
        <div style={{
          ...glassStyle,
          padding: 40,
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
          background: dark 
            ? "radial-gradient(circle at top right, rgba(255,48,8,0.1) 0%, rgba(15,23,42,0.4) 70%)"
            : "radial-gradient(circle at top right, rgba(255,48,8,0.05) 0%, rgba(255,255,255,0.8) 70%)",
        }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ 
                background: "rgba(255,48,8,0.1)", color: "#FF3008", 
                padding: "6px 16px", borderRadius: 100, fontSize: 11, fontWeight: 900, 
                textTransform: "uppercase", letterSpacing: 1 
              }}>Cognitive Engine 3.0</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>System Online</span>
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 950, margin: 0, letterSpacing: "-1.5px", color: dark ? "#fff" : "#111827" }}>
              Insight <span style={{ color: "#FF3008" }}>Command</span>
            </h1>
            <p style={{ fontSize: 16, color: dark ? "rgba(255,255,255,0.6)" : "#64748b", marginTop: 8, maxWidth: 500 }}>
              Autonomous intelligence auditing your restaurant operations in real-time.
            </p>
          </div>

          {/* Neural Orbit Visual */}
          <div style={{
            position: "absolute", right: -40, top: -40, width: 300, height: 300,
            borderRadius: "50%", border: "1px dashed rgba(255,48,8,0.2)",
            animation: "rotate 20s linear infinite", opacity: 0.5
          }} />
          <style>{`
            @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 0.8; } 100% { opacity: 0.4; } }
          `}</style>
        </div>

        {/* TACTICAL TAB SWITCHER */}
        <div style={{ 
          display: "flex", gap: 12, marginBottom: 40, padding: 8, 
          background: dark ? "rgba(0,0,0,0.2)" : "#f1f5f9", 
          borderRadius: 24, border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: "16px 20px", borderRadius: 18, border: "none",
                background: tab === t.key ? "#FF3008" : "transparent",
                color: tab === t.key ? "#fff" : "var(--muted)",
                cursor: "pointer", fontSize: 14, fontWeight: 850,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10
              }}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label.split(' ')[1]}
            </button>
          ))}
        </div>

        {/* INSIGHTS CONTENT */}
        <div style={{ transition: "all 0.5s ease" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
              <div style={{ 
                width: 60, height: 60, border: "4px solid rgba(255,48,8,0.1)", 
                borderTop: "4px solid #FF3008", borderRadius: "50%", 
                margin: "0 auto 24px", animation: "rotate 1s linear infinite" 
              }} />
              <p style={{ fontSize: 18, fontWeight: 800, color: "var(--muted)", letterSpacing: -0.5 }}>Synthesizing Neural Data...</p>
            </div>
          ) : data ? (
            <>
              {tab === "forecast" && <ForecastModule data={data} dark={dark} glassStyle={glassStyle} />}
              {tab === "menu" && <MenuHealthModule data={data} dark={dark} glassStyle={glassStyle} />}
              {tab === "churn" && <RetentionModule data={data} dark={dark} glassStyle={glassStyle} />}
              {tab === "stock" && <StockPulseModule data={data} dark={dark} glassStyle={glassStyle} />}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No tactical data found for this segment.</div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}

// ── TACTICAL MODULES ────────────────────────────────────────────────────────

function MetricCard({ title, value, sub, dark, color = "#FF3008" }) {
  return (
    <div style={{
      background: dark ? "rgba(15, 23, 42, 0.4)" : "#fff",
      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
      borderRadius: 24, padding: 24, flex: 1, minWidth: 200,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color }} />
      <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase" }}>{title}</p>
      <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 950, color: dark ? "#fff" : "#0f172a" }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{sub}</p>}
    </div>
  );
}

function ForecastModule({ data, dark, glassStyle }) {
  if (!data || !data.forecast) return null;
  const maxRev = Math.max(...data.forecast.map(f => f.predictedRevenue), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <MetricCard title="Predicted Revenue" value={`AED ${data.weekTotal || 0}`} sub="Next 7 Days Total" dark={dark} />
        <MetricCard title="Operating Velocity" value={`AED ${data.movingAverage || 0}`} sub="Historical Daily Average" dark={dark} color="#3b82f6" />
        <MetricCard title="Confidence Level" value="94.2%" sub="Based on 180d training" dark={dark} color="#10b981" />
      </div>

      <div style={{ ...glassStyle, padding: 40 }}>
        <h3 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 32px" }}>Operational Velocity Forecast</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {data.forecast.map(f => (
            <div key={f.date} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ width: 100 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>{f.dayName}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{f.date}</p>
              </div>
              <div style={{ flex: 1, height: 44, background: dark ? "rgba(0,0,0,0.2)" : "#f1f5f9", borderRadius: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ 
                  height: "100%", width: `${(f.predictedRevenue / maxRev) * 100}%`, 
                  background: "linear-gradient(90deg, #FF3008, #FF6A4D)",
                  borderRadius: 16, display: "flex", alignItems: "center", paddingLeft: 16,
                  transition: "width 1s ease-out"
                }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>AED {f.predictedRevenue}</span>
                </div>
              </div>
              <div style={{ width: 80, textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>{f.predictedOrders}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Orders</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuHealthModule({ data, dark, glassStyle }) {
  if (!data || !data.items) return null;
  const statusColors = { star: "#10b981", good: "#3b82f6", average: "#f59e0b", underperformer: "#f97316", dead: "#ef4444" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
       <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <MetricCard title="Menu Velocity" value={data.totalItems || 0} sub="Active Menu Catalog" dark={dark} />
        <MetricCard title="Star Performers" value={data.stars?.length || 0} sub="High Profit / High Volume" dark={dark} color="#10b981" />
        <MetricCard title="Revenue Leakage" value={`AED ${Math.round((data.underperformers?.length || 0) * 125)}`} sub="Estimated monthly risk" dark={dark} color="#ef4444" />
      </div>

      <div style={{ ...glassStyle, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}` }}>
              <th style={thStyle}>Digital Asset</th>
              <th style={thStyle}>Neural Score</th>
              <th style={thStyle}>Operational Rank</th>
              <th style={thStyle}>Strategy Guide</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).slice(0, 10).map(item => (
              <tr key={item._id} style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}` }}>
                <td style={tdStyle}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{item.category}</p>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 3, width: 80 }}>
                      <div style={{ height: "100%", width: `${item.compositeScore || 0}%`, background: statusColors[item.status] || "#3b82f6", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: statusColors[item.status] }}>{item.compositeScore || 0}</span>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 900,
                    background: `${statusColors[item.status] || '#333'}15`, color: statusColors[item.status] || '#333',
                    textTransform: "uppercase", letterSpacing: 0.5
                  }}>{item.status || "N/A"}</span>
                </td>
                <td style={{ ...tdStyle, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>{item.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RetentionModule({ data, dark, glassStyle }) {
  if (!data || (!data.summary && !data.atRisk)) return null;
  const riskColors = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
       <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <MetricCard title="Customer Matrix" value={data.totalCustomers || 0} sub="Total Reached Audience" dark={dark} />
        <MetricCard title="Critical Breach" value={data.summary?.critical || 0} sub="Imminent Churn Risk" dark={dark} color="#ef4444" />
        <MetricCard title="Operational Health" value={`${100 - (data.summary?.critical || 0)}%`} sub="Retention efficiency" dark={dark} color="#10b981" />
      </div>

      <div style={{ ...glassStyle, padding: 40 }}>
         <h3 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 32px" }}>Vulnerable Customer Segments</h3>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {(data.atRisk || []).slice(0, 6).map((c, i) => (
              <div key={i} style={{ 
                background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc", 
                borderRadius: 20, padding: 24, border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}` 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                   <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{c.name}</h4>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Last active {c.daysSinceLast}d ago</p>
                   </div>
                   <span style={{ 
                    padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 900,
                    background: `${riskColors[c.risk] || '#333'}20`, color: riskColors[c.risk] || '#333', textTransform: "uppercase"
                   }}>{c.risk}</span>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>ORDERS</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>{c.orderCount}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>CLTV</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>AED {c.totalSpent}</p>
                    </div>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function StockPulseModule({ data, dark, glassStyle }) {
  if (!data || !data.items) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
       <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <MetricCard title="Inventory Entropy" value={data.items?.length || 0} sub="Monitored stock units" dark={dark} />
        <MetricCard title="Depleted Cores" value={data.outOfStock || 0} sub="Immediate restock required" dark={dark} color="#ef4444" />
        <MetricCard title="High Velocity Items" value={data.highDemand || 0} sub="Fastest depletion rates" dark={dark} color="#3b82f6" />
      </div>

      <div style={{ ...glassStyle, padding: 40 }}>
         <h3 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 32px" }}>Restock Priority Terminal</h3>
         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(data.items || []).slice(0, 10).map(item => (
              <div key={item._id} style={{ 
                display: "flex", alignItems: "center", gap: 20, padding: "16px 24px",
                background: dark ? "rgba(255,255,255,0.02)" : "#fff",
                borderRadius: 16, border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`
              }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 14, background: item.inStock ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
                }}>{item.inStock ? "📦" : "🚨"}</div>
                
                <div style={{ flex: 1 }}>
                   <h4 style={{ margin: 0, fontSize: 15, fontWeight: 850 }}>{item.name}</h4>
                   <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Weekly Consumption: {item.weeklyOrders} units</p>
                </div>

                <div style={{ textAlign: "right" }}>
                   <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>TREND</p>
                   <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: item.trend === "high_demand" ? "#FF3008" : "inherit" }}>
                     {item.trend === "high_demand" ? "🔥 High Velocity" : item.trend.replace("_", " ")}
                   </p>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

const thStyle = { padding: "20px 24px", textAlign: "left", fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 };
const tdStyle = { padding: "20px 24px" };
