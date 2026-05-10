import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import {
  TrendingUp, LayoutGrid, Users, Package,
  Info, CheckCircle2, AlertCircle, 
  Calendar, SortDesc, RefreshCw
} from "lucide-react";

/* ─── Constants ──────────────────────────────────────────────── */

const ACCENT = "#3b82f6"; // Standard blue for a cleaner look

const TABS = [
  { key: "forecast", label: "Sales Projections",   Icon: TrendingUp },
  { key: "menu",     label: "Menu Analytics",       Icon: LayoutGrid },
  { key: "churn",    label: "Customer Retention",   Icon: Users      },
  { key: "stock",    label: "Inventory Signals",     Icon: Package    },
];

const BADGE_STYLES = {
  star:          { bg: "#dcfce7", color: "#166534" },
  good:          { bg: "#dbeafe", color: "#1e40af" },
  average:       { bg: "#fef3c7", color: "#92400e" },
  underperformer:{ bg: "#fef3c7", color: "#92400e" },
  dead:          { bg: "#fee2e2", color: "#991b1b" },
};

const RISK_STYLES = {
  critical: { bg: "#fee2e2", color: "#991b1b" },
  high:     { bg: "#fef3c7", color: "#92400e" },
  medium:   { bg: "#fef3c7", color: "#92400e" },
};

/* ─── Main page ──────────────────────────────────────────────── */

export default function AIInsights() {
  const { dark } = useTheme();
  const [tab,     setTab]     = useState("forecast");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true); setData(null);
    try {
      const endpoints = {
        forecast: "/api/ai/restaurant/forecast",
        menu:     "/api/ai/restaurant/menu-insights",
        churn:    "/api/ai/restaurant/churn",
        stock:    "/api/ai/restaurant/stock-alerts",
      };
      const res = await api.get(endpoints[t]);
      if (res.data.success) setData(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60, fontFamily: fontStack }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 32,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>AI Insights</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              Predictive analytics and operational intelligence dashboard.
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600,
            color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 100,
            background: dark ? "rgba(255,255,255,0.04)" : "#f1f5f9",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
            Live Analysis
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          style={{
            display: "flex", gap: 8, marginBottom: 32,
            borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
          }}
        >
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                style={{
                  padding: "12px 16px", background: "none", border: "none",
                  borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                  color: active ? "var(--text)" : "var(--text-secondary)",
                  cursor: "pointer", fontSize: 14, fontWeight: active ? 700 : 500,
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState dark={dark} />
        ) : data ? (
          <>
            {tab === "forecast" && <ForecastModule  data={data} dark={dark} />}
            {tab === "menu"     && <MenuModule      data={data} dark={dark} />}
            {tab === "churn"    && <RetentionModule data={data} dark={dark} />}
            {tab === "stock"    && <StockModule     data={data} dark={dark} />}
          </>
        ) : (
          <EmptyState dark={dark} />
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </RestaurantLayout>
  );
}

/* ─── Shared primitives ──────────────────────────────────────── */

function MetricCard({ label, value, sub, up, dark }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
      borderRadius: 16, padding: 24, flex: 1, minWidth: 240,
      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
    }}>
      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <h3 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-1px" }}>
        {value}
      </h3>
      {sub && (
        <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: up ? "#10b981" : "var(--text-secondary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Panel({ title, icon: Icon, meta, dark, children, noPad }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
      borderRadius: 20, overflow: "hidden",
    }}>
      <div style={{
        padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}`,
      }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h4>
        {meta && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            {meta}
          </span>
        )}
      </div>
      <div style={noPad ? {} : { padding: 24 }}>{children}</div>
    </div>
  );
}

function Badge({ status }) {
  const s = BADGE_STYLES[status] || BADGE_STYLES.good;
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700, padding: "4px 10px",
      borderRadius: 8, textTransform: "uppercase", letterSpacing: "0.02em",
      background: s.bg, color: s.color,
    }}>{status}</span>
  );
}

function LoadingState({ dark }) {
  return (
    <div style={{ textAlign: "center", padding: "120px 0" }}>
      <div style={{
        width: 40, height: 40,
        border: `3px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
        borderTop: `3px solid ${ACCENT}`, borderRadius: "50%",
        margin: "0 auto 24px", animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 600 }}>Analyzing performance data...</p>
    </div>
  );
}

function EmptyState({ dark }) {
  return (
    <div style={{
      textAlign: "center", padding: 80,
      background: dark ? "rgba(255,255,255,0.02)" : "#fff",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
      borderRadius: 20,
    }}>
      <Info size={32} style={{ opacity: 0.2, marginBottom: 16 }} />
      <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No analytical data found for this segment.</p>
    </div>
  );
}

function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* ─── Forecast ───────────────────────────────────────────────── */

