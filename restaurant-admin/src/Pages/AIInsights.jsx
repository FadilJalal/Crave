import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const TABS = [
  { key: "forecast", label: "📈 Sales Forecast", desc: "AI-predicted revenue for the next 7 days" },
  { key: "menu", label: "🍽️ Menu Insights", desc: "AI scores for every menu item" },
  { key: "churn", label: "⚠️ Churn Risk", desc: "Customers who may stop ordering" },
  { key: "stock", label: "📦 Stock Alerts", desc: "Demand trends and stock warnings" },
];

export default function AIInsights() {
  const [tab, setTab] = useState("forecast");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true); setData(null);
    try {
      const endpoints = { forecast: "/api/ai/restaurant/forecast", menu: "/api/ai/restaurant/menu-insights", churn: "/api/ai/restaurant/churn", stock: "/api/ai/restaurant/stock-alerts" };
      const res = await api.get(endpoints[t]);
      if (res.data.success) setData(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const card = (title, value, sub, color = "#111") => (
    <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px", minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>{sub}</p>}
    </div>
  );

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 900 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>🤖 AI Insights</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>AI-powered analytics for your restaurant — no API keys needed</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "10px 18px", borderRadius: 12, border: tab === t.key ? "2px solid #ff4e2a" : "1.5px solid var(--border)",
              background: tab === t.key ? "#fff5f3" : "white", fontWeight: 800, fontSize: 13,
              color: tab === t.key ? "#ff4e2a" : "#374151", cursor: "pointer", fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px", fontStyle: "italic" }}>
          {TABS.find(t => t.key === tab)?.desc}
        </p>

        {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>Loading AI analysis...</div>}

        {!loading && data && tab === "forecast" && <ForecastView data={data} />}
        {!loading && data && tab === "menu" && <MenuInsightsView data={data} />}
        {!loading && data && tab === "churn" && <ChurnView data={data} />}
        {!loading && data && tab === "stock" && <StockView data={data} />}
      </div>
    </RestaurantLayout>
  );
}

