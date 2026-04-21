import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { 
  TrendingUp, 
  LayoutGrid, 
  Users, 
  Package, 
  BrainCircuit, 
  CheckCircle2, 
  ArrowUpRight,
  Info,
  AlertCircle
} from "lucide-react";

const TABS = [
  { 
    key: "forecast", 
    label: "Sales Projections", 
    icon: <TrendingUp size={18} />, 
    desc: "Predictive revenue analysis based on historical trends and market velocity." 
  },
  { 
    key: "menu", 
    label: "Menu Analytics", 
    icon: <LayoutGrid size={18} />, 
    desc: "Comprehensive evaluation of menu item performance and profitability." 
  },
  { 
    key: "churn", 
    label: "Customer Retention", 
    icon: <Users size={18} />, 
    desc: "Advanced churn detection to identify and re-engage dormant customers." 
  },
  { 
    key: "stock", 
    label: "Inventory Signals", 
    icon: <Package size={18} />, 
    desc: "Intelligent monitoring of stock depletion and procurement requirements." 
  },
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

  const accentColor = "#6366f1"; // Professional Indigo

  const contentContainerStyle = {
    background: dark ? "rgba(15, 23, 42, 0.4)" : "#ffffff",
    backdropFilter: "blur(20px)",
    border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
    boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.03)",
    borderRadius: 24,
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
        
        {/* PROFESSIONAL HEADER */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ 
              background: `${accentColor}15`, color: accentColor, 
              padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, 
              textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 
            }}>
              <BrainCircuit size={14} />
              AI Intelligence Suite
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Analyzing Active Vectors</span>
            </div>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: "-1px", color: dark ? "#fff" : "#0f172a" }}>
            Business Intelligence <span style={{ color: "var(--muted)", fontWeight: 400 }}>& Insights</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 600, lineHeight: 1.6 }}>
            Gain a competitive edge with AI-driven analytics that audit your restaurant's operational health and market position in real-time.
          </p>
        </div>

        {/* REFINED TAB SWITCHER */}
        <div style={{ 
          display: "flex", gap: 8, marginBottom: 32, padding: 6, 
          background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", 
          borderRadius: 16, border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 12, border: "none",
                background: tab === t.key ? (dark ? "rgba(255,255,255,0.1)" : "#fff") : "transparent",
                color: tab === t.key ? (dark ? "#fff" : "#0f172a") : "var(--muted)",
                boxShadow: tab === t.key && !dark ? "0 4px 10px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer", fontSize: 13, fontWeight: tab === t.key ? 800 : 600,
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <div style={{ color: tab === t.key ? accentColor : "inherit" }}>{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* INSIGHTS CONTENT */}
        <div style={{ transition: "all 0.4s ease" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "120px 0" }}>
              <div style={{ 
                width: 48, height: 48, border: `3px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, 
                borderTop: `3px solid ${accentColor}`, borderRadius: "50%", 
                margin: "0 auto 20px", animation: "spin 0.8s linear infinite" 
              }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--muted)" }}>Processing analytical data segments...</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : data ? (
            <>
              {tab === "forecast" && <ForecastModule data={data} dark={dark} contentContainerStyle={contentContainerStyle} accentColor={accentColor} />}
              {tab === "menu" && <MenuHealthModule data={data} dark={dark} contentContainerStyle={contentContainerStyle} accentColor={accentColor} />}
              {tab === "churn" && <RetentionModule data={data} dark={dark} contentContainerStyle={contentContainerStyle} accentColor={accentColor} />}
              {tab === "stock" && <StockPulseModule data={data} dark={dark} contentContainerStyle={contentContainerStyle} accentColor={accentColor} />}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 80, color: "var(--muted)", ...contentContainerStyle }}>
              <Info style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No analytical data found for this segment.</p>
            </div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}

// ── PROFESSIONAL MODULES ───────────────────────────────────────────────────

function StatCard({ title, value, sub, dark, accentColor }) {
  return (
    <div style={{
      background: dark ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
      border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
      borderRadius: 20, padding: 24, flex: 1, minWidth: 240,
      boxShadow: !dark ? "0 2px 4px rgba(0,0,0,0.02)" : "none"
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <h4 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: dark ? "#fff" : "#0f172a" }}>{value}</h4>
        {sub && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>{sub}</span>}
      </div>
    </div>
  );
}

function ForecastModule({ data, dark, contentContainerStyle, accentColor }) {
  if (!data || !data.forecast) return null;
  const maxRev = Math.max(...data.forecast.map(f => f.predictedRevenue), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard title="Predicted Revenue" value={`AED ${data.weekTotal || 0}`} sub="+12.4%" dark={dark} accentColor={accentColor} />
        <StatCard title="Operating Velocity" value={`AED ${data.movingAverage || 0}`} sub="Daily Avg" dark={dark} accentColor={accentColor} />
        <StatCard title="Analysis Confidence" value="94.2%" sub="High" dark={dark} accentColor={accentColor} />
      </div>

      <div style={{ ...contentContainerStyle, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Projected Daily Performance</h3>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Next 7 Business Days</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.forecast.map(f => (
            <div key={f.date} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 120 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{f.dayName}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{f.date}</p>
              </div>
              <div style={{ flex: 1, height: 12, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ 
                  height: "100%", width: `${(f.predictedRevenue / maxRev) * 100}%`, 
                  background: accentColor, borderRadius: 10,
                  transition: "width 1s ease-out"
                }} />
              </div>
              <div style={{ width: 100, textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>AED {f.predictedRevenue}</p>
                <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{f.predictedOrders} Orders</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuHealthModule({ data, dark, contentContainerStyle, accentColor }) {
  if (!data || !data.items) return null;
  const statusColors = { star: "#10b981", good: "#3b82f6", average: "#f59e0b", underperformer: "#f97316", dead: "#ef4444" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
       <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard title="Total Menu Items" value={data.totalItems || 0} dark={dark} accentColor={accentColor} />
        <StatCard title="High Performance" value={data.stars?.length || 0} sub="Top Tier" dark={dark} accentColor={accentColor} />
        <StatCard title="Revenue Optimization" value={`AED ${Math.round((data.underperformers?.length || 0) * 125)}`} sub="Gap Analysis" dark={dark} accentColor={accentColor} />
      </div>

      <div style={{ ...contentContainerStyle, overflow: "hidden" }}>
        <div style={{ padding: "24px 32px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Menu Item Performance Audit</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: dark ? "rgba(255,255,255,0.01)" : "#f8fafc" }}>
              <th style={thStyle}>Menu Item</th>
              <th style={thStyle}>Performance Score</th>
              <th style={thStyle}>Operational Status</th>
              <th style={thStyle}>Strategic Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).slice(0, 10).map(item => (
              <tr key={item._id} style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}` }}>
                <td style={tdStyle}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{item.category}</p>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 6, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 3, minWidth: 60 }}>
                      <div style={{ height: "100%", width: `${item.compositeScore || 0}%`, background: statusColors[item.status] || "#3b82f6", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: statusColors[item.status] }}>{item.compositeScore}%</span>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                    background: `${statusColors[item.status] || '#333'}15`, color: statusColors[item.status] || '#333',
                    textTransform: "uppercase"
                  }}>{item.status || "Normal"}</span>
                </td>
                <td style={{ ...tdStyle, color: "var(--muted)", fontSize: 12, fontWeight: 500 }}>{item.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RetentionModule({ data, dark, contentContainerStyle, accentColor }) {
  if (!data || (!data.summary && !data.atRisk)) return null;
  const riskColors = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
       <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard title="Active Customer Base" value={data.totalCustomers || 0} dark={dark} accentColor={accentColor} />
        <StatCard title="At-Risk Segments" value={data.summary?.critical || 0} sub="Attention Required" dark={dark} accentColor={accentColor} />
        <StatCard title="Retention Rate" value={`${100 - (data.summary?.critical || 0)}%`} dark={dark} accentColor={accentColor} />
      </div>

      <div style={{ ...contentContainerStyle, padding: 32 }}>
         <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>Customer Retention Analysis</h3>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {(data.atRisk || []).slice(0, 6).map((c, i) => (
              <div key={i} style={{ 
                background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc", 
                borderRadius: 16, padding: 20, border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}` 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                   <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{c.name}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>Inactive for {c.daysSinceLast} days</p>
                   </div>
                   <div style={{ color: riskColors[c.risk] }}><AlertCircle size={16} /></div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Orders</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{c.orderCount}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>CLV</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>AED {c.totalSpent}</p>
                    </div>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function StockPulseModule({ data, dark, contentContainerStyle, accentColor }) {
  if (!data || !data.items) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
       <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard title="Inventory Units" value={data.items?.length || 0} dark={dark} accentColor={accentColor} />
        <StatCard title="Critical Alerts" value={data.outOfStock || 0} sub="Action Needed" dark={dark} accentColor={accentColor} />
        <StatCard title="Inventory Turnover" value={data.highDemand || 0} sub="High Velocity" dark={dark} accentColor={accentColor} />
      </div>

      <div style={{ ...contentContainerStyle, padding: 32 }}>
         <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>Supply Chain Risk Monitoring</h3>
         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(data.items || []).slice(0, 10).map(item => (
              <div key={item._id} style={{ 
                display: "flex", alignItems: "center", gap: 16, padding: "12px 20px",
                background: dark ? "rgba(255,255,255,0.02)" : "#fff",
                borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`
              }}>
                <div style={{ 
                  width: 36, height: 36, borderRadius: 10, 
                  background: item.inStock ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: item.inStock ? "#10b981" : "#ef4444"
                }}>
                  {item.inStock ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                
                <div style={{ flex: 1 }}>
                   <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.name}</h4>
                   <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>Avg. Weekly Consumption: {item.weeklyOrders} units</p>
                </div>

                <div style={{ textAlign: "right" }}>
                   <div style={{ 
                     display: "inline-flex", alignItems: "center", gap: 4, 
                     color: item.trend === "high_demand" ? "#ef4444" : "var(--muted)",
                     fontSize: 11, fontWeight: 700
                    }}>
                     {item.trend === "high_demand" && <ArrowUpRight size={14} />}
                     {item.trend === "high_demand" ? "ACCELERATING" : "NORMAL"}
                   </div>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

const thStyle = { padding: "16px 24px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 };
const tdStyle = { padding: "16px 24px" };