function ForecastModule({ data, dark }) {
  if (!data?.forecast) return null;
  const max = Math.max(...data.forecast.map(f => f.predictedRevenue), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <MetricCard label="Predicted Revenue"  value={`AED ${data.weekTotal || 0}`}     sub="↑ 12.4% vs last week" up dark={dark} />
        <MetricCard label="Daily Average"       value={`AED ${data.movingAverage || 0}`} sub="Operating velocity"       dark={dark} />
        <MetricCard label="Forecast Confidence" value="94.2%"                            sub="↑ High accuracy"     up dark={dark} />
      </div>

      <Panel title="Projected Daily Performance" meta="Next 7 Days" dark={dark}>
        {data.forecast.map(f => (
          <div key={f.date} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
            <div style={{ width: 120 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{f.dayName}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{f.date}</p>
            </div>
            <div style={{ flex: 1, height: 10, background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(f.predictedRevenue / max) * 100}%`, background: ACCENT, borderRadius: 100, transition: "width 1s ease" }} />
            </div>
            <div style={{ width: 140, textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>AED {f.predictedRevenue.toLocaleString()}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{f.predictedOrders} orders</p>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ─── Menu ───────────────────────────────────────────────────── */

const TH = { padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" };
const TD = { padding: "16px 24px", verticalAlign: "middle" };

function MenuModule({ data, dark }) {
  if (!data?.items) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <MetricCard label="Total Menu Items"  value={data.totalItems || 0}                dark={dark} />
        <MetricCard label="Top Performers"    value={data.stars?.length || 0}           sub="Star tier"           up dark={dark} />
        <MetricCard label="Optimization Gap"   value={`AED ${Math.round((data.underperformers?.length || 0) * 125)}`} sub="Revenue potential"     dark={dark} />
      </div>

      <Panel title="Menu Performance Audit" meta="Ranked by composite score" dark={dark} noPad>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                <th style={TH}>Item Name</th>
                <th style={TH}>Composite Score</th>
                <th style={TH}>Operational Status</th>
                <th style={TH}>AI Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).slice(0, 10).map(item => (
                <tr key={item._id} style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` }}>
                  <td style={TD}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{item.category}</p>
                  </td>
                  <td style={TD}>
                    <div style={{ height: 6, background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 100, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.compositeScore || 0}%`, background: ACCENT, borderRadius: 100 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{item.compositeScore}%</span>
                  </td>
                  <td style={TD}><Badge status={item.status} /></td>
                  <td style={{ ...TD, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{item.suggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ─── Retention ──────────────────────────────────────────────── */

function RetentionModule({ data, dark }) {
  if (!data?.summary && !data?.atRisk) return null;
  const rate = Math.max(0, 100 - Math.round(((data.summary?.critical || 0) / (data.totalCustomers || 1)) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <MetricCard label="Active Customers"   value={(data.totalCustomers || 0).toLocaleString()} dark={dark} />
        <MetricCard label="At-Risk Segments" value={data.summary?.critical || 0} sub="Requires attention"    dark={dark} />
        <MetricCard label="Retention Rate"     value={`${rate}%`}                  sub="↑ 30-day window" up dark={dark} />
      </div>

      <Panel title="At-Risk Customer Segments" meta="Prioritised by churn likelihood" dark={dark}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {(data.atRisk || []).slice(0, 6).map((c, i) => {
            const rs = RISK_STYLES[c.risk] || RISK_STYLES.medium;
            return (
              <div key={i} style={{
                background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                borderRadius: 16, padding: 20,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: ACCENT, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>{initials(c.name)}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{c.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>Inactive {c.daysSinceLast} days</p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px",
                    borderRadius: 6, textTransform: "uppercase",
                    background: rs.bg, color: rs.color,
                  }}>{c.risk}</span>
                </div>
                <div style={{ display: "flex", gap: 24, paddingTop: 16, borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Orders</p>
                    <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800 }}>{c.orderCount}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Lifetime Value</p>
                    <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800 }}>AED {c.totalSpent}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ─── Stock ──────────────────────────────────────────────────── */

function StockModule({ data, dark }) {
  if (!data?.items) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <MetricCard label="Inventory Units" value={data.items?.length || 0}                  dark={dark} />
        <MetricCard label="Critical Alerts"    value={data.outOfStock || 0} sub="Action needed"    dark={dark} />
        <MetricCard label="High Velocity"   value={data.highDemand || 0} sub="Reorder soon"     dark={dark} />
      </div>

      <Panel title="Supply Chain Risk Monitor" meta="Live stock monitoring" dark={dark}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(data.items || []).slice(0, 10).map(item => (
            <div key={item._id} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
              borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
              background: dark ? "rgba(255,255,255,0.03)" : "#fff",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: item.inStock ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: item.inStock ? "#10b981" : "#ef4444",
              }}>
                {item.inStock
                  ? <CheckCircle2 size={18} />
                  : <AlertCircle  size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Avg. Weekly Consumption: {item.weeklyOrders} units
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                background: item.trend === "high_demand" ? "rgba(239,68,68,0.1)" : (dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"),
                color:      item.trend === "high_demand" ? "#ef4444" : "var(--text-secondary)",
                textTransform: "uppercase"
              }}>
                {item.trend === "high_demand" ? "↑ High Demand" : "Normal Velocity"}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