function ForecastView({ data }) {
  if (data.message) return <div style={{ padding: 20, background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", color: "#92400e", fontWeight: 600 }}>{data.message}</div>;
  const maxRev = Math.max(...data.forecast.map(f => f.predictedRevenue), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Week Forecast</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>AED {data.weekTotal}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Daily Average</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>AED {data.movingAverage}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Data Points</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.dataPoints} days</p>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: 18 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>7-Day Revenue Forecast</p>
        {data.forecast.map((f) => (
          <div key={f.date} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ width: 60, fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{f.dayName}</span>
            <div style={{ flex: 1, height: 24, background: "#f3f4f6", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(f.predictedRevenue / maxRev) * 100}%`, background: "linear-gradient(90deg, #ff4e2a, #ff8c5a)", borderRadius: 8, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "white" }}>AED {f.predictedRevenue}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af", width: 50, textAlign: "right" }}>~{f.predictedOrders} ord</span>
          </div>
        ))}
      </div>

      {data.dayOfWeekPattern && (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: 18, marginTop: 14 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>Day-of-Week Pattern</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.dayOfWeekPattern.map((d) => (
              <div key={d.day} style={{ textAlign: "center", flex: "1 1 60px", padding: "10px 8px", background: "#f9fafb", borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#6b7280" }}>{d.day}</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 900 }}>AED {d.avgRevenue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuInsightsView({ data }) {
  const statusColors = { star: "#16a34a", good: "#2563eb", average: "#f59e0b", underperformer: "#ea580c", dead: "#dc2626" };
  const statusEmoji = { star: "⭐", good: "👍", average: "😐", underperformer: "👎", dead: "💀" };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Total Items</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.totalItems}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Stars</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{data.stars?.length || 0}</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Underperformers</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{data.underperformers?.length || 0}</p>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
              <th style={th}>Item</th><th style={th}>Score</th><th style={th}>Orders</th><th style={th}>Revenue</th><th style={th}>Rating</th><th style={th}>Status</th><th style={th}>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item) => (
              <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={td}><span style={{ fontWeight: 700 }}>{item.name}</span><br /><span style={{ fontSize: 11, color: "#9ca3af" }}>{item.category}</span></td>
                <td style={{ ...td, fontWeight: 800, color: statusColors[item.status] }}>{item.compositeScore}</td>
                <td style={td}>{item.orders}</td>
                <td style={td}>AED {item.revenue}</td>
                <td style={td}>{item.avgRating > 0 ? `⭐ ${item.avgRating.toFixed(1)}` : "—"}</td>
                <td style={td}><span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: `${statusColors[item.status]}15`, color: statusColors[item.status] }}>{statusEmoji[item.status]} {item.status}</span></td>
                <td style={{ ...td, fontSize: 11, color: "#6b7280", maxWidth: 200 }}>{item.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.categoryBreakdown?.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: 18, marginTop: 14 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>Category Breakdown</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.categoryBreakdown.map((c) => (
              <div key={c.category} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 10, flex: "1 1 120px" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#374151" }}>{c.category}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{c.items} items · {c.orders} orders · AED {c.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChurnView({ data }) {
  const riskColors = { critical: "#dc2626", high: "#ea580c", medium: "#f59e0b" };
  const riskEmoji = { critical: "🚨", high: "⚠️", medium: "📉" };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Total Customers</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>{data.totalCustomers}</p>
        </div>
        <div style={{ background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Critical</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{data.summary?.critical || 0}</p>
        </div>
        <div style={{ background: "#fff7ed", borderRadius: 14, border: "1px solid #fed7aa", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#ea580c", fontWeight: 700 }}>High Risk</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#ea580c" }}>{data.summary?.high || 0}</p>
        </div>
        <div style={{ background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 700 }}>Medium Risk</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#92400e" }}>{data.summary?.medium || 0}</p>
        </div>
      </div>

      {data.atRisk?.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 700 }}>
          🎉 No customers at risk of churning!
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
                <th style={th}>Customer</th><th style={th}>Risk</th><th style={th}>Orders</th><th style={th}>Spent</th><th style={th}>Avg Gap</th><th style={th}>Days Since</th>
              </tr>
            </thead>
            <tbody>
              {data.atRisk?.map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}><span style={{ fontWeight: 700 }}>{c.name}</span><br /><span style={{ fontSize: 11, color: "#9ca3af" }}>{c.email}</span></td>
                  <td style={td}><span style={{ padding: "2px 8px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: `${riskColors[c.risk]}15`, color: riskColors[c.risk] }}>{riskEmoji[c.risk]} {c.risk}</span></td>
                  <td style={td}>{c.orderCount}</td>
                  <td style={td}>AED {c.totalSpent}</td>
                  <td style={td}>{c.avgGapDays}d</td>
                  <td style={{ ...td, fontWeight: 700, color: riskColors[c.risk] }}>{c.daysSinceLast}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StockView({ data }) {
  const trendColors = { high_demand: "#16a34a", moderate_demand: "#2563eb", stable: "#6b7280", no_orders: "#dc2626" };
  const trendEmoji = { high_demand: "🔥", moderate_demand: "📊", stable: "➖", no_orders: "💤" };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#15803d", fontWeight: 700 }}>High Demand</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{data.highDemand}</p>
        </div>
        <div style={{ background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Out of Stock</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{data.outOfStock}</p>
        </div>
        <div style={{ background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", padding: "16px 18px", flex: "1 1 140px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 700 }}>No Orders</p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: "#92400e" }}>{data.noOrders}</p>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
              <th style={th}>Item</th><th style={th}>Weekly</th><th style={th}>Daily Avg</th><th style={th}>Trend</th><th style={th}>Alert</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item) => (
              <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6", opacity: item.inStock ? 1 : 0.5 }}>
                <td style={td}><span style={{ fontWeight: 700 }}>{item.name}</span>{!item.inStock && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginLeft: 6 }}>OUT</span>}</td>
                <td style={td}>{item.weeklyOrders}</td>
                <td style={td}>{item.dailyAvg}/day</td>
                <td style={td}><span style={{ color: trendColors[item.trend], fontWeight: 700 }}>{trendEmoji[item.trend]} {item.trend.replace("_", " ")}</span></td>
                <td style={{ ...td, fontSize: 11, color: "#6b7280" }}>{item.alert || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: "10px 14px", textAlign: "left", fontWeight: 800, fontSize: 11, color: "#6b7280", textTransform: "uppercase" };
const td = { padding: "10px 14px" };
